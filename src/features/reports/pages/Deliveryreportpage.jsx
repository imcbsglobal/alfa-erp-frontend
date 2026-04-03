import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useUrlPage from '../../../utils/useUrlPage';
import { getDeliveryHistory } from "../../../services/sales";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import { formatDateDDMMYYYY, formatTime } from '../../../utils/formatters';
import { X, Search } from 'lucide-react';
import { useAuth } from "../../auth/AuthContext";
import { usePersistedFilters } from '../../../utils/usePersistedFilters';

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

export default function DeliveryReportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [rawSessions, setRawSessions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useUrlPage();
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(100);
  const [savedFilters, saveFilters] = usePersistedFilters('delivery-report-filters', {
    dateFilter: new Date().toISOString().split('T')[0],
    searchQuery: '',
    deliveryTypeFilter: 'ALL',
    statusFilter: 'ALL',
  });
  const [dateFilter, setDateFilter] = useState(savedFilters.dateFilter);
  const [searchQuery, setSearchQuery] = useState(savedFilters.searchQuery);
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState(savedFilters.deliveryTypeFilter);
  const [statusFilter, setStatusFilter] = useState(savedFilters.statusFilter);
  const searchRef = useRef(null);

  // Attachment lightbox state
  const [attachmentModal, setAttachmentModal] = useState({ open: false, url: '', type: '' });

  const debouncedSearch = useDebounce(searchQuery, 400);

  useEffect(() => { searchRef.current?.focus(); }, []);

  useEffect(() => {
    saveFilters({ dateFilter, searchQuery, deliveryTypeFilter, statusFilter });
  }, [dateFilter, searchQuery, deliveryTypeFilter, statusFilter]);

  useEffect(() => {
    loadSessions();
  }, [currentPage, dateFilter, debouncedSearch, timeFilter, deliveryTypeFilter, statusFilter]);

  const sortByStartTime = (arr) =>
    [...arr].sort((a, b) => new Date(a.start_time || a.created_at) - new Date(b.start_time || b.created_at));

  const loadSessions = async () => {
    setLoading(true);
    try {
      const params = { page_size: 10000 };
      if (timeFilter) {
        const cutoff = new Date(Date.now() - parseInt(timeFilter, 10) * 60 * 60 * 1000);
        params.start_time = cutoff.toISOString();
      }
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (deliveryTypeFilter !== 'ALL') params.delivery_type = deliveryTypeFilter;

      const applyLocalFilters = (rows) => {
        let out = [...rows];
        if (statusFilter !== 'ALL') out = out.filter((s) => (s.delivery_status || '') === statusFilter);
        if (deliveryTypeFilter !== 'ALL') out = out.filter((s) => (s.delivery_type || '') === deliveryTypeFilter);
        return out;
      };

      const q = debouncedSearch.trim().toLowerCase();
      const res = await getDeliveryHistory(params);
      const allResults = sortByStartTime(applyLocalFilters(res.data.results || []));

      const searchedResults = !q
        ? allResults
        : allResults.filter((s) => [
            s.invoice_no, s.customer_name, s.customer_area, s.customer_address,
            s.delivery_user_name, s.delivery_user_email, s.courier_name, s.tracking_no, s.notes,
          ].filter(Boolean).some((val) => String(val).toLowerCase().includes(q)));

      const dateFilteredResults = !dateFilter
        ? searchedResults
        : searchedResults.filter((s) => getSessionFilterDate(s) === dateFilter);

      const startIdx = (currentPage - 1) * itemsPerPage;
      const endIdx = startIdx + itemsPerPage;

      setRawSessions(dateFilteredResults);
      setSessions(dateFilteredResults.slice(startIdx, endIdx));
      setTotalCount(dateFilteredResults.length);
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

  const getShortLocation = (address) => {
    if (!address) return "Location not captured";
    const parts = String(address).split(',').map((p) => p.trim()).filter(Boolean);
    const shortAddr = parts.slice(0, 2).join(', ') || String(address);
    return shortAddr.length > 40 ? `${shortAddr.slice(0, 40)}...` : shortAddr;
  };

  const getCourierSlipUrl = (session) => session?.courier_slip_url || session?.courier_slip || "";

  const getPickupDisplayName = (session) => (
    session?.pickup_person_name || session?.customer_name || session?.temp_name || '—'
  );

  // Attachment viewer link — shows inside Delivery Details column
  const renderAttachmentLink = (session) => {
    const url = session?.attachment_url;
    if (!url) return null;
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isImage) {
            setAttachmentModal({ open: true, url, type: 'image' });
          } else {
            window.open(url, '_blank');
          }
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
      return (
        <div className="space-y-0.5">
          <p>{session.courier_name || 'Courier not set'}</p>
          {session.tracking_no && <p className="text-xs text-gray-500">Tracking: {session.tracking_no}</p>}
          {slipUrl ? (
            <a
              href={slipUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              View Slip / Screenshot
            </a>
          ) : (
            <p className="text-xs text-teal-700">Slip not uploaded</p>
          )}
          {renderAttachmentLink(session)}
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
                Person: {session.pickup_person_name ? session.pickup_person_name : <span className="text-red-600 font-medium">Required</span>}
              </p>
              <p className="text-xs font-semibold text-teal-700">
                Company: {session.pickup_company_name ? session.pickup_company_name : <span className="text-red-600 font-medium">Required</span>}
              </p>
            </>
          ) : (
            <p className="text-xs font-semibold text-teal-700">Name: {getPickupDisplayName(session)}</p>
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
            <div>
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Open Location
              </a>
          </div>
          )}
          {renderAttachmentLink(session)}
        </div>
      );
    }

    return <p>—</p>;
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">

          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Delivery Report</h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-3 mb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Date:</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>

              <div className="h-6 w-px bg-gray-200" />

              <div className="flex items-center gap-1.5">
                <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Delivery Type:</label>
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

              <div className="flex items-center gap-1.5">
                <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                >
                  <option value="ALL">All Status</option>
                  <option value="TO_CONSIDER">TO_CONSIDER</option>
                  <option value="IN_TRANSIT">IN_TRANSIT</option>
                  <option value="DELIVERED">DELIVERED</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Search:</label>
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Invoice No, Customer or Delivery Staff..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="pl-7 pr-7 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm w-[320px]"
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
            </div>
          </div>

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
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '18%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '16%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '14%' }} />
                    </colgroup>
                    <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                      <tr>
                        {["Invoice No", "Customer", "Delivery Details", "Delivery Type", "Delivery Date & Time", "Status", "Actions"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        const grouped = {};
                        sessions.forEach((s) => {
                          const key = s.boxing_group_id || `single-${s.id}`;
                          if (!grouped[key]) grouped[key] = [];
                          grouped[key].push(s);
                        });

                        return Object.entries(grouped).map(([groupKey, rows], groupIndex) => {
                          const isGroup = rows.length > 1;
                          const first = rows[0];

                          if (isGroup) {
                            return (
                              <React.Fragment key={groupKey}>
                                {/* Group header */}
                                <tr>
                                  <td colSpan="7" className="p-0">
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
                                            const preferred = getPreferredInvoiceFromGroupId(first.boxing_group_id, rows);
                                            if (!preferred) return null;
                                            return (
                                              <span className="ml-2 px-2 py-0.5 bg-teal-100 text-teal-800 rounded-full text-[10px] font-bold">
                                                📦 Address: {preferred.customer_name}
                                              </span>
                                            );
                                          })()}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                </tr>

                                {/* Group rows */}
                                {rows.map((session, idx) => {
                                  const isLast = idx === rows.length - 1;
                                  return (
                                    <tr key={session.id} style={{ background: '#f7fdfb' }}>
                                      <td colSpan="7" className="p-0">
                                        <div className={`mx-3 border-l-2 border-r-2 border-teal-400 ${isLast ? 'border-b-2 rounded-b-lg mb-2' : ''} px-0`}>
                                          <table className="w-full" style={{ tableLayout: 'fixed' }}>
                                            <colgroup>
                                              <col style={{ width: '12%' }} />
                                              <col style={{ width: '18%' }} />
                                              <col style={{ width: '18%' }} />
                                              <col style={{ width: '12%' }} />
                                              <col style={{ width: '16%' }} />
                                              <col style={{ width: '10%' }} />
                                              <col style={{ width: '14%' }} />
                                            </colgroup>
                                            <tbody>
                                              <tr className={`${isLast ? '' : 'border-b border-teal-100'}`}>
                                                <td className="px-4 py-2 pl-8 text-sm font-medium text-teal-700">{session.invoice_no}</td>
                                                <td className="px-4 py-2 text-sm text-gray-700">
                                                  <p>{session.customer_name || '—'}</p>
                                                  <p className="text-xs text-gray-500">{session.customer_area || session.customer_address || session.temp_name || '—'}</p>
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-700">
                                                  {renderDeliveryDetails(session)}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-700">
                                                  <p>{DELIVERY_LABEL[session.delivery_type] || session.delivery_type || '—'}</p>
                                                  {session.courier_name && <p className="text-xs font-semibold text-blue-700">{session.courier_name}</p>}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-700">
                                                  <p>{formatDateDDMMYYYY(getSessionDisplayDateTime(session))}</p>
                                                  <p className="text-xs text-gray-500">
                                                    {formatTime(getSessionDisplayDateTime(session))}
                                                    {session.end_time ? ` → ${formatTime(session.end_time)}` : ''}
                                                  </p>
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

                          // Single row
                          return (
                            <tr key={first.id} className={`hover:bg-gray-50 transition-colors ${groupIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{first.invoice_no}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <p>{first.customer_name || '—'}</p>
                                <p className="text-xs text-gray-500">{first.customer_area || first.customer_address || first.temp_name || '—'}</p>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {renderDeliveryDetails(first)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <p>{DELIVERY_LABEL[first.delivery_type] || first.delivery_type || '—'}</p>
                                {first.courier_name && <p className="text-xs font-semibold text-blue-700">{first.courier_name}</p>}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <p>{formatDateDDMMYYYY(getSessionDisplayDateTime(first))}</p>
                                <p className="text-xs text-gray-500">
                                  {formatTime(getSessionDisplayDateTime(first))}
                                  {first.end_time ? ` → ${formatTime(first.end_time)}` : ''}
                                </p>
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
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-700">Delivery Attachment</p>
              <div className="flex items-center gap-3">
                <a
                  href={attachmentModal.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-teal-600 hover:text-teal-800 font-medium hover:underline"
                >
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
            {/* Image preview */}
            <div className="p-4 flex items-center justify-center bg-gray-50 min-h-[300px]">
              <img
                src={attachmentModal.url}
                alt="Delivery attachment"
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}