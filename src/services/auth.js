import api from "./api";
import axios from "axios";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

// LOGIN (uses axios, not api)
export async function login(email, password) {
  const response = await axios.post(`${API_BASE_URL}/auth/login/`, {
    email,
    password,
  });

  return response.data;
}

// USERS
export const getUsers = () => api.get("/auth/users/");
export const getUser = (id) => api.get(`/auth/users/${id}/`);
export const createUser = (data) => api.post("/auth/users/", data);
export const updateUser = (id, data) => api.put(`/auth/users/${id}/`, data);
export const patchUser = (id, data) => api.patch(`/auth/users/${id}/`, data);
export const deleteUser = (id) => api.delete(`/auth/users/${id}/`);

export const activateUser = (id) => api.post(`/auth/users/${id}/activate/`);
export const deactivateUser = (id) => api.post(`/auth/users/${id}/deactivate/`);

export const changeUserPassword = (data) =>
  api.post("/auth/users/change_password/", data);

export const uploadUserAvatar = (id, file) => {
  const formData = new FormData();
  formData.append("avatar", file);
  return api.patch(`/auth/users/${id}/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

// JOB TITLES
export const getJobTitles = () => api.get("/auth/job-titles/");
export const createJobTitle = (data) => api.post("/auth/job-titles/", data);
export const updateJobTitle = (id, data) =>
  api.put(`/auth/job-titles/${id}/`, data);
export const patchJobTitle = (id, data) =>
  api.patch(`/auth/job-titles/${id}/`, data);
export const deleteJobTitle = (id) =>
  api.delete(`/auth/job-titles/${id}/`);

// DEPARTMENTS
export const getDepartments = () => api.get("/auth/departments/");
export const getDepartmentById = (id) =>
  api.get(`/auth/departments/${id}/`);
export const createDepartment = (data) =>
  api.post("/auth/departments/", data);
export const updateDepartment = (id, data) =>
  api.put(`/auth/departments/${id}/`, data);
export const deleteDepartment = (id) =>
  api.delete(`/auth/departments/${id}/`);
