import api from "./axios";

// Unwrap the ApiResponse<T> envelope: { success, data, message, timestamp }
const unwrap = (response) => response.data.data;

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

function extractYoutubeId(url) {

    if (!url) return null;

    const regex =
        /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]{11}).*/;

    const match = url.match(regex);

    return match ? match[1] : null;
}

export const createLive = async (payload) => {

    const response = await api.post(
        "/api/rooms",
        payload
    );

    return normalizeRoom(
        unwrap(response)
    );
};

export const getAllLives = () =>
  api.get("/api/rooms").then((res) => unwrap(res).map(normalizeRoom));

export const getLiveById = (id) =>
  api.get(`/api/rooms/${id}`).then((res) => normalizeRoom(unwrap(res)));

export const joinLive = (id) =>
  api.post(`/api/rooms/${id}/join`)
     .then((res) => normalizeRoom(unwrap(res)));

export const leaveLive = (id) =>
  api.post(`/api/rooms/${id}/leave`)
     .then((res) => unwrap(res));

export const endLive = (id) =>
  api.patch(`/api/rooms/${id}/end`).then((res) => normalizeRoom(unwrap(res)));

export const getLiveComments = (id) =>
  api.get(`/api/rooms/${id}/messages/recent?limit=50`).then((res) => unwrap(res));

export const addComment = (id, text) =>
    api.post(`/api/rooms/${id}/messages`, {

        message: text

    }).then((res) => unwrap(res));

export const getLiveSeats = (id) =>
  api.get(`/api/rooms/${id}/seats`).then((res) => unwrap(res));

export const claimSeat = (id, seatNumber) =>
  api.post(`/api/rooms/${id}/seats/${seatNumber}/book`).then((res) => unwrap(res));

export const setLiveMedia = () =>
    Promise.resolve();

export const getRoomCode = (room) =>
    room?.code ?? "";