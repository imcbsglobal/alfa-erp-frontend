import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getInvoiceReport } from "../../../services/sales";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import { formatDateTime, formatNumber } from '../../../utils/formatters';
import { X, Search } from 'lucide-react';
import { useAuth } from "../../auth/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function InvoiceReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  const debouncedSearch = useDebounce(searchQuery, 500);

  useEffect(() => { searchInputRef.current?.focus(); }, []);

  useEffect(() => {
    loadInvoices();
  }, [currentPage, itemsPerPage, statusFilter, dateFilter, debouncedSearch]);

  // SSE Live Updates
  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE_URL}/sales/sse/invoices/`);
    eventSource.onmessage = (event) => {
      try {
        const invoice = JSON.parse(event.data);
        const q = debouncedSearch.toLowerCase();
        const matchesStatus = !statusFilter || invoice.status === statusFilter;
        const matchesDate = !dateFilter || invoice.created_at?.startsWith(dateFilter);
        const matchesSearch = !q ||
          (invoice.invoice_no || '').toLowerCase().includes(q) ||
          (invoice.customer?.name || invoice.temp_name || '').toLowerCase().includes(q) ||
          (invoice.salesman?.name || '').toLowerCase().includes(q);

        if (matchesStatus && matchesDate && matchesSearch) {
          setInvoices(prev => {
            const exists = prev.find(inv => inv.id === invoice.id);
            if (exists) return prev.map(inv => inv.id === invoice.id ? invoice : inv);
            return [...prev, invoice].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          });
          setTotalCount(prev => prev + 1);
        }
      } catch (e) { console.error("Invalid SSE invoice:", e); }
    };
    eventSource.onerror = () => eventSource.close();
    return () => eventSource.close();
  }, [statusFilter, dateFilter, debouncedSearch]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, page_size: itemsPerPage };
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) { params.start_date = dateFilter; params.end_date = dateFilter; }
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await getInvoiceReport(params);
      setInvoices(res.data.results || []);
      setTotalCount(res.data.count || 0);
    } catch (err) {
      console.error("❌ Failed to load invoice report:", err);
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Invoice Reports</h1>
            <div className="flex flex-wrap items-center gap-3">

              {/* Date */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Date:</label>
                <input type="date" value={dateFilter}
                  onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>

              {/* Unified Search */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Search:</label>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Invoice No, Customer, Salesman..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="pl-8 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm min-w-[240px]"
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Rows */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Rows:</label>
                <select value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white min-w-[80px]"
                >
                  {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <button onClick={() => { loadInvoices(); toast.success("Report refreshed"); }}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all whitespace-nowrap"
              >Generate</button>
            </div>
          </div>
        </div>

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
                      {["Invoice No", "Created By", "Date & Time", "Customer Name", "Amount", "Actions"].map(h => (
                        <th key={h} className={`px-4 py-3 text-xs font-bold text-white uppercase tracking-wider ${h === "Amount" ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((inv, index) => (
                      <tr key={inv.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{inv.invoice_no}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{inv.salesman?.name || 'N/A'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{formatDateTime(inv.created_at)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <p>{inv.customer?.name || inv.temp_name || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{inv.customer?.area || inv.customer?.address1 || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 whitespace-nowrap">
                          ₹{formatNumber(inv.Total, 2, '0.00')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button onClick={() => handleViewInvoice(inv.id)}
                            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
                          >View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination currentPage={currentPage} totalItems={totalCount} itemsPerPage={itemsPerPage}
                onPageChange={(p) => setCurrentPage(p)} label="invoices" colorScheme="teal" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}