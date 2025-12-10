import axios from "axios";

const API_BASE_URL = "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add access token to request
api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem("access_token");
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Handle expired access token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem("refresh_token");

      if (!refresh) {
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh,
        });

        localStorage.setItem("access_token", res.data.access);
        originalRequest.headers.Authorization = `Bearer ${res.data.access}`;

        return api(originalRequest);
      } catch (err) {
        localStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// LOGIN
export async function login(email, password) {
  const response = await axios.post(`${API_BASE_URL}/auth/login/`, {
    email, password
  });

  return {
    user: response.data.user,
    access: response.data.access,
    refresh: response.data.refresh
  };
}

export const pickInvoice = (id, data) =>
  api.post(`/invoices/${id}/pick/`, data);

export const stopPicking = (id, data) =>
  api.post(`/invoices/${id}/stop-picking/`, data);

export const getInvoice = (id) =>
  api.get(`/invoices/${id}/`);
