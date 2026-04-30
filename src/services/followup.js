import api from './api'; // your existing axios instance

// ── Tracker ─────────────────────────────────────────────────
export const getFollowUpTracker = (params = {}) =>
  api.get('/followup/tracker/', { params });

// ── Follow-up logs ───────────────────────────────────────────
export const getFollowUpLogs = (params = {}) =>
  api.get('/followup/logs/', { params });

export const createFollowUp = (data) =>
  api.post('/followup/logs/', data);

export const getEscalationRecipients = () =>
  api.get('/followup/escalation-recipients/');

export const updateFollowUp = (id, data) =>
  api.patch(`/followup/logs/${id}/`, data);

export const deleteFollowUp = (id) =>
  api.delete(`/followup/logs/${id}/`);

// ── Alerts ───────────────────────────────────────────────────
export const getAlerts = (params = {}) =>
  api.get('/followup/alerts/', { params });

export const createAlert = (data) =>
  api.post('/followup/alerts/', data);

export const resolveAlert = (id) =>
  api.patch(`/followup/alerts/${id}/resolve/`);

// ── Report ───────────────────────────────────────────────────
export const getFollowUpReport = (params = {}) =>
  api.get('/followup/report/', { params });