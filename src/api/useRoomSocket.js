import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Opens a WebSocket to the Quarkus realtime service for a room and exposes
 * a send function plus incoming events. The Vite proxy forwards /ws to
 * ws://localhost:8081, so we connect via the app's own origin.
 *
 * Protocol (confirmed against the Quarkus backend):
 *   URL:  ws://<host>/ws/rooms/{roomId}/users/{userId}
 *   send: { type: "CHAT", payload: { content } }
 *   recv: { type: "CHAT", payload: { messageId, senderId, senderDisplayName, content, timestamp } }
 *         { type: "CHAT_HISTORY", payload: { messages: [...] } }
 *         plus YOUTUBE_SYNC_STATE, PARTICIPANT_COUNT, ACTIVITY_LOG(_HISTORY), etc.
 */
export function useRoomSocket({ roomId, userId, onEvent }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const reconnectRef = useRef(null);
  const shouldReconnect = useRef(true);

  // Keep the latest onEvent without re-opening the socket on every render.
  const onEventRef = useRef(onEvent);
  useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);

  const connect = useCallback(() => {
    if (!roomId || userId == null) return;

    // Build ws:// or wss:// based on current page protocol, using the app origin
    // so the Vite proxy (/ws -> :8081) handles the forward.
    const scheme = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${scheme}://${window.location.host}/ws/rooms/${roomId}/users/${userId}`;

    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onEventRef.current?.(data);
      } catch (err) {
        console.error("Bad WS message:", event.data, err);
      }
    };

    socket.onclose = () => {
      setConnected(false);
      // Auto-reconnect after a short delay, unless we're tearing down on purpose.
      if (shouldReconnect.current) {
        reconnectRef.current = setTimeout(connect, 1500);
      }
    };

    socket.onerror = () => {
      // onclose will fire after this and handle reconnect.
      socket.close();
    };
  }, [roomId, userId]);

  useEffect(() => {
    shouldReconnect.current = true;
    connect();

    return () => {
      shouldReconnect.current = false;
      clearTimeout(reconnectRef.current);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [connect]);

  const send = useCallback((type, payload) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, payload }));
      return true;
    }
    return false;
  }, []);

  const sendChat = useCallback((content) => send("CHAT", { content }), [send]);

  return { connected, send, sendChat };
}