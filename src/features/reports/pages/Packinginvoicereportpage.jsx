import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useUrlPage from '../../../utils/useUrlPage';
import { getPackingHistory } from "../../../services/sales";
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
  const [currentPage, setCurrentPage] = useUrlPage();
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage] = useState(100);
  const [savedFilters, saveFilters] = usePersistedFilters('packing-report-filters', {
    dateFilter: new Date().toISOString().split('T')[0],
    searchQuery: '',
  });
  const [dateFilter, setDateFilter] = useState(savedFilters.dateFilter);
  const [searchQuery, setSearchQuery] = useState(savedFilters.searchQuery);
  const [timeFilter, setTimeFilter] = useState('');
  const searchRef = useRef(null);

  const debouncedSearch = useDebounce(searchQuery, 400);

  useEffect(() => { searchRef.current?.focus(); }, []);

  useEffect(() => {
    saveFilters({ dateFilter, searchQuery });
  }, [dateFilter, searchQuery]);

  useEffect(() => {
    loadSessions();
  }, [currentPage, dateFilter, debouncedSearch, timeFilter]);

  const sortByStartTime = (arr) =>
    [...arr].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));

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
        const res = await getPackingHistory(params);
        const results = sortByStartTime(res.data.results || []);
        // ✅ Picking data now included directly in API response (no enrichment needed)
        setRawSessions(results);
        setSessions(results);
        setTotalCount(res.data.count || 0);
      } else {
        // Try API search first
        const searchRes = await getPackingHistory({ ...params, search: debouncedSearch });
        const searchResults = searchRes.data.results || [];

        if (searchResults.length > 0) {
          const sorted = sortByStartTime(searchResults);
          // ✅ Picking data now included directly in API response (no enrichment needed)
          setRawSessions(sorted);
          setSessions(sorted);
          setTotalCount(searchRes.data.count || 0);
        } else {
          // Fallback: client-side packer name filter
          const allParams = { page_size: 1000 };
          if (dateFilter) { allParams.start_date = dateFilter; allParams.end_date = dateFilter; }

          const allRes = await getPackingHistory(allParams);
          const allResults = sortByStartTime(allRes.data.results || []);

          const packerMatches = allResults.filter(s =>
            (s.packer_name || '').toLowerCase().includes(q)
          );
          setRawSessions(allResults);
          // ✅ Picking data now included directly in API response (no enrichment needed)
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
    saveFilters({ dateFilter, searchQuery });
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

  const getPreferredInvoiceFromGroupId = (boxing_group_id, rows) => {
    if (!boxing_group_id) return null;
    const parts = boxing_group_id.split("|");
    if (parts.length < 2) return null;
    const preferredNo = parts[1];
    return rows.find(r => r.invoice_no === preferredNo) || null;
  };

  // Memoize grouped sessions to avoid recalculating on every render
  const groupedSessions = useMemo(() => {
    const grouped = {};
    sessions.forEach(s => {
      const key = s.boxing_group_id || `single-${s.id}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(s);
    });
    return Object.entries(grouped);
  }, [sessions]);

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

            <div className="h-6 w-px bg-gray-200" />

            {/* Unified Search */}
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
              onClick={() => { loadSessions(); toast.success("Report Generated"); }}
              className="px-4 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow hover:from-teal-600 hover:to-cyan-700 transition-all whitespace-nowrap ml-auto"
            >
              Generate
            </button>
            <ClearFiltersButton onClear={() => { setDateFilter(new Date().toISOString().split('T')[0]); setSearchQuery(''); setTimeFilter(''); setCurrentPage(1); }} />
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
                <table className="min-w-full divide-y divide-gray-200" style={{tableLayout:'fixed'}}>
                  <colgroup>
                    <col style={{width:'12%'}} />
                    <col style={{width:'16%'}} />
                    <col style={{width:'14%'}} />
                    <col style={{width:'10%'}} />
                    <col style={{width:'16%'}} />
                    <col style={{width:'8%'}} />
                    <col style={{width:'10%'}} />
                    <col style={{width:'8%'}} />
                  </colgroup>
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                    <tr>
                      {["Invoice No", "Customer", "Picking Date & Time", "Packer", "Packing Date & Time", "Boxes", "Status", "Actions"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(() => {
                      return groupedSessions.map(([groupKey, rows]) => {
                        const isGroup = rows.length > 1;
                        const first = rows[0];

                        if (isGroup) {
                          return (
                            <React.Fragment key={groupKey}>
                              {/* Group header — top border + left/right border via outline trick */}
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
                                    <td colSpan="8" className="p-0">
                                      <div className={`mx-3 border-l-2 border-r-2 border-teal-400 ${isLast ? 'border-b-2 rounded-b-lg mb-2' : ''} px-0`}>
                                        <table className="w-full" style={{tableLayout:'fixed'}}>
                                          <colgroup>
                                            <col style={{width:'12%'}} />
                                            <col style={{width:'16%'}} />
                                            <col style={{width:'14%'}} />
                                            <col style={{width:'10%'}} />
                                            <col style={{width:'16%'}} />
                                            <col style={{width:'8%'}} />
                                            <col style={{width:'10%'}} />
                                            <col style={{width:'8%'}} />
                                          </colgroup>
                                          <tbody>
                                            <tr className={`${isLast ? '' : 'border-b border-teal-100'}`}>
                                              <td className="px-4 py-2 pl-8 text-sm font-medium text-teal-700 w-[12%]">{session.invoice_no}</td>
                                              <td className="px-4 py-2 text-sm text-gray-700">
                                                <p>{session.customer_name || '—'}</p>
                                                <p className="text-xs text-gray-500">{session.customer_area || session.customer_address || session.temp_name || '—'}</p>
                                              </td>
                                              <td className="px-4 py-2 text-sm text-gray-700">
                                                {(() => {
                                                  const pickDate = session.picking_date || session.invoice_created_at || session.invoice_date || session.created_at || '';
                                                  const pickStart = session.picking_start_time;
                                                  const pickEnd = session.picking_end_time;
                                                  if (!pickDate && !pickStart && !pickEnd) return <span className="text-gray-400">—</span>;
                                                  return (
                                                    <>
                                                      <p>{pickDate ? formatDateDDMMYYYY(pickDate) : formatDateDDMMYYYY(pickStart || pickEnd)}</p>
                                                      <p className="text-xs text-gray-500">
                                                        {pickStart ? formatTime(pickStart) : (pickDate ? formatTime(pickDate) : '')}
                                                        {pickEnd ? ` → ${formatTime(pickEnd)}` : ''}
                                                      </p>
                                                    </>
                                                  );
                                                })()}
                                              </td>
                                              <td className="px-4 py-2 text-sm text-gray-700">
                                                <p>{session.packer_name || '—'}</p>
                                                {(session.picking_source === 'EXPRESS_BILLING' || session.source === 'EXPRESS_BILLING') && (
                                                  <p className="text-xs text-teal-600 font-semibold">Express Billing</p>
                                                )}
                                              </td>
                                              <td className="px-4 py-2 text-sm text-gray-700">
                                                <p>{formatDateDDMMYYYY(session.created_at)}</p>
                                                <p className="text-xs text-gray-500">
                                                  {formatTime(session.start_time)}{session.end_time ? ` → ${formatTime(session.end_time)}` : ''}
                                                </p>
                                              </td>
                                              <td className="px-4 py-2 text-sm text-gray-700 text-center">
                                                {(session.source === 'EXPRESS_BILLING' || session.picking_source === 'EXPRESS_BILLING') ? (
                                                  <span className="text-gray-400">—</span>
                                                ) : (
                                                  session.packing_status === 'PACKED' && session.label_count != null
                                                    ? <span className="font-semibold text-gray-800">{session.label_count}</span>
                                                    : <span className="text-gray-400">—</span>
                                                )}
                                              </td>
                                              <td className="px-4 py-2">
                                                <span className={`px-2 py-1 rounded-full border text-xs font-bold ${STATUS_BADGE[session.packing_status] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                                                  {session.packing_status || '—'}
                                                </span>
                                              </td>
                                              <td className="px-4 py-2">
                                                <button onClick={() => handleViewSession(session)} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg font-semibold text-xs hover:bg-teal-700">
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

                        // Single row — existing style unchanged
                        return (
                          <tr key={first.id} className={`hover:bg-gray-50 transition-colors ${sessions.indexOf(first) % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{first.invoice_no}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              <p>{first.customer_name || '—'}</p>
                              <p className="text-xs text-gray-500">{first.customer_area || first.customer_address || first.temp_name || '—'}</p>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {(() => {
                                const pickDate = first.picking_date || first.invoice_created_at || first.invoice_date || first.created_at || '';
                                const pickStart = first.picking_start_time;
                                const pickEnd = first.picking_end_time;
                                if (!pickDate && !pickStart && !pickEnd) return <span className="text-gray-400">—</span>;
                                return (
                                  <>
                                    <p>{pickDate ? formatDateDDMMYYYY(pickDate) : formatDateDDMMYYYY(pickStart || pickEnd)}</p>
                                    <p className="text-xs text-gray-500">
                                      {pickStart ? formatTime(pickStart) : (pickDate ? formatTime(pickDate) : '')}
                                      {pickEnd ? ` → ${formatTime(pickEnd)}` : ''}
                                    </p>
                                  </>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              <p>{first.packer_name || '—'}</p>
                              {(first.picking_source === 'EXPRESS_BILLING' || first.source === 'EXPRESS_BILLING') && (
                                <p className="text-xs text-teal-600 font-semibold">Express Billing</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              <p>{formatDateDDMMYYYY(first.created_at)}</p>
                              <p className="text-xs text-gray-500">
                                {formatTime(first.start_time)}{first.end_time ? ` → ${formatTime(first.end_time)}` : ''}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {(first.source === 'EXPRESS_BILLING' || first.picking_source === 'EXPRESS_BILLING') ? (
                                <span className="text-gray-400">—</span>
                              ) : (
                                first.packing_status === 'PACKED' ? (
                                  <div className="space-y-1">
                                    {first.label_count != null && <p className="text-sm text-center font-semibold text-gray-800">{first.label_count}</p>}
                                    {first.courier_name && <p className="text-xs text-center text-blue-700 font-medium">{first.courier_name}</p>}
                                    {!first.label_count && !first.courier_name && <span className="text-gray-400">—</span>}
                                  </div>
                                ) : <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full border text-xs font-bold ${STATUS_BADGE[first.packing_status] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                                {first.packing_status || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button onClick={() => handleViewSession(first)} className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:from-teal-600 hover:to-cyan-700">
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
  );
}