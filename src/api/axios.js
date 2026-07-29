import axios from "axios";
import mockServer from './mockServer';

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("accessToken");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);

export default api;
