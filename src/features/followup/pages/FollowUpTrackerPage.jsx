import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getFollowUpTracker, createFollowUp, getEscalationRecipients, createVisitLog, getAccMasterAgents, getServiceMasterAreas } from "../../../services/followup";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import { X, Search, Download, Eye, Trash2, Plus } from "lucide-react";
import ClientDetailPanel from "../components/ClientDetailPanel";
import LogFollowUpModal from "../components/LogFollowUpModal";
import { utils, writeFile } from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

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
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function TruncCell({ text, maxW = "max-w-[140px]", className = "" }) {
  if (!text || text === "—") return <span className="text-gray-300">—</span>;
  return (
    <span title={text} className={`block truncate ${maxW} ${className}`}>
      {text}
    </span>
  );
}

// ── Visit Log Sub-Modal ──────────────────────────────────────
function newRow() {
  return {
    _id:          Math.random().toString(36).slice(2),
    invoice_no:   "",
    invoice_date: "",
    remarks:      "",
    amount:       "",
    payment_date: "",
  };
}

function VisitLogModal({ client, onClose }) {
  const [rows,          setRows]          = useState([newRow()]);
  const [promised,      setPromised]      = useState("");
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");

  const updateRow = (id, field, value) => {
    setError("");
    setRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r));
  };
  const addRow    = () => setRows(prev => [...prev, newRow()]);
  const removeRow = (id) => { if (rows.length > 1) setRows(prev => prev.filter(r => r._id !== id)); };
  const total     = rows.reduce((s, r) => s + parseFloat(r.amount || 0), 0);

  const handleSave = async () => {
    setError("");
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i].invoice_no.trim())               { setError(`Row ${i + 1}: Invoice No. is required.`); return; }
      if (!rows[i].amount || parseFloat(rows[i].amount) <= 0) { setError(`Row ${i + 1}: Amount must be > 0.`); return; }
      if (!rows[i].payment_date)                    { setError(`Row ${i + 1}: Payment Collection Date is required.`); return; }
    }
    setSaving(true);
    try {
      await createVisitLog({
        client_code:     client.code,
        client_name:     client.name,
        promised_amount: promised ? parseFloat(promised) : null,
        bill_details:    rows.map(({ invoice_no, invoice_date, remarks, amount, payment_date }) => ({
          invoice_no,
          invoice_date:  invoice_date  || null,
          remarks:       remarks       || "",
          amount:        parseFloat(amount),
          payment_date:  payment_date  || null,
        })),
      });
      toast.success("Visit log saved!");
      onClose();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-white font-bold text-base">Visit Log — Bill Split-up</p>
            <p className="text-blue-100 text-xs">{client.name} · {client.code}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X size={20} /></button>
        </div>

        {/* Client strip */}
        <div className="bg-blue-50 border-b border-blue-100 px-6 py-3 flex flex-wrap gap-6 items-center flex-shrink-0">
          {client.agent && <><span className="text-xs text-gray-500 font-medium">Agent</span><span className="text-xs font-bold text-gray-800">{client.agent}</span></>}
          {client.area  && <><span className="text-xs text-gray-500 font-medium">Area</span><span className="text-xs font-bold text-gray-800">{client.area}</span></>}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-red-600 font-semibold uppercase tracking-wide">Outstanding</span>
            <span className="text-xs font-bold text-red-700 tabular-nums">{fmtRupee(client.outstanding)}</span>
          </div>
        </div>

        {/* Promised amount */}
        <div className="px-6 pt-4 pb-3 border-b border-gray-100 flex-shrink-0 flex items-center gap-4">
          <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">Promised Amount by Client (₹)</label>
          <input
            type="number" min="0"
            value={promised}
            onChange={e => setPromised(e.target.value)}
            placeholder="Enter promised amount"
            disabled={saving}
            className="w-52 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Bill table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Bill Details <span className="text-xs font-normal text-gray-400">(manual entry)</span>
            </h3>
            <button
              type="button" onClick={addRow} disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-semibold hover:bg-indigo-100 transition-all"
            >
              <Plus size={13} /> Add Row
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 w-8">#</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 min-w-[130px]">Invoice No. <span className="text-red-500">*</span></th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 min-w-[130px]">Invoice Date</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 min-w-[180px]">Remarks</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600 min-w-[120px]">Amount (₹) <span className="text-red-500">*</span></th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 min-w-[150px]">Payment Collection Date <span className="text-red-500">*</span></th>
                  <th className="px-2 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, idx) => (
                  <tr key={row._id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-3 py-2 text-gray-400 font-medium">{idx + 1}</td>
                    <td className="px-2 py-2">
                      <input type="text" value={row.invoice_no} onChange={e => updateRow(row._id, "invoice_no", e.target.value)}
                        placeholder="INV-001" disabled={saving}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="date" value={row.invoice_date} onChange={e => updateRow(row._id, "invoice_date", e.target.value)}
                        disabled={saving}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="text" value={row.remarks} onChange={e => updateRow(row._id, "remarks", e.target.value)}
                        placeholder="e.g. Monthly supply" disabled={saving}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min="0" value={row.amount} onChange={e => updateRow(row._id, "amount", e.target.value)}
                        placeholder="0" disabled={saving}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="date" value={row.payment_date} onChange={e => updateRow(row._id, "payment_date", e.target.value)}
                        disabled={saving}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
                    </td>
                    <td className="px-2 py-2">
                      <button type="button" onClick={() => removeRow(row._id)} disabled={saving || rows.length === 1}
                        className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30 opacity-0 group-hover:opacity-100">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-indigo-50 border-t-2 border-indigo-200">
                  <td colSpan={4} className="px-3 py-2.5 text-right text-xs font-bold text-indigo-700">
                    Total ({rows.length} {rows.length === 1 ? "entry" : "entries"})
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-indigo-800 tabular-nums">
                    ₹{total.toLocaleString("en-IN")}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 flex-shrink-0">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex gap-2 flex-shrink-0">
          <button type="button" onClick={onClose} disabled={saving}
            className="flex-1 px-4 py-2.5 text-sm bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? (
              <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Saving…</>
            ) : "Save Visit Log"}
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
  const [minOutstanding,    setMinOutstanding]    = useState("");
  const [maxOutstanding,    setMaxOutstanding]    = useState("");
  const [agentOptions,      setAgentOptions]      = useState([]);
  const [areaOptions,       setAreaOptions]       = useState([]);
  const [currentPage,       setCurrentPage]       = useState(1);
  const [totalCount,        setTotalCount]        = useState(0);
  const [counts,            setCounts]            = useState({ overdue: 0, due_week: 0, all: 0 });
  const [selectedClient,    setSelectedClient]    = useState(null);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showPaymentModal,  setShowPaymentModal]  = useState(false);
  const [exporting,         setExporting]         = useState(false);
  const searchRef      = useRef(null);
  const ITEMS_PER_PAGE = 100;
  const debouncedSearch = useDebounce(searchQuery, 400);

  useEffect(() => { searchRef.current?.focus(); }, []);
  useEffect(() => { loadClients(); }, [tab, debouncedSearch, currentPage, sortBy, sortOrder, selectedAgent, selectedArea, minOutstanding, maxOutstanding]);
  useEffect(() => { loadTabCounts(); }, [selectedAgent, selectedArea]);
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

  const loadTabCounts = async () => {
    try {
      const baseParams = {};
      if (selectedAgent !== "all") baseParams.agent = selectedAgent;
      if (selectedArea  !== "all") baseParams.area  = selectedArea;
      const [allRes, overdueRes, weekRes] = await Promise.all([
        getFollowUpTracker({ ...baseParams, filter: "all",      page_size: 1 }),
        getFollowUpTracker({ ...baseParams, filter: "overdue",  page_size: 1 }),
        getFollowUpTracker({ ...baseParams, filter: "due_week", page_size: 1 }),
      ]);
      setCounts({ all: allRes.data.count || 0, overdue: overdueRes.data.count || 0, due_week: weekRes.data.count || 0 });
    } catch (_) {}
  };

  const loadClients = async () => {
    setLoading(true);
    try {
      const params = { filter: tab, page: currentPage, page_size: ITEMS_PER_PAGE, sort_by: sortBy, sort_order: sortOrder };
      if (selectedAgent !== "all") params.agent  = selectedAgent;
      if (selectedArea  !== "all") params.area   = selectedArea;
      if (debouncedSearch.trim())  params.search = debouncedSearch.trim();
      if (minOutstanding) params.outstanding_min = parseFloat(minOutstanding);
      if (maxOutstanding) params.outstanding_max = parseFloat(maxOutstanding);
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

  const exportToExcel = async () => {
    setExporting(true);
    const toastId = toast.loading("Preparing Excel export...");
    try {
      const params = { filter: tab, page_size: 999999, sort_by: sortBy, sort_order: sortOrder };
      if (selectedAgent !== "all") params.agent = selectedAgent;
      if (selectedArea  !== "all") params.area = selectedArea;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const res = await getFollowUpTracker(params);
      const all = res.data.results || [];
      if (!all.length) { toast.error("No data to export", { id: toastId }); return; }
      toast.loading(`Building Excel for ${all.length} clients…`, { id: toastId });
      const data = all.map(c => ({
        Code: c.code,
        Client: c.name,
        Agent: c.agent || "—",
        Area: c.area || "—",
        Invoices: c.invoice_count,
        Credit: c.credit,
        Debit: c.debit,
        Outstanding: c.outstanding,
        "Oldest Due Days": c.oldest_due_days,
        Risk: c.risk,
      }));
      const ws = utils.json_to_sheet(data);
      ws["!cols"] = [
        { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
      ];
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Payment Tracker");
      writeFile(wb, `followup_tracker_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success(`Exported ${all.length} clients to Excel`, { id: toastId });
    } catch (err) {
      toast.error("Excel export failed", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    const toastId = toast.loading("Preparing PDF export...");
    try {
      const params = { filter: tab, page_size: 999999, sort_by: sortBy, sort_order: sortOrder };
      if (selectedAgent !== "all") params.agent = selectedAgent;
      if (selectedArea  !== "all") params.area  = selectedArea;
      if (debouncedSearch.trim())  params.search = debouncedSearch.trim();
      const res = await getFollowUpTracker(params);
      const all = res.data.results || [];
      if (!all.length) { toast.error("No data to export", { id: toastId }); return; }
      toast.loading(`Building PDF for ${all.length} clients…`, { id: toastId });

      const doc        = new jsPDF({ orientation: "landscape", format: "a4" });
      const pageWidth  = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // ── plain rupee — NO locale spaces ──────────────────────────
      const rupee = (val) => {
        const n = parseFloat(val || 0);
        const fixed = n.toFixed(2);
        const [intPart, dec] = fixed.split(".");
        const lastThree = intPart.slice(-3);
        const rest = intPart.slice(0, -3);
        const grouped = rest
          ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
          : lastThree;
        return "Rs." + grouped + "." + dec;
      };

      const margin       = 8;
      const topMargin    = 16;
      const bottomMargin = 8;
      const startY       = 16;
      const rowHeight    = 9;
      const availableW   = pageWidth - margin * 2;

      const headers   = ["Code", "Name", "Complete Address", "Phone", "Credit", "Debit", "Outstanding"];
      const weights   = [7, 17, 27, 16, 11, 11, 11];
      const totalW    = weights.reduce((s, w) => s + w, 0);
      const colWidths = weights.map(w => (w / totalW) * availableW);
      const numericCols = new Set([4, 5, 6]);

      // fitText — truncate only, never wrap
      const fitText = (value, maxW) => {
        const text = String(value ?? "—");
        if (doc.getTextWidth(text) <= maxW) return text;
        const ell = "...";
        let out = text;
        while (out.length > 0 && doc.getTextWidth(out + ell) > maxW) out = out.slice(0, -1);
        return out ? out + ell : ell;
      };

      // wrap address into max 2 lines
      const wrapLines = (text, maxW, maxLines = 2) => {
        const words = String(text || "—").split(" ");
        const lines = [];
        let cur = "";
        for (const word of words) {
          const test = cur ? `${cur} ${word}` : word;
          if (doc.getTextWidth(test) <= maxW) {
            cur = test;
          } else {
            if (cur) lines.push(cur);
            cur = word;
            if (lines.length >= maxLines - 1) { lines.push(cur); return lines; }
          }
        }
        if (cur) lines.push(cur);
        return lines;
      };

      // draw header — rects first, then text
      const drawHeader = (y) => {
        // Step 1: all rectangles
        doc.setFillColor(20, 184, 166);
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.3);
        let x = margin;
        colWidths.forEach(w => { doc.rect(x, y, w, rowHeight, "FD"); x += w; });

        // Step 2: all text after rects
        doc.setFont(undefined, "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(255, 255, 255);
        x = margin;
        headers.forEach((h, i) => {
          const align = numericCols.has(i) ? "right" : i === 0 ? "center" : "left";
          const tx    = numericCols.has(i) ? x + colWidths[i] - 1 : i === 0 ? x + colWidths[i] / 2 : x + 1.5;
          doc.text(h, tx, y + rowHeight / 2 + 0.3, { align, baseline: "middle" });
          x += colWidths[i];
        });

        // Step 3: reset for data rows
        doc.setTextColor(0, 0, 0);
      };

      // Title
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`Payment Follow-Up Tracker - ${new Date().toLocaleDateString("en-IN")}`, margin, 11);

      let curY = startY;
      drawHeader(curY);
      curY += rowHeight;

      all.forEach((client, rowIdx) => {
        if (curY + rowHeight > pageHeight - bottomMargin) {
          doc.addPage();
          curY = topMargin;
          drawHeader(curY);
          curY += rowHeight;
        }

        // zebra
        if (rowIdx % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          let x = margin;
          colWidths.forEach(w => { doc.rect(x, curY, w, rowHeight, "F"); x += w; });
        }

        // borders
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        let x = margin;
        colWidths.forEach(w => { doc.rect(x, curY, w, rowHeight, "S"); x += w; });

        const addr  = [client.address, client.place, client.city, client.state, client.fax]
                        .filter(Boolean).join(", ") || "—";
        const phone = [client.phone, client.phone2].filter(Boolean).join(", ") || "—";

        const rowData = [
          client.code || "—",
          client.name || "—",
          addr,
          phone,
          rupee(client.credit),
          rupee(client.debit),
          rupee(client.outstanding),
        ];

        doc.setFont(undefined, "normal");
        doc.setTextColor(0, 0, 0);
        x = margin;

        rowData.forEach((cell, ci) => {
          const w   = colWidths[ci];
          const pad = 1.2;

          if (ci === 2) {
            // address — 2-line wrap
            doc.setFontSize(5.0);
            const lines = wrapLines(cell, w - pad * 2, 2);
            const lh    = 3.0;
            const startLY = curY + rowHeight / 2 - (lines.length * lh) / 2 + 0.5;
            lines.forEach((ln, li) =>
              doc.text(ln, x + pad, startLY + li * lh, { baseline: "middle" })
            );
          } else if (numericCols.has(ci)) {
            // numeric — fitText, NO maxWidth, right-aligned
            doc.setFontSize(5.5);
            const txt = fitText(cell, w - pad);
            doc.text(txt, x + w - pad, curY + rowHeight / 2 + 0.3, {
              align: "right", baseline: "middle",
            });
          } else {
            doc.setFontSize(5.5);
            const txt   = fitText(cell, w - pad * 2);
            const align = ci === 0 ? "center" : "left";
            const tx    = ci === 0 ? x + w / 2 : x + pad;
            doc.text(txt, tx, curY + rowHeight / 2 + 0.3, { align, baseline: "middle" });
          }
          x += w;
        });

        curY += rowHeight;
      });

      // page numbers
      const pages = doc.internal.getNumberOfPages();
      doc.setFontSize(6);
      doc.setTextColor(140, 140, 140);
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.text(`Page ${i} of ${pages}`, pageWidth - margin, pageHeight - 4, { align: "right" });
      }

      doc.save(`followup_tracker_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success(`Exported ${all.length} clients to PDF`, { id: toastId });
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error(`PDF export failed: ${err.message || "Unknown error"}`, { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  const isCleared = (c) => !c.outstanding || parseFloat(c.outstanding) === 0;
  const hasActiveFilters = tab !== "all" || selectedAgent !== "all" || selectedArea !== "all" || searchQuery.trim().length > 0 || minOutstanding || maxOutstanding;
  const clearFilters = () => { setTab("all"); setSearchQuery(""); setSelectedAgent("all"); setSelectedArea("all"); setMinOutstanding(""); setMaxOutstanding(""); setCurrentPage(1); };

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
      <div className="max-w-[1400px] mx-auto">

        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Payment Follow-Up</h1>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button onClick={() => { loadClients(); loadTabCounts(); toast.success("Refreshed"); }}
              className="px-3 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-semibold text-xs shadow hover:from-teal-600 hover:to-cyan-700 transition-all">
              Refresh
            </button>
            <button onClick={exportToExcel} disabled={loading || exporting}
              className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold text-xs shadow hover:from-emerald-600 hover:to-green-700 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
              <Download size={12} />
              {exporting ? "Exporting..." : "Excel"}
            </button>
            <button onClick={exportToPDF} disabled={loading || exporting}
              className="px-3 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold text-xs shadow hover:from-orange-600 hover:to-red-700 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
              <Download size={12} />
              {exporting ? "Exporting..." : "PDF"}
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-3">
          <div className="flex flex-col gap-3">
            {/* Filter Header with Toggle */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Filters</h2>
              <button onClick={clearFilters} disabled={!hasActiveFilters}
                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 rounded-lg font-semibold text-xs hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                Reset
              </button>
            </div>
            {/* Compact single-line filter row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-8 gap-3 items-center">
              <div className="relative min-w-0 sm:col-span-2 xl:col-span-2">
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
              <select value={tab} onChange={e => { setTab(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white">
                {TAB_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select value={selectedAgent} onChange={e => { setSelectedAgent(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white">
                <option value="all">All Agents</option>
                {agentOptions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select value={selectedArea} onChange={e => { setSelectedArea(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white">
                <option value="all">All Areas</option>
                {areaOptions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <input type="number" min="0" placeholder="Outstanding Min" value={minOutstanding}
                onChange={e => { setMinOutstanding(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white" />
              <input type="number" min="0" placeholder="Outstanding Max" value={maxOutstanding}
                onChange={e => { setMaxOutstanding(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs bg-white" />
              <button onClick={() => { setCurrentPage(1); loadClients(); }} disabled={loading}
                className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-[11px] shadow hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap">
                Go
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
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
                      <SortTh field="code">Code</SortTh>
                      <SortTh field="name">Client</SortTh>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider">Agent</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider">Area</th>
                      <SortTh field="invoice_count" className="text-center">Inv</SortTh>
                      <SortTh field="debit"         className="text-right">Credit</SortTh>
                      <SortTh field="credit"        className="text-right">Debit</SortTh>
                      <SortTh field="outstanding"   className="text-right">Outstanding</SortTh>
                      <SortTh field="oldest_due_days" className="text-center">Oldest Due</SortTh>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider">Risk</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider">Next F/U</th>
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
                      const isVisit     = c.last_outcome === "VISIT";
                      return (
                        <tr key={c.code} onClick={() => setSelectedClient(c)}
                          className={`hover:bg-teal-50/40 transition-colors cursor-pointer ${index % 2 === 0 ? "bg-white" : "bg-gray-50/60"} ${selectedClient?.code === c.code ? "!bg-teal-50" : ""}`}>
                          <td className="px-3 py-2 overflow-hidden"><span className="text-[11px] font-mono text-gray-500 truncate block">{c.code}</span></td>
                          <td className="px-3 py-2 overflow-hidden"><span title={c.name} className="text-xs font-medium text-gray-800 truncate block">{c.name}</span></td>
                          <td className="px-3 py-2 overflow-hidden"><TruncCell text={c.agent || "—"} maxW="max-w-full" className="text-xs text-gray-700" /></td>
                          <td className="px-3 py-2 overflow-hidden"><TruncCell text={c.area  || "—"} maxW="max-w-full" className="text-xs text-gray-600" /></td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-semibold ${invCount > 0 ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-400"}`}>{invCount}</span>
                          </td>
                          <td className="px-3 py-2 text-right"><span className="text-xs text-gray-700 tabular-nums">{fmtRupee(billed)}</span></td>
                          <td className="px-3 py-2 text-right"><span className="text-xs font-medium text-teal-600 tabular-nums">{fmtRupee(paid)}</span></td>
                          <td className="px-3 py-2 text-right"><span className={`text-xs font-semibold tabular-nums ${cleared ? "text-gray-400" : "text-red-500"}`}>{fmtRupee(outstanding)}</span></td>
                          <td className="px-3 py-2 text-center">
                            {cleared ? (
                              <span className="px-1.5 py-0.5 rounded-full border text-[10px] font-bold bg-teal-100 text-teal-700 border-teal-200">Cleared</span>
                            ) : dueDays >= 60 ? (
                              <span className="px-1.5 py-0.5 rounded-full border text-[10px] font-bold bg-red-100 text-red-700 border-red-200">{dueDays}d</span>
                            ) : dueDays >= 30 ? (
                              <span className="px-1.5 py-0.5 rounded-full border text-[10px] font-bold bg-amber-100 text-amber-700 border-amber-200">{dueDays}d</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-full border text-[10px] font-bold bg-yellow-100 text-yellow-700 border-yellow-200">{dueDays ?? "—"}d</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${RISK_COLORS[c.risk] || RISK_COLORS.None}`}>{c.risk || "None"}</span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-gray-600">
                                {c.next_followup_date
                                  ? new Date(c.next_followup_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
                                  : <span className="text-gray-300">—</span>}
                              </span>
                              {isVisit && (
                                <span title="Field Visit Logged"
                                  className="inline-flex items-center self-start px-1.5 py-0.5 rounded-full border text-[10px] font-bold bg-indigo-100 text-indigo-700 border-indigo-200">
                                  Visit
                                </span>
                              )}
                              {isEscalated && (
                                <span title={c.last_escalated_to ? `Escalated to ${c.last_escalated_to}` : "Escalated"}
                                  className="inline-flex items-center self-start max-w-full px-1.5 py-0.5 rounded-full border text-[10px] font-bold bg-orange-100 text-orange-700 border-orange-200 truncate">
                                  Escalated{c.last_escalated_to ? `: ${c.last_escalated_to}` : ""}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                            {cleared ? (
                              <button onClick={() => setSelectedClient(c)}
                                className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md font-semibold text-xs hover:bg-gray-200 transition-all inline-flex items-center gap-1">
                                <Eye size={11} /> View
                              </button>
                            ) : (
                              <button onClick={() => { setSelectedClient(c); setShowFollowUpModal(true); }}
                                className="px-2.5 py-1 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-md font-semibold text-xs shadow hover:from-teal-600 hover:to-cyan-700 transition-all">
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
              <Pagination currentPage={currentPage} totalItems={totalCount} itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={p => setCurrentPage(p)} label="clients" colorScheme="teal" />
            </>
          )}
        </div>
      </div>

      {/* Client detail panel */}
      {selectedClient && !showFollowUpModal && !showPaymentModal && (
        <ClientDetailPanel client={selectedClient} onClose={() => setSelectedClient(null)}
          onLogFollowUp={() => setShowFollowUpModal(true)} onRecordPayment={() => setShowPaymentModal(true)}
          onRefresh={() => { loadClients(); loadTabCounts(); }} />
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
          loadTabCounts();
          setShowFollowUpModal(false);
          setSelectedClient(null);
        }}
      />
    </div>
  );
}