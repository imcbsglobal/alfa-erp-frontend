import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getFollowUpMaster, getAccMasterAgents, getServiceMasterAreas } from "../../../services/followup";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import { X, Search, Download, Phone, Mail, MapPin } from "lucide-react";
import ClientDetailPanel from "../components/ClientDetailPanel";
import LogFollowUpModal from "../components/LogFollowUpModal";

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
  VISIT:       "Visit",
};

function fmtRupee(val) {
  const n = parseFloat(val || 0);
  if (n === 0) return "₹0";
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function TruncCell({ text, maxW = "max-w-[140px]", className = "" }) {
  if (!text || text === "—") return <span className="text-gray-300">—</span>;
  return (
    <span title={text} className={`block truncate ${maxW} ${className}`}>
      {text}
    </span>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function FollowUpMasterPage() {
  const navigate = useNavigate();

  const [clients,           setClients]           = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [sortBy,            setSortBy]            = useState("outstanding");
  const [sortOrder,         setSortOrder]         = useState("desc");
  const [searchQuery,       setSearchQuery]       = useState("");
  const [selectedAgent,     setSelectedAgent]     = useState("all");
  const [selectedArea,      setSelectedArea]      = useState("all");
  const [agentOptions,      setAgentOptions]      = useState([]);
  const [areaOptions,       setAreaOptions]       = useState([]);
  const [currentPage,       setCurrentPage]       = useState(1);
  const [totalCount,        setTotalCount]        = useState(0);
  const [selectedClient,    setSelectedClient]    = useState(null);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [exporting,         setExporting]         = useState(false);

  const searchRef      = useRef(null);
  const ITEMS_PER_PAGE = 50;
  const debouncedSearch = useDebounce(searchQuery, 400);

  useEffect(() => { searchRef.current?.focus(); }, []);
  useEffect(() => { loadClients(); }, [debouncedSearch, currentPage, sortBy, sortOrder, selectedAgent, selectedArea]);
  useEffect(() => { loadFilterOptions(); }, []);

  const loadFilterOptions = async () => {
    try {
      const [agentsData, areasData] = await Promise.all([
        getAccMasterAgents(),
        getServiceMasterAreas(),
      ]);
      const agents = [...new Set(agentsData)].sort((a, b) => a.localeCompare(b));
      const areas = [...new Set(areasData)].sort((a, b) => a.localeCompare(b));
      setAgentOptions(agents);
      setAreaOptions(areas);
    } catch (_) {
      toast.error("Failed to load filter options");
    }
  };

  const loadClients = async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, page_size: ITEMS_PER_PAGE, sort_by: sortBy, sort_order: sortOrder };
      if (selectedAgent !== "all") params.agent  = selectedAgent;
      if (selectedArea  !== "all") params.area   = selectedArea;
      if (debouncedSearch.trim())  params.search = debouncedSearch.trim();
      const res = await getFollowUpMaster(params);
      setClients(res.data.results || []);
      setTotalCount(res.data.count || 0);
    } catch (_) {
      toast.error("Failed to load master data");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    setExporting(true);
    const toastId = toast.loading("Preparing export...");
    try {
      const params = { page_size: 999999 };
      if (selectedAgent !== "all") params.agent  = selectedAgent;
      if (selectedArea  !== "all") params.area   = selectedArea;
      if (debouncedSearch.trim())  params.search = debouncedSearch.trim();
      const res = await getFollowUpMaster(params);
      const all = res.data.results || [];
      if (!all.length) { toast.error("No data to export", { id: toastId }); return; }
      toast.loading(`Building CSV for ${all.length} clients…`, { id: toastId });
      const headers = ["Code", "Name", "Agent", "Area", "Address", "Phone", "Credit", "Debit", "Outstanding"];
      const rows = all.map(c => [
        c.code, c.name, c.agent || "—", c.area || "—", c.address || "—", c.phone || "—", c.email || "—",
        c.debit, c.credit, c.outstanding,
      ]);
      const csv  = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `followup_master_${new Date().toISOString().split("T")[0]}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast.success(`Exported ${all.length} clients`, { id: toastId });
    } catch (_) {
      toast.error("Export failed", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const handleSort = (col) => {
    if (sortBy === col) setSortOrder(o => (o === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortOrder("desc"); }
    setCurrentPage(1);
  };

  const isCleared = (c) => !c.outstanding || parseFloat(c.outstanding) === 0;
  const hasActiveFilters = selectedAgent !== "all" || selectedArea !== "all" || searchQuery.trim().length > 0;
  const clearFilters = () => { setSearchQuery(""); setSelectedAgent("all"); setSelectedArea("all"); setCurrentPage(1); };

  const SortTh = ({ field, children, className = "" }) => (
    <th onClick={() => handleSort(field)}
      className={`px-3 py-2.5 text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:bg-white/10 select-none whitespace-nowrap transition-colors ${className}`}>
      <span className="inline-flex items-center gap-1">
        {children}
        {sortBy === field ? <span className="opacity-90">{sortOrder === "desc" ? "↓" : "↑"}</span> : <span className="opacity-40">↕</span>}
      </span>
    </th>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-3">
      <div className="max-w-[1600px] mx-auto">

        <div className="mb-3">
          <h1 className="text-xl font-bold text-gray-800">Follow-Up Master</h1>
          <p className="text-xs text-gray-500 mt-0.5">Complete client details with address and contact information</p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-3">
          <div className="flex flex-col gap-3 lg:gap-4">
            <div className="flex flex-col xl:flex-row xl:items-center gap-3 xl:gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 flex-1 min-w-0">
                <div className="relative min-w-0 md:col-span-2 xl:col-span-1">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input ref={searchRef} type="text" placeholder="Search client, code or agent..."
                    value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-8 pr-8 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs" />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(""); setCurrentPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <select value={selectedAgent} onChange={e => { setSelectedAgent(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white">
                    <option value="all">All Agents</option>
                    {agentOptions.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <select value={selectedArea} onChange={e => { setSelectedArea(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white">
                    <option value="all">All Areas</option>
                    {areaOptions.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 xl:justify-end xl:ml-auto">
                <button onClick={() => { loadClients(); toast.success("Refreshed"); }}
                  className="px-3.5 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-semibold text-xs shadow hover:from-teal-600 hover:to-cyan-700 transition-all">
                  Refresh
                </button>
                <button onClick={exportCSV} disabled={loading || exporting}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold text-xs shadow hover:from-emerald-600 hover:to-green-700 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Download size={12} />
                  {exporting ? "Exporting..." : `CSV (${totalCount})`}
                </button>
                <button onClick={clearFilters} disabled={!hasActiveFilters}
                  className="px-3.5 py-2 bg-white border border-gray-300 text-gray-600 rounded-xl font-semibold text-xs hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  Reset Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Loading master data...</div>
          ) : clients.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">No clients found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1200px] md:min-w-full divide-y divide-gray-100" style={{ tableLayout: "fixed", width: "100%" }}>
                  <colgroup>
                    <col style={{ width: "72px" }} />
                    <col style={{ width: "200px" }} />
                    <col style={{ width: "100px" }} />
                    <col style={{ width: "110px" }} />
                    <col style={{ width: "240px" }} />
                    <col style={{ width: "120px" }} />
                    <col style={{ width: "110px" }} />
                    <col style={{ width: "110px" }} />
                    <col style={{ width: "120px" }} />
                  </colgroup>
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider">Code</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider">Client</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider">Agent</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider">Area</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider">Address</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider">Phone</th>
                      <SortTh field="debit" className="text-right">Credit</SortTh>
                      <SortTh field="credit" className="text-right">Debit</SortTh>
                      <SortTh field="outstanding" className="text-right">Outstanding</SortTh>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {clients.map((c, index) => {
                      const cleared     = isCleared(c);
                      const outstanding = parseFloat(c.outstanding || 0);
                      const billed      = parseFloat(c.debit       || 0);
                      const paid        = parseFloat(c.credit      || 0);
                      return (
                        <tr key={c.code} onClick={() => setSelectedClient(c)}
                          className={`hover:bg-teal-50/40 transition-colors cursor-pointer ${index % 2 === 0 ? "bg-white" : "bg-gray-50/60"} ${selectedClient?.code === c.code ? "!bg-teal-50" : ""}`}>
                          <td className="px-3 py-2 overflow-hidden"><span className="text-[11px] font-mono text-gray-500 truncate block">{c.code}</span></td>
                          <td className="px-3 py-2 overflow-hidden"><span title={c.name} className="text-xs font-medium text-gray-800 truncate block">{c.name}</span></td>
                          <td className="px-3 py-2 overflow-hidden"><TruncCell text={c.agent || "—"} maxW="max-w-full" className="text-xs text-gray-700" /></td>
                          <td className="px-3 py-2 overflow-hidden"><TruncCell text={c.area  || "—"} maxW="max-w-full" className="text-xs text-gray-600" /></td>
                          <td className="px-3 py-2 overflow-hidden">
                            <div className="flex items-start gap-1.5">
                              <MapPin size={11} className="text-gray-400 flex-shrink-0 mt-0.5" />
                              <TruncCell text={c.address || "—"} maxW="max-w-full" className="text-xs text-gray-600" />
                            </div>
                          </td>
                          <td className="px-3 py-2 overflow-hidden">
                            {c.phone ? (
                              <div className="flex items-center gap-1.5">
                                <Phone size={10} className="text-gray-400 flex-shrink-0" />
                                <span className="text-xs text-gray-700 truncate block">{c.phone}</span>
                              </div>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right"><span className="text-xs text-gray-700 tabular-nums">{fmtRupee(billed)}</span></td>
                          <td className="px-3 py-2 text-right"><span className="text-xs font-medium text-teal-600 tabular-nums">{fmtRupee(paid)}</span></td>
                          <td className="px-3 py-2 text-right"><span className={`text-xs font-semibold tabular-nums ${cleared ? "text-gray-400" : "text-red-500"}`}>{fmtRupee(outstanding)}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination currentPage={currentPage} totalItems={totalCount} itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={p => setCurrentPage(p)} label="clients" colorScheme="teal" />
            </>
          )}
        </div>
      </div>

      {/* Client detail panel */}
      {selectedClient && !showFollowUpModal && (
        <ClientDetailPanel client={selectedClient} onClose={() => setSelectedClient(null)}
          onLogFollowUp={() => setShowFollowUpModal(true)}
          onRefresh={() => { loadClients(); }} />
      )}

      {/* Log Follow-Up modal */}
      <LogFollowUpModal
        isOpen={showFollowUpModal}
        client={selectedClient}
        onClose={() => {
          setShowFollowUpModal(false);
          setSelectedClient(null);
        }}
        onSaved={() => {
          loadClients();
          setShowFollowUpModal(false);
          setSelectedClient(null);
        }}
      />
    </div>
  );
}
