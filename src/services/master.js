import axiosInstance from "./axiosInstance";

const API_BASE = "/api/auth";

export const getTrays = async () => {
  return axiosInstance.get(`${API_BASE}/trays/`);
};

export const createTray = async (data) => {
  return axiosInstance.post(`${API_BASE}/trays/`, {
    tray_code: data.tray_code,
    status: data.status || 'ACTIVE',
    remarks: data.remarks?.trim() || null,
  });
};

export const updateTray = async (id, data) => {
  return axiosInstance.put(`${API_BASE}/trays/${id}/`, {
    tray_code: data.tray_code,
    status: data.status || 'ACTIVE',
    remarks: data.remarks?.trim() || null,
  });
};

export const deleteTray = async (id) => {
  return axiosInstance.delete(`${API_BASE}/trays/${id}/`);
};
