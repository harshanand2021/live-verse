import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Host-to-viewer screen sharing over WebRTC, signalled through the room socket.
 *
 * The Quarkus backend already relays the three signaling messages we need
 * (WebRtcSignalingEventHandler): WEBRTC_OFFER {targetUserId, sdp} host->viewer,
 * WEBRTC_ANSWER {targetUserId, sdp} viewer->host, and WEBRTC_ICE_CANDIDATE
 * {targetUserId, candidate, sdpMid, sdpMLineIndex} in both directions.
 *
 * The host opens one RTCPeerConnection per viewer, so upload cost grows with the
 * audience — fine for a handful of people, an SFU would be needed for a full room.
 */

// Public STUN is enough on one machine or a single LAN. Anything else — mobile
// data, symmetric NAT, corporate firewalls — needs a TURN relay, so we add one
// when it is configured and quietly fall back to STUN-only when it is not.
function buildIceServers() {
  const servers = [{ urls: "stun:stun.l.google.com:19302" }];
  const url = import.meta.env.VITE_TURN_URL;
  const username = import.meta.env.VITE_TURN_USERNAME;
  const credential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (url && username && credential) {
    servers.push({ urls: url, username, credential });
  }
  return servers;
}

// The backend relays these payloads verbatim, so the recipient only ever sees
// `targetUserId` — their own id — and never learns who sent it. The host needs
// that to match an answer to the right viewer, so we carry the sender id inside
// the string field the DTO already forwards.
function pack(from, value) {
  return JSON.stringify({ from: String(from), value });
}

// Falls back to treating the raw string as the value, so this keeps working if
// the backend ever starts stamping a real sender id on the relay itself.
function unpack(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.from != null) {
      return { from: String(parsed.from), value: parsed.value };
    }
  } catch {
    // Not our envelope.
  }
  return { from: null, value: raw };
}

const DEAD_STATES = ["failed", "closed", "disconnected"];
const OFFER_RETRY_MS = 5000;
const MAX_OFFER_ATTEMPTS = 3;

export function useScreenShare({ isHost, hostId, currentUserId, viewerIds, send }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [surface, setSurface] = useState("");
  const [error, setError] = useState("");

  const peersRef = useRef(new Map()); // peerUserId -> { pc, pendingIce }
  const localStreamRef = useRef(null);
  // Candidates can arrive before the offer that creates their peer connection.
  const orphanIceRef = useRef(new Map()); // peerUserId -> candidates[]
  const attemptsRef = useRef(new Map()); // peerUserId -> offers sent

  // Long-lived peer callbacks read through this so they never capture stale
  // props, and so changing props doesn't tear down live connections.
  const ctxRef = useRef({ isHost, hostId, currentUserId, send });
  useEffect(() => {
    ctxRef.current = { isHost, hostId, currentUserId, send };
  }, [isHost, hostId, currentUserId, send]);

  const closePeer = useCallback((peerId) => {
    const key = String(peerId);
    const entry = peersRef.current.get(key);
    if (!entry) return;

    entry.pc.onicecandidate = null;
    entry.pc.ontrack = null;
    entry.pc.onconnectionstatechange = null;
    try {
      entry.pc.close();
    } catch {
      // Already closed.
    }
    peersRef.current.delete(key);
  }, []);

  const closeAllPeers = useCallback(() => {
    Array.from(peersRef.current.keys()).forEach(closePeer);
    orphanIceRef.current.clear();
  }, [closePeer]);

  const createPeer = useCallback(
    (peerId) => {
      const key = String(peerId);
      closePeer(key); // replace any stale connection for this peer

      const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
      // Adopt any candidates that raced ahead of this connection.
      const entry = { pc, pendingIce: orphanIceRef.current.get(key) || [] };
      orphanIceRef.current.delete(key);
      peersRef.current.set(key, entry);

      pc.onicecandidate = ({ candidate }) => {
        if (!candidate) return;
        const { currentUserId: me, send: sendNow } = ctxRef.current;
        sendNow("WEBRTC_ICE_CANDIDATE", {
          targetUserId: Number(key),
          candidate: pack(me, candidate.candidate),
          sdpMid: candidate.sdpMid,
          sdpMLineIndex: candidate.sdpMLineIndex,
        });
      };

      return entry;
    },
    [closePeer],
  );

  const flushPendingIce = async (entry) => {
    const queued = entry.pendingIce.splice(0);
    for (const candidate of queued) {
      try {
        await entry.pc.addIceCandidate(candidate);
      } catch (err) {
        console.warn("Discarded queued ICE candidate:", err);
      }
    }
  };

  // ── Host side ────────────────────────────────────────────────────────────
  const offerTo = useCallback(
    async (viewerId) => {
      const stream = localStreamRef.current;
      if (!stream) return;

      const { currentUserId: me, send: sendNow } = ctxRef.current;
      const key = String(viewerId);
      const entry = createPeer(key);
      stream.getTracks().forEach((track) => entry.pc.addTrack(track, stream));

      attemptsRef.current.set(key, (attemptsRef.current.get(key) || 0) + 1);
      entry.pc.onconnectionstatechange = () => {
        if (entry.pc.connectionState === "connected") {
          attemptsRef.current.delete(key);
        }
      };

      try {
        const offer = await entry.pc.createOffer();
        await entry.pc.setLocalDescription(offer);
        sendNow("WEBRTC_OFFER", {
          targetUserId: Number(viewerId),
          sdp: pack(me, offer.sdp),
        });
      } catch (err) {
        console.error(`Failed to offer screen share to user ${viewerId}:`, err);
        closePeer(viewerId);
      }
    },
    [createPeer, closePeer],
  );

  // ── Viewer side ──────────────────────────────────────────────────────────
  const acceptOffer = useCallback(
    async (fromUserId, sdp) => {
      const { currentUserId: me, send: sendNow } = ctxRef.current;
      const entry = createPeer(fromUserId);

      entry.pc.ontrack = (event) => setRemoteStream(event.streams[0] || null);
      entry.pc.onconnectionstatechange = () => {
        if (DEAD_STATES.includes(entry.pc.connectionState)) setRemoteStream(null);
      };

      try {
        await entry.pc.setRemoteDescription({ type: "offer", sdp });
        await flushPendingIce(entry);
        const answer = await entry.pc.createAnswer();
        await entry.pc.setLocalDescription(answer);
        sendNow("WEBRTC_ANSWER", {
          targetUserId: Number(fromUserId),
          sdp: pack(me, answer.sdp),
        });
      } catch (err) {
        console.error("Failed to answer the host's screen share:", err);
        closePeer(fromUserId);
        setRemoteStream(null);
      }
    },
    [createPeer, closePeer],
  );

  const handleSignal = useCallback(
    (type, payload) => {
      if (!payload) return;

      if (type === "WEBRTC_OFFER") {
        const { from, value } = unpack(payload.sdp);
        // Only the host is allowed to offer, so that's who this is from.
        acceptOffer(from ?? ctxRef.current.hostId, value);
        return;
      }

      if (type === "WEBRTC_ANSWER") {
        const { from, value } = unpack(payload.sdp);
        const entry = from ? peersRef.current.get(String(from)) : null;
        if (!entry) return;
        entry.pc
          .setRemoteDescription({ type: "answer", sdp: value })
          .then(() => flushPendingIce(entry))
          .catch((err) => console.error("Failed to apply answer:", err));
        return;
      }

      if (type === "WEBRTC_ICE_CANDIDATE") {
        const { from, value } = unpack(payload.candidate);
        // A viewer only ever peers with the host, so an unlabelled candidate
        // can only have come from them.
        const key = String(
          from ?? (ctxRef.current.isHost ? "" : ctxRef.current.hostId),
        );
        if (!key) return;

        const candidate = {
          candidate: value,
          sdpMid: payload.sdpMid,
          sdpMLineIndex: payload.sdpMLineIndex,
        };
        const entry = peersRef.current.get(key);

        if (!entry) {
          // Raced ahead of the offer — hold it until the peer exists.
          const waiting = orphanIceRef.current.get(key) || [];
          waiting.push(candidate);
          orphanIceRef.current.set(key, waiting);
        } else if (entry.pc.remoteDescription) {
          entry.pc
            .addIceCandidate(candidate)
            .catch((err) => console.warn("Bad ICE candidate:", err));
        } else {
          entry.pendingIce.push(candidate);
        }
      }
    },
    [acceptOffer],
  );

  const stopShare = useCallback(() => {
    closeAllPeers();
    attemptsRef.current.clear();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setSurface("");
  }, [closeAllPeers]);

  const startShare = useCallback(
    async ({ preferTab = false } = {}) => {
      if (!ctxRef.current.isHost) return;
      if (!navigator.mediaDevices?.getDisplayMedia) {
        setError("Screen sharing is not supported by this browser.");
        return;
      }

      try {
        setError("");
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
          preferCurrentTab: preferTab,
          selfBrowserSurface: "exclude",
          surfaceSwitching: "include",
        });

        const videoTrack = stream.getVideoTracks()[0];
        setSurface(videoTrack?.getSettings?.().displaySurface || "");
        // The browser's own "Stop sharing" bar ends the track behind our back.
        videoTrack?.addEventListener("ended", () => stopShare());

        localStreamRef.current = stream;
        setLocalStream(stream);
      } catch (err) {
        if (err.name !== "NotAllowedError") {
          setError("Unable to start screen sharing. Please try again.");
        }
      }
    },
    [stopShare],
  );

  // Offer to everyone watching, and keep up as people come and go mid-share.
  // Idempotent: only missing peers get an offer, only departed ones get closed.
  useEffect(() => {
    if (!isHost || !localStream) return;

    const wanted = new Set(viewerIds.map(String));
    wanted.forEach((id) => {
      if (!peersRef.current.has(id)) offerTo(id);
    });
    Array.from(peersRef.current.keys()).forEach((id) => {
      if (!wanted.has(id)) closePeer(id);
    });
  }, [isHost, localStream, viewerIds, offerTo, closePeer]);

  // A targeted relay can vanish silently: SessionRegistry.findByUserIdInRoom
  // picks any session matching the user, and if a stale one from a dropped
  // connection wins, the message is dropped with no error. Re-offer to anyone
  // who never got connected, so a reconnecting viewer recovers on their own.
  useEffect(() => {
    if (!isHost || !localStream) return undefined;

    const timer = window.setInterval(() => {
      viewerIds.forEach((id) => {
        const key = String(id);
        const state = peersRef.current.get(key)?.pc.connectionState;
        if (state === "connected" || state === "connecting") return;
        if ((attemptsRef.current.get(key) || 0) >= MAX_OFFER_ATTEMPTS) return;
        offerTo(key);
      });
    }, OFFER_RETRY_MS);

    return () => window.clearInterval(timer);
  }, [isHost, localStream, viewerIds, offerTo]);

  useEffect(
    () => () => {
      closeAllPeers();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    },
    [closeAllPeers],
  );

  return {
    localStream,
    remoteStream,
    surface,
    error,
    startShare,
    stopShare,
    handleSignal,
    dropPeer: closePeer,
  };
}
