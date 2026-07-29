import api from "./axios"

export const getCurrentUser = () => api.get("/api/users/me")

export const getUserById = (id) => api.get(`/api/users/${id}`);

export const getUsers = () => api.get('/api/users');

export const updateProfile = (data) => api.put("/api/users/profile", data)

export const uploadProfilePhoto = (formData) => api.post("/api/users/profile-photo", formData);

export const followUser = (id) => api.post(`/api/users/${id}/follow`);

export const unfollowUser = (id) => api.delete(`/api/users/${id}/follow`);

export const searchUsers = (keyword) => api.get("/api/users/search", {params: { q: keyword }});
