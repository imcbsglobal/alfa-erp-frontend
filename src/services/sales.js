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

// Get billing history
export const getBillingHistory = (params) => {
  return api.get("/sales/billing/history/", { params });
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

export const getCouriers = async (params = {}) => {
  return api.get("/sales/couriers/", { params });
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

// Generic paginated-URL fetcher (for DRF cursor/page-based next URLs)
export const getByUrl = (url) => api.get(url);

// Invoices list
export const getInvoices = (params = {}) => api.get("/sales/invoices/", { params });

// Picking
export const startPicking = (data) => api.post("/sales/picking/start/", data);
export const completePicking = (data) => api.post("/sales/picking/complete/", data);
export const bulkStartPicking = (data) => api.post("/sales/picking/bulk-start/", data);

// Billing invoices
export const getBillingInvoices = (params = {}) => api.get("/sales/billing/invoices/", { params });
export const returnBillingInvoice = (data) => api.post("/sales/billing/return/", data);

// Packing operations
export const getPackingBill = (invoiceNo) => api.get(`/sales/packing/bill/${invoiceNo}/`);
export const startPackingCheck = (data) => api.post("/sales/packing/start-checking/", data);
export const holdForConsolidation = (data) => api.post("/sales/packing/hold-for-consolidation/", data);
export const getMyPackingChecking = () => api.get("/sales/packing/my-checking/");
export const getPublicInvoiceDetail = (invoiceNo) => api.get(`/sales/packing/invoice-public/${invoiceNo}/`);

// Tray-based packing workflow
export const searchTrays = (q, invoiceNo = '', limit = 100) => 
  api.get("/sales/packing/search-trays/", { params: { q, limit, ...(invoiceNo && { invoice_no: invoiceNo }) } });
export const getTrayBill = (invoiceNo) => api.get(`/sales/packing/tray-bill/${invoiceNo}/`);
export const saveTrayDraft = (data) => api.post("/sales/packing/save-tray-draft/", data);
export const completeTrayPacking = (data) => api.post("/sales/packing/complete-tray-packing/", data);
export const getBoxingInvoices = (params = {}) => api.get("/sales/packing/boxing-invoices/", { params });
export const getBoxingData = (invoiceNo) => api.get(`/sales/packing/boxing-data/${invoiceNo}/`);
export const completeBoxing = (data) => api.post("/sales/packing/complete-boxing/", data);

// Delivery
export const assignDelivery = (data) => api.post("/sales/delivery/assign/", data);
export const uploadDeliverySlip = (formData) =>
  api.post("/sales/delivery/upload-slip/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Reports / Settings
export const exportInvoiceReport = (params = {}) => api.get("/sales/invoice-report/export/", { params });
export const getDeveloperSettings = () => api.get("/common/developer-settings/");