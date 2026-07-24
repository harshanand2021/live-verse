import api from "./axios";

export const login = (credentials) => api.post("/api/auth/login", credentials);

export const register = (userData) => api.post("/api/auth/register", userData);

export const logout = () => api.post("/api/auth/logout");

export const refreshToken = () => api.post("/api/auth/refresh");

export const forgotPassword = (email) =>
  api.post("/api/auth/forgot-password", { email });

export const resetPassword = (payload) =>
  api.post("/api/auth/reset-password", payload);
