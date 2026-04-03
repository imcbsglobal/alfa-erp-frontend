import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useUrlPage from '../../../utils/useUrlPage';
import { getInvoiceReport, exportInvoiceReport } from "../../../services/sales";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import { formatDateTime, formatNumber } from '../../../utils/formatters';
import { X, Search, Download } from 'lucide-react';
import { useAuth } from "../../auth/AuthContext";
import { usePersistedFilters } from '../../../utils/usePersistedFilters';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const STATUS_OPTIONS = [
  { value: '',           label: 'All Status'  },
  { value: 'INVOICED',   label: 'Invoiced'    },
  { value: 'PICKED',     label: 'Picked'      },
  { value: 'PACKED',     label: 'Packed'      },
  { value: 'DISPATCHED', label: 'Dispatched'  },
  { value: 'DELIVERED',  label: 'Delivered'   },
];

import { getInvoiceStatusLabel } from '../../../utils/invoiceStatus';
import { INVOICE_STATUS_COLORS as STATUS_BADGE } from '../../../utils/invoiceStatus';

export default function InvoiceReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rawInvoices, setRawInvoices] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [currentPage, setCurrentPage] = useUrlPage();
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(100);
  const [savedFilters, saveFilters] = usePersistedFilters('invoice-report-filters', {
  statusFilter: '',
  dateFilter: new Date().toISOString().split('T')[0],
  searchQuery: '',
  });
  const [statusFilter, setStatusFilter] = useState(savedFilters.statusFilter);
  const [dateFilter, setDateFilter] = useState(savedFilters.dateFilter);
  const [searchQuery, setSearchQuery] = useState(savedFilters.searchQuery);
  const searchRef = useRef(null);

  const debouncedSearch = useDebounce(searchQuery, 400);

  useEffect(() => { searchRef.current?.focus(); }, []);

  useEffect(() => {
    saveFilters({ statusFilter, dateFilter, searchQuery });
  }, [statusFilter, dateFilter, searchQuery]);

  useEffect(() => {
    loadInvoices();
  }, [currentPage, statusFilter, dateFilter, debouncedSearch]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, page_size: itemsPerPage };
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) { params.start_date = dateFilter; params.end_date = dateFilter; }

      const q = debouncedSearch.trim().toLowerCase();

      if (!q) {
        const res = await getInvoiceReport(params);
        const results = res.data.results || [];
        setRawInvoices(results);
        setInvoices(results);
        setTotalCount(res.data.count || 0);
      } else {
        const searchRes = await getInvoiceReport({ ...params, search: debouncedSearch });
        const searchResults = searchRes.data.results || [];

        if (searchResults.length > 0) {
          setRawInvoices(searchResults);
          setInvoices(searchResults);
          setTotalCount(searchRes.data.count || 0);
        } else {
          const allParams = { page_size: 10000 };
          if (statusFilter) allParams.status = statusFilter;
          if (dateFilter) { allParams.start_date = dateFilter; allParams.end_date = dateFilter; }

          const allRes = await getInvoiceReport(allParams);
          const allResults = allRes.data.results || [];
          const salesmanFiltered = allResults.filter(inv =>
            (inv.salesman?.name || '').toLowerCase().includes(q)
          );
          setRawInvoices(allResults);
          setInvoices(salesmanFiltered);
          setTotalCount(salesmanFiltered.length);
        }
      }
    } catch (err) {
      console.error("Failed to load invoice report:", err);
      toast.error("Failed to load invoice report");
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = (id) => {
    saveFilters({ statusFilter, dateFilter, searchQuery });
    const isOpsUser = ["PICKER", "PACKER", "BILLER", "DELIVERY", "STORE"].includes(user?.role);
    navigate(`${isOpsUser ? '/ops/billing/invoices/view' : '/billing/invoices/view'}/${id}`, {
      state: { backPath: "/history/invoice-report" }
    });
  };

  const downloadExcel = async () => {
    setExporting(true);
    const toastId = toast.loading("Preparing export...");

    try {
      const XLSX = await import('xlsx');

      // Lightweight export endpoint — no heavy joins
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) { params.start_date = dateFilter; params.end_date = dateFilter; }
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();

      const res = await exportInvoiceReport(params);
      let allData = res.data.data || [];

      // Salesman fallback filter (same logic as table view)
      const q = debouncedSearch.trim().toLowerCase();
      if (q && allData.length > 0) {
        const hasDirectMatch = allData.some(row =>
          (row.invoice_no || '').toLowerCase().includes(q) ||
          (row.customer_name || '').toLowerCase().includes(q)
        );
        if (!hasDirectMatch) {
          allData = allData.filter(row =>
            (row.created_by || '').toLowerCase().includes(q)
          );
        }
      }

      if (!allData.length) {
        toast.error("No data to export", { id: toastId });
        return;
      }

      toast.loading(`Building Excel for ${allData.length} invoices...`, { id: toastId });

      const rows = allData.map((row) => ({
        "Invoice No":    row.invoice_no || '',
        "Created By":    row.created_by || 'N/A',
        "Date & Time":   formatDateTime(row.created_at),
        "Customer Name": row.customer_name || 'N/A',
        "Area":          row.area || '',
        "Amount (₹)":    row.amount || 0,
        "Status":        row.status || '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = [
        { wch: 18 }, { wch: 18 }, { wch: 22 },
        { wch: 28 }, { wch: 22 }, { wch: 14 }, { wch: 14 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Invoice Report");

      const dateLabel = dateFilter || new Date().toISOString().split("T")[0];
      const statusLabel = statusFilter || "All";
      XLSX.writeFile(wb, `Invoice_Report_${dateLabel}_${statusLabel}.xlsx`);

      toast.success(`Exported ${allData.length} invoices`, { id: toastId });
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Export failed. Please try again.", { id: toastId });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Invoice Reports</h1>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm p-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">

            {/* Date */}
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Date:</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>

            {/* Status */}
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white"
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="h-6 w-px bg-gray-200" />

            {/* Search */}
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Search:</label>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Invoice No, Customer or Created By..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-7 pr-7 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm w-[300px]"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => { loadInvoices(); toast.success("Report Generated"); }}
                className="px-4 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow hover:from-teal-600 hover:to-cyan-700 transition-all whitespace-nowrap"
              >
                Generate
              </button>
              <button
                onClick={downloadExcel}
                disabled={loading || exporting}
                className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg font-semibold text-sm shadow hover:from-emerald-600 hover:to-green-700 transition-all whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={14} />
                {exporting ? "Exporting..." : `Excel (All ${totalCount})`}
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-500">Loading report...</div>
          ) : invoices.length === 0 ? (
            <div className="py-20 text-center text-gray-500">No invoices found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                    <tr>
                      {["Invoice No", "Created By", "Date & Time", "Customer Name", "Amount", "Status", "Actions"].map(h => (
                        <th
                          key={h}
                          className={`px-4 py-3 text-xs font-bold text-white uppercase tracking-wider ${h === "Amount" ? "text-right" : "text-left"}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((inv, index) => (
                      <tr
                        key={inv.id}
                        className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {inv.invoice_no}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {inv.salesman?.name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {formatDateTime(inv.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <p>{inv.customer?.name || inv.temp_name || 'N/A'}</p>
                          <p className="text-xs text-gray-500">
                            {inv.customer?.area || inv.customer?.address1 || inv.temp_name || '—'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 whitespace-nowrap">
                          ₹{formatNumber(inv.Total, 2, '0.00')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full border text-xs font-bold ${STATUS_BADGE[inv.status] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                            {getInvoiceStatusLabel(inv.status) || inv.status || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleViewInvoice(inv.id)}
                            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalItems={totalCount}
                itemsPerPage={itemsPerPage}
                onPageChange={(p) => setCurrentPage(p)}
                label="invoices"
                colorScheme="teal"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}