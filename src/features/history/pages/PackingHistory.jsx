import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useUrlPage from '../../../utils/useUrlPage';
import { X } from "lucide-react";
import Pagination from "../../../components/Pagination";
import { getPackingHistory } from "../../../services/sales";
import PackingDetailModal from "../../../components/PackingDetailModal";
import { formatDate, formatTime } from '../../../utils/formatters';

export default function PackingHistory() {
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useUrlPage();
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  useEffect(() => {
    load();

    // Listen for data clear events from developer settings
    const handleDataCleared = (event) => {
      const { tableName } = event.detail;
      if (tableName === 'all' || tableName === 'packing_sessions') {
        console.log('🔄 Data cleared - reloading packing history...');
        load();
      }
    };

    window.addEventListener('dataCleared', handleDataCleared);
    return () => window.removeEventListener('dataCleared', handleDataCleared);
  }, [currentPage, filterStatus, filterDate, search]);

  const load = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        page_size: itemsPerPage,
      };

      if (search.trim()) params.search = search.trim();
      if (filterStatus) params.status = filterStatus;
      if (filterDate) params.start_date = filterDate;

      const response = await getPackingHistory(params);
      setHistory(response.data.results);
      setTotalCount(response.data.count);
    } catch (error) {
      console.error("Failed to load packing history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (invoiceNo) => {
    setSelectedInvoiceId(invoiceNo);
    setModalOpen(true);
  };

  const handleViewInvoice = (invoiceId) => {
    navigate(`/invoices/${invoiceId}`);
  };

  const formatDuration = (minutes) => {
    if (!minutes) return "-";
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getStatusMessage = (status, notes) => {
    // Handle special admin override cases - always show these
    if (notes && notes.includes('[ADMIN OVERRIDE]')) {
      return notes;
    }
    
    // If there are no notes, show status-based message
    if (!notes || !notes.trim()) {
      switch (status) {
        case 'PACKED':
          return 'Packing completed';
        case 'IN_PROGRESS':
          return 'Packing started';
        case 'PENDING':
          return 'Packing pending';
        default:
          return 'Packing in progress';
      }
    }
    
    // Normalize notes for comparison
    const normalizedNote = notes.toLowerCase().trim();
    
    // Only filter out truly generic auto-generated status messages
    const genericMessages = [
      'packing started',
      'packing complete', 
      'packing completed',
      'bulk packing started',
      'bulk packing completed',
      'starting packing'
    ];
    
    // Check if this is an exact match for generic status messages
    const isGenericStatus = genericMessages.some(msg => normalizedNote === msg);
    
    // If it's a generic status message, show status-based message instead
    if (isGenericStatus) {
      switch (status) {
        case 'PACKED':
          return 'Packing completed';
        case 'IN_PROGRESS':
          return 'Packing started';
        case 'PENDING':
          return 'Packing pending';
        default:
          return 'Packing in progress';
      }
    }
    
    // Show all other notes (including reasons, manual notes, etc.)
    return notes;
  };

  const statusBadge = (status) => {
    const styles = {
      PENDING: "bg-gray-100 text-gray-700 border-gray-200",
      IN_PROGRESS: "bg-yellow-100 text-yellow-700 border-yellow-200",
      PACKING: "bg-orange-100 text-orange-700 border-orange-200",
      PACKED: "bg-green-100 text-green-700 border-green-200",
    };

    const labels = {
      PENDING: "Pending",
      IN_PROGRESS: "In Progress",
      PACKING: "Packing",
      PACKED: "Packed",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-bold border ${
          styles[status] || "bg-gray-100 text-gray-700"
        }`}
      >
        {labels[status] || status}
      </span>
    );
  };

  const handleClearFilters = () => {
    setSearch("");
    setFilterStatus("");
    setFilterDate(new Date().toISOString().split('T')[0]); // Reset to today
    setCurrentPage(1);
  };

  const hasActiveFilters = search || filterStatus || filterDate;

  return (
    <>
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        {/* HEADER + FILTER ROW */}
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Packing History</h2>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[350px]">
              <input
                type="text"
                placeholder="Search invoice or packer..."
                className="px-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all w-full"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all min-w-[350px]"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PACKED">Packed</option>
            </select>

            {/* Date Filter */}
            <input
              type="date"
              placeholder="Filter by date"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all min-w-[350px]"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setCurrentPage(1);
              }}
            />

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all flex items-center gap-2 font-medium"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* TABLE */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-teal-500 to-cyan-600 text-left">
                  <th className="px-3 sm:px-6 py-4 text-sm font-bold text-white" style={{width:'10%'}}>Invoice</th>
                  <th className="px-3 sm:px-6 py-4 text-sm font-bold text-white" style={{width:'18%'}}>Customer</th>
                  <th className="px-3 sm:px-6 py-4 text-sm font-bold text-white" style={{width:'16%'}}>Packer</th>
                  <th className="px-3 sm:px-6 py-4 text-sm font-bold text-white" style={{width:'10%'}}>Status</th>
                  <th className="px-3 sm:px-6 py-4 text-sm font-bold text-white" style={{width:'18%'}}>Date & Time</th>
                  <th className="px-3 sm:px-6 py-4 text-sm font-bold text-white" style={{width:'10%'}}>Duration</th>
                  <th className="px-3 sm:px-6 py-4 text-sm font-bold text-white" style={{width:'8%'}}>Boxes</th>
                  <th className="px-3 sm:px-6 py-4 text-sm font-bold text-white" style={{width:'10%'}}>Notes</th>
                </tr>
              </thead>

              <tbody>
                {(() => {
                  // Group by boxing_group_id
                  const grouped = {};
                  history.forEach(h => {
                    const key = h.boxing_group_id || `single-${h.id}`;
                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push(h);
                  });

                  return Object.entries(grouped).map(([groupKey, rows]) => {
                    const isGroup = rows.length > 1;
                    const first = rows[0];

                    if (isGroup) {
                      return (
                        <React.Fragment key={groupKey}>
                          {/* Group header — top + left + right border, rounded top */}
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
                                  </span>
                                </div>
                              </div>
                            </td>
                          </tr>

                          {/* Individual rows inside group */}
                          {rows.map((h, idx) => {
                            const isLast = idx === rows.length - 1;
                            return (
                              <tr key={h.id} style={{ background: '#f7fdfb' }} onClick={() => handleRowClick(h.invoice_no)}>
                                <td colSpan="8" className="p-0 cursor-pointer">
                                  <div className={`mx-3 border-l-2 border-r-2 border-teal-400 ${isLast ? 'border-b-2 rounded-b-lg mb-2' : ''}`}>
                                    <table className="w-full">
                                      <colgroup>
                                        <col style={{width:'10%'}} />
                                        <col style={{width:'18%'}} />
                                        <col style={{width:'16%'}} />
                                        <col style={{width:'10%'}} />
                                        <col style={{width:'18%'}} />
                                        <col style={{width:'10%'}} />
                                        <col style={{width:'8%'}} />
                                        <col style={{width:'10%'}} />
                                      </colgroup>
                                      <tbody>
                                        <tr className={` ${!isLast ? 'border-b border-teal-100' : ''}`}>
                                          <td className="px-3 sm:px-6 py-2 pl-8">
                                            <button className="text-teal-600 hover:text-teal-800 font-medium text-xs">
                                              {h.invoice_no}
                                            </button>
                                          </td>
                                          <td className="px-3 sm:px-6 py-2">
                                            <p className="font-medium text-sm">{h.customer_name}</p>
                                            <p className="text-xs text-gray-500">{h.customer_area || h.customer_address || h.temp_name || "—"}</p>
                                          </td>
                                          <td className="px-3 sm:px-6 py-2">
                                            <p className="font-medium text-sm">{h.packer_name}</p>
                                            <p className="text-xs text-gray-500">{h.packer_email}</p>
                                          </td>
                                          <td className="px-3 sm:px-6 py-2">{statusBadge(h.packing_status)}</td>
                                          <td className="px-3 sm:px-6 py-2">
                                            <p className="text-sm font-medium">{formatDate(h.start_time)}</p>
                                            <p className="text-xs text-gray-600">
                                              {formatTime(h.start_time)}{h.end_time && <> to {formatTime(h.end_time)}</>}
                                            </p>
                                          </td>
                                          <td className="px-3 sm:px-6 py-2">
                                            {h.duration
                                              ? <span className="text-teal-600 font-medium">{formatDuration(h.duration)}</span>
                                              : <span className="text-gray-400">In Progress</span>}
                                          </td>
                                          <td className="px-3 sm:px-6 py-2 text-center text-sm font-semibold text-gray-800">
                                            {h.packing_status === 'PACKED' && h.label_count != null
                                              ? h.label_count
                                              : <span className="text-gray-400">—</span>}
                                          </td>
                                          <td className="px-3 sm:px-6 py-2">
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                                              {h.notes?.includes('[ADMIN OVERRIDE]')
                                                ? <span className="text-orange-600 font-semibold">{h.notes}</span>
                                                : <span className="text-gray-700">{getStatusMessage(h.packing_status, h.notes)}</span>}
                                            </p>
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

                    // Single bill — existing style unchanged
                    return (
                      <tr
                        key={first.id}
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleRowClick(first.invoice_no)}
                      >
                        <td className="px-3 sm:px-6 py-3">
                          <button className="text-teal-600 hover:text-teal-800 font-medium">{first.invoice_no}</button>
                        </td>
                        <td className="px-3 sm:px-6 py-3">
                          <p className="font-medium">{first.customer_name}</p>
                          <p className="text-xs text-gray-500">{first.customer_area || first.customer_address || first.temp_name || "—"}</p>
                        </td>
                        <td className="px-3 sm:px-6 py-3">
                          <p className="font-medium">{first.packer_name}</p>
                          <p className="text-xs text-gray-500">{first.packer_email}</p>
                        </td>
                        <td className="px-3 sm:px-6 py-3">{statusBadge(first.packing_status)}</td>
                        <td className="px-3 sm:px-6 py-3">
                          <p className="text-sm font-medium">{formatDate(first.start_time)}</p>
                          <p className="text-xs text-gray-600">
                            {formatTime(first.start_time)}{first.end_time && <> to {formatTime(first.end_time)}</>}
                          </p>
                        </td>
                        <td className="px-3 sm:px-6 py-3">
                          {first.duration ? <span className="text-teal-600 font-medium">{formatDuration(first.duration)}</span> : <span className="text-gray-400">In Progress</span>}
                        </td>
                        <td className="px-3 sm:px-6 py-3">
                          {first.packing_status === 'PACKED' && first.label_count != null
                            ? <p className="text-sm text-center font-semibold text-gray-800">{first.label_count}</p>
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-3 sm:px-6 py-3">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                            {first.notes && first.notes.includes('[ADMIN OVERRIDE]')
                              ? <span className="text-orange-600 font-semibold">{first.notes}</span>
                              : <span className="text-gray-700">{getStatusMessage(first.packing_status, first.notes)}</span>}
                          </p>
                        </td>
                      </tr>
                    );
                  });
                })()}

                {history.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-gray-500">
                      No packing records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        <Pagination
          currentPage={currentPage}
          totalItems={totalCount}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          label="pack records"
        />
      </div>

      {/* PACKING DETAIL MODAL */}
      <PackingDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        invoiceId={selectedInvoiceId}
      />
    </>
  );
}