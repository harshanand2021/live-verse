import api from "./axios";

export const createLive = (payload) => api.post("/api/live", payload);

export const getAllLives = () => api.get("/api/live");

export const getLiveById = (id) => api.get(`/api/live/${id}`);

export const joinLive = (id) => api.post(`/api/live/${id}/join`);

export const leaveLive = (id) => api.post(`/api/live/${id}/leave`);

export const endLive = (id) => api.post(`/api/live/${id}/end`);

export const getLiveComments = (id) => api.get(`/api/live/${id}/comments`);

export const addComment = (id, comment) =>
  api.post(`/api/live/${id}/comments`, comment);

export const getLiveSeats = (id) => api.get(`/api/live/${id}/seats`);

export const claimSeat = (id, seatId) => api.post(`/api/live/${id}/seats/${seatId}`);

export const setLiveMedia = (id, payload) => api.put(`/api/live/${id}/media`, payload);
