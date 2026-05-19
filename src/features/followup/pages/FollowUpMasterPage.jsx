import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getFollowUpMaster, getAccMasterAgents, getServiceMasterAreas } from "../../../services/followup";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import { X, Search, Download, Phone, Mail, MapPin, Eye } from "lucide-react";
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
  VISIT:       "Visit",
};

function fmtRupee(val) {
  const n = parseFloat(val || 0);
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const [minOutstanding,    setMinOutstanding]    = useState("");
  const [maxOutstanding,    setMaxOutstanding]    = useState("");
  const [agentOptions,      setAgentOptions]      = useState([]);
  const [areaOptions,       setAreaOptions]       = useState([]);
  const [currentPage,       setCurrentPage]       = useState(1);
  const [totalCount,        setTotalCount]        = useState(0);
  const [selectedClient,    setSelectedClient]    = useState(null);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [exporting,         setExporting]         = useState(false);
  const [detailClient,      setDetailClient]      = useState(null);
  const searchRef      = useRef(null);
  const ITEMS_PER_PAGE = 50;
  const debouncedSearch = useDebounce(searchQuery, 400);

  useEffect(() => { searchRef.current?.focus(); }, []);
  useEffect(() => { loadClients(); }, [debouncedSearch, currentPage, sortBy, sortOrder, selectedAgent, selectedArea, minOutstanding, maxOutstanding]);
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
      if (minOutstanding) params.outstanding_min = parseFloat(minOutstanding);
      if (maxOutstanding) params.outstanding_max = parseFloat(maxOutstanding);
      const res = await getFollowUpMaster(params);
      setClients(res.data.results || []);
      setTotalCount(res.data.count || 0);
    } catch (_) {
      toast.error("Failed to load master data");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    setExporting(true);
    const toastId = toast.loading("Preparing Excel export...");
    try {
      const params = { page_size: 999999 };
      if (selectedAgent !== "all") params.agent  = selectedAgent;
      if (selectedArea  !== "all") params.area   = selectedArea;
      if (debouncedSearch.trim())  params.search = debouncedSearch.trim();
      const res = await getFollowUpMaster(params);
      const all = res.data.results || [];
      if (!all.length) { toast.error("No data to export", { id: toastId }); return; }
      toast.loading(`Building Excel for ${all.length} clients…`, { id: toastId });
      const data = all.map(c => ({
        Code: c.code,
        Name: c.name,
        Agent: c.agent || "—",
        Area: c.area || "—",
        Address: c.address || "—",
        Place: c.place || "—",
        City: c.city || "—",
        State: c.state || "—",
        Phone: c.phone || "—",
        "Phone 2": c.phone2 || "—",
        Pincode: c.fax || "—",
        Department: c.openingdepartment || "—",
        Email: c.email || "—",
        Credit: c.credit,
        Debit: c.debit,
        Outstanding: c.outstanding,
      }));
      const ws = utils.json_to_sheet(data);
      ws["!cols"] = [
        { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 15 }, { wch: 20 },
        { wch: 12 }, { wch: 12 }, { wch: 15 },
      ];
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Customer List");
      writeFile(wb, `followup_customer_list_${new Date().toISOString().split("T")[0]}.xlsx`);
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
      const params = { page_size: 999999 };
      if (selectedAgent !== "all") params.agent  = selectedAgent;
      if (selectedArea  !== "all") params.area   = selectedArea;
      if (debouncedSearch.trim())  params.search = debouncedSearch.trim();
      const res = await getFollowUpMaster(params);
      const all = res.data.results || [];
      if (!all.length) { toast.error("No data to export", { id: toastId }); return; }
      toast.loading(`Building PDF for ${all.length} clients…`, { id: toastId });

      const doc = new jsPDF({ orientation: "landscape", format: "a4" });
      const pageWidth  = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // ── simple rupee formatter — NO locale spaces ──────────────
      const rupee = (val) => {
        const n = parseFloat(val || 0);
        const fixed = n.toFixed(2);
        const [intPart, dec] = fixed.split(".");
        // Indian grouping: last 3 then pairs
        const lastThree = intPart.slice(-3);
        const rest = intPart.slice(0, -3);
        const grouped = rest
          ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
          : lastThree;
        return "Rs." + grouped + "." + dec;   // plain ASCII, no ₹ unicode
      };

      const margin       = 8;
      const topMargin    = 16;
      const bottomMargin = 8;
      const startY       = 16;
      const rowHeight    = 9;
      const availableW   = pageWidth - margin * 2;

      const headers  = ["Code", "Name", "Complete Address", "Phone", "Credit", "Debit", "Outstanding"];
      const weights  = [7, 17, 27, 16, 11, 11, 11];
      const totalW   = weights.reduce((s, w) => s + w, 0);
      const colWidths = weights.map(w => (w / totalW) * availableW);
      const numericCols = new Set([4, 5, 6]);

      // ── fitText: truncate to fit width, no wrapping ────────────
      const fitText = (value, maxW) => {
        const text = String(value ?? "—");
        if (doc.getTextWidth(text) <= maxW) return text;
        const ell = "...";
        let out = text;
        while (out.length > 0 && doc.getTextWidth(out + ell) > maxW) out = out.slice(0, -1);
        return out ? out + ell : ell;
      };

      // ── wrap address into max 2 lines ──────────────────────────
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

      // ── draw header row ────────────────────────────────────────
      const drawHeader = (y) => {
        let x = margin;
        
        // Step 1: Draw all filled rectangles first
        doc.setFillColor(20, 184, 166);
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.3);
        colWidths.forEach((w) => {
          doc.rect(x, y, w, rowHeight, "FD");
          x += w;
        });

        // Step 2: Draw all text AFTER rectangles — force white color here
        doc.setFont(undefined, "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(255, 255, 255);  // white — set AFTER rect drawing
        
        x = margin;
        headers.forEach((h, i) => {
          const align = numericCols.has(i) ? "right" : i === 0 ? "center" : "left";
          const tx = numericCols.has(i)
            ? x + colWidths[i] - 1
            : i === 0
            ? x + colWidths[i] / 2
            : x + 1.5;
          doc.text(h, tx, y + rowHeight / 2 + 0.3, { align, baseline: "middle" });
          x += colWidths[i];
        });
        
        // Step 3: Reset text color to black for subsequent rows
        doc.setTextColor(0, 0, 0);
      };

      // Title
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`Customer List - ${new Date().toLocaleDateString("en-IN")}`, margin, 11);

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

        // cell borders
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        let x = margin;
        colWidths.forEach(w => { doc.rect(x, curY, w, rowHeight, "S"); x += w; });

        const addr = [client.address, client.place, client.city, client.state, client.fax]
          .filter(Boolean).join(", ") || "—";
        const phone = [client.phone, client.phone2].filter(Boolean).join(", ") || "—";

        const rowData = [
          client.code  || "—",
          client.name  || "—",
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
          const w = colWidths[ci];
          const pad = 1.2;

          if (ci === 2) {
            // address — wrap 2 lines
            doc.setFontSize(5.0);
            const lines = wrapLines(cell, w - pad * 2, 2);
            const lh = 3.0;
            const startLY = curY + rowHeight / 2 - (lines.length * lh) / 2 + 0.5;
            lines.forEach((ln, li) => {
              doc.text(ln, x + pad, startLY + li * lh, { baseline: "middle" });
            });
          } else if (numericCols.has(ci)) {
            // numeric — fitText only, NO maxWidth, right-aligned
            doc.setFontSize(5.5);
            const txt = fitText(cell, w - pad);
            doc.text(txt, x + w - pad, curY + rowHeight / 2 + 0.3, {
              align: "right",
              baseline: "middle",
            });
          } else {
            doc.setFontSize(5.5);
            const txt = fitText(cell, w - pad * 2);
            const align = ci === 0 ? "center" : "left";
            const tx    = ci === 0 ? x + w / 2 : x + pad;
            doc.text(txt, tx, curY + rowHeight / 2 + 0.3, {
              align,
              baseline: "middle",
            });
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

      doc.save(`followup_customer_list_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success(`Exported ${all.length} clients to PDF`, { id: toastId });
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error(`PDF export failed: ${err.message || "Unknown error"}`, { id: toastId });
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
  const hasActiveFilters = selectedAgent !== "all" || selectedArea !== "all" || searchQuery.trim().length > 0 || minOutstanding || maxOutstanding;
  const clearFilters = () => { setSearchQuery(""); setSelectedAgent("all"); setSelectedArea("all"); setMinOutstanding(""); setMaxOutstanding(""); setCurrentPage(1); };

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

        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Customer List</h1>
            <p className="text-xs text-gray-500 mt-0.5">Complete client details with address and contact information</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button onClick={() => { loadClients(); toast.success("Refreshed"); }}
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
            <div className="py-16 text-center text-gray-400 text-sm">Loading master data...</div>
          ) : clients.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">No clients found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[1000px] md:min-w-full divide-y divide-gray-100" style={{ tableLayout: "fixed", width: "100%" }}>
                  <colgroup>
                    <col style={{ width: "60px" }} />
                    <col style={{ width: "170px" }} />
                    <col style={{ width: "85px" }} />
                    <col style={{ width: "85px" }} />
                    <col style={{ width: "160px" }} />   {/* was 220px */}
                    <col style={{ width: "100px" }} />
                    <col style={{ width: "130px" }} />   {/* was 110px */}
                    <col style={{ width: "130px" }} />   {/* was 110px */}
                    <col style={{ width: "140px" }} />   {/* was 120px */}
                  </colgroup>
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider">Code</th>
                      <SortTh field="name">Client</SortTh>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider">Agent</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider">Area</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider">Address</th>
                      <th className="px-3 py-2.5 text-left text-xs font-bold text-white uppercase tracking-wider">City</th>
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
                        <tr key={c.code}
                          className={`hover:bg-teal-50/40 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50/60"}`}>
                          <td className="px-3 py-2 overflow-hidden"><span className="text-[11px] font-mono text-gray-500 truncate block">{c.code}</span></td>
                          <td className="px-3 py-2 overflow-hidden"><span title={c.name} className="text-xs font-medium text-gray-800 truncate block">{c.name}</span></td>
                          <td className="px-3 py-2 overflow-hidden"><TruncCell text={c.agent || "—"} maxW="max-w-full" className="text-xs text-gray-700" /></td>
                          <td className="px-3 py-2 overflow-hidden"><TruncCell text={c.area  || "—"} maxW="max-w-full" className="text-xs text-gray-600" /></td>
                          <td className="px-3 py-2 overflow-hidden">
                            <div className="flex items-start gap-2">
                              <button onClick={(e) => { e.stopPropagation(); setDetailClient(c); }} className="p-1 hover:bg-gray-200 rounded transition-colors" title="View details">
                                <Eye size={14} className="text-gray-600 hover:text-gray-800" />
                              </button>
                              <TruncCell text={c.address || "—"} maxW="max-w-full" className="text-xs text-gray-600" />
                            </div>
                          </td>
                          <td className="px-3 py-2 overflow-hidden"><TruncCell text={c.city || "—"} maxW="max-w-full" className="text-xs text-gray-600" /></td>
                          <td className="px-3 py-2 text-right">
                            <span className="text-xs text-gray-700 tabular-nums whitespace-nowrap">{fmtRupee(billed)}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="text-xs font-medium text-teal-600 tabular-nums whitespace-nowrap">{fmtRupee(paid)}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className={`text-xs font-semibold tabular-nums whitespace-nowrap ${cleared ? "text-gray-400" : "text-red-500"}`}>
                              {fmtRupee(outstanding)}
                            </span>
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

      {/* Details modal for hidden fields */}
      {detailClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-800">{detailClient.name}</h3>
              <button onClick={() => setDetailClient(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div><span className="font-semibold text-gray-700">Place:</span> <span className="text-gray-600">{detailClient.place || "—"}</span></div>
              <div><span className="font-semibold text-gray-700">City:</span> <span className="text-gray-600">{detailClient.city || "—"}</span></div>
              <div><span className="font-semibold text-gray-700">State:</span> <span className="text-gray-600">{detailClient.state || "—"}</span></div>
              <div><span className="font-semibold text-gray-700">Phone 2:</span> <span className="text-gray-600">{detailClient.phone2 || "—"}</span></div>
              <div><span className="font-semibold text-gray-700">Pincode:</span> <span className="text-gray-600">{detailClient.fax || "—"}</span></div>
              <div><span className="font-semibold text-gray-700">Department:</span> <span className="text-gray-600">{detailClient.openingdepartment || "—"}</span></div>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button onClick={() => setDetailClient(null)} className="px-3 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-semibold hover:bg-teal-600 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

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
