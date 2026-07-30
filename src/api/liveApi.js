import api from "./axios";

// Unwrap the ApiResponse<T> envelope: { success, data, message, timestamp }
const unwrap = (response) => response.data.data;

// Backend room → frontend-shaped room.
function normalizeRoom(backendRoom) {
  if (!backendRoom) return null;
  return {
    id: String(backendRoom.roomId),
    title: backendRoom.roomName,
    description: '',
    contentType: backendRoom.contentType === 'YOUTUBE' ? 'movie' : 'live',
    visibility: 'public',
    status: (backendRoom.status || '').toLowerCase(),
    hostName: backendRoom.hostDisplayName,
    hostId: String(backendRoom.hostUserId),
    viewerCount: backendRoom.occupiedSeats || 0,
    posterColor: '#3A1B4A',
    code: backendRoom.inviteCode,
    startedAt: backendRoom.createdAt ? new Date(backendRoom.createdAt).toLocaleString() : '',
    youtubeVideoId: extractYoutubeId(backendRoom.videoUrl),
  };
}

function extractYoutubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export const createLive = (payload) =>
  api.post("/api/rooms", payload).then((res) => normalizeRoom(unwrap(res)));

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

export const addComment = (id, comment) =>
  api.post(`/api/rooms/${id}/messages`, comment).then((res) => unwrap(res));

export const getLiveSeats = (id) =>
  api.get(`/api/rooms/${id}/seats`).then((res) => unwrap(res));

export const claimSeat = (id, seatNumber) =>
  api.post(`/api/rooms/${id}/seats/${seatNumber}/book`).then((res) => unwrap(res));

export const setLiveMedia = (id, payload) =>
  Promise.reject(new Error("Video URL is set at room creation and cannot be changed"));