import axios from "axios";
import mockServer from './mockServer';
import.meta.env.VITE_API_URL

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/',
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

if (import.meta.env.VITE_USE_DUMMY_API !== 'false') {
  api.defaults.adapter = mockServer;
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    Promise.reject(error);
  },
);

const AUTH_ENDPOINTS = /\/api\/auth\//;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // A rejected sign-in is the caller's to report, so only an expired session on a
    // regular request should drop the token and bounce the user back to the login page.
    const isAuthRequest = AUTH_ENDPOINTS.test(error.config?.url || "");

    if (error.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem("accessToken");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
