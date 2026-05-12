import { useState, useEffect, useRef } from "react";
import { getFollowUpReport, getFollowUpLogs } from "../../../services/followup";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import { formatNumber, formatDateTime } from "../../../utils/formatters";
import { X, Search, Download, Eye } from "lucide-react";
import ClearFiltersButton from '../../../components/ClearFiltersButton';
function useDebounce(value, delay) {
  const [dv, setDv] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDv(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return dv;
}

const OUTCOME_OPTIONS = [
  { value: "",            label: "All Outcomes"       },
  { value: "PROMISED",    label: "Payment Promised"   },
  { value: "PARTIAL",     label: "Partial Collection" },
  { value: "PAID",        label: "Fully Collected"    },
  { value: "NO_RESPONSE", label: "No Response"        },
  { value: "DISPUTE",     label: "Dispute Raised"     },
  { value: "ESCALATED",   label: "Escalated"          },
  { value: "VISIT",       label: "Visit Logged"       },
];

const OUTCOME_BADGE = {
  PROMISED:    "bg-blue-100 text-blue-700 border-blue-200",
  PARTIAL:     "bg-yellow-100 text-yellow-700 border-yellow-200",
  NO_RESPONSE: "bg-gray-100 text-gray-600 border-gray-200",
  DISPUTE:     "bg-red-100 text-red-700 border-red-200",
  ESCALATED:   "bg-orange-100 text-orange-700 border-orange-200",
  PAID:        "bg-green-100 text-green-700 border-green-200",
  VISIT:       "bg-teal-100 text-teal-700 border-teal-200",
};

const OUTCOME_LABELS = {
  PROMISED:    "Promised",
  PARTIAL:     "Partial",
  NO_RESPONSE: "No Response",
  DISPUTE:     "Dispute",
  ESCALATED:   "Escalated",
  PAID:        "Collected",
  VISIT:       "Visit",
};

const CHANNEL_LABELS = {
  PHONE: "Call",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  VISIT: "Visit",
};

// ── Truncated cell ───────────────────────────────────────────
function TruncCell({ text, maxW = "max-w-full", className = "" }) {
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

function NoteModal({ note, clientName, onClose }) {
  if (!note) return null;

  // ── Parse bill split-up if present (VISIT or COLLECTION log) ────
  const isVisitLog       = note.text && note.text.includes("VISIT - BILL SPLIT-UP:");
  const isCollectionLog  = note.text && note.text.includes("COLLECTION - BILL SPLIT-UP:");
  const isBillLog        = isVisitLog || isCollectionLog;
  const billSplitHeader  = isCollectionLog ? "COLLECTION - BILL SPLIT-UP:" : "VISIT - BILL SPLIT-UP:";

  let billDetails = [];
  let regularNotes = note.text || "";
  let promisedAmountFromText = null;
  let totalCollected = null;
  let totalRemaining = null;

  if (isBillLog) {
    const lines = note.text.split("\n");
    const billStartIdx = lines.findIndex(l => l.includes(billSplitHeader));

    if (billStartIdx !== -1) {
      const billLines = [];
      for (let i = billStartIdx + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        if (line.startsWith("Promised Amount:")) {
          const match = line.match(/₹([\d,]+(?:\.\d{2})?)/);
          if (match) promisedAmountFromText = match[1];
          continue;
        }
        if (line.startsWith("Total Collected:")) {
          const match = line.match(/₹([\d,]+(?:\.\d{2})?)/);
          if (match) totalCollected = match[1];
          continue;
        }
        if (line.startsWith("Total Amount:") || line.startsWith("Remaining:")) {
          const match = line.match(/₹([\d,]+(?:\.\d{2})?)/);
          if (match && line.startsWith("Remaining:")) totalRemaining = match[1];
          continue;
        }
        if (line.startsWith("Invoice:")) billLines.push(line);
      }

      // Parse visit bill lines (VISIT format)
      if (isVisitLog) {
        billDetails = billLines.map(line => {
          const invoice     = (line.match(/Invoice:\s*(\S+)/) || [])[1] || "";
          const date        = (line.match(/Date:\s*(\d{2}-\d{2}-\d{4})/) || [])[1] || "";
          const amount      = (line.match(/Amount:\s*₹([\d,]+(?:\.\d{2})?)/) || [])[1] || "";
          const paymentDate = (line.match(/Payment Date:\s*(\d{2}-\d{2}-\d{4})/) || [])[1] || "";
          const remarks     = (line.match(/Remarks:\s*([^|]+)/) || [])[1]?.trim() || "";
          return { invoice, date, amount, paymentDate, remarks, collected: null, nextDate: null };
        });
      }

      // Parse collection bill lines (COLLECTION format — includes Collected / Remaining / Next Collection)
      if (isCollectionLog) {
        billDetails = billLines.map(line => {
          const invoice   = (line.match(/Invoice:\s*(\S+)/) || [])[1] || "";
          const date      = (line.match(/Date:\s*(\d{2}-\d{2}-\d{4})/) || [])[1] || "";
          const amount    = (line.match(/Amount:\s*₹([\d,]+(?:\.\d{2})?)/) || [])[1] || "";
          const collected = (line.match(/Collected:\s*₹([\d,]+(?:\.\d{2})?)/) || [])[1] || null;
          const remaining = (line.match(/Remaining:\s*₹([\d,]+(?:\.\d{2})?)/) || [])[1] || null;
          const nextDate  = (line.match(/Next Collection:\s*([\d-]+)/) || [])[1] || null;
          const remarks   = (line.match(/Remarks:\s*([^|]+)/) || [])[1]?.trim() || "";
          return { invoice, date, amount, collected, remaining, nextDate, remarks };
        });
      }

      regularNotes = "";
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-base">Follow-Up Notes</p>
            <p className="text-teal-100 text-xs">{clientName}</p>
            {note && note.createdByName && (
              <p className="text-teal-200 text-[10px] mt-1">Assigned to: <span className="font-semibold">{note.createdByName}</span></p>
            )}
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Bill Split-Up Table */}
          {isBillLog && billDetails.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                  {isCollectionLog ? "Collection Details" : "Bill Split-Up Details"}
                </h3>
                {isCollectionLog && totalCollected && (
                  <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                    Collected: ₹{totalCollected}
                  </span>
                )}
              </div>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-teal-50">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-700 border-b border-gray-200">Invoice</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-700 border-b border-gray-200">Date</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-gray-700 border-b border-gray-200">Amount</th>
                      {isCollectionLog ? (
                        <>
                          <th className="px-3 py-2.5 text-right font-semibold text-green-700 border-b border-gray-200">Collected</th>
                          <th className="px-3 py-2.5 text-right font-semibold text-orange-700 border-b border-gray-200">Remaining</th>
                          <th className="px-3 py-2.5 text-left font-semibold text-gray-700 border-b border-gray-200">Next Date</th>
                        </>
                      ) : (
                        <th className="px-3 py-2.5 text-left font-semibold text-gray-700 border-b border-gray-200">Payment Date</th>
                      )}
                      {billDetails.some(b => b.remarks) && (
                        <th className="px-3 py-2.5 text-left font-semibold text-gray-700 border-b border-gray-200">Remarks</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {billDetails.map((bill, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-3 py-2.5 font-mono text-gray-700">{bill.invoice}</td>
                        <td className="px-3 py-2.5 text-gray-600">{bill.date || "—"}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-gray-700 tabular-nums">₹{bill.amount}</td>
                        {isCollectionLog ? (
                          <>
                            <td className="px-3 py-2.5 text-right font-bold text-green-600 tabular-nums">
                              {bill.collected ? `₹${bill.collected}` : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-orange-600 tabular-nums">
                              {bill.remaining ? `₹${bill.remaining}` : <span className="text-green-500 text-[10px] font-bold">Fully Paid</span>}
                            </td>
                            <td className="px-3 py-2.5 text-gray-600 text-[10px]">{bill.nextDate || "—"}</td>
                          </>
                        ) : (
                          <td className="px-3 py-2.5 text-gray-600">{bill.paymentDate || "—"}</td>
                        )}
                        {billDetails.some(b => b.remarks) && (
                          <td className="px-3 py-2.5 text-gray-600 text-[10px]">{bill.remarks || "—"}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Collection summary footer */}
              {isCollectionLog && (totalCollected || totalRemaining) && (
                <div className="flex gap-3 mt-1">
                  {totalCollected && (
                    <div className="flex-1 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">
                      <p className="text-[10px] text-gray-500">Total Collected</p>
                      <p className="text-sm font-bold text-green-600">₹{totalCollected}</p>
                    </div>
                  )}
                  {totalRemaining && (
                    <div className="flex-1 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-center">
                      <p className="text-[10px] text-gray-500">Remaining</p>
                      <p className="text-sm font-bold text-orange-600">₹{totalRemaining}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Regular Notes */}
          {regularNotes && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-wrap break-words">
              {regularNotes}
            </div>
          )}

          {/* Promised Amount & Next Follow-Up */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {(promisedAmountFromText || note.promisedAmount != null) && (
              <div className="rounded-xl border border-teal-100 bg-teal-50 p-3">
                <p className="text-gray-400 font-mono">Promised Amount</p>
                <p className="text-teal-600 font-semibold mt-0.5">
                  ₹{promisedAmountFromText || (note.promisedAmount ? parseFloat(note.promisedAmount).toLocaleString("en-IN", { maximumFractionDigits: 0 }) : "0")}
                </p>
              </div>
            )}
            {note.nextFollowUp && (
              <div className="rounded-xl border border-gray-200 bg-white p-3">
                <p className="text-gray-400 font-mono">Next Follow-Up</p>
                <p className="text-gray-700 font-semibold mt-0.5">{note.nextFollowUp}</p>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 pb-5 flex justify-end border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-all mt-4"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function FollowUpReportPage() {
  const today = new Date().toISOString().split("T")[0];

  const [summary,       setSummary]       = useState(null);
  const [logs,          setLogs]          = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [logsLoading,   setLogsLoading]   = useState(true);
  const [dateFilter,    setDateFilter]    = useState(today);
  const [outcomeFilter, setOutcomeFilter] = useState("");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [currentPage,   setCurrentPage]   = useState(1);
  const [totalCount,    setTotalCount]    = useState(0);
  const [exporting,     setExporting]     = useState(false);
  const [selectedNote,  setSelectedNote]  = useState(null);

  const searchRef      = useRef(null);
  const ITEMS_PER_PAGE = 100;
  const debouncedSearch = useDebounce(searchQuery, 350);

  useEffect(() => { searchRef.current?.focus(); }, []);
  useEffect(() => { loadSummary(); }, [dateFilter, outcomeFilter, debouncedSearch]);
  useEffect(() => { loadLogs(); }, [dateFilter, outcomeFilter, debouncedSearch, currentPage]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const params = { start_date: dateFilter, end_date: dateFilter };
      if (outcomeFilter)          params.outcome = outcomeFilter;
      if (debouncedSearch.trim()) params.search  = debouncedSearch.trim();
      const res = await getFollowUpReport(params);
      setSummary(res.data);
    } catch { toast.error("Failed to load report summary"); }
    finally   { setLoading(false); }
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const params = {
        page:       currentPage,
        page_size:  ITEMS_PER_PAGE,
        start_date: dateFilter,
        end_date:   dateFilter,
      };
      if (outcomeFilter)          params.outcome = outcomeFilter;
      if (debouncedSearch.trim()) params.search  = debouncedSearch.trim();
      const res = await getFollowUpLogs(params);
      setLogs(res.data.results || res.data);
      setTotalCount(res.data.count || (res.data.results || res.data).length);
    } catch { toast.error("Failed to load logs"); }
    finally   { setLogsLoading(false); }
  };

  const exportExcel = async () => {
    setExporting(true);
    const toastId = toast.loading("Preparing export…");
    try {
      const XLSX   = await import("xlsx");
      const params = { page_size: 10000, start_date: dateFilter, end_date: dateFilter };
      if (outcomeFilter)          params.outcome = outcomeFilter;
      if (debouncedSearch.trim()) params.search  = debouncedSearch.trim();

      const res = await getFollowUpLogs(params);
      const all = res.data.results || res.data;

      const rows = all.map(log => ({
        "Date":             formatDateTime(log.created_at),
        "Client Code":      log.client_code,
        "Client Name":      log.client_name,
        "Agent":            log.agent  || "",
        "Area":             log.area_display || log.area || "",
        "Follow-Up Type":   CHANNEL_LABELS[log.channel] || log.channel || "",
        "Outstanding (₹)":  log.outstanding_amount || "",
        "Collected (₹)":    log.collected_amount || "",
        "Outcome":          OUTCOME_LABELS[log.outcome] || log.outcome,
        "Notes":            log.notes  || "",
        "Next Follow-Up":   log.next_followup_date || "",
        "Logged By":        log.created_by_name    || "",
        "Assigned To":      log.assigned_to_name   || "",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 20 }, { wch: 12 }, { wch: 28 }, { wch: 10 }, { wch: 12 },
        { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 40 }, { wch: 14 }, { wch: 18 }, { wch: 18 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Follow-Up Report");
      XLSX.writeFile(wb, `FollowUp_Report_${dateFilter}.xlsx`);
      toast.success(`Exported ${all.length} records`, { id: toastId });
    } catch {
      toast.error("Export failed", { id: toastId });
    } finally { setExporting(false); }
  };

  const totalFU   = summary?.total_followups || 0;
  const byOutcome = summary?.by_outcome      || {};

  const hasActiveFilters =
    outcomeFilter ||
    searchQuery.trim().length > 0;

  const activeFilterCount = [
    outcomeFilter !== '',
    !!searchQuery,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setOutcomeFilter("");
    setSearchQuery("");
    setCurrentPage(1);
    toast.success('Filters cleared');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-3">
      <div className="max-w-[1400px] mx-auto">
        <NoteModal
          note={selectedNote}
          clientName={selectedNote?.clientName}
          onClose={() => setSelectedNote(null)}
        />

        {/* ── Header ── */}
        <div className="mb-3">
          <h1 className="text-xl font-bold text-gray-800">Follow-Up Reports</h1>
        </div>

        {/* ── Summary Cards ── */}
        {!loading && summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
            {[
              {
                label: "Total Follow-Ups",
                value: totalFU,
                sub:   dateFilter,
                color: "bg-teal-50 border-teal-200 text-teal-800",
              },
              {
                label: "Promises Received",
                value: byOutcome.PROMISED    || 0,
                sub:   "awaiting payment",
                color: "bg-blue-50 border-blue-200 text-blue-800",
              },
              {
                label: "Partial Collections",
                value: byOutcome.PARTIAL     || 0,
                sub:   "balance pending",
                color: "bg-yellow-50 border-yellow-200 text-yellow-800",
              },
              {
                label: "Fully Collected",
                value: byOutcome.PAID        || 0,
                sub:   "fully settled",
                color: "bg-green-50 border-green-200 text-green-800",
              },
              {
                label: "No Response",
                value: byOutcome.NO_RESPONSE || 0,
                sub:   "needs retry",
                color: "bg-gray-50 border-gray-200 text-gray-700",
              },
            ].map(card => (
              <div key={card.label} className={`rounded-xl border p-3 ${card.color}`}>
                <p className="text-[10px] font-semibold opacity-70 mb-1 uppercase tracking-wide">
                  {card.label}
                </p>
                <p className="text-2xl font-bold">{card.value}</p>
                {card.sub && <p className="text-[10px] opacity-60 mt-0.5">{card.sub}</p>}
              </div>
            ))}
          </div>
        )}

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
                    placeholder="Search client, code or notes…"
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

                {/* Date */}
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-semibold text-gray-600 whitespace-nowrap flex-shrink-0">Date:</label>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={e => { setDateFilter(e.target.value); setCurrentPage(1); }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                  />
                </div>

                {/* Outcome */}
                <select
                  value={outcomeFilter}
                  onChange={e => { setOutcomeFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white"
                >
                  {OUTCOME_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>

                {/* Spacer slot — keeps grid symmetry on xl */}
                <div className="hidden xl:block" />
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end xl:ml-auto">
                <ClearFiltersButton onClear={clearFilters} activeCount={activeFilterCount} />

                <button
                  onClick={() => { loadSummary(); loadLogs(); toast.success("Report generated"); }}
                  className="px-3.5 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-semibold text-xs shadow hover:from-teal-600 hover:to-cyan-700 transition-all"
                >
                  Generate
                </button>

                <button
                  onClick={exportExcel}
                  disabled={logsLoading || exporting}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold text-xs shadow hover:from-emerald-600 hover:to-green-700 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={12} />
                  {exporting ? "Exporting…" : `Excel (${totalCount})`}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {logsLoading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Loading logs…</div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              No follow-up logs found for the selected range
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table
                  className="min-w-[1080px] md:min-w-full divide-y divide-gray-100"
                  style={{ tableLayout: "fixed", width: "100%" }}
                >
                  <colgroup>
                    <col style={{ width: "80px" }} />
                    <col style={{ width: "250px" }} />
                    <col style={{ width: "80px"  }} />
                    <col style={{ width: "80px"  }} />
                    <col style={{ width: "90px"  }} />
                    <col style={{ width: "80px" }} />
                    <col style={{ width: "80px" }} />
                    <col style={{ width: "80px"  }} />
                    <col style={{ width: "80px" }} />
                    <col style={{ width: "100px"  }} />
                  </colgroup>
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                    <tr>
                      {[
                        "Date & Time", "Client", "Agent", "Area", "F/U Type","Outcome",
                         "Collected",  "Notes", "Next F/U", "Logged By",
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
                    {logs.map((log, idx) => (
                      <tr
                        key={log.id}
                        className={`hover:bg-teal-50/40 transition-colors ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"
                        }`}
                      >
                        {/* Date */}
                        <td className="px-3 py-2 overflow-hidden">
                          <span className="text-[11px] text-gray-500 truncate block">
                            {formatDateTime(log.created_at)}
                          </span>
                        </td>

                        {/* Client */}
                        <td className="px-3 py-2 overflow-hidden">
                          <span
                            title={log.client_name}
                            className="text-xs font-medium text-gray-800 truncate block"
                          >
                            {log.client_name}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono truncate block">
                            {log.client_code}
                          </span>
                        </td>

                        {/* Agent */}
                        <td className="px-3 py-2 overflow-hidden">
                          <TruncCell text={log.agent || "—"} className="text-xs text-gray-700" />
                        </td>

                        {/* Area */}
                        <td className="px-3 py-2 overflow-hidden">
                          <TruncCell text={log.area_display || log.area || "—"} className="text-xs text-gray-600" />
                        </td>

                        {/* Follow-Up Type */}
                        <td className="px-3 py-2 overflow-hidden">
                          <div className="space-y-0.5">
                            <TruncCell text={CHANNEL_LABELS[log.channel] || log.channel || "—"} className="text-xs text-gray-700" />
                            {log.assigned_to_name && (
                              <p className="text-[10px] font-semibold text-teal-600 truncate">
                                {log.assigned_to_name}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Outcome */}
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${
                            OUTCOME_BADGE[log.outcome] || "bg-gray-100 text-gray-600 border-gray-200"
                          }`}>
                            {OUTCOME_LABELS[log.outcome] || log.outcome || "—"}
                          </span>
                        </td>

                        {/* Collected */}
                        <td className="px-3 py-2 text-right">
                          <span className={`text-xs font-semibold tabular-nums ${
                            log.collected_amount ? "text-green-600" : "text-gray-400"
                          }`}>
                            {log.collected_amount ? fmtRupee(log.collected_amount) : "—"}
                          </span>
                        </td>

                        {/* Notes */}
                        <td className="px-3 py-2 overflow-hidden text-center">
                          {log.notes || log.promised_amount != null || log.next_followup_date ? (
                            <button
                              type="button"
                              onClick={() => setSelectedNote({
                                text: log.notes,
                                promisedAmount: log.promised_amount,
                                nextFollowUp: log.next_followup_date
                                  ? new Date(log.next_followup_date).toLocaleDateString("en-IN", {
                                      day: "2-digit", month: "short", year: "numeric",
                                    })
                                  : null,
                                clientName: log.client_name,
                                createdByName: log.assigned_to_name,
                              })}
                              title="View notes"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-teal-200 bg-teal-50 text-teal-600 hover:bg-teal-100 hover:text-teal-700 transition-all"
                            >
                              <Eye size={14} />
                            </button>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>

                        {/* Next F/U */}
                        <td className="px-3 py-2">
                          <span className="text-xs text-gray-600">
                            {log.next_followup_date
                              ? new Date(log.next_followup_date).toLocaleDateString("en-IN", {
                                  day: "2-digit", month: "short",
                                })
                              : <span className="text-gray-300">—</span>}
                          </span>
                        </td>

                        {/* Logged By */}
                        <td className="px-3 py-2 overflow-hidden">
                          <TruncCell
                            text={log.created_by_name || "—"}
                            className="text-xs text-gray-600"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={currentPage}
                totalItems={totalCount}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={p => setCurrentPage(p)}
                label="logs"
                colorScheme="teal"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}