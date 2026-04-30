import api from "./api";

// USERS
export const getUsersApi = (params = {}) => api.get("/auth/users/", { params });
export const getAllUsersApi = () => api.get("/auth/users/", { params: { page_size: 'all' } });

// ADMIN – GET ALL MENUS
export const getAllMenusApi = () =>
  api.get("/access/admin/menus/");

// ADMIN – GET USER MENUS
export const getUserMenusApi = (userId) =>
  api.get(`/access/admin/users/${userId}/menus/`);

// ADMIN – ASSIGN MENUS
export const assignMenusApi = (payload) =>
  api.post("/access/admin/assign-menus/", payload);
