// services/auth.js
import axios from "axios";

const API_BASE_URL = "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem("access_token");
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Refresh token on 401
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

// ================== AUTH ==================

// LOGIN (unchanged)
export async function login(email, password) {
  try {
    console.log("Attempting login with:", { email });

    const response = await axios.post(`${API_BASE_URL}/auth/login/`, {
      email,
      password,
    });

    console.log("Login response:", response.data);

    return response.data;
  } catch (error) {
    console.error("Login error details:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    if (error.response?.status === 500) {
      throw new Error("Server error. Please try again later or contact support.");
    } else if (error.response?.status === 401) {
      throw new Error("Invalid email or password");
    } else if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    } else {
      throw new Error("Login failed. Please check your connection and try again.");
    }
  }
}

// ================== USERS ==================
//
// Backend spec (you gave):
// GET    /api/auth/users/                -> list
// POST   /api/auth/users/                -> create
// PUT    /api/auth/users/{id}/           -> update
// PATCH  /api/auth/users/{id}/           -> partial update / upload avatar
// DELETE /api/auth/users/{id}/           -> delete
// POST   /api/auth/users/change_password/ -> change password
// POST   /api/auth/users/{id}/activate/   -> activate
// POST   /api/auth/users/{id}/deactivate/ -> deactivate
//

// LIST USERS
export async function getUsers() {
  try {
    const response = await api.get("/auth/users/");
    return response.data;
  } catch (error) {
    console.error("Get users error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
}

// GET SINGLE USER (for edit page)
export async function getUser(id) {
  try {
    const response = await api.get(`/auth/users/${id}/`);
    return response.data;
  } catch (error) {
    console.error("Get user error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
}

// CREATE USER
export async function createUser(userData) {
  try {
    const response = await api.post("/auth/users/", userData);
    return response.data;
  } catch (error) {
    console.error("Create user error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
}

// UPDATE USER (PUT)
export async function updateUser(id, userData) {
  try {
    const response = await api.put(`/auth/users/${id}/`, userData);
    return response.data;
  } catch (error) {
    console.error("Update user error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
}

// PARTIAL UPDATE (PATCH) – generic
export async function patchUser(id, userData) {
  try {
    const response = await api.patch(`/auth/users/${id}/`, userData);
    return response.data;
  } catch (error) {
    console.error("Patch user error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
}

// DELETE USER
export async function deleteUser(id) {
  try {
    const response = await api.delete(`/auth/users/${id}/`);
    return response.data;
  } catch (error) {
    console.error("Delete user error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
}

// ACTIVATE USER
export async function activateUser(id) {
  try {
    const response = await api.post(`/auth/users/${id}/activate/`);
    return response.data;
  } catch (error) {
    console.error("Activate user error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
}

// DEACTIVATE USER
export async function deactivateUser(id) {
  try {
    const response = await api.post(`/auth/users/${id}/deactivate/`);
    return response.data;
  } catch (error) {
    console.error("Deactivate user error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
}

// CHANGE PASSWORD – adjust payload keys to your backend
export async function changeUserPassword(payload) {
  // e.g. { user_id, old_password?, new_password }
  try {
    const response = await api.post("/auth/users/change_password/", payload);
    return response.data;
  } catch (error) {
    console.error("Change password error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
}

// UPLOAD AVATAR – PATCH /users/{id}/ with multipart/form-data
export async function uploadUserAvatar(id, file) {
  const formData = new FormData();
  formData.append("profile_photo", file);

  try {
    const response = await api.patch(`/auth/users/${id}/`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Upload avatar error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw error;
  }
}


// ================== JOB TITLES ==================

// GET ALL
export async function getJobTitles() {
  const response = await api.get("/auth/job-titles/");
  return response.data;
}

// CREATE
export async function createJobTitle(data) {
  const response = await api.post("/auth/job-titles/", data);
  return response.data;
}

// UPDATE FULL
export async function updateJobTitle(id, data) {
  const response = await api.put(`/auth/job-titles/${id}/`, data);
  return response.data;
}

// PATCH UPDATE
export async function patchJobTitle(id, data) {
  const response = await api.patch(`/auth/job-titles/${id}/`, data);
  return response.data;
}

// DELETE
export async function deleteJobTitle(id) {
  const response = await api.delete(`/auth/job-titles/${id}/`);
  return response.data;
}
