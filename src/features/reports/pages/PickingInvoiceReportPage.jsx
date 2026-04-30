import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useUrlPage from '../../../utils/useUrlPage';
import { getPickingHistory } from "../../../services/sales";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import { formatDateDDMMYYYY, formatTime } from '../../../utils/formatters';
import { X, Search } from 'lucide-react';
import ClearFiltersButton from '../../../components/ClearFiltersButton';
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

const STATUS_BADGE = {
  PREPARING: "bg-blue-100 text-blue-700 border-blue-300",
  PICKED:    "bg-emerald-100 text-emerald-700 border-emerald-300",
  VERIFIED:  "bg-green-100 text-green-700 border-green-300",
  REVIEW:    "bg-red-100 text-red-700 border-red-300",
  CANCELLED: "bg-gray-100 text-gray-600 border-gray-300",
};

export default function PickingInvoiceReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rawSessions, setRawSessions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useUrlPage();
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(100);
  const [savedFilters, saveFilters] = usePersistedFilters('picking-report-filters', {
    invoiceDateFilter: new Date().toISOString().split('T')[0],
    pickingDateFilter: new Date().toISOString().split('T')[0],
    searchQuery: '',
  });
  const [invoiceDateFilter, setInvoiceDateFilter] = useState(savedFilters.invoiceDateFilter);
  const [pickingDateFilter, setPickingDateFilter] = useState(savedFilters.pickingDateFilter);
  const [searchQuery, setSearchQuery] = useState(savedFilters.searchQuery);
  const [timeFilter, setTimeFilter] = useState('');
  const searchRef = useRef(null);

  const debouncedSearch = useDebounce(searchQuery, 400);

  useEffect(() => { searchRef.current?.focus(); }, []);

  useEffect(() => {
    saveFilters({ invoiceDateFilter, pickingDateFilter, searchQuery });
  }, [invoiceDateFilter, pickingDateFilter, searchQuery]);

  useEffect(() => {
    loadSessions();
  }, [currentPage, invoiceDateFilter, pickingDateFilter, debouncedSearch, timeFilter]);

  const sortByStartTime = (arr) =>
    [...arr].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

  const loadSessions = async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, page_size: itemsPerPage };
      
      // Invoice date filter (DATE & TIME column - invoice created date)
      if (invoiceDateFilter) { 
        params.invoice_start_date = invoiceDateFilter; 
        params.invoice_end_date = invoiceDateFilter; 
      }
      
      // Picking date filter (PICKING DATE & TIME column - when picking session happened)
      if (pickingDateFilter) { 
        params.picking_start_date = pickingDateFilter; 
        params.picking_end_date = pickingDateFilter; 
      }
      
      if (timeFilter) {
        const cutoff = new Date(Date.now() - parseInt(timeFilter) * 60 * 60 * 1000);
        params.start_time = cutoff.toISOString();
      }

      const q = debouncedSearch.trim().toLowerCase();

      if (!q) {
        const res = await getPickingHistory(params);
        const results = sortByStartTime(res.data.results || []);
        setRawSessions(results);
        setSessions(results);
        setTotalCount(res.data.count || 0);
      } else {
        // Try API search first
        const searchRes = await getPickingHistory({ ...params, search: debouncedSearch });
        const searchResults = searchRes.data.results || [];

        if (searchResults.length > 0) {
          const sorted = sortByStartTime(searchResults);
          setRawSessions(sorted);
          setSessions(sorted);
          setTotalCount(searchRes.data.count || 0);
        } else {
          // Fallback: client-side picker name filter
          const allParams = { page_size: 10000 };
          if (invoiceDateFilter) { allParams.invoice_start_date = invoiceDateFilter; allParams.invoice_end_date = invoiceDateFilter; }
          if (pickingDateFilter) { allParams.picking_start_date = pickingDateFilter; allParams.picking_end_date = pickingDateFilter; }

          const allRes = await getPickingHistory(allParams);
          const allResults = sortByStartTime(allRes.data.results || []);

          const pickerMatches = allResults.filter(s =>
            (s.picker_name || '').toLowerCase().includes(q)
          );
          setRawSessions(allResults);
          setSessions(pickerMatches);
          setTotalCount(pickerMatches.length);
        }
      }
    } catch (err) {
      console.error("Failed to load picking report:", err);
      toast.error("Failed to load picking report");
    } finally {
      setLoading(false);
    }
  };

  const handleViewSession = (session) => {
    saveFilters({ invoiceDateFilter, pickingDateFilter, searchQuery });
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
      packer_info: null,
      delivery_info: null,
    };
    const isOpsUser = ["PICKER", "PACKER", "BILLER", "DELIVERY", "STORE"].includes(user?.role);
    navigate(`${isOpsUser ? '/ops/picking/invoices/view' : '/invoices/view'}/${session.id}`, {
      state: { backPath: "/history/picking-report", invoiceData }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Picking Report</h1>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm p-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">

            {/* Invoice Date */}
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Invoice Date:</label>
              <input
                type="date"
                value={invoiceDateFilter}
                onChange={(e) => { setInvoiceDateFilter(e.target.value); setCurrentPage(1); }}
                className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>

            {/* Picking Date */}
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Picking Date:</label>
              <input
                type="date"
                value={pickingDateFilter}
                onChange={(e) => { setPickingDateFilter(e.target.value); setCurrentPage(1); }}
                className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>

            {/* Unified Search */}
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Search:</label>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Invoice No, Customer or Picker..."
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
              onClick={() => { loadSessions(); toast.success("Report Generated"); }}
              className="px-4 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow hover:from-teal-600 hover:to-cyan-700 transition-all whitespace-nowrap ml-auto"
            >
              Generate
            </button>
            <ClearFiltersButton onClear={() => { setInvoiceDateFilter(new Date().toISOString().split('T')[0]); setPickingDateFilter(new Date().toISOString().split('T')[0]); setSearchQuery(''); setTimeFilter(''); setCurrentPage(1); }} />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-500">Loading report...</div>
          ) : sessions.length === 0 ? (
            <div className="py-20 text-center text-gray-500">No picking records found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                    <tr>
                      {["Invoice No", "Date & Time", "Customer", "Picker", "Picking Date & Time", "Status", "Actions"].map(h => (
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
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          <p>{formatDateDDMMYYYY(session.invoice_created_at)}</p>
                          <p className="text-xs text-gray-500">{formatTime(session.invoice_created_at)}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <p>{session.customer_name || '—'}</p>
                          <p className="text-xs text-gray-500">{session.customer_area || session.customer_address || session.temp_name || '—'}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          <p>{session.picker_name || '—'}</p>
                          {session.source === 'EXPRESS_BILLING' && (
                            <p className="text-xs text-teal-600 font-semibold">Express Billing</p>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          <p>{formatDateDDMMYYYY(session.created_at)}</p>
                          <p className="text-xs text-gray-500">
                            {formatTime(session.start_time)}
                            {session.end_time ? ` → ${formatTime(session.end_time)}` : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full border text-xs font-bold ${STATUS_BADGE[session.picking_status] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                            {session.picking_status || '—'}
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