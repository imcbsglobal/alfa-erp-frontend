import React, { useState, useEffect } from 'react';
import { Package, Eye, RefreshCw, X, Layers } from 'lucide-react';
import { getByUrl } from '../../../services/sales';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import useUrlPage from '../../../utils/useUrlPage';
import Pagination from '../../../components/Pagination';
import ActiveUsersDock from '../../../components/ActiveUsersDock';
import { formatAmount, formatDateTime } from '../../../utils/formatters';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ─── helpers ──────────────────────────────────────────────────────────────────
const buildTableRows = (deliveries) => {
  const groupMap = {};
  const singles  = [];
  deliveries.forEach((d) => {
    const gid = d.packer_info?.boxing_group_id;
    if (gid) {
      if (!groupMap[gid]) groupMap[gid] = [];
      groupMap[gid].push(d);
    } else {
      singles.push(d);
    }
  });
  const groups = Object.entries(groupMap).map(([groupId, items]) => ({ type: 'group', groupId, items }));
  return [...groups, ...singles.map(d => ({ type: 'single', delivery: d }))];
};

const getTimeSince = (dateString) => {
  if (!dateString) return '';
  const diffMins = Math.floor((new Date() - new Date(dateString)) / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

// ─── GroupBlock ────────────────────────────────────────────────────────────────
const GroupBlock = ({ groupId, items, onView }) => {
  const repItem       = items[0];
  const highPriority  = items.some((b) => b.priority === 'HIGH');
  const totalAmount   = items.reduce((sum, d) => sum + parseFloat(d.Total || 0), 0);
  const assignedNames = [...new Set(
    items
      .map((d) => d.delivery_info?.delivery_user_name || d.delivery_info?.name)
      .filter(Boolean)
  )];
  const staffLabel = assignedNames.length > 0 ? assignedNames.join(', ') : 'Unassigned';

  const borderColor = '#5eead4';
  const headerBg    = '#f0fdfa';

  return (
    <>
      <tr aria-hidden="true">
        <td colSpan={8} className="bg-gray-50 p-0" style={{ height: 10 }} />
      </tr>

      <tr>
        <td
          colSpan={8}
          style={{
            background: headerBg,
            borderLeft: `2px solid ${borderColor}`,
            borderRight: `2px solid ${borderColor}`,
            borderTop: `2px solid ${borderColor}`,
            borderRadius: '10px 10px 0 0',
            padding: '8px 16px',
          }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <div
              className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: '#ccfbf1' }}
            >
              <Layers className="w-3.5 h-3.5" style={{ color: '#0d9488' }} />
            </div>

            <span className="text-xs font-bold" style={{ color: '#0f766e' }}>
              Consolidated · {items.length} invoice{items.length !== 1 ? 's' : ''}
            </span>

            {highPriority && (
              <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-300">
                HIGH PRIORITY
              </span>
            )}

            <span className="text-xs text-gray-700 bg-white border border-teal-200 px-2 py-0.5 rounded-full">
              Assigned: {staffLabel}
            </span>

            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-gray-400 font-mono">
                {groupId.slice(-6).toUpperCase()}
              </span>
              <span className="text-sm font-semibold text-gray-800">
                {formatAmount(totalAmount)}
              </span>
            </div>
          </div>
        </td>
      </tr>

      {items.map((delivery, idx) => {
        const isInProgress = delivery.delivery_info?.start_time && !delivery.delivery_info?.end_time;
        const isPending = !delivery.delivery_info?.start_time;
        const isLast = idx === items.length - 1;

        return (
          <tr
            key={delivery.id}
            className={`transition-colors ${
              idx % 2 === 0
                ? 'bg-white hover:bg-gray-50'
                : 'bg-teal-50/20 hover:bg-teal-50/60'
            }`}
            style={{
              borderLeft: `2px solid ${borderColor}`,
              borderRight: `2px solid ${borderColor}`,
              borderBottom: isLast
                ? `2px solid ${borderColor}`
                : `1px solid ${highPriority ? '#fee2e2' : '#ccfbf1'}`,
              borderRadius: isLast ? '0 0 10px 10px' : undefined,
            }}
          >
            <td className="px-4 py-3">
              <p className="font-semibold text-gray-900 text-sm">{delivery.invoice_no}</p>
              <p className="text-xs text-gray-400">{delivery.customer?.code}</p>
            </td>
            <td className="px-4 py-3">
              <p className="font-medium text-gray-900 text-sm">
                {delivery.customer?.name || delivery.temp_name || '—'}
              </p>
              <p className="text-xs text-gray-400">
                {delivery.customer?.address1 || delivery.customer?.area || ''}
              </p>
            </td>
            <td className="px-4 py-3">
              <p className="text-sm text-gray-700">{delivery.customer?.phone1 || '—'}</p>
            </td>
            <td className="px-4 py-3 text-right">
              <p className="font-semibold text-gray-800 text-sm">{formatAmount(delivery.Total)}</p>
              <p className="text-xs text-gray-400">{delivery.items?.length || 0} items</p>
            </td>
            <td className="px-4 py-3">
              <p className="text-sm font-medium text-gray-900 truncate">
                {delivery.delivery_info?.delivery_user_name || delivery.delivery_info?.name || 'Unassigned'}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {delivery.delivery_info?.delivery_user_email || delivery.delivery_info?.email || ''}
              </p>
            </td>
            <td className="px-4 py-3">
              {isInProgress ? (
                <span className="inline-flex items-center px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                  In Progress
                </span>
              ) : isPending ? (
                <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  Pending
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                  Assigned
                </span>
              )}
            </td>
            <td className="px-4 py-3">
              <p className="text-sm text-gray-700">{formatDateTime(delivery.created_at)}</p>
              <p className="text-xs text-gray-400">{getTimeSince(delivery.created_at)}</p>
            </td>
            <td className="px-4 py-3">
              <button
                onClick={() => onView(delivery.id)}
                className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white
                           rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow
                           hover:from-teal-600 hover:to-cyan-700 transition-all"
              >
                <Eye className="w-3.5 h-3.5" />
                View
              </button>
            </td>
          </tr>
        );
      })}

      <tr aria-hidden="true">
        <td colSpan={8} className="bg-gray-50 p-0" style={{ height: 4 }} />
      </tr>
    </>
  );
};

// ─── SingleRow ─────────────────────────────────────────────────────────────────
const SingleRow = ({ delivery, onView }) => {
  const isInProgress = delivery.delivery_info?.start_time && !delivery.delivery_info?.end_time;
  const isPending    = !delivery.delivery_info?.start_time;
  return (
    <tr className="hover:bg-gray-50 transition border-b border-gray-100">
      <td className="px-4 py-3">
        <p className="font-semibold text-gray-900">{delivery.invoice_no}</p>
        <p className="text-xs text-gray-500">{delivery.customer?.code}</p>
      </td>
      <td className="px-4 py-3">
        <p className="font-medium text-gray-900">{delivery.customer?.name || '—'}</p>
        <p className="text-xs text-gray-500">
          {delivery.customer?.address1 || delivery.temp_name || ''}
        </p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-gray-900">{delivery.customer?.phone1 || '—'}</p>
      </td>
      <td className="px-4 py-3 text-right">
        <p className="font-semibold text-gray-900">{formatAmount(delivery.Total)}</p>
        <p className="text-xs text-gray-500">{delivery.items?.length || 0} items</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-start gap-2">
          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
            isInProgress ? 'bg-yellow-500 animate-pulse' : isPending ? 'bg-green-500' : 'bg-gray-400'
          }`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {delivery.delivery_info?.delivery_user_name || delivery.delivery_info?.name || 'Staff Member'}
            </p>
            {(delivery.delivery_info?.delivery_user_email || delivery.delivery_info?.email) && (
              <p className="text-xs text-gray-500 truncate">
                {delivery.delivery_info?.delivery_user_email || delivery.delivery_info?.email}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {isInProgress ? (
          <span className="inline-flex items-center px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">In Progress</span>
        ) : isPending ? (
          <span className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Pending</span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">Assigned</span>
        )}
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-gray-900">{formatDateTime(delivery.created_at)}</p>
        <p className="text-xs text-gray-500">{getTimeSince(delivery.created_at)}</p>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onView(delivery.id)}
          className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white
                     rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow
                     hover:from-teal-600 hover:to-cyan-700 transition-all"
        >
          <Eye className="w-3.5 h-3.5" />
          View
        </button>
      </td>
    </tr>
  );
};

// ─── main page ─────────────────────────────────────────────────────────────────
const CompanyDeliveryListPage = () => {
  const [deliveries, setDeliveries]         = useState([]);
  const [loading, setLoading]               = useState(false);
  const [searchTerm, setSearchTerm]         = useState('');
  const [currentPage, setCurrentPage]       = useUrlPage();
  const navigate     = useNavigate();
  const itemsPerPage = 10;

  useEffect(() => {
    loadCompanyDeliveries();
    const handleDataCleared = (e) => {
      const { tableName } = e.detail;
      if (['all', 'delivery_sessions'].includes(tableName)) loadCompanyDeliveries();
    };
    window.addEventListener('dataCleared', handleDataCleared);
    return () => window.removeEventListener('dataCleared', handleDataCleared);
  }, []);

  useEffect(() => {
    let es, reconnectTimeout;
    let attempts = 0;
    const connect = () => {
      if (es) es.close();
      es = new EventSource(`${API_BASE_URL}/sales/sse/invoices/`);
      es.onmessage = (event) => {
        attempts = 0;
        try {
          const data = JSON.parse(event.data);
          if (!data.invoice_no) return;
          if (data.delivery_type === 'INTERNAL' && data.delivery_status === 'TO_CONSIDER') {
            loadCompanyDeliveries();
          }
        } catch (_) {}
      };
      es.onerror = () => {
        es.close(); attempts++;
        reconnectTimeout = setTimeout(connect, Math.min(1000 * 2 ** attempts, 30000));
      };
    };
    connect();
    return () => { if (reconnectTimeout) clearTimeout(reconnectTimeout); if (es) es.close(); };
  }, []);

  const loadCompanyDeliveries = async () => {
    setLoading(true);
    try {
      let all = [];
      let nextUrl = '/sales/delivery/consider-list/?delivery_type=INTERNAL&status=TO_CONSIDER&page_size=100';
      while (nextUrl) {
        const res = await getByUrl(nextUrl);
        all = [...all, ...(res.data.results || [])];
        nextUrl = res.data.next;
        if (nextUrl) {
          const u = new URL(nextUrl, window.location.origin);
          nextUrl = u.pathname.replace(/^\/api/, '') + u.search;
        }
      }
      const sorted = all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setDeliveries(sorted);
    } catch {
      toast.error('Failed to load company deliveries');
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = (billId) => navigate(`/delivery/invoices/view/${billId}/company-delivery`);

  // ── derived ──────────────────────────────────────────────────────────────────
  const matchesSearch = (d) => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return (
      d.invoice_no?.toLowerCase().includes(s) ||
      d.customer?.name?.toLowerCase().includes(s) ||
      d.customer?.code?.toLowerCase().includes(s) ||
      d.delivery_info?.delivery_user_name?.toLowerCase().includes(s) ||
      d.delivery_info?.delivery_user_email?.toLowerCase().includes(s)
    );
  };

  const filtered   = deliveries.filter(matchesSearch);
  const tableRows  = buildTableRows(filtered);
  const totalCount = tableRows.length;
  const pagedRows  = tableRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const groupCount  = tableRows.filter(r => r.type === 'group').length;
  const singleCount = tableRows.filter(r => r.type === 'single').length;

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">

        {/* header */}
        <div className="mb-6 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Company Delivery - Consider List</h1>
            {!loading && filtered.length > 0 && (
              <p className="text-sm text-gray-500 mt-0.5">
                {groupCount > 0 && <span>{groupCount} group{groupCount !== 1 ? 's' : ''} · </span>}
                {singleCount > 0 && <span>{singleCount} single order{singleCount !== 1 ? 's' : ''}</span>}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search invoice, customer, or staff..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="px-4 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none
                           focus:ring-2 focus:ring-teal-500 w-full sm:w-64 text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                ><X className="w-4 h-4" /></button>
              )}
            </div>
            <button
              onClick={async () => { await loadCompanyDeliveries(); toast.success('Refreshed'); }}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg
                         font-semibold text-sm shadow-lg hover:from-teal-600 hover:to-cyan-700
                         transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent mb-4" />
              <p className="text-gray-500">Loading deliveries...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-lg font-medium">No company deliveries in consider list</p>
              <p className="text-sm text-gray-400 mt-2">
                {searchTerm ? 'Try adjusting your search' : 'Assigned deliveries will appear here'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '23%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '11%' }} />
                    <col style={{ width: '8%' }} />
                  </colgroup>
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Invoice</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Customer</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Contact</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Assigned Staff</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Assigned At</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-50">
                    {pagedRows.map((row) => {
                      if (row.type === 'group') {
                        return (
                          <GroupBlock
                            key={row.groupId}
                            groupId={row.groupId}
                            items={row.items}
                            onView={handleViewInvoice}
                          />
                        );
                      }
                      return (
                        <SingleRow
                          key={row.delivery.id}
                          delivery={row.delivery}
                          onView={handleViewInvoice}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={currentPage}
                totalItems={totalCount}
                itemsPerPage={itemsPerPage}
                onPageChange={(p) => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                label="deliveries"
                colorScheme="teal"
              />
            </>
          )}
          <ActiveUsersDock type="delivery" />
        </div>
      </div>
    </div>
  );
};

export default CompanyDeliveryListPage;