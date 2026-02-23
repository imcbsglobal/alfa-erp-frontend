import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import { formatDateDDMMYYYY, formatTime } from '../../../utils/formatters';
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

export default function PackingInvoiceReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  const debouncedSearch = useDebounce(searchQuery, 500);

  useEffect(() => { searchInputRef.current?.focus(); }, []);

  useEffect(() => {
    loadSessions();
  }, [currentPage, itemsPerPage, dateFilter, debouncedSearch]);

  // SSE Live Updates
  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE_URL}/sales/sse/invoices/`);
    eventSource.onmessage = (event) => {
      try {
        const invoice = JSON.parse(event.data);
        const q = debouncedSearch.toLowerCase();
        const matchesDate = !dateFilter || invoice.created_at?.startsWith(dateFilter);
        const matchesSearch = !q ||
          (invoice.invoice_no || '').toLowerCase().includes(q) ||
          (invoice.customer?.name || invoice.temp_name || '').toLowerCase().includes(q) ||
          (invoice.packer_info?.name || '').toLowerCase().includes(q);

        if (matchesDate && matchesSearch) {
          setSessions(prev => {
            const exists = prev.find(s => s.id === invoice.id);
            if (exists) return prev.map(s => s.id === invoice.id ? { ...s, ...invoice } : s);
            return [...prev, invoice].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          });
          setTotalCount(prev => prev + 1);
        }
      } catch (e) { console.error("Invalid SSE invoice:", e); }
    };
    eventSource.onerror = () => eventSource.close();
    return () => eventSource.close();
  }, [dateFilter, debouncedSearch]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, page_size: itemsPerPage };
      if (dateFilter) { params.start_date = dateFilter; params.end_date = dateFilter; }
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await api.get("/sales/packing/history/", { params });
      setSessions(res.data.results || []);
      setTotalCount(res.data.count || 0);
    } catch (err) {
      console.error("❌ Failed to load packing report:", err);
      toast.error("Failed to load packing report");
    } finally {
      setLoading(false);
    }
  };

  const handleViewSession = (session) => {
    const invoiceData = {
      id: session.id,
      invoice_no: session.invoice_no,
      invoice_date: session.invoice_date,
      status: session.invoice_status,
      remarks: session.invoice_remarks,
      temp_name: session.temp_name || '',
      Total: session.Total,
      created_at: session.created_at,
      created_by: session.salesman_name,
      priority: session.priority || 'LOW',
      salesman: { name: session.salesman_name },
      customer: {
        name: session.customer_name,
        email: session.customer_email,
        phone1: session.customer_phone,
        address1: session.customer_address,
        area: session.customer_address,
        code: '',
        phone2: '',
      },
      items: session.items || [],
      picker_info: session.picker_name ? {
        name: session.picker_name,
        email: session.picker_email,
        end_time: session.end_time,
      } : null,
      packer_info: session.packer_name ? {
        name: session.packer_name,
        email: session.packer_email,
        end_time: session.end_time,
      } : null,
      delivery_info: null,
    };

    const isOpsUser = ["PICKER", "PACKER", "BILLER", "DELIVERY", "STORE"].includes(user?.role);
    navigate(`${isOpsUser ? '/ops/packing/invoices/view' : '/packing/invoices/view'}/${session.id}`, {
      state: { backPath: "/history/packing-report", invoiceData }
    });
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "PACKING":   return "bg-blue-100 text-blue-700 border-blue-300";
      case "PACKED":    return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "VERIFIED":  return "bg-green-100 text-green-700 border-green-300";
      case "REVIEW":    return "bg-red-100 text-red-700 border-red-300";
      case "CANCELLED": return "bg-gray-100 text-gray-600 border-gray-300";
      default:          return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Packing Report</h1>
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
                    placeholder="Invoice No, Customer, Packer..."
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

              <button onClick={() => { loadSessions(); toast.success("Report refreshed"); }}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all whitespace-nowrap"
              >Generate</button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-500">Loading report...</div>
          ) : sessions.length === 0 ? (
            <div className="py-20 text-center text-gray-500">No packing records found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                    <tr>
                      {["Invoice No", "Customer", "Packer", "Date", "Start Time", "End Time", "Status", "Actions"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sessions.map((session, index) => (
                      <tr key={session.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{session.invoice_no}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <p>{session.customer_name || '—'}</p>
                          <p className="text-xs text-gray-500">{session.customer_area || session.customer_address || session.temp_name || '—'}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{session.packer_name || '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{formatDateDDMMYYYY(session.created_at)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{formatTime(session.start_time)}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{session.end_time ? formatTime(session.end_time) : '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full border text-xs font-bold ${getStatusBadgeColor(session.packing_status)}`}>
                            {session.packing_status || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button onClick={() => handleViewSession(session)}
                            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
                          >View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination currentPage={currentPage} totalItems={totalCount} itemsPerPage={itemsPerPage}
                onPageChange={(p) => setCurrentPage(p)} label="records" colorScheme="teal" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}