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

// Get delivery history
export const getDeliveryHistory = (params) => {
  return api.get("/sales/delivery/history/", { params });
};

// Start delivery (for dispatch - first assignment)
export const startDelivery = (data) => {
  return api.post("/sales/delivery/start/", data);
};

// Start assigned delivery (for staff to begin delivery)
export const startAssignedDelivery = (data) => {
  return api.post("/sales/delivery/start-assigned/", data);
};

// Complete delivery
export const completeDelivery = (data) => {
  return api.post("/sales/delivery/complete/", data);
};

// Get consider list (invoices waiting for staff action)
export const getConsiderList = (params) => {
  return api.get("/sales/delivery/consider-list/", { params });
};

export const getCouriers = async () => {
  return api.get("/sales/couriers/");
};

export const getCourierById = (id) => {
  return api.get(`/sales/couriers/${id}/`);
};

export const createCourier = async (courierData) => {
  return api.post("/sales/couriers/", courierData);
};

export const updateCourier = (id, courierData) => {
  return api.patch(`/sales/couriers/${id}/`, courierData);
};

export const deleteCourier = async (id) => {
  return api.delete(`/sales/couriers/${id}/`);
};

// Add this export for updating/patching invoices
export const updateInvoice = (data) =>
  api.patch("/sales/update/invoice/", data);

export const cancelSession = (data) =>
  api.post("/sales/cancel-session/", data);

// Get invoice report with pagination, search, and date filtering
export const getInvoiceReport = (params = {}) => {
  return api.get("/sales/invoice-report/", { params });
};

// Get billing user summary showing how many bills each user has created
export const getBillingUserSummary = (params = {}) => {
  return api.get("/sales/billing/user-summary/", { params });
};