import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useUrlPage from '../../../utils/useUrlPage';
import { getDeliveryHistory, getCourierAuditLogs, getCouriers, getEligibleDeliveryStaff } from "../../../services/sales";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import { formatDateDDMMYYYY, formatTime } from '../../../utils/formatters';
import { X, Search, ChevronDown, Filter } from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from "../../auth/AuthContext";
import { usePersistedFilters } from '../../../utils/usePersistedFilters';
import ClearFiltersButton from '../../../components/ClearFiltersButton';

const toIsoDate = (value) => {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
};

const getSessionFilterDate = (session) => {
  const primary = session?.delivery_status === 'DELIVERED'
    ? (session?.end_time || session?.start_time || session?.created_at)
    : (session?.start_time || session?.created_at);
  return toIsoDate(primary);
};

const getSessionDisplayDateTime = (session) => {
  if (session?.delivery_status === 'DELIVERED') {
    return session?.end_time || session?.start_time || session?.created_at;
  }
  return session?.start_time || session?.created_at;
};

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const STATUS_BADGE = {
  TO_CONSIDER: "bg-amber-100 text-amber-700 border-amber-300",
  IN_TRANSIT:  "bg-blue-100 text-blue-700 border-blue-300",
  DELIVERED:   "bg-emerald-100 text-emerald-700 border-emerald-300",
  CANCELLED:   "bg-gray-100 text-gray-600 border-gray-300",
};

const DELIVERY_LABEL = {
  INTERNAL: "Company Delivery",
  COURIER: "Courier Delivery",
  DIRECT: "Counter Pickup",
};

// ─── Box weight helpers ────────────────────────────────────────────────────────
const getBoxWeight = (session) => {
  const weights = (
    session?.invoice_box_weights ||
    session?.delivery_info?.box_weights ||
    session?.packer_info?.box_weights ||
    session?.box_weights ||
    null
  );
  if (typeof weights === 'number') return weights;
  if (Array.isArray(weights)) return weights;
  return null;
};

const formatBoxWeights = (weights) => {
  if (!weights) return null;
  const array = Array.isArray(weights) ? weights : [weights];
  const total = array.reduce((sum, w) => sum + (w || 0), 0);
  if (array.length === 1) return ` ${array[0]} kg`;
  return ` ${total} kg (${array.length})`;
};

export default function DeliveryReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rawSessions, setRawSessions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useUrlPage();
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(100);
  const [couriers, setCouriers] = useState([]);
  const [loadingCouriers, setLoadingCouriers] = useState(false);
  const [companyDeliveryUsers, setCompanyDeliveryUsers] = useState([]);
  const [loadingDeliveryUsers, setLoadingDeliveryUsers] = useState(false);

  const [savedFilters, saveFilters] = usePersistedFilters('delivery-report-filters', {
    dateFilter: new Date().toISOString().split('T')[0],
    searchQuery: '',
    deliveryTypeFilter: 'ALL',
    statusFilter: 'ALL',
    courierFilter: 'ALL',
    companyDeliveryUserFilter: 'ALL',
  });

  const [dateFilter, setDateFilter] = useState(savedFilters.dateFilter);
  const [searchQuery, setSearchQuery] = useState(savedFilters.searchQuery);
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState(savedFilters.deliveryTypeFilter);
  const [statusFilter, setStatusFilter] = useState(savedFilters.statusFilter);
  const [courierFilter, setCourierFilter] = useState(savedFilters.courierFilter);
  const [companyDeliveryUserFilter, setCompanyDeliveryUserFilter] = useState(savedFilters.companyDeliveryUserFilter);
  const [timeFilter] = useState('');
  const searchRef = useRef(null);

  const [attachmentModal, setAttachmentModal] = useState({ open: false, url: '', type: '' });
  const [expandedAuditLogs, setExpandedAuditLogs] = useState({});
  const [auditLogCache, setAuditLogCache] = useState({});

  const [showBulkHistory, setShowBulkHistory] = useState(false);
  const [bulkHistory, setBulkHistory] = useState([]);
  const [bulkHistoryLoading, setBulkHistoryLoading] = useState(false);
  const [bulkHistorySearch, setBulkHistorySearch] = useState('');
  const [bulkHistoryDateFilter, setBulkHistoryDateFilter] = useState('');
  const [bulkHistoryPage, setBulkHistoryPage] = useState(1);
  const BULK_HISTORY_PAGE_SIZE = 5;

  const debouncedSearch = useDebounce(searchQuery, 400);

  const loadBulkDeliveryHistory = async () => {
    setBulkHistoryLoading(true);
    try {
      const res = await api.get('/sales/admin/bulk-status-history/');
      if (res.data.success) {
        const filtered = res.data.results.filter(
          (r) => r.from_status === 'PACKED' && r.to_status === 'DELIVERED'
        );
        setBulkHistory(filtered);
      }
    } catch (err) {
      toast.error('Failed to load bulk delivery history');
    } finally {
      setBulkHistoryLoading(false);
    }
  };

  useEffect(() => { searchRef.current?.focus(); }, []);

  useEffect(() => {
    saveFilters({ dateFilter, searchQuery, deliveryTypeFilter, statusFilter, courierFilter, companyDeliveryUserFilter });
  }, [dateFilter, searchQuery, deliveryTypeFilter, statusFilter, courierFilter, companyDeliveryUserFilter]);

  useEffect(() => {
    if (deliveryTypeFilter === 'COURIER') loadCouriersList();
  }, [deliveryTypeFilter]);

  useEffect(() => {
    if (deliveryTypeFilter === 'INTERNAL') loadCompanyDeliveryUsers();
  }, [deliveryTypeFilter]);

  useEffect(() => {
    if (deliveryTypeFilter !== 'COURIER') setCourierFilter('ALL');
  }, [deliveryTypeFilter]);

  useEffect(() => {
    if (deliveryTypeFilter !== 'INTERNAL') setCompanyDeliveryUserFilter('ALL');
  }, [deliveryTypeFilter]);

  const loadCouriersList = async () => {
    setLoadingCouriers(true);
    try {
      const response = await getCouriers();
      setCouriers(response?.data?.data || []);
    } catch (err) {
      console.error("Failed to load couriers:", err);
      setCouriers([]);
    } finally {
      setLoadingCouriers(false);
    }
  };

  const loadCompanyDeliveryUsers = async () => {
    setLoadingDeliveryUsers(true);
    try {
      const res = await getEligibleDeliveryStaff();
      const users = res?.data?.data?.results || [];
      setCompanyDeliveryUsers(users.map(u => ({
        id: u.id,
        name: u.name || u.full_name || u.email,
        email: u.email,
        role: u.role,
      })));
    } catch (err) {
      console.error("Failed to load company delivery users:", err);
      setCompanyDeliveryUsers([]);
    } finally {
      setLoadingDeliveryUsers(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [currentPage, dateFilter, debouncedSearch, timeFilter, deliveryTypeFilter, statusFilter, courierFilter, companyDeliveryUserFilter]);

  const groupedSessions = useMemo(() => {
    const grouped = {};
    sessions.forEach((s) => {
      const key = s.boxing_group_id || `single-${s.id}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    });
    return grouped;
  }, [sessions]);

  const sortByStartTime = (arr) =>
    [...arr].sort((a, b) => new Date(a.start_time || a.created_at) - new Date(b.start_time || b.created_at));

  const toggleAuditLogs = async (invoiceNo) => {
    const key = `audit-${invoiceNo}`;
    if (!expandedAuditLogs[key] && !auditLogCache[invoiceNo]) {
      try {
        const response = await getCourierAuditLogs(invoiceNo);
        setAuditLogCache(prev => ({ ...prev, [invoiceNo]: response.data.data || [] }));
      } catch (err) {
        setAuditLogCache(prev => ({ ...prev, [invoiceNo]: [] }));
      }
    }
    setExpandedAuditLogs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const loadSessions = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (timeFilter) {
        const cutoff = new Date(Date.now() - parseInt(timeFilter, 10) * 60 * 60 * 1000);
        params.start_time = cutoff.toISOString();
      }
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (deliveryTypeFilter !== 'ALL') params.delivery_type = deliveryTypeFilter;
      if (courierFilter !== 'ALL') params.courier_name = courierFilter;
      if (dateFilter) { params.start_date = dateFilter; params.end_date = dateFilter; }
      params.page = currentPage;

      const res = await getDeliveryHistory(params);
      const rawData = res.data.results || [];
      const q = debouncedSearch.trim().toLowerCase();

      let filteredResults = !q
        ? rawData
        : rawData.filter((s) => [
            s.invoice_no, s.customer_name, s.customer_area, s.customer_address,
            s.delivery_user_name, s.delivery_user_email, s.courier_name, s.tracking_no, s.notes,
          ].filter(Boolean).some((val) => String(val).toLowerCase().includes(q)));

      if (statusFilter !== 'ALL') {
        filteredResults = filteredResults.filter((s) => s.delivery_status === statusFilter);
      }

      if (courierFilter !== 'ALL' && deliveryTypeFilter === 'COURIER') {
        filteredResults = filteredResults.filter((s) => s.courier_name === courierFilter);
      }

      if (companyDeliveryUserFilter !== 'ALL' && deliveryTypeFilter === 'INTERNAL') {
        const selectedUser = companyDeliveryUsers.find(u => u.id === companyDeliveryUserFilter);
        if (selectedUser) {
          filteredResults = filteredResults.filter((s) =>
            s.delivery_user_email === selectedUser.email ||
            s.delivery_user_name === selectedUser.name
          );
        }
      }

      const sortedResults = sortByStartTime(filteredResults);
      setRawSessions(res.data.results || []);
      setSessions(sortedResults);
      setTotalCount(res.data.count || 0);
    } catch (err) {
      console.error("Failed to load delivery report:", err);
      toast.error("Failed to load delivery report");
    } finally {
      setLoading(false);
    }
  };

  const handleViewSession = (session) => {
    saveFilters({ dateFilter, searchQuery, deliveryTypeFilter, statusFilter });
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
      picker_info: null,
      packer_info: null,
      delivery_info: {
        delivery_type: session.delivery_type,
        delivery_status: session.delivery_status,
        delivery_user_email: session.delivery_user_email,
        delivery_user_name: session.delivery_user_name,
        courier_name: session.courier_name,
        tracking_no: session.tracking_no,
        start_time: session.start_time,
        end_time: session.end_time,
        notes: session.notes,
      },
    };
    const isOpsUser = ["PICKER", "PACKER", "BILLER", "DELIVERY", "STORE"].includes(user?.role);
    navigate(`${isOpsUser ? '/ops/delivery/invoices/view' : '/delivery/invoices/view'}/${session.id}`, {
      state: { backPath: "/history/delivery-report", invoiceData }
    });
  };

  const getPreferredInvoiceFromGroupId = (boxing_group_id, rows) => {
    if (!boxing_group_id) return null;
    const parts = String(boxing_group_id).split("|");
    if (parts.length < 2) return null;
    const preferredNo = parts[1];
    return rows.find((r) => r.invoice_no === preferredNo) || null;
  };

  const getCourierSlipUrl = (session) => session?.courier_slip_url || session?.courier_slip || "";

  const renderCourierAuditTrail = (invoiceNo) => {
    const logs = auditLogCache[invoiceNo] || [];
    if (!logs.length) return null;
    return (
      <div className="mt-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="text-xs font-bold text-gray-700 mb-2">📋 Courier Change History:</p>
        <div className="space-y-2">
          {logs.map((log, idx) => (
            <div key={log.id} className="text-xs bg-white p-2 rounded border border-gray-100">
              <div className="flex items-start justify-between">
                <span className="font-semibold text-gray-900">Change #{logs.length - idx}</span>
                <span className="text-gray-500">{formatTime(log.changed_at)}</span>
              </div>
              <p className="text-gray-600 mt-1">
                <span className="font-medium">{log.changed_by_name}</span>
                {log.changed_by_email && <span className="text-gray-500"> ({log.changed_by_email})</span>}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-semibold">
                  {log.old_courier_name || 'N/A'}
                </span>
                <span className="text-gray-400">→</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-semibold">
                  {log.new_courier_name || 'N/A'}
                </span>
              </div>
              {log.reason && (
                <p className="text-gray-600 italic mt-1">
                  <span className="font-medium">Reason:</span> {log.reason}
                </p>
              )}
              <p className="text-gray-500 text-[9px] mt-1">
                {formatDateDDMMYYYY(log.changed_at)} at {formatTime(log.changed_at)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getPickupDisplayName = (session) => (
    session?.temp_name || session?.customer_display_name || session?.customer_name || '—'
  );

  const renderAttachmentLink = (session) => {
    const url = session?.attachment_url;
    if (!url) return null;
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isImage) setAttachmentModal({ open: true, url, type: 'image' });
          else window.open(url, '_blank');
        }}
        className="inline-flex items-center gap-1 mt-1 text-xs text-teal-700 hover:text-teal-900 font-semibold hover:underline"
      >
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
        View Attachment
      </button>
    );
  };

  const renderDeliveryDetails = (session) => {
    if (session.delivery_type === 'COURIER') {
      const slipUrl = getCourierSlipUrl(session);
      const auditKey = `audit-${session.invoice_no}`;
      const isAuditExpanded = expandedAuditLogs[auditKey];
      return (
        <div className="space-y-0.5">
          <p>{session.courier_name || 'Courier not set'}</p>
          {slipUrl ? (
            <a href={slipUrl} target="_blank" rel="noreferrer"
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline"
              onClick={(e) => e.stopPropagation()}>
              View Slip / Screenshot
            </a>
          ) : (
            <p className="text-xs text-teal-700">Slip not uploaded</p>
          )}
          {renderAttachmentLink(session)}
          {auditLogCache[session.invoice_no]?.length > 0 && (
            <button onClick={(e) => { e.stopPropagation(); toggleAuditLogs(session.invoice_no); }}
              className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline">
              <ChevronDown size={14} style={{ transform: isAuditExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              {isAuditExpanded ? 'Hide' : 'View'} Change History
            </button>
          )}
          {isAuditExpanded && auditLogCache[session.invoice_no]?.length > 0 && (
            <div onClick={(e) => e.stopPropagation()}>{renderCourierAuditTrail(session.invoice_no)}</div>
          )}
        </div>
      );
    }

    if (session.delivery_type === 'DIRECT') {
      return (
        <div className="space-y-0.5">
          <p className="font-medium">{session.counter_sub_mode === 'company' ? 'Direct Company' : 'Direct Patient'}</p>
          {session.counter_sub_mode === 'company' ? (
            <>
              <p className="text-xs font-semibold text-teal-700">
                Customer: {getPickupDisplayName(session)}
              </p>
              <p className="text-xs font-semibold text-teal-700">
                Company: {session.pickup_company_name ? session.pickup_company_name : <span className="text-red-600 font-medium">Required</span>}
              </p>
            </>
          ) : (
            <p className="text-xs font-semibold text-teal-700">Customer: {getPickupDisplayName(session)}</p>
          )}
          {renderAttachmentLink(session)}
        </div>
      );
    }

    if (session.delivery_type === 'INTERNAL') {
      const mapUrl = session.delivery_latitude && session.delivery_longitude
        ? `https://www.google.com/maps?q=${session.delivery_latitude},${session.delivery_longitude}`
        : null;
      return (
        <div className="space-y-0.5">
          <p>{session.delivery_user_name || '—'}</p>
          <p className="text-xs text-gray-500">{session.delivery_user_email || '—'}</p>
          {mapUrl && (
            <a href={mapUrl} target="_blank" rel="noreferrer"
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline"
              onClick={(e) => e.stopPropagation()}>
              Open Location
            </a>
          )}
          {renderAttachmentLink(session)}
        </div>
      );
    }

    return <p>—</p>;
  };

  const getFilteredInvoices = (entry) => {
    const searchLower = bulkHistorySearch.trim().toLowerCase();

    if (!searchLower) return entry.invoices || [];

    return (entry.invoices || []).filter(
      (inv) =>
        inv.invoice_no?.toLowerCase().includes(searchLower) ||
        inv.customer_name?.toLowerCase().includes(searchLower)
    );
  };

  const filteredBulkHistory = bulkHistory.filter((entry) => {
    // Match executed_at date against selected date
    const matchesDate = bulkHistoryDateFilter
      ? new Date(entry.executed_at || entry.updated_at).toISOString().slice(0, 10) === bulkHistoryDateFilter
      : true;

    // Search across run fields AND invoice rows
    const searchLower = bulkHistorySearch.trim().toLowerCase();
    const matchesSearch = !searchLower
      ? true
      : entry.performed_by?.toLowerCase().includes(searchLower) ||
        entry.from_date?.toLowerCase().includes(searchLower) ||
        entry.to_date?.toLowerCase().includes(searchLower) ||
        String(entry.count || '').includes(searchLower) ||
        (entry.invoices || []).some(
          (inv) =>
            inv.invoice_no?.toLowerCase().includes(searchLower) ||
            inv.customer_name?.toLowerCase().includes(searchLower)
        );

    return matchesDate && matchesSearch;
  });

  const bulkHistoryTotalPages = Math.ceil(filteredBulkHistory.length / BULK_HISTORY_PAGE_SIZE);
  const paginatedBulkHistory = filteredBulkHistory.slice(
    (bulkHistoryPage - 1) * BULK_HISTORY_PAGE_SIZE,
    bulkHistoryPage * BULK_HISTORY_PAGE_SIZE
  );

  // Count active filters for badge
  const activeFilterCount = [
    deliveryTypeFilter !== 'ALL',
    statusFilter !== 'ALL',
    courierFilter !== 'ALL',
    companyDeliveryUserFilter !== 'ALL',
    !!searchQuery,
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    setDeliveryTypeFilter('ALL');
    setStatusFilter('ALL');
    setCourierFilter('ALL');
    setCompanyDeliveryUserFilter('ALL');
    setSearchQuery('');
    setCurrentPage(1);
    toast.success('Filters cleared');
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">

          {/* ── Header ── */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Delivery Report</h1>
              <p className="text-xs text-gray-400 mt-0.5">Track and review all delivery activity</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setShowBulkHistory(true);
                  setBulkHistorySearch('');
                  setBulkHistoryDateFilter('');
                  setBulkHistoryPage(1);
                  loadBulkDeliveryHistory();
                }}
                className="px-4 py-2 bg-white border border-teal-400 text-teal-700 rounded-lg
                          font-semibold text-sm shadow-sm hover:bg-teal-50 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Bulk Delivery History
              </button>
              <button
                onClick={() => { loadSessions(); toast.success("Report refreshed"); }}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg
                          font-semibold text-sm shadow hover:from-teal-600 hover:to-cyan-700 transition-all"
              >
                Generate
              </button>
            </div>
          </div>

          {/* ── Filter Bar ── */}
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

              {/* Delivery Type */}
              <div className="flex items-center gap-1.5">
                <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Type:</label>
                <select
                  value={deliveryTypeFilter}
                  onChange={(e) => { setDeliveryTypeFilter(e.target.value); setCurrentPage(1); }}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                >
                  <option value="ALL">All Types</option>
                  <option value="INTERNAL">Company Delivery</option>
                  <option value="COURIER">Courier Delivery</option>
                  <option value="DIRECT">Counter Pickup</option>
                </select>
              </div>

              {/* Courier Service — only shown when COURIER */}
              {deliveryTypeFilter === 'COURIER' && (
                <>
                  <div className="flex items-center gap-1.5">
                    <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Courier:</label>
                    <select
                      value={courierFilter}
                      onChange={(e) => { setCourierFilter(e.target.value); setCurrentPage(1); }}
                      disabled={loadingCouriers}
                      className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="ALL">{loadingCouriers ? 'Loading...' : 'All Couriers'}</option>
                      {couriers.map((courier) => (
                        <option key={courier.courier_id} value={courier.courier_name}>
                          {courier.courier_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Assigned To — only shown when INTERNAL */}
              {deliveryTypeFilter === 'INTERNAL' && (
                <>
                  <div className="flex items-center gap-1.5">
                    <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Assigned To:</label>
                    <select
                      value={companyDeliveryUserFilter}
                      onChange={(e) => { setCompanyDeliveryUserFilter(e.target.value); setCurrentPage(1); }}
                      disabled={loadingDeliveryUsers}
                      className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="ALL">{loadingDeliveryUsers ? 'Loading...' : 'All Users'}</option>
                      {companyDeliveryUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}{u.email ? ` (${u.email})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Status */}
              <div className="flex items-center gap-1.5">
                <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                >
                  <option value="ALL">All Status</option>
                  <option value="TO_CONSIDER">To Consider</option>
                  <option value="IN_TRANSIT">In Transit</option>
                  <option value="DELIVERED">Delivered</option>
                </select>
              </div>

              {/* Search */}
              <div className="flex items-center gap-1.5">
                <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Search:</label>
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Invoice, customer, delivery staff..."
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

              {/* Clear Filters Button */}
              <ClearFiltersButton onClear={handleClearFilters} activeCount={activeFilterCount} />
            </div>
          </div>

          {/* ── Table ── */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {loading ? (
              <div className="py-20 text-center text-gray-500">Loading report...</div>
            ) : sessions.length === 0 ? (
              <div className="py-20 text-center text-gray-500">No delivery records found</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '20%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '13%' }} />
                      <col style={{ width: '11%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '9%' }} />
                    </colgroup>
                    <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                      <tr>
                        {["Invoice No", "Customer", "Delivery Details", "Delivery Type", "Delivery Start Date & Time", "Delivery End Date & Time", "Status", "Actions"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        return Object.entries(groupedSessions).map(([groupKey, rows], groupIndex) => {
                          const isGroup = rows.length > 1;
                          const first = rows[0];

                          if (isGroup) {
                            return (
                              <React.Fragment key={groupKey}>
                                <tr>
                                  <td colSpan="8" className="p-0">
                                    <div className="mx-3 mt-2 rounded-t-lg border-2 border-b-0 border-teal-400 bg-teal-50 px-3 py-1.5">
                                      <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded bg-teal-600 flex items-center justify-center flex-shrink-0">
                                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                          </svg>
                                        </div>
                                        <span className="text-xs font-semibold text-teal-900">
                                          Consolidated · {rows.length} invoices
                                          {first.courier_name && <span className="ml-2 text-teal-700">· {first.courier_name}</span>}
                                          {first.label_count != null && <span className="ml-2 text-teal-600">· {first.label_count} box(es)</span>}
                                          {(() => {
                                            const weights = getBoxWeight(first);
                                            const weightsDisplay = formatBoxWeights(weights);
                                            if (weightsDisplay) return <span className="ml-2 text-teal-600">· {weightsDisplay}</span>;
                                            return null;
                                          })()}
                                          {(() => {
                                            const preferred = getPreferredInvoiceFromGroupId(first.boxing_group_id, rows);
                                            if (!preferred) return null;
                                            return (
                                              <span className="ml-2 px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full text-[10px] font-bold">
                                                Address: {preferred.customer_name}
                                              </span>
                                            );
                                          })()}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                </tr>

                                {rows.map((session, idx) => {
                                  const isLast = idx === rows.length - 1;
                                  return (
                                    <tr key={session.id} style={{ background: '#f7fdfb' }}>
                                      <td colSpan="7" className="p-0">
                                        <div className={`mx-3 border-l-2 border-r-2 border-teal-400 ${isLast ? 'border-b-2 rounded-b-lg mb-2' : ''} px-0`}>
                                          <table className="w-full" style={{ tableLayout: 'fixed' }}>
                                            <colgroup>
                                              <col style={{ width: '10%' }} />
                                              <col style={{ width: '15%' }} />
                                              <col style={{ width: '17%' }} />
                                              <col style={{ width: '10%' }} />
                                              <col style={{ width: '13%' }} />
                                              <col style={{ width: '13%' }} />
                                              <col style={{ width: '10%' }} />
                                              <col style={{ width: '12%' }} />
                                            </colgroup>
                                            <tbody>
                                              <tr className={`${isLast ? '' : 'border-b border-teal-100'}`}>
                                                <td className="px-4 py-2 pl-8 text-sm font-medium text-teal-700">{session.invoice_no}</td>
                                                <td className="px-4 py-2 text-sm text-gray-700">
                                                  <p>{session.customer_name || '—'}</p>
                                                  <p className="text-xs text-gray-500">{session.customer_area || session.customer_address || session.temp_name || '—'}</p>
                                                  {(() => {
                                                    const boxCount = session.label_count || session.tray_codes?.length || 0;
                                                    const weights = getBoxWeight(session);
                                                    const weightsDisplay = formatBoxWeights(weights);
                                                    if (boxCount > 0 || weightsDisplay) {
                                                      return (
                                                        <p className="text-xs text-teal-600 font-semibold mt-1">
                                                          {boxCount} box{boxCount !== 1 ? 'es' : ''}{weightsDisplay ? ` · ${weightsDisplay}` : ''}
                                                        </p>
                                                      );
                                                    }
                                                    return null;
                                                  })()}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-700">{renderDeliveryDetails(session)}</td>
                                                <td className="px-4 py-2 text-sm text-gray-700">
                                                  <p>{DELIVERY_LABEL[session.delivery_type] || session.delivery_type || '—'}</p>
                                                  {session.courier_name && <p className="text-xs font-semibold text-blue-700">{session.courier_name}</p>}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-700">
                                                  <p>{formatDateDDMMYYYY(session.start_time || session.created_at)}</p>
                                                  <p className="text-xs text-gray-500">{formatTime(session.start_time || session.created_at)}</p>
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-700">
                                                  {session.end_time ? (
                                                    <>
                                                      <p>{formatDateDDMMYYYY(session.end_time)}</p>
                                                      <p className="text-xs text-gray-500">{formatTime(session.end_time)}</p>
                                                    </>
                                                  ) : <p className="text-gray-400">—</p>}
                                                </td>
                                                <td className="px-4 py-2">
                                                  <span className={`px-2 py-1 rounded-full border text-xs font-bold ${STATUS_BADGE[session.delivery_status] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                                                    {session.delivery_status || '—'}
                                                  </span>
                                                </td>
                                                <td className="px-4 py-2">
                                                  <button
                                                    onClick={() => handleViewSession(session)}
                                                    className="px-3 py-1.5 bg-teal-600 text-white rounded-lg font-semibold text-xs hover:bg-teal-700"
                                                  >
                                                    View
                                                  </button>
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </React.Fragment>
                            );
                          }

                          return (
                            <tr key={first.id} className={`hover:bg-gray-50 transition-colors ${groupIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{first.invoice_no}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <p>{first.customer_name || '—'}</p>
                                <p className="text-xs text-gray-500">{first.customer_area || first.customer_address || first.temp_name || '—'}</p>
                                {(() => {
                                  const boxCount = first.label_count || first.tray_codes?.length || 0;
                                  const weights = getBoxWeight(first);
                                  const weightsDisplay = formatBoxWeights(weights);
                                  if (boxCount > 0 || weightsDisplay) {
                                    return (
                                      <p className="text-xs text-teal-600 font-semibold mt-1">
                                        {boxCount} box{boxCount !== 1 ? 'es' : ''}{weightsDisplay ? ` · ${weightsDisplay}` : ''}
                                      </p>
                                    );
                                  }
                                  return null;
                                })()}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">{renderDeliveryDetails(first)}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <p>{DELIVERY_LABEL[first.delivery_type] || first.delivery_type || '—'}</p>
                                {first.courier_name && <p className="text-xs font-semibold text-blue-700">{first.courier_name}</p>}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <p>{formatDateDDMMYYYY(first.start_time || first.created_at)}</p>
                                <p className="text-xs text-gray-500">{formatTime(first.start_time || first.created_at)}</p>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {first.end_time ? (
                                  <>
                                    <p>{formatDateDDMMYYYY(first.end_time)}</p>
                                    <p className="text-xs text-gray-500">{formatTime(first.end_time)}</p>
                                  </>
                                ) : <p className="text-gray-400">—</p>}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full border text-xs font-bold ${STATUS_BADGE[first.delivery_status] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                                  {first.delivery_status || '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => handleViewSession(first)}
                                  className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:from-teal-600 hover:to-cyan-700"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      })()}
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

      {/* ATTACHMENT VIEWER MODAL */}
      {attachmentModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
          onClick={() => setAttachmentModal({ open: false, url: '', type: '' })}
        >
          <div
            className="relative bg-white rounded-xl shadow-2xl max-w-3xl w-full mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-700">Delivery Attachment</p>
              <div className="flex items-center gap-3">
                <a href={attachmentModal.url} target="_blank" rel="noreferrer"
                  className="text-xs text-teal-600 hover:text-teal-800 font-medium hover:underline">
                  Open in new tab
                </a>
                <button
                  onClick={() => setAttachmentModal({ open: false, url: '', type: '' })}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center bg-gray-50 min-h-[300px]">
              <img src={attachmentModal.url} alt="Delivery attachment"
                className="max-w-full max-h-[70vh] object-contain rounded" />
            </div>
          </div>
        </div>
      )}
      {/* BULK DELIVERY HISTORY MODAL */}
      {showBulkHistory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
          onClick={() => setShowBulkHistory(false)}
        >
          <div
            className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 flex flex-col"
            style={{ maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-5 py-4 flex items-center justify-between flex-shrink-0 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg leading-tight">Bulk Delivery History</h2>
                  <p className="text-white/75 text-xs">PACKED → DELIVERED bulk progression runs</p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkHistory(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Filters Bar */}
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
              <div className="flex flex-wrap items-center gap-3">

                {/* Executed Date filter */}
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">Executed Date:</label>
                  <input
                    type="date"
                    value={bulkHistoryDateFilter}
                    onChange={(e) => { setBulkHistoryDateFilter(e.target.value); setBulkHistoryPage(1); }}
                    className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                  />
                  {bulkHistoryDateFilter && (
                    <button
                      onClick={() => { setBulkHistoryDateFilter(''); setBulkHistoryPage(1); }}
                      className="text-gray-400 hover:text-red-500 transition"
                      title="Clear date"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Divider */}
                <div className="w-px h-6 bg-gray-300" />

                {/* Search */}
                <div className="flex items-center gap-1.5 flex-1">
                  <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">Search:</label>
                  <div className="relative flex-1 max-w-sm">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Invoice no, customer, performed by..."
                      value={bulkHistorySearch}
                      onChange={(e) => { setBulkHistorySearch(e.target.value); setBulkHistoryPage(1); }}
                      className="w-full pl-7 pr-7 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                    />
                    {bulkHistorySearch && (
                      <button
                        onClick={() => { setBulkHistorySearch(''); setBulkHistoryPage(1); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Summary + Refresh */}
                <div className="flex items-center gap-3 ml-auto">
                  <span className="text-xs text-gray-500 font-medium">
                    {filteredBulkHistory.length} run{filteredBulkHistory.length !== 1 ? 's' : ''} found
                  </span>
                  <button
                    onClick={loadBulkDeliveryHistory}
                    disabled={bulkHistoryLoading}
                    className="px-3 py-1.5 text-xs font-semibold text-teal-600 hover:text-teal-800 border border-teal-300 rounded-lg hover:bg-teal-50 transition flex items-center gap-1.5"
                  >
                    <svg className={`w-3.5 h-3.5 ${bulkHistoryLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>

              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-5">
              {bulkHistoryLoading ? (
                <div className="flex items-center justify-center py-16 text-teal-600 gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-500 border-t-transparent" />
                  <span className="text-sm font-medium">Loading history...</span>
                </div>
              ) : paginatedBulkHistory.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="font-semibold text-gray-500 text-sm">
                    {bulkHistorySearch || bulkHistoryDateFilter ? 'No runs match your filters' : 'No bulk delivery runs found'}
                  </p>
                  {(bulkHistorySearch || bulkHistoryDateFilter) && (
                    <button
                      onClick={() => { setBulkHistorySearch(''); setBulkHistoryDateFilter(''); setBulkHistoryPage(1); }}
                      className="mt-3 text-xs text-teal-600 hover:text-teal-800 underline"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {paginatedBulkHistory.map((entry, entryIdx) => {
                    const runNo = filteredBulkHistory.length - ((bulkHistoryPage - 1) * BULK_HISTORY_PAGE_SIZE) - entryIdx;
                    return (
                      <div key={entry.id} className="rounded-xl border border-emerald-200 bg-emerald-50 overflow-hidden">
                        <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2 border-b border-emerald-200 bg-emerald-100/60">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {runNo}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                                <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded text-xs font-bold">PACKED</span>
                                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <span className="px-2 py-0.5 bg-teal-200 text-teal-800 rounded text-xs font-bold">DELIVERED</span>
                                <span className="text-emerald-700 font-semibold text-xs">
                                  · {entry.count} invoice{entry.count !== 1 ? 's' : ''}
                                </span>
                              </div>
                              <p className="text-xs text-emerald-700 mt-0.5">
                                Invoice dates: <strong>{entry.from_date}</strong> → <strong>{entry.to_date}</strong>
                                {entry.performed_by && (
                                  <span className="ml-2 text-emerald-600">· by <strong>{entry.performed_by}</strong></span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-xs text-emerald-700 bg-white border border-emerald-200 rounded-lg px-3 py-1.5 font-mono flex-shrink-0">
                            🕐 {new Date(entry.executed_at || entry.updated_at).toLocaleString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
                            })}
                          </div>
                        </div>

                        {entry.invoices && entry.invoices.length > 0 ? (
                          <div className="overflow-x-auto max-h-52">
                            <table className="min-w-full text-xs divide-y divide-emerald-100">
                              <thead className="bg-emerald-50 sticky top-0">
                                <tr>
                                  {['#', 'Invoice No', 'Invoice Date', 'Customer', 'Total', 'Status', 'Executed At'].map((h) => (
                                    <th key={h} className="px-3 py-2 text-left font-semibold text-emerald-700 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-emerald-50">
                                {getFilteredInvoices(entry).map((inv, idx) => (
                                  <tr key={inv.invoice_no} className="hover:bg-emerald-50 transition-colors">
                                    <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                                    <td className="px-3 py-2 font-semibold text-gray-900">{inv.invoice_no}</td>
                                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{inv.invoice_date}</td>
                                    <td className="px-3 py-2 text-gray-700">{inv.customer_name}</td>
                                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap font-medium">₹{Number(inv.total ?? 0).toFixed(2)}</td>
                                    <td className="px-3 py-2">
                                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold text-[10px]">
                                        {inv.new_status || 'DELIVERED'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-gray-500 font-mono whitespace-nowrap">
                                      {new Date(entry.executed_at || entry.updated_at).toLocaleString('en-IN', {
                                        day: '2-digit', month: 'short',
                                        hour: '2-digit', minute: '2-digit', hour12: true,
                                      })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="px-4 py-3 text-xs text-gray-400 italic">No invoice details available for this run.</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagination Footer */}
            {!bulkHistoryLoading && filteredBulkHistory.length > BULK_HISTORY_PAGE_SIZE && (
              <div className="border-t border-gray-200 px-5 py-3 flex items-center justify-between bg-gray-50 flex-shrink-0 rounded-b-xl">
                <p className="text-xs text-gray-500">
                  Showing{' '}
                  <span className="font-semibold text-gray-700">
                    {(bulkHistoryPage - 1) * BULK_HISTORY_PAGE_SIZE + 1}–{Math.min(bulkHistoryPage * BULK_HISTORY_PAGE_SIZE, filteredBulkHistory.length)}
                  </span>{' '}
                  of <span className="font-semibold text-gray-700">{filteredBulkHistory.length}</span> runs
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setBulkHistoryPage(1)} disabled={bulkHistoryPage === 1}
                    className="px-2 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition">«</button>
                  <button onClick={() => setBulkHistoryPage((p) => Math.max(1, p - 1))} disabled={bulkHistoryPage === 1}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition">Prev</button>
                  {Array.from({ length: bulkHistoryTotalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === bulkHistoryTotalPages || Math.abs(p - bulkHistoryPage) <= 1)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-xs">…</span>
                      ) : (
                        <button key={item} onClick={() => setBulkHistoryPage(item)}
                          className={`px-3 py-1.5 text-xs rounded-lg border font-semibold transition ${
                            bulkHistoryPage === item ? 'bg-teal-600 text-white border-teal-600 shadow' : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                          }`}>{item}</button>
                      )
                    )}
                  <button onClick={() => setBulkHistoryPage((p) => Math.min(bulkHistoryTotalPages, p + 1))} disabled={bulkHistoryPage === bulkHistoryTotalPages}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition">Next</button>
                  <button onClick={() => setBulkHistoryPage(bulkHistoryTotalPages)} disabled={bulkHistoryPage === bulkHistoryTotalPages}
                    className="px-2 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition">»</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}