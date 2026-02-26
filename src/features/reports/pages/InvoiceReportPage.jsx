import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getInvoiceReport } from "../../../services/sales";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import { formatDateTime, formatNumber } from '../../../utils/formatters';
import { X, Search, Download } from 'lucide-react';
import { useAuth } from "../../auth/AuthContext";
import * as XLSX from 'xlsx';

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

const STATUS_BADGE = {
  INVOICED:   'bg-slate-100 text-slate-700 border-slate-300',
  PICKING:    'bg-blue-100 text-blue-700 border-blue-300',
  PICKED:     'bg-emerald-100 text-emerald-700 border-emerald-300',
  PACKING:    'bg-purple-100 text-purple-700 border-purple-300',
  PACKED:     'bg-teal-100 text-teal-700 border-teal-300',
  DISPATCHED: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  DELIVERED:  'bg-green-100 text-green-700 border-green-300',
  REVIEW:     'bg-red-100 text-red-700 border-red-300',
};

export default function InvoiceReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // rawInvoices = everything returned by API (no search param for salesman queries)
  const [rawInvoices, setRawInvoices] = useState([]);
  // invoices = what's displayed after client-side salesman filter
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(100);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('');
  const searchRef = useRef(null);

  const debouncedSearch = useDebounce(searchQuery, 400);

  useEffect(() => { searchRef.current?.focus(); }, []);

  // Re-run whenever filters or search changes
  useEffect(() => {
    loadInvoices();
  }, [currentPage, statusFilter, dateFilter, debouncedSearch, timeFilter]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, page_size: itemsPerPage };
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) { params.start_date = dateFilter; params.end_date = dateFilter; }
      if (timeFilter) {
        const cutoff = new Date(Date.now() - parseInt(timeFilter) * 60 * 60 * 1000);
        params.start_time = cutoff.toISOString();
      }

      const q = debouncedSearch.trim().toLowerCase();

      if (!q) {
        const res = await getInvoiceReport(params);
        const results = res.data.results || [];
        setRawInvoices(results);
        setInvoices(results);
        setTotalCount(res.data.count || 0);
      } else {
        // First try API search for invoice/customer
        const searchRes = await getInvoiceReport({ ...params, search: debouncedSearch });
        const searchResults = searchRes.data.results || [];

        if (searchResults.length > 0) {
          setRawInvoices(searchResults);
          setInvoices(searchResults);
          setTotalCount(searchRes.data.count || 0);
        } else {
          // Fallback: fetch all (no pagination) to check salesman name client-side
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
    const isOpsUser = ["PICKER", "PACKER", "BILLER", "DELIVERY", "STORE"].includes(user?.role);
    navigate(`${isOpsUser ? '/ops/billing/invoices/view' : '/billing/invoices/view'}/${id}`, {
      state: { backPath: "/history/invoice-report" }
    });
  };

  const downloadExcel = () => {
    if (!invoices.length) { toast.error("No data to export"); return; }

    const rows = invoices.map((inv) => ({
      "Invoice No":    inv.invoice_no || "",
      "Created By":    inv.salesman?.name || "N/A",
      "Date & Time":  formatDateTime(inv.created_at),
      "Customer Name": inv.customer?.name || inv.temp_name || "N/A",
      "Area":          inv.customer?.area || inv.customer?.address1 || "",
      "Amount (₹)":    parseFloat(inv.Total) || 0,
      "Status":        inv.status || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Column widths
    ws["!cols"] = [
      { wch: 14 }, { wch: 18 }, { wch: 22 },
      { wch: 28 }, { wch: 22 }, { wch: 14 }, { wch: 14 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoice Report");

    const dateLabel = dateFilter || new Date().toISOString().split("T")[0];
    const statusLabel = statusFilter || "All";
    const filename = `Invoice_Report_${dateLabel}_${statusLabel}.xlsx`;

    XLSX.writeFile(wb, filename);
    toast.success(`Exported ${invoices.length} invoices to Excel`);
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

            {/* Time */}
            {/* <div className="flex items-center gap-1.5">
              <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Time:</label>
              <select
                value={timeFilter}
                onChange={(e) => { setTimeFilter(e.target.value); setCurrentPage(1); }}
                className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white w-[80px]"
              >
                <option value="">All</option>
                <option value="1">1 hr</option>
                <option value="2">2 hr</option>
                <option value="3">3 hr</option>
                <option value="4">4 hr</option>
                <option value="6">6 hr</option>
                <option value="12">12 hr</option>
              </select>
            </div> */}

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

            {/* Unified Search */}
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
                onClick={() => { loadInvoices(); toast.success("Report generated successfully"); }}
                className="px-4 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow hover:from-teal-600 hover:to-cyan-700 transition-all whitespace-nowrap"
              >
                Generate
              </button>
              <button
                onClick={downloadExcel}
                disabled={loading || invoices.length === 0}
                className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg font-semibold text-sm shadow hover:from-emerald-600 hover:to-green-700 transition-all whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={14} />
                Excel
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
                            {inv.status || '—'}
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