// services/sales.js
import api from "./api";

export const getActivePickingTask = (params = {}) =>
  api.get("/sales/picking/active/", { params });

export const getPickingHistory = (params = {}) => {
  return api.get("/sales/picking/history/", { params });
};

export const getPackingHistory = (params = {}) => {
  return api.get("/sales/packing/history/", { params });
};

export const getDeliveryHistory = (params = {}) => {
  return api.get("/sales/delivery/history/", { params });
};

export const getInvoiceById = (id) => {
  return api.get(`/sales/invoices/${id}/`);
};