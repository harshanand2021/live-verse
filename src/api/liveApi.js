import api from "./axios";

// Unwrap the ApiResponse<T> envelope: { success, data, message, timestamp }
const unwrap = (response) => response.data.data;


export const resolveInvite = (code) =>
  api.get(`/api/rooms/invite/${encodeURIComponent(code)}`).then((res) => normalizeRoom(unwrap(res)));


// Backend room → frontend-shaped room.
function normalizeRoom(backendRoom) {
  if (!backendRoom) return null;
  return {
    id: String(backendRoom.roomId),

    title: backendRoom.roomName,

    description: "",

    contentType:
        backendRoom.contentType === "YOUTUBE"
            ? "movie"
            : "live",

    visibility: "public",

    status: (backendRoom.status || "").toLowerCase(),

    hostName: backendRoom.hostDisplayName,

    hostId: String(backendRoom.hostUserId),

    viewerCount: backendRoom.occupiedSeats || 0,

    totalSeats: backendRoom.totalSeats,

    posterColor: "#3A1B4A",

    code: backendRoom.inviteCode,

    startedAt: backendRoom.createdAt
        ? new Date(
              backendRoom.createdAt
          ).toLocaleString()
        : "",

    youtubeVideoId: extractYoutubeId(
        backendRoom.videoUrl
    ),

    videoUrl: backendRoom.videoUrl,

    roomName: backendRoom.roomName,

    createdAt: backendRoom.createdAt,

    backend: backendRoom
};
}

// The backend only accepts videoUrl at creation time: RoomService rejects a
// videoUrl on LIVE_STREAM rooms and exposes no update path, so whatever the room
// plays has to be decided here. A room opened without a URL stays LIVE_STREAM.
function denormalizeCreateRequest(frontendPayload) {
  const videoUrl = frontendPayload.videoUrl?.trim();
  return {
    roomName: frontendPayload.title,
    totalSeats: frontendPayload.totalSeats || 50,
    ...(videoUrl
      ? { contentType: "YOUTUBE", videoUrl }
      : { contentType: "LIVE_STREAM" }),
  };
}

// Backend seat map → flat array the seat grid renders directly.
// Backend: { roomId, totalSeats, occupiedSeats, seats: [{ seatNumber, isBooked, bookedByUserId, bookedByDisplayName }] }
function normalizeSeats(backendSeatMap) {
  if (!backendSeatMap || !Array.isArray(backendSeatMap.seats)) return [];
  return backendSeatMap.seats.map((seat) => ({
    seatNumber: seat.seatNumber,
    isBooked: seat.isBooked,
    bookedByUserId: seat.bookedByUserId != null ? String(seat.bookedByUserId) : null,
    bookedByName: seat.bookedByDisplayName || null,
  }));
}

export function extractYoutubeId(url) {

    if (!url) return null;

    const regex =
        /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]{11}).*/;

    const match = url.match(regex);

    return match ? match[1] : null;
}

export const createLive = async (payload) => {

    const response = await api.post(
        "/api/rooms",
        denormalizeCreateRequest(payload)
    );

    return normalizeRoom(
        unwrap(response)
    );
};

export const getAllLives = () =>
  api.get("/api/rooms").then((res) => unwrap(res).map(normalizeRoom));

export const getLiveById = (id) =>
  api.get(`/api/rooms/${id}`).then((res) => normalizeRoom(unwrap(res)));

export const joinLive = (id) => Promise.resolve(null);
export const leaveLive = (id) => Promise.resolve(null);

export const endLive = (id) =>
  api.patch(`/api/rooms/${id}/end`).then((res) => normalizeRoom(unwrap(res)));

export const getLiveComments = (id) =>
  api.get(`/api/rooms/${id}/messages/recent?limit=50`).then((res) => unwrap(res));

export const addComment = (id, payload) =>
  api.post(`/api/rooms/${id}/messages`, payload).then((res) => unwrap(res));

export const getLiveSeats = (id) =>
  api.get(`/api/rooms/${id}/seats`).then((res) => normalizeSeats(unwrap(res)));

export const claimSeat = (id, seatNumber) =>
  api.post(`/api/rooms/${id}/seats/${seatNumber}/book`).then((res) => unwrap(res));

// Host changes what the room is playing, mid-session. Persists it against the
// room so anyone entering later gets it; pushing it to people already seated is
// a separate ROOM_VIDEO_CHANGED broadcast over the socket.
export const setLiveMedia = (id, videoUrl) =>
    api
        .patch(`/api/rooms/${id}/video`, { videoUrl })
        .then((res) => normalizeRoom(unwrap(res)));

export const getRoomCode = (room) =>
    room?.code ?? "";