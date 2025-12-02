// auth.js
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

// LOGIN with improved error handling
export async function login(email, password) {
  try {
    console.log('Attempting login with:', { email }); // Debug log
    
    const response = await axios.post(`${API_BASE_URL}/auth/login/`, {
      email, 
      password
    });

    console.log('Login response:', response.data); // Debug log

    return {
      user: response.data.user,
      access: response.data.access,
      refresh: response.data.refresh
    };
  } catch (error) {
    // Log detailed error information
    console.error('Login error details:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    // Re-throw with more specific error message
    if (error.response?.status === 500) {
      throw new Error('Server error. Please try again later or contact support.');
    } else if (error.response?.status === 401) {
      throw new Error('Invalid email or password');
    } else if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    } else {
      throw new Error('Login failed. Please check your connection and try again.');
    }
  }
}