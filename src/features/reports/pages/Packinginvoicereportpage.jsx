import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import { formatDateDDMMYYYY, formatTime } from '../../../utils/formatters';
import { X, Search } from 'lucide-react';
import { useAuth } from "../../auth/AuthContext";

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const STATUS_BADGE = {
  PACKING:   "bg-blue-100 text-blue-700 border-blue-300",
  PACKED:    "bg-emerald-100 text-emerald-700 border-emerald-300",
  VERIFIED:  "bg-green-100 text-green-700 border-green-300",
  REVIEW:    "bg-red-100 text-red-700 border-red-300",
  CANCELLED: "bg-gray-100 text-gray-600 border-gray-300",
};

export default function PackingInvoiceReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rawSessions, setRawSessions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(100);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState('');
  const searchRef = useRef(null);

  const debouncedSearch = useDebounce(searchQuery, 400);

  useEffect(() => { searchRef.current?.focus(); }, []);

  useEffect(() => {
    loadSessions();
  }, [currentPage, dateFilter, debouncedSearch, timeFilter]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, page_size: itemsPerPage };
      if (dateFilter) { params.start_date = dateFilter; params.end_date = dateFilter; }
      if (timeFilter) {
        const cutoff = new Date(Date.now() - parseInt(timeFilter) * 60 * 60 * 1000);
        params.start_time = cutoff.toISOString();
      }

      const q = debouncedSearch.trim().toLowerCase();

      if (!q) {
        const res = await api.get("/sales/packing/history/", { params });
        const results = res.data.results || [];
        setRawSessions(results);
        setSessions(results);
        setTotalCount(res.data.count || 0);
      } else {
        // Try API search first
        const searchRes = await api.get("/sales/packing/history/", { params: { ...params, search: debouncedSearch } });
        const searchResults = searchRes.data.results || [];

        if (searchResults.length > 0) {
          setRawSessions(searchResults);
          setSessions(searchResults);
          setTotalCount(searchRes.data.count || 0);
        } else {
          // Fallback: client-side packer name filter
          const allParams = { page_size: 10000 };
          if (dateFilter) { allParams.start_date = dateFilter; allParams.end_date = dateFilter; }

          const allRes = await api.get("/sales/packing/history/", { params: allParams });
          const allResults = allRes.data.results || [];

          const packerMatches = allResults.filter(s =>
            (s.packer_name || '').toLowerCase().includes(q)
          );
          setRawSessions(allResults);
          setSessions(packerMatches);
          setTotalCount(packerMatches.length);
        }
      }
    } catch (err) {
      console.error("Failed to load packing report:", err);
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
        area: session.customer_area || session.customer_address,
        code: '', phone2: '',
      },
      items: session.items || [],
      picker_info: session.picker_name
        ? { name: session.picker_name, email: session.picker_email, end_time: session.end_time }
        : null,
      packer_info: session.packer_name
        ? { name: session.packer_name, email: session.packer_email, end_time: session.end_time }
        : null,
      delivery_info: null,
    };
    const isOpsUser = ["PICKER", "PACKER", "BILLER", "DELIVERY", "STORE"].includes(user?.role);
    navigate(`${isOpsUser ? '/ops/packing/invoices/view' : '/packing/invoices/view'}/${session.id}`, {
      state: { backPath: "/history/packing-report", invoiceData }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Packing Report</h1>
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

            <div className="h-6 w-px bg-gray-200" />

            {/* Unified Search — invoice/customer via API, packer via client filter */}
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Search:</label>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Invoice No, Customer or Packer..."
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

            <button
              onClick={() => { loadSessions(); toast.success("Report refreshed"); }}
              className="px-4 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow hover:from-teal-600 hover:to-cyan-700 transition-all whitespace-nowrap ml-auto"
            >
              Generate
            </button>
          </div>
        </div>

        {/* Table */}
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
                      {["Invoice No", "Customer", "Packer", "Packing Date & Time", "Status", "Actions"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sessions.map((session, index) => (
                      <tr key={session.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {session.invoice_no}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <p>{session.customer_name || '—'}</p>
                          <p className="text-xs text-gray-500">{session.customer_area || session.customer_address || session.temp_name || '—'}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {session.packer_name || '—'}
                        </td>
                        {/* Merged Date + Start Time + End Time */}
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          <p>{formatDateDDMMYYYY(session.created_at)}</p>
                          <p className="text-xs text-gray-500">
                            {formatTime(session.start_time)}
                            {session.end_time ? ` → ${formatTime(session.end_time)}` : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full border text-xs font-bold ${STATUS_BADGE[session.packing_status] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                            {session.packing_status || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleViewSession(session)}
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
                label="records"
                colorScheme="teal"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}