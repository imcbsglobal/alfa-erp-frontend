import api from "./api";

export const getStatusBreakdown = () => api.get("/analytics/status-breakdown/");
export const getDashboardStats = () => api.get("/analytics/dashboard-stats/");
