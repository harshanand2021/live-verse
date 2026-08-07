import axios from "axios";

const API_BASE = 'https://liveverse-backend-core-production.up.railway.app';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only bounce to login on a real auth failure for a non-auth request.
    const url = error.config?.url || "";
    const isAuthRequest = url.includes("/api/auth/");
    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem("accessToken");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;