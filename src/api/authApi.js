import api from "./axios";

export const login = (credentials) => api.post("/api/auth/login", credentials);

export const register = (userData) => api.post("/api/auth/register", userData);

export const verify = () => api.get("/api/auth/verify");

// The backend has no logout or refresh endpoints yet.
// Logout is client-side only — clear the token and redirect.
// Kept as no-op functions so calling code doesn't break.
export const logout = () => Promise.resolve({ data: null });

export const refreshToken = () => Promise.reject(new Error("Refresh not supported"));