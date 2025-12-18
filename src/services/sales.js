// services/sales.js
import api from "./api";

export const getActivePickingTask = (params = {}) =>
  api.get("/sales/picking/active/", { params });

export const getPickingHistory = (params = {}) => {
  return api.get("/sales/picking/history/", { params });
};
