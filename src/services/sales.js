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

  // Start delivery
  export const startDelivery = (data) => {
    return api.post("/sales/delivery/start/", data);
  };

  // Complete delivery
  export const completeDelivery = (data) => {
    return api.post("/sales/delivery/complete/", data);
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