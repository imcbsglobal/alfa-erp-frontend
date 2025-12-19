import api from "../../../services/api";

export const packingService = {
  // Get active packing task for current user
  getActivePacking: async () => {
    return await api.get("/sales/packing/active/");
  },

  // Get active packing task for specific user (admin only)
  getActivePackingForUser: async (userEmail) => {
    return await api.get("/sales/packing/active/", {
      params: { user_email: userEmail }
    });
  },

  // Start packing
  startPacking: async (invoiceNo, userEmail, notes = "Packing started") => {
    return await api.post("/sales/packing/start/", {
      invoice_no: invoiceNo,
      user_email: userEmail,
      notes: notes,
    });
  },

  // Complete packing
  completePacking: async (invoiceNo, userEmail, notes = "Packing completed") => {
    return await api.post("/sales/packing/complete/", {
      invoice_no: invoiceNo,
      user_email: userEmail,
      notes: notes,
    });
  },

  // Get packing history
  getPackingHistory: async (params = {}) => {
    return await api.get("/sales/packing/history/", { params });
  },

  // Get invoices ready for packing (PICKED status)
  getPickedInvoices: async (params = {}) => {
    return await api.get("/sales/invoices/", {
      params: { status: "PICKED", ...params }
    });
  },
};