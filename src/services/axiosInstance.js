import axios from "axios";

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || (
  window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : window.location.origin
);

const axiosInstance = axios.create({
  baseURL: BACKEND_BASE_URL,
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;
