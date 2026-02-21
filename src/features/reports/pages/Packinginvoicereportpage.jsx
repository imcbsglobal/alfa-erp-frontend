import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import { formatDateDDMMYYYY, formatTime } from '../../../utils/formatters';
import { X } from 'lucide-react';
import { useAuth } from "../../auth/AuthContext";

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
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [customerFilter, setCustomerFilter] = useState('');
  const [packerFilter, setPackerFilter] = useState('');
  const searchInputRef = useRef(null);

  const debouncedCustomerFilter = useDebounce(customerFilter, 500);
  const debouncedPackerFilter = useDebounce(packerFilter, 500);

  useEffect(() => { searchInputRef.current?.focus(); }, []);

  useEffect(() => {
    loadSessions();
  }, [currentPage, itemsPerPage, statusFilter, dateFilter, debouncedCustomerFilter, debouncedPackerFilter]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const params = { page: currentPage, page_size: itemsPerPage };
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) { params.start_date = dateFilter; params.end_date = dateFilter; }
      if (debouncedCustomerFilter) params.search = debouncedCustomerFilter;
      if (debouncedPackerFilter) params.search = debouncedPackerFilter;

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
    // Normalize session fields to match the invoice shape CommonInvoiceView expects
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
    const basePath = isOpsUser ? "/ops/packing/invoices/view" : "/packing/invoices/view";

    navigate(`${basePath}/${session.id}`, {
      state: {
        backPath: "/history/packing-report",
        invoiceData,
      }
    });
  };

  const handleRefresh = () => { loadSessions(); toast.success("Report refreshed"); };

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
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Date:</label>
                <input type="date" value={dateFilter}
                  onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Customer:</label>
                <div className="relative">
                  <input ref={searchInputRef} type="text" placeholder="Search customer..." value={customerFilter}
                    onChange={(e) => { setCustomerFilter(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm min-w-[160px]"
                  />
                  {customerFilter && (
                    <button onClick={() => { setCustomerFilter(''); setCurrentPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Packer:</label>
                <div className="relative">
                  <input type="text" placeholder="Search packer..." value={packerFilter}
                    onChange={(e) => { setPackerFilter(e.target.value); setCurrentPage(1); }}
                    className="px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm min-w-[160px]"
                  />
                  {packerFilter && (
                    <button onClick={() => { setPackerFilter(''); setCurrentPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Rows:</label>
                <select value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white min-w-[80px]"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
              <button onClick={handleRefresh}
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
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Invoice No</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Packer</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Start Time</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">End Time</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sessions.map((session, index) => (
                      <tr key={session.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{session.invoice_no}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <p>{session.customer_name || '—'}</p>
                          <p className="text-xs text-gray-500">{session.customer_address || '—'}</p>
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
                          <button
                            onClick={() => handleViewSession(session)}
                            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
                          >View</button>
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