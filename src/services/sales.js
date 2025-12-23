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

// ADD THESE PACKING EXPORTS
export const startPacking = (data) =>
  api.post("/sales/packing/start/", data);

export const completePacking = (data) =>
  api.post("/sales/packing/complete/", data);

export const getActivePackingTask = (params = {}) =>
  api.get("/sales/packing/active/", { params });

export const getPackedInvoices = (params = {}) =>
  api.get("/sales/invoices/", { params: { status: "PACKED", ...params } });

// Add at the end of the file
export const startDelivery = (data) =>
  api.post("/sales/delivery/start/", data);

export const completeDelivery = (data) =>
  api.post("/sales/delivery/complete/", data);

