import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useUrlPage from '../../../utils/useUrlPage';
import { X } from "lucide-react";
import ClearFiltersButton from '../../../components/ClearFiltersButton';
import Pagination from "../../../components/Pagination";
import { getDeliveryHistory } from "../../../services/sales";
import DeliveryDetailModal from "../../../components/DeliveryDetailModal";
import { formatDateTime } from '../../../utils/formatters';

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

export default function DeliveryHistory() {
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  const [currentPage, setCurrentPage] = useUrlPage();
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 8;

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  // Attachment viewer state
  const [attachmentModal, setAttachmentModal] = useState({ open: false, url: '', type: '' });

  useEffect(() => {
    load();

    const handleDataCleared = (event) => {
      const { tableName } = event.detail;
      if (tableName === 'all' || tableName === 'delivery_sessions') {
        load();
      }
    };

    window.addEventListener('dataCleared', handleDataCleared);
    return () => window.removeEventListener('dataCleared', handleDataCleared);
  }, [currentPage, filterType, filterDate, search]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 10000 };
      if (filterType) params.delivery_type = filterType;

      const response = await getDeliveryHistory(params);
      const allRows = response.data?.results || [];
      const q = search.trim().toLowerCase();

      const filteredRows = allRows.filter((row) => {
        const matchesType = !filterType || row.delivery_type === filterType;
        const matchesDate = !filterDate || getSessionFilterDate(row) === filterDate;
        const matchesSearch = !q || [
          row.invoice_no,
          row.customer_name,
          row.customer_area,
          row.customer_address,
          row.delivery_user_name,
          row.delivery_user_email,
          row.notes,
        ]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q));

        return matchesType && matchesDate && matchesSearch;
      });

      const startIdx = (currentPage - 1) * itemsPerPage;
      const endIdx = startIdx + itemsPerPage;
      setHistory(filteredRows.slice(startIdx, endIdx));
      setTotalCount(filteredRows.length);
    } catch (error) {
      console.error("Failed to load delivery history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (delivery) => {
    setSelectedDelivery(delivery);
    setModalOpen(true);
  };

  const handleViewInvoice = (invoiceNo, e) => {
    e.stopPropagation();
    navigate(`/invoices/${invoiceNo}`);
  };

  const formatDuration = (minutes) => {
    if (!minutes) return "-";
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getStatusMessage = (status, notes) => {
    if (notes && notes.includes('[ADMIN OVERRIDE]')) return notes;
    if (!notes || !notes.trim()) {
      switch (status) {
        case 'DELIVERED': return 'Delivery completed';
        case 'IN_TRANSIT': return 'Delivery started';
        case 'PENDING': return 'Delivery pending';
        default: return 'Delivery in progress';
      }
    }
    const normalizedNote = notes.toLowerCase().trim();
    const genericMessages = [
      'delivery started', 'delivery complete', 'delivery completed',
      'bulk delivery started', 'bulk delivery completed', 'starting delivery'
    ];
    const isGenericStatus = genericMessages.some(msg => normalizedNote === msg);
    if (isGenericStatus) {
      switch (status) {
        case 'DELIVERED': return 'Delivery completed';
        case 'IN_TRANSIT': return 'Delivery started';
        case 'PENDING': return 'Delivery pending';
        default: return 'Delivery in progress';
      }
    }
    return notes;
  };

  const getShortLocation = (address) => {
    if (!address) return "No location";
    const parts = address.split(',').map(p => p.trim());
    const shortAddr = parts.slice(0, 2).join(', ');
    return shortAddr.length > 30 ? shortAddr.substring(0, 30) + '...' : shortAddr;
  };

  const typeBadge = (type) => {
    const styles = {
      DIRECT: "bg-blue-100 text-blue-700 border-blue-200",
      COURIER: "bg-purple-100 text-purple-700 border-purple-200",
      INTERNAL: "bg-green-100 text-green-700 border-green-200",
    };
    const labels = {
      DIRECT: "Counter Pickup",
      COURIER: "Courier",
      INTERNAL: "Company Delivery",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[type] || "bg-gray-100 text-gray-700"}`}>
        {labels[type] || type}
      </span>
    );
  };

  const statusBadge = (status) => {
    const styles = {
      PENDING: "bg-gray-100 text-gray-700 border-gray-200",
      IN_TRANSIT: "bg-yellow-100 text-yellow-700 border-yellow-200",
      DELIVERED: "bg-green-100 text-green-700 border-green-200",
    };
    const labels = {
      PENDING: "Pending",
      IN_TRANSIT: "In Transit",
      DELIVERED: "Delivered",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status] || "bg-gray-100 text-gray-700"}`}>
        {labels[status] || status}
      </span>
    );
  };

  const toggleExpand = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const handleClearFilters = () => {
    setSearch("");
    setFilterType("");
    setFilterDate(new Date().toISOString().split('T')[0]);
    setCurrentPage(1);
  };

  const hasActiveFilters = search || filterType || filterDate;

  const getPreferredInvoiceFromGroupId = (boxing_group_id, rows) => {
    if (!boxing_group_id) return null;
    const parts = boxing_group_id.split("|");
    if (parts.length < 2) return null;
    const preferredNo = parts[1];
    return rows.find((r) => r.invoice_no === preferredNo) || null;
  };

  const getPickupDisplayName = (row) => {
    return row?.pickup_person_name || row?.customer_name || row?.temp_name || "-";
  };

  // Attachment link renderer
  const renderAttachmentLink = (row) => {
    const url = row?.attachment_url;
    if (!url) return <span className="text-gray-400 text-xs">No attachment</span>;
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
        className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium hover:underline"
      >
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
        View Attachment
      </button>
    );
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        {/* HEADER + FILTERS */}
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Delivery History</h2>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[350px]">
              <input
                type="text"
                placeholder="Search invoice or details..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="px-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all w-full"
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); setCurrentPage(1); }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all min-w-[350px]"
            >
              <option value="">All Types</option>
              <option value="DIRECT">Counter Pickup</option>
              <option value="COURIER">Courier</option>
              <option value="INTERNAL">Company Delivery</option>
            </select>

            <input
              type="date"
              value={filterDate}
              onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all min-w-[350px]"
            />

            {hasActiveFilters && (
              <ClearFiltersButton onClear={handleClearFilters} />
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '20%' }} />
                </colgroup>
                <thead>
                  <tr className="bg-gradient-to-r from-teal-500 to-cyan-600">
                    <th className="px-6 py-4 text-white text-left">Invoice</th>
                    <th className="px-6 py-4 text-white text-left">Customer</th>
                    <th className="px-6 py-4 text-white text-left">Type</th>
                    <th className="px-6 py-4 text-white text-left">Details</th>
                    <th className="px-6 py-4 text-white text-left">Status</th>
                    <th className="px-6 py-4 text-white text-left">Duration</th>
                    <th className="px-6 py-4 text-white text-left">Notes & Attachment</th>
                  </tr>
                </thead>

                <tbody>
                  {(() => {
                    const grouped = {};
                    history.forEach((h) => {
                      const key = h.boxing_group_id || `single-${h.id}`;
                      if (!grouped[key]) grouped[key] = [];
                      grouped[key].push(h);
                    });

                    const renderDetails = (h) => {
                      if (h.delivery_type === "DIRECT") {
                        return (
                          <>
                            {h.counter_sub_mode === "patient" && (
                              <>
                                <p className="font-medium">Direct Patient</p>
                                <p className="text-xs text-gray-500">Name: {getPickupDisplayName(h)}</p>
                                <p className="text-xs text-gray-500">Phone: {h.pickup_person_phone || "-"}</p>
                              </>
                            )}
                            {h.counter_sub_mode === "company" && (
                              <>
                                <p className="font-medium">Direct Company</p>
                                <p className="text-xs text-gray-500">
                                  Person: {h.pickup_person_name ? h.pickup_person_name : <span className="text-red-600 font-medium">Required</span>}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Company: {h.pickup_company_name ? h.pickup_company_name : <span className="text-red-600 font-medium">Required</span>}
                                </p>
                              </>
                            )}
                          </>
                        );
                      }
                      if (h.delivery_type === "COURIER") {
                        return <p className="font-medium">{h.courier_name}</p>;
                      }
                      if (h.delivery_type === "INTERNAL") {
                        return (
                          <>
                            <p className="font-medium">{h.delivery_user_name}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <p className="text-xs text-gray-500">{getShortLocation(h.delivery_location_address)}</p>
                            </div>
                          </>
                        );
                      }
                      return null;
                    };

                    return Object.entries(grouped).map(([groupKey, rows]) => {
                      const isGroup = rows.length > 1;
                      const first = rows[0];

                      if (isGroup) {
                        return (
                          <>
                            <tr key={`${groupKey}-header`}>
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

                            {rows.map((h, idx) => {
                              const isLast = idx === rows.length - 1;
                              return (
                                <tr key={h.id} style={{ background: '#f7fdfb' }} onClick={() => handleRowClick(h)}>
                                  <td colSpan="7" className="p-0 cursor-pointer">
                                    <div className={`mx-3 border-l-2 border-r-2 border-teal-400 ${isLast ? 'border-b-2 rounded-b-lg mb-2' : ''}`}>
                                      <table className="w-full" style={{ tableLayout: 'fixed' }}>
                                        <colgroup>
                                          <col style={{ width: '14%' }} />
                                          <col style={{ width: '22%' }} />
                                          <col style={{ width: '12%' }} />
                                          <col style={{ width: '12%' }} />
                                          <col style={{ width: '10%' }} />
                                          <col style={{ width: '10%' }} />
                                          <col style={{ width: '20%' }} />
                                        </colgroup>
                                        <tbody>
                                          <tr className={`${!isLast ? 'border-b border-teal-100' : ''}`}>
                                            <td className="px-6 py-2">
                                              <button
                                                onClick={(e) => handleViewInvoice(h.invoice_no, e)}
                                                className="text-teal-600 hover:text-teal-800 font-medium hover:underline"
                                              >
                                                {h.invoice_no}
                                              </button>
                                            </td>
                                            <td className="px-6 py-2">
                                              <p className="font-medium">{h.customer_name}</p>
                                              <p className="text-xs text-gray-500">{h.customer_area || h.customer_address || h.temp_name || "—"}</p>
                                            </td>
                                            <td className="px-6 py-2">{typeBadge(h.delivery_type)}</td>
                                            <td className="px-6 py-2 text-gray-700">{renderDetails(h)}</td>
                                            <td className="px-6 py-2">{statusBadge(h.delivery_status)}</td>
                                            <td className="px-6 py-2">
                                              {h.duration ? (
                                                <span className="text-gray-700 font-medium">{formatDuration(h.duration)}</span>
                                              ) : (
                                                <span className="text-gray-400">In Progress</span>
                                              )}
                                            </td>
                                            <td className="px-6 py-2">
                                              <div className="space-y-1">
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                                                  {h.notes && h.notes.includes('[ADMIN OVERRIDE]') ? (
                                                    <span className="text-orange-600 font-semibold">{h.notes}</span>
                                                  ) : (
                                                    <span className="text-gray-700">{getStatusMessage(h.delivery_status, h.notes)}</span>
                                                  )}
                                                </p>
                                                {renderAttachmentLink(h)}
                                              </div>
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </>
                        );
                      }

                      return (
                        <tr
                          key={first.id}
                          className="border-b hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleRowClick(first)}
                        >
                          <td className="px-6 py-3">
                            <button
                              onClick={(e) => handleViewInvoice(first.invoice_no, e)}
                              className="text-teal-600 hover:text-teal-800 font-medium hover:underline"
                            >
                              {first.invoice_no}
                            </button>
                          </td>
                          <td className="px-6 py-3">
                            <p className="font-medium">{first.customer_name}</p>
                            <p className="text-xs text-gray-500">{first.customer_area || first.customer_address || first.temp_name || "—"}</p>
                          </td>
                          <td className="px-6 py-3">{typeBadge(first.delivery_type)}</td>
                          <td className="px-6 py-3 text-gray-700">{renderDetails(first)}</td>
                          <td className="px-6 py-3">{statusBadge(first.delivery_status)}</td>
                          <td className="px-6 py-3">
                            {first.duration ? (
                              <span className="text-gray-700 font-medium">{formatDuration(first.duration)}</span>
                            ) : (
                              <span className="text-gray-400">In Progress</span>
                            )}
                          </td>
                          <td className="px-6 py-3">
                            <div className="space-y-1">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                                {first.notes && first.notes.includes('[ADMIN OVERRIDE]') ? (
                                  <span className="text-orange-600 font-semibold">{first.notes}</span>
                                ) : (
                                  <span className="text-gray-700">{getStatusMessage(first.delivery_status, first.notes)}</span>
                                )}
                              </p>
                              {renderAttachmentLink(first)}
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}

                  {history.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-gray-500">
                        No delivery records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="lg:hidden space-y-4">
              {history.map((h) => (
                <div key={h.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="p-4 cursor-pointer" onClick={() => handleRowClick(h)}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleViewInvoice(h.invoice_no, e); }}
                          className="font-bold text-teal-600 hover:underline"
                        >
                          {h.invoice_no}
                        </button>
                        <p className="text-sm text-gray-600">{h.customer_name}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {typeBadge(h.delivery_type)}
                        {statusBadge(h.delivery_status)}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 space-y-1">
                      <p>📅 {formatDateTime(getSessionDisplayDateTime(h))}</p>
                      <p>⏱️ {formatDuration(h.duration)}</p>
                      {h.delivery_type === "INTERNAL" && h.delivery_location_address && (
                        <div className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          <span>{getShortLocation(h.delivery_location_address)}</span>
                        </div>
                      )}
                    </div>

                    {/* Attachment on mobile */}
                    <div className="mt-2" onClick={e => e.stopPropagation()}>
                      {renderAttachmentLink(h)}
                    </div>

                    <div className="mt-2 text-center text-gray-400 text-xs">
                      Tap to view details
                    </div>
                  </div>
                </div>
              ))}

              {history.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No delivery records found
                </div>
              )}
            </div>
          </>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={totalCount}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          label="delivery records"
        />
      </div>

      {/* DELIVERY DETAIL MODAL */}
      <DeliveryDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        deliveryData={selectedDelivery}
      />

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