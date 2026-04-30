import { useState, useEffect, useRef } from "react";
import { getAlerts, resolveAlert, createAlert } from "../../../services/followup";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import { formatNumber } from "../../../utils/formatters";
import { X, Search, CheckCircle, Bell, AlertTriangle, Clock, Megaphone, Plus } from "lucide-react";
import LogFollowUpModal from "../components/LogFollowUpModal";
import { useAuth } from "../../auth/AuthContext";

function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

const SEVERITY = {
  HIGH:   { badge: "bg-red-100 text-red-700 border-red-200",           dot: "bg-red-500"    },
  MEDIUM: { badge: "bg-yellow-100 text-yellow-700 border-yellow-200",  dot: "bg-yellow-500" },
  LOW:    { badge: "bg-green-100 text-green-700 border-green-200",     dot: "bg-green-500"  },
};

const ALERT_TYPE_LABELS = {
  OVERDUE:     "Overdue",
  DUE_SOON:    "Due This Week",
  ESCALATED:   "Escalated",
};

const ALERT_TYPE_ICONS = {
  OVERDUE:     <AlertTriangle size={11} />,
  DUE_SOON:    <Clock size={11} />,
  ESCALATED:   <Megaphone size={11} />,
};

const ALERT_STATUS_STYLES = {
  ACTIVE:    "bg-orange-100 text-orange-700 border-orange-200",
  RESPONDED: "bg-blue-100 text-blue-700 border-blue-200",
  RESOLVED:  "bg-gray-100 text-gray-500 border-gray-200",
};

const ALERT_STATUS_LABELS = {
  ACTIVE:    "Active",
  RESPONDED: "Responded",
  RESOLVED:  "Resolved",
};

function formatFollowUpDate(daysValue) {
  const days = Number(daysValue);
  if (Number.isNaN(days)) return null;

  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.toLocaleDateString("en-GB");
}

// ── Truncated cell ───────────────────────────────────────────
function TruncCell({ text, maxW = "max-w-[140px]", className = "" }) {
  if (!text || text === "—") return <span className="text-gray-300">—</span>;
  return (
    <span title={text} className={`block truncate ${maxW} ${className}`}>
      {text}
    </span>
  );
}

function fmtRupee(val) {
  const n = parseFloat(val || 0);
  if (n === 0) return "₹0";
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

// ── Create Alert Modal ───────────────────────────────────────
function CreateAlertModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    client_code: "", client_name: "", agent: "", area: "",
    outstanding_amount: "", oldest_due_days: "",
    alert_type: "OVERDUE", severity: "HIGH",
  });
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    if (!form.client_code || !form.client_name) {
      toast.error("Client code and name are required");
      return;
    }
    setSaving(true);
    try {
      await createAlert(form);
      toast.success("Alert created!");
      onSaved(); onClose();
    } catch {
      toast.error("Failed to create alert");
    } finally { setSaving(false); }
  };

  const field = (label, key, type = "text", placeholder = "") => (
    <div>
      <label className="text-xs font-semibold text-gray-600 block mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4 flex items-center justify-between">
          <p className="text-white font-bold text-base">Create Payment Alert</p>
          <button onClick={onClose}><X size={20} className="text-white/80 hover:text-white" /></button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {field("Client Code *",     "client_code",        "text",   "e.g. CLI-041")}
            {field("Client Name *",     "client_name",        "text",   "Sunrise Surgicals")}
            {field("Agent",             "agent",              "text",   "RK")}
            {field("Area",              "area",               "text",   "West")}
            {field("Outstanding (₹)",   "outstanding_amount", "number", "0")}
            {field("Oldest Due (days)", "oldest_due_days",    "number", "0")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Alert Type</label>
              <select
                value={form.alert_type}
                onChange={e => setForm(f => ({ ...f, alert_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                {Object.entries(ALERT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Severity</label>
              <select
                value={form.severity}
                onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handle}
            disabled={saving}
            className="px-5 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow hover:from-teal-600 hover:to-cyan-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Create Alert"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function AlertsPage() {
  const { user: currentUser } = useAuth();
  const [alerts,         setAlerts]         = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [typeFilter,     setTypeFilter]     = useState("");
  const [showResolved,   setShowResolved]   = useState(false);
  const [currentPage,    setCurrentPage]    = useState(1);
  const [totalCount,     setTotalCount]     = useState(0);
  const [showCreate,     setShowCreate]     = useState(false);
  const [resolvingId,    setResolvingId]    = useState(null);
  const [summaryCounts,  setSummaryCounts]  = useState({ high: 0, medium: 0, low: 0 });
  const [followUpClient, setFollowUpClient] = useState(null);

  const searchRef      = useRef(null);
  const ITEMS_PER_PAGE = 100;
  const debouncedSearch = useDebounce(searchQuery, 350);

  useEffect(() => { searchRef.current?.focus(); }, []);
  useEffect(() => { loadAlerts(); loadSummaryCounts(); }, [severityFilter, typeFilter, showResolved, debouncedSearch, currentPage]);

  const buildParams = (page, pageSize) => {
    const params = { page, page_size: pageSize, resolved: showResolved };
    if (severityFilter)           params.severity   = severityFilter;
    if (typeFilter)               params.alert_type = typeFilter;
    if (debouncedSearch.trim())   params.search     = debouncedSearch.trim();
    return params;
  };

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await getAlerts(buildParams(currentPage, ITEMS_PER_PAGE));
      setAlerts(res.data.results || res.data);
      setTotalCount(res.data.count || (res.data.results || res.data).length);
    } catch {
      toast.error("Failed to load alerts");
    } finally { setLoading(false); }
  };

  const loadSummaryCounts = async () => {
    setSummaryLoading(true);
    try {
      const res = await getAlerts(buildParams(1, 10000));
      const all = res.data.results || res.data || [];
      setSummaryCounts({
        high:   all.filter(a => getAlertStatus(a) === "ACTIVE" && a.severity === "HIGH").length,
        medium: all.filter(a => getAlertStatus(a) === "ACTIVE" && a.severity === "MEDIUM").length,
        low:    all.filter(a => getAlertStatus(a) === "ACTIVE" && a.severity === "LOW").length,
      });
    } catch {
      setSummaryCounts({ high: 0, medium: 0, low: 0 });
    } finally { setSummaryLoading(false); }
  };

  const handleResolve = async (id) => {
    setResolvingId(id);
    try {
      await resolveAlert(id);
      toast.success("Alert resolved");
      loadAlerts();
      loadSummaryCounts();
    } catch {
      toast.error("Failed to resolve");
    } finally { setResolvingId(null); }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSeverityFilter("");
    setTypeFilter("");
    setShowResolved(false);
    setCurrentPage(1);
  };

  const getAlertStatus = (alert) => {
    if (alert.activity_status) return alert.activity_status;
    if (alert.is_resolved)     return "RESOLVED";
    return alert.has_followup || alert.followup_count > 0 ? "RESPONDED" : "ACTIVE";
  };

  const alertToClient = (alert) => ({
    code:        alert.client_code,
    name:        alert.client_name,
    agent:       alert.agent,
    area:        alert.area_display || alert.area,
    outstanding: alert.outstanding_amount,
    alert_id:    alert.id,
  });

  const isAssignedAlertForCurrentUser = (alert) => {
    if (!alert?.assigned_to) return true;
    if (!currentUser?.id) return false;
    return String(alert.assigned_to) === String(currentUser.id);
  };

  const hasActiveFilters = searchQuery.trim() || severityFilter || typeFilter || showResolved;

  return (
    <div className="min-h-screen bg-gray-50 p-3">
      {showCreate && (
        <CreateAlertModal onClose={() => setShowCreate(false)} onSaved={loadAlerts} />
      )}
      <LogFollowUpModal
        isOpen={!!followUpClient}
        client={followUpClient}
        onClose={() => setFollowUpClient(null)}
        onSaved={async () => {
          // After a follow-up is logged, treat it as resolution for the alert
          if (followUpClient?.alert_id) {
            try {
              await resolveAlert(followUpClient.alert_id);
              toast.success("Alert resolved");
            } catch {
              toast.error("Failed to resolve alert after follow-up");
            }
          }
          loadAlerts();
          loadSummaryCounts();
        }}
      />

      <div className="max-w-[1400px] mx-auto">

        {/* ── Header ── */}
        <div className="mb-3">
          <h1 className="text-xl font-bold text-gray-800">Payment Alerts</h1>
        </div>

        {/* ── Filter Bar ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-3">
          <div className="flex flex-col gap-3 lg:gap-4">
            <div className="flex flex-col xl:flex-row xl:items-center gap-3 xl:gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 flex-1 min-w-0">
                {/* Search */}
                <div className="relative min-w-0 md:col-span-2 xl:col-span-1">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search client or code…"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-8 pr-8 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Severity */}
                <select
                  value={severityFilter}
                  onChange={e => { setSeverityFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white"
                >
                  <option value="">All Severities</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>

                {/* Type */}
                <select
                  value={typeFilter}
                  onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white"
                >
                  <option value="">All Types</option>
                  {Object.entries(ALERT_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>

                {/* Show resolved toggle */}
                <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-gray-300 rounded-xl text-xs text-gray-600 select-none">
                  <input
                    type="checkbox"
                    checked={showResolved}
                    onChange={e => { setShowResolved(e.target.checked); setCurrentPage(1); }}
                    className="w-3.5 h-3.5 accent-teal-500"
                  />
                  Show Resolved
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end xl:ml-auto">
                <button
                  onClick={() => setShowCreate(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-semibold text-xs shadow hover:from-teal-600 hover:to-cyan-700 transition-all flex items-center gap-1.5"
                >
                  <Plus size={12} />
                  New Alert
                </button>
                <button
                  onClick={() => { loadAlerts(); loadSummaryCounts(); toast.success("Refreshed"); }}
                  className="px-3.5 py-2 bg-white border border-gray-300 text-gray-600 rounded-xl font-semibold text-xs hover:bg-gray-50 transition-all"
                >
                  Refresh
                </button>
                <button
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="px-3.5 py-2 bg-white border border-gray-300 text-gray-600 rounded-xl font-semibold text-xs hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Loading alerts…</div>
          ) : alerts.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">No alerts found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table
                  className="min-w-[1080px] md:min-w-full divide-y divide-gray-100"
                  style={{ tableLayout: "fixed", width: "100%" }}
                >
                  <colgroup>
                    <col style={{ width: "72px"  }} />
                    <col style={{ width: "180px" }} />
                    <col style={{ width: "90px"  }} />
                    <col style={{ width: "90px"  }} />
                    <col style={{ width: "110px" }} />
                    <col style={{ width: "100px" }} />
                    <col style={{ width: "110px" }} />
                    <col style={{ width: "100px" }} />
                    <col style={{ width: "80px"  }} />
                    <col style={{ width: "110px" }} />
                  </colgroup>
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                    <tr>
                      {[
                        "Code", "Client", "Agent", "Area",
                        "Outstanding", "Due In (days)", "Alert Type",
                        "Severity", "F/U Date", "Actions",
                      ].map(h => (
                        <th
                          key={h}
                          className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {alerts.map((alert, idx) => {
                      const status = getAlertStatus(alert);
                      const canActOnAlert = isAssignedAlertForCurrentUser(alert);
                      return (
                        <tr
                          key={alert.id}
                          className={`hover:bg-teal-50/40 transition-colors ${
                            idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                          } ${alert.is_resolved ? "opacity-60" : ""}`}
                        >
                          {/* Code */}
                          <td className="px-3 py-2 overflow-hidden">
                            <span className="text-[11px] font-mono text-gray-500 truncate block">
                              {alert.client_code}
                            </span>
                          </td>

                          {/* Client */}
                          <td className="px-3 py-2 overflow-hidden">
                            <TruncCell
                              text={alert.client_name}
                              maxW="max-w-full"
                              className="text-xs font-medium text-gray-800"
                            />
                            {alert.alert_type === 'ESCALATED' && (
                              <div className=" rounded-lg text-xs text-orange-700 font-medium">
                                ⚠️ Escalated to {canActOnAlert ? "you" : (alert.assigned_to_name || "assigned user")}
                              </div>
                            )}
                          </td>

                          {/* Agent */}
                          <td className="px-3 py-2 overflow-hidden">
                            <TruncCell text={alert.agent || "—"} maxW="max-w-full" className="text-xs text-gray-700" />
                          </td>

                          {/* Area */}
                          <td className="px-3 py-2 overflow-hidden">
                            <TruncCell text={alert.area_display || alert.area || "—"} maxW="max-w-full" className="text-xs text-gray-600" />
                          </td>

                          {/* Outstanding */}
                          <td className="px-3 py-2 text-right">
                            <span className="text-xs font-semibold text-red-500 tabular-nums">
                              {fmtRupee(alert.outstanding_amount)}
                            </span>
                          </td>

                          {/* Days Old */}
                          <td className="px-3 py-2 text-center">
                            {alert.oldest_due_days != null ? (
                              (() => {
                                const days = Number(alert.oldest_due_days);
                                if (Number.isNaN(days)) return (<span className="text-gray-300 text-xs">—</span>);
                                // Overdue (positive) should show with a leading minus (e.g. -6d)
                                // Upcoming (negative) should show as positive value without sign (e.g. 1d)
                                const label = days > 0 ? `-${days}d` : `${Math.abs(days)}d`;
                                const cls = days > 60
                                  ? "bg-red-100 text-red-700 border-red-200"
                                  : days > 30
                                  ? "bg-amber-100 text-amber-700 border-amber-200"
                                  : days > 0
                                  ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                                  : "bg-green-100 text-green-700 border-green-200";
                                return (
                                  <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${cls}`}>
                                    {label}
                                  </span>
                                );
                              })()
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>

                          {/* Alert Type */}
                          <td className="px-3 py-2">
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-gray-600 whitespace-nowrap">
                              {ALERT_TYPE_ICONS[alert.alert_type]}
                              {ALERT_TYPE_LABELS[alert.alert_type] || alert.alert_type}
                            </span>
                          </td>

                          {/* Severity */}
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1 w-fit ${
                              SEVERITY[alert.severity]?.badge || "bg-gray-100 text-gray-600 border-gray-200"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${SEVERITY[alert.severity]?.dot}`} />
                              {alert.severity.charAt(0) + alert.severity.slice(1).toLowerCase()}
                            </span>
                          </td>

                          {/* Follow-up Date */}
                          <td className="px-3 py-2 text-center">
                            {alert.oldest_due_days != null ? (
                              <span className="text-xs text-gray-700">
                                {formatFollowUpDate(alert.oldest_due_days)}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  if (!canActOnAlert) return;
                                  setFollowUpClient(alertToClient(alert));
                                }}
                                disabled={!canActOnAlert}
                                title={canActOnAlert ? "Log a follow-up" : "This escalated alert is assigned to another user"}
                                className="px-2.5 py-1 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-md font-semibold text-[10px] shadow hover:from-teal-600 hover:to-cyan-700 transition-all flex items-center gap-1 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Bell size={10} />
                                Follow-up
                              </button>
                              {!alert.is_resolved && canActOnAlert && (
                                <button
                                  onClick={() => handleResolve(alert.id)}
                                  disabled={resolvingId === alert.id}
                                  title="Mark as resolved"
                                  className="p-1 text-gray-400 hover:text-teal-600 transition-colors disabled:opacity-50 flex-shrink-0"
                                >
                                  <CheckCircle size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={currentPage}
                totalItems={totalCount}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={p => setCurrentPage(p)}
                label="alerts"
                colorScheme="teal"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}