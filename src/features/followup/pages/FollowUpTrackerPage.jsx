import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getFollowUpTracker, createFollowUp, getEscalationRecipients } from "../../../services/followup";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import { X, Search, Download, Plus, Eye } from "lucide-react";
import ClientDetailPanel from "../components/ClientDetailPanel";

// ── helpers ──────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

const OUTCOME_LABELS = {
  PROMISED:    "Promised",
  PARTIAL:     "Partial",
  NO_RESPONSE: "No Response",
  DISPUTE:     "Dispute",
  ESCALATED:   "Escalated",
  PAID:        "Debit",
};

const OUTCOME_COLORS = {
  PROMISED:    "bg-blue-100 text-blue-700 border-blue-200",
  PARTIAL:     "bg-yellow-100 text-yellow-700 border-yellow-200",
  NO_RESPONSE: "bg-gray-100 text-gray-600 border-gray-200",
  DISPUTE:     "bg-red-100 text-red-700 border-red-200",
  PAID:        "bg-green-100 text-green-700 border-green-200",
};

const RISK_COLORS = {
  High: "bg-red-100 text-red-700 border-red-200",
  Med:  "bg-amber-100 text-amber-700 border-amber-200",
  Low:  "bg-green-100 text-green-700 border-green-200",
  None: "bg-gray-100 text-gray-500 border-gray-200",
};

const TAB_OPTIONS = [
  { value: "all",      label: "All Clients"   },
  { value: "overdue",  label: "Overdue"       },
  { value: "due_week", label: "Due This Week" },
];

function fmtRupee(val) {
  const n = parseFloat(val || 0);
  if (n === 0) return "₹0";
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function getDueDays(nextFollowupDate, fallbackDays) {
  if (!nextFollowupDate) return fallbackDays ?? null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(nextFollowupDate);
  if (Number.isNaN(dueDate.getTime())) return fallbackDays ?? null;
  dueDate.setHours(0, 0, 0, 0);

  return Math.max(0, Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)));
}

// ── Truncated cell with native tooltip ──────────────────────
function TruncCell({ text, maxW = "max-w-[140px]", className = "" }) {
  if (!text || text === "—") return <span className="text-gray-300">—</span>;
  return (
    <span
      title={text}
      className={`block truncate ${maxW} ${className}`}
    >
      {text}
    </span>
  );
}

// ── Log Follow-Up Modal ──────────────────────────────────────
function LogModal({ client, onClose, onSaved }) {
  const [form, setForm] = useState({
    channel:            "PHONE",
    outcome:            "PROMISED",
    escalated_to:       "",
    contact_person:     "",
    notes:              "",
    promised_amount:    "",
    next_followup_date: "",
  });
  const [saving, setSaving] = useState(false);
  const [recipientOptions, setRecipientOptions] = useState([]);
  const [recipientLoading, setRecipientLoading] = useState(false);

  useEffect(() => {
    const loadRecipients = async () => {
      setRecipientLoading(true);
      try {
        const res = await getEscalationRecipients();
        setRecipientOptions(res.data.results || []);
      } catch (_) {
        setRecipientOptions([]);
      } finally {
        setRecipientLoading(false);
      }
    };

    loadRecipients();
  }, []);

  const handleSubmit = async () => {
    if (!form.outcome) { toast.error("Select an outcome"); return; }
    setSaving(true);
    try {
      const payload = {
        client_code:        client.code,
        client_name:        client.name,
        agent:              client.agent,
        area:               client.area,
        outstanding_amount: client.outstanding,
        ...form,
        escalated_to: form.outcome === "ESCALATED" ? form.escalated_to.trim() : "",
        promised_amount: form.promised_amount ? parseFloat(form.promised_amount) : undefined,
      };

      if (form.next_followup_date && form.next_followup_date.trim() !== "") {
        payload.next_followup_date = form.next_followup_date.trim();
      } else {
        delete payload.next_followup_date;
      }

      await createFollowUp(payload);
      toast.success("Follow-up logged!");
      onSaved();
      onClose();
    } catch (_) {
      toast.error("Failed to save follow-up");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-base">{client?.name}</p>
            <p className="text-teal-100 text-xs">
              {client?.code} · {client?.area} · Agent: {client?.agent || "—"}
            </p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="bg-red-50 border-b border-red-100 px-6 py-2 flex items-center justify-between">
          <span className="text-xs text-red-600 font-semibold uppercase tracking-wide">Outstanding</span>
          <span className="text-red-700 font-bold text-sm">{fmtRupee(client?.outstanding)}</span>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Follow-Up Type *</label>
              <select
                value={form.channel}
                onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="PHONE">Call</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Email</option>
                <option value="VISIT">Visit</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Outcome *</label>
              <select
                value={form.outcome}
                onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="PROMISED">Payment Promised</option>
                <option value="PARTIAL">Partial Payment</option>
                <option value="NO_RESPONSE">No Response</option>
                <option value="DISPUTE">Dispute Raised</option>
                <option value="ESCALATED">Escalated</option>
              </select>
            </div>
          </div>

          {form.outcome === "ESCALATED" && (
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Escalated To *</label>
              <select
                value={form.escalated_to}
                onChange={e => setForm(f => ({ ...f, escalated_to: e.target.value }))}
                disabled={recipientLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="">{recipientLoading ? "Loading users..." : "Select user"}</option>
                {recipientOptions.map((user) => (
                  <option key={user.id} value={user.name}>
                    {user.name}{user.role ? ` (${user.role})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Contact Person</label>
            <input
              type="text"
              value={form.contact_person}
              onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))}
              placeholder="Name of person contacted"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Details about the follow-up call / visit..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Promised Amount (₹)</label>
              <input
                type="number"
                min="0"
                value={form.promised_amount}
                onChange={e => setForm(f => ({ ...f, promised_amount: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Next Follow-Up Date</label>
              <input
                type="date"
                value={form.next_followup_date}
                onChange={e => setForm(f => ({ ...f, next_followup_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        <div className="px-6 pb-5 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Follow-Up"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function FollowUpTrackerPage() {
  const navigate = useNavigate();

  const [clients,           setClients]           = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [tab,               setTab]               = useState("all");
  const [sortBy,            setSortBy]            = useState("outstanding");
  const [sortOrder,         setSortOrder]         = useState("desc");
  const [searchQuery,       setSearchQuery]       = useState("");
  const [selectedAgent,     setSelectedAgent]     = useState("all");
  const [selectedArea,      setSelectedArea]      = useState("all");
  const [agentOptions,      setAgentOptions]      = useState([]);
  const [areaOptions,       setAreaOptions]       = useState([]);
  const [currentPage,       setCurrentPage]       = useState(1);
  const [totalCount,        setTotalCount]        = useState(0);
  const [counts,            setCounts]            = useState({ overdue: 0, due_week: 0, all: 0 });
  const [selectedClient,    setSelectedClient]    = useState(null);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showPaymentModal,  setShowPaymentModal]  = useState(false);
  const [exporting,         setExporting]         = useState(false);

  const searchRef    = useRef(null);
  const ITEMS_PER_PAGE = 100;
  const debouncedSearch = useDebounce(searchQuery, 400);

  useEffect(() => { searchRef.current?.focus(); }, []);
  useEffect(() => { loadClients(); }, [tab, debouncedSearch, currentPage, sortBy, sortOrder, selectedAgent, selectedArea]);
  useEffect(() => { loadTabCounts(); }, [selectedAgent, selectedArea]);
  useEffect(() => { loadFilterOptions(); }, []);

  const loadFilterOptions = async () => {
    try {
      const res = await getFollowUpTracker({ filter: "all", page_size: 999999 });
      const all = res.data.results || [];
      const agents = [...new Set(all.map(c => (c.agent || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      const areas  = [...new Set(all.map(c => (c.area  || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      setAgentOptions(agents);
      setAreaOptions(areas);
    } catch (_) {}
  };

  const loadTabCounts = async () => {
    try {
      const baseParams = {};
      if (selectedAgent !== "all") baseParams.agent = selectedAgent;
      if (selectedArea !== "all") baseParams.area = selectedArea;

      const [allRes, overdueRes, weekRes] = await Promise.all([
        getFollowUpTracker({ ...baseParams, filter: "all",      page_size: 1 }),
        getFollowUpTracker({ ...baseParams, filter: "overdue",  page_size: 1 }),
        getFollowUpTracker({ ...baseParams, filter: "due_week", page_size: 1 }),
      ]);
      setCounts({
        all:      allRes.data.count      || 0,
        overdue:  overdueRes.data.count  || 0,
        due_week: weekRes.data.count     || 0,
      });
    } catch (_) {}
  };

  const loadClients = async () => {
    setLoading(true);
    try {
      const params = {
        filter:     tab,
        page:       currentPage,
        page_size:  ITEMS_PER_PAGE,
        sort_by:    sortBy,
        sort_order: sortOrder,
      };
      if (selectedAgent !== "all") params.agent = selectedAgent;
      if (selectedArea !== "all") params.area = selectedArea;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const res = await getFollowUpTracker(params);
      setClients(res.data.results || []);
      setTotalCount(res.data.count || 0);
    } catch (_) {
      toast.error("Failed to load tracker");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (col) => {
    if (sortBy === col) setSortOrder(o => (o === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortOrder("desc"); }
    setCurrentPage(1);
  };

  const exportCSV = async () => {
    setExporting(true);
    const toastId = toast.loading("Preparing export...");
    try {
      const params = { filter: tab, page_size: 999999 };
      if (selectedAgent !== "all") params.agent = selectedAgent;
      if (selectedArea !== "all") params.area = selectedArea;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const res = await getFollowUpTracker(params);
      const all = res.data.results || [];
      if (!all.length) { toast.error("No data to export", { id: toastId }); return; }
      toast.loading(`Building CSV for ${all.length} clients…`, { id: toastId });
      const headers = [
        "Code", "Name", "Agent", "Area",
        "Invoices", "Credit", "Debit", "Outstanding",
        "Oldest Due (days)", "Risk", "Next F/U",
      ];
      const rows = all.map(c => [
        c.code, c.name, c.agent || "—", c.area || "—",
        c.invoice_count || 0,
        c.debit, c.credit, c.outstanding,
        getDueDays(c.next_followup_date, c.oldest_due_days), c.risk,
        OUTCOME_LABELS[c.last_outcome] || "—",
        c.next_followup_date || "—",
      ]);
      const csv  = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `followup_tracker_${tab}_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${all.length} clients`, { id: toastId });
    } catch (_) {
      toast.error("Export failed", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const isCleared = (c) => !c.outstanding || parseFloat(c.outstanding) === 0;
  const hasActiveFilters =
    tab !== "all" ||
    selectedAgent !== "all" ||
    selectedArea !== "all" ||
    searchQuery.trim().length > 0;

  const clearFilters = () => {
    setTab("all");
    setSearchQuery("");
    setSelectedAgent("all");
    setSelectedArea("all");
    setCurrentPage(1);
  };

  // ── Sortable TH ──
  const SortTh = ({ field, children, className = "" }) => (
    <th
      onClick={() => handleSort(field)}
      className={`px-3 py-2.5 text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-white/10 select-none whitespace-nowrap transition-colors ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortBy === field
          ? <span className="opacity-90">{sortOrder === "desc" ? "↓" : "↑"}</span>
          : <span className="opacity-40">↕</span>}
      </span>
    </th>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-3">
      <div className="max-w-[1400px] mx-auto">

        {/* ── Header ── */}
        <div className="mb-3">
          <h1 className="text-xl font-bold text-gray-800">Payment Follow-Up</h1>
        </div>

        {/* ── Filter Bar ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-3">
          <div className="flex flex-col gap-3 lg:gap-4">
            <div className="flex flex-col xl:flex-row xl:items-center gap-3 xl:gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 flex-1 min-w-0">
                <div className="relative min-w-0 md:col-span-2 xl:col-span-1">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search client, code or agent..."
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
                <div className="flex items-center gap-1.5 min-w-0">
                  <select
                    value={tab}
                    onChange={e => { setTab(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white"
                  >
                    {TAB_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 min-w-0">
                  <select
                    value={selectedAgent}
                    onChange={e => { setSelectedAgent(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white"
                  >
                    <option value="all">All Agents</option>
                    {agentOptions.map(agent => (
                      <option key={agent} value={agent}>{agent}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 min-w-0">
                  <select
                    value={selectedArea}
                    onChange={e => { setSelectedArea(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white"
                  >
                    <option value="all">All Areas</option>
                    {areaOptions.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end xl:ml-auto">
                <button
                  onClick={() => { loadClients(); loadTabCounts(); toast.success("Refreshed"); }}
                  className="px-3.5 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-semibold text-xs shadow hover:from-teal-600 hover:to-cyan-700 transition-all"
                >
                  Refresh
                </button>

                <button
                  onClick={exportCSV}
                  disabled={loading || exporting}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold text-xs shadow hover:from-emerald-600 hover:to-green-700 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={12} />
                  {exporting ? "Exporting..." : `CSV (${totalCount})`}
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
            <div className="py-16 text-center text-gray-400 text-sm">Loading tracker...</div>
          ) : clients.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">No clients found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1220px] md:min-w-full divide-y divide-gray-100" style={{ tableLayout: "fixed", width: "100%" }}>
                  <colgroup><col style={{ width: "72px" }} /><col style={{ width: "200px" }} /><col style={{ width: "100px" }} /><col style={{ width: "110px" }} /><col style={{ width: "52px" }} /><col style={{ width: "110px" }} /><col style={{ width: "110px" }} /><col style={{ width: "120px" }} /><col style={{ width: "84px" }} /><col style={{ width: "60px" }} /><col style={{ width: "72px" }} /><col style={{ width: "68px" }} /></colgroup>
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider">Code</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider">Client</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider">Agent</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider">Area</th>
                      <SortTh field="invoice_count" className="text-center">Inv</SortTh>
                      <SortTh field="debit"         className="text-right" >Credit</SortTh>
                      <SortTh field="credit"        className="text-right" >Debit</SortTh>
                      <SortTh field="outstanding"   className="text-right" >Outstanding</SortTh>
                      <SortTh field="oldest_due_days" className="text-center">Oldest Due</SortTh>
                      <th className="px-3 py-2.5 text-left   text-xs font-bold text-white uppercase tracking-wider">Risk</th>
                      <th className="px-3 py-2.5 text-left   text-xs font-bold text-white uppercase tracking-wider">Next F/U</th>
                      <th className="px-3 py-2.5 text-center text-xs font-bold text-white uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {clients.map((c, index) => {
                      const cleared     = isCleared(c);
                      const outstanding = parseFloat(c.outstanding || 0);
                      const billed      = parseFloat(c.debit       || 0);
                      const paid        = parseFloat(c.credit      || 0);
                      const invCount    = c.invoice_count ?? 0;
                      const dueDays     = getDueDays(c.next_followup_date, c.oldest_due_days);
                      const isEscalated = c.last_outcome === "ESCALATED";

                      return (
                        <tr
                          key={c.code}
                          onClick={() => setSelectedClient(c)}
                          className={`hover:bg-teal-50/40 transition-colors cursor-pointer ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                          } ${selectedClient?.code === c.code ? "!bg-teal-50" : ""}`}
                        >
                          {/* Code */}
                          <td className="px-3 py-2 overflow-hidden">
                            <span className="text-[11px] font-mono text-gray-500 truncate block">{c.code}</span>
                          </td>

                          {/* Client */}
                          <td className="px-3 py-2 overflow-hidden">
                            <span
                              title={c.name}
                              className="text-xs font-medium text-gray-800 truncate block"
                            >
                              {c.name}
                            </span>
                          </td>

                          {/* Agent */}
                          <td className="px-3 py-2 overflow-hidden">
                            <TruncCell text={c.agent || "—"} maxW="max-w-full" className="text-xs text-gray-700" />
                          </td>

                          {/* Area */}
                          <td className="px-3 py-2 overflow-hidden">
                            <TruncCell text={c.area || "—"} maxW="max-w-full" className="text-xs text-gray-600" />
                          </td>

                          {/* Inv */}
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold ${
                              invCount > 0 ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-400"
                            }`}>
                              {invCount}
                            </span>
                          </td>

                          {/* Credit */}
                          <td className="px-3 py-2 text-right">
                            <span className="text-xs text-gray-700 tabular-nums">{fmtRupee(billed)}</span>
                          </td>

                          {/* Debit */}
                          <td className="px-3 py-2 text-right">
                            <span className="text-xs font-medium text-teal-600 tabular-nums">{fmtRupee(paid)}</span>
                          </td>

                          {/* Outstanding */}
                          <td className="px-3 py-2 text-right">
                            <span className={`text-xs font-semibold tabular-nums ${cleared ? "text-gray-400" : "text-red-500"}`}>
                              {fmtRupee(outstanding)}
                            </span>
                          </td>

                          {/* Oldest Due badge */}
                          <td className="px-3 py-2 text-center">
                            {cleared ? (
                              <span className="px-1.5 py-0.5 rounded-full border text-[10px] font-bold bg-teal-100 text-teal-700 border-teal-200">
                                Cleared
                              </span>
                            ) : dueDays >= 60 ? (
                              <span className="px-1.5 py-0.5 rounded-full border text-[10px] font-bold bg-red-100 text-red-700 border-red-200">
                                {dueDays}d
                              </span>
                            ) : dueDays >= 30 ? (
                              <span className="px-1.5 py-0.5 rounded-full border text-[10px] font-bold bg-amber-100 text-amber-700 border-amber-200">
                                {dueDays}d
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-full border text-[10px] font-bold bg-yellow-100 text-yellow-700 border-yellow-200">
                                {dueDays ?? "—"}d
                              </span>
                            )}
                          </td>

                          {/* Risk */}
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${RISK_COLORS[c.risk] || RISK_COLORS.None}`}>
                              {c.risk || "None"}
                            </span>
                          </td>

                          {/* Next F/U */}
                          <td className="px-3 py-2">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-gray-600">
                                {c.next_followup_date
                                  ? new Date(c.next_followup_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                                  : <span className="text-gray-300">—</span>}
                              </span>
                              {isEscalated && (
                                <span
                                  title={c.last_escalated_to ? `Escalated to ${c.last_escalated_to}` : "Escalated"}
                                  className="inline-flex items-center self-start max-w-full px-1.5 py-0.5 rounded-full border text-[10px] font-bold bg-orange-100 text-orange-700 border-orange-200 truncate"
                                >
                                  Escalated{c.last_escalated_to ? `: ${c.last_escalated_to}` : ""}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td
                            className="px-3 py-2 text-center"
                            onClick={e => e.stopPropagation()}
                          >
                            {cleared ? (
                              <button
                                onClick={() => setSelectedClient(c)}
                                className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md font-semibold text-xs hover:bg-gray-200 transition-all inline-flex items-center gap-1"
                              >
                                <Eye size={11} />
                                View
                              </button>
                            ) : (
                              <button
                                onClick={() => { setSelectedClient(c); setShowFollowUpModal(true); }}
                                className="px-2.5 py-1 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-md font-semibold text-xs shadow hover:from-teal-600 hover:to-cyan-700 transition-all"
                              >
                                Log
                              </button>
                            )}
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
                label="clients"
                colorScheme="teal"
              />
            </>
          )}
        </div>
      </div>

      {/* ── Client detail panel ── */}
      {selectedClient && !showFollowUpModal && !showPaymentModal && (
        <ClientDetailPanel
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onLogFollowUp={() => setShowFollowUpModal(true)}
          onRecordPayment={() => setShowPaymentModal(true)}
          onRefresh={() => { loadClients(); loadTabCounts(); }}
        />
      )}

      {/* ── Log Follow-Up modal ── */}
      {showFollowUpModal && (
        <LogModal
          client={selectedClient}
          onClose={() => setShowFollowUpModal(false)}
          onSaved={() => {
            loadClients();
            loadTabCounts();
            setShowFollowUpModal(false);
            setSelectedClient(null);
          }}
        />
      )}
    </div>
  );
}