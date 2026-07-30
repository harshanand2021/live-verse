import axios from "axios";

const api = axios.create({

    baseURL: import.meta.env.VITE_API_URL,

    timeout: 10000,

    headers: {

        "Content-Type": "application/json"

    }

});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    console.log("Token:", token);
    console.log("Authorization:", token ? `Bearer ${token}` : "No token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    console.log("Headers:", config.headers);

    return config;
});

api.interceptors.response.use(

    (response) => response,

    (error) => {

        if (error.response?.status === 401) {

            localStorage.removeItem("accessToken");

            window.location.href = "/login";

        }

        return Promise.reject(error);

    }

);

export default api;