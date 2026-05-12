import api from './api'; // your existing axios instance

// ── Tracker ─────────────────────────────────────────────────
export const getFollowUpTracker = (params = {}) =>
  api.get('/followup/tracker/', { params });

// ── Master (full details with address) ──────────────────────
export const getFollowUpMaster = (params = {}) =>
  api.get('/followup/master/', { params });

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

// ── Visit Log ─────────────────────────────────────────────────
export const createVisitLog = (data) =>
  api.post('/followup/visit-log/create/', data);

export const getFollowUpUsers = () =>
  api.get('/followup/followup-users/');

export const getMyAssignedVisits = () =>
  api.get('/followup/my-assigned-visits/');

export const saveCollectionDetails = (data) =>
  api.post('/followup/save-collection-details/', data);

function asList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function pickAreaName(item = {}) {
  if (typeof item === 'string') return item;
  return (
    item.area ||
    item.area_name ||
    item.areaName ||
    item.location ||
    item.name ||
    ''
  );
}

function pickAgentName(item = {}) {
  if (typeof item === 'string') return item;
  return (
    item.agent ||
    item.agent_name ||
    item.agentName ||
    item.name ||
    item.employee_name ||
    ''
  );
}

export const getServiceMasterAreas = async () => {
  const response = await api.get('/followup/filter-areas/');
  const payload = response?.data;
  return asList(payload)
    .map((item) => (pickAreaName(item) || '').trim())
    .filter(Boolean);
};

export const getAccMasterAgents = async () => {
  const response = await api.get('/followup/filter-agents/');
  const payload = response?.data;
  return asList(payload)
    .map((item) => (pickAgentName(item) || '').trim())
    .filter(Boolean);
};