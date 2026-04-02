import React, { useState, useEffect, useRef } from 'react';
import { Truck, Upload, X, Layers } from 'lucide-react';
import { getByUrl, getDeliveryHistory, uploadDeliverySlip } from '../../../services/sales';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import useUrlPage from '../../../utils/useUrlPage';
import Pagination from '../../../components/Pagination';
import { formatFileSize, formatAmount } from '../../../utils/formatters';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const formatAddedDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatAddedTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const normalizeCourierDelivery = (row) => {
  const boxingGroupId = row?.packer_info?.boxing_group_id || row?.boxing_group_id || '';
  return {
    ...row,
    id: row?.invoice_id || row?.id,
    customer: row?.customer || {
      name: row?.customer_name || row?.temp_name || '—',
      code: row?.customer_code || '',
      phone1: row?.customer_phone || '',
      address1: row?.customer_address || row?.customer_area || row?.temp_name || '',
      area: row?.customer_area || row?.customer_address || row?.temp_name || '',
    },
    delivery_info: row?.delivery_info || {
      courier_name: row?.courier_name || '',
      delivery_status: row?.delivery_status || '',
    },
    packer_info: row?.packer_info || { boxing_group_id: boxingGroupId },
  };
};

const getDeliveryStatus = (row) => row?.delivery_info?.delivery_status || row?.delivery_status || '';

const shouldShowInCourierConsiderList = (row) => {
  const status = getDeliveryStatus(row);
  const hasSlip = Boolean(row?.courier_slip_url || row?.courier_slip || row?.pod_uploaded);
  return status === 'TO_CONSIDER' && !hasSlip;
};

const buildTableRows = (deliveries) => {
  const groupMap = {};
  const singles = [];
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

// ─── Mobile Card for single delivery ──────────────────────────────────────────
const MobileSingleCard = ({ delivery, onView, onUpload }) => {
  const isCourierAssigned = !!delivery.delivery_info?.courier_name;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-bold text-gray-900 text-base">{delivery.invoice_no}</p>
          <p className="text-xs text-gray-400">{delivery.customer?.code}</p>
        </div>
        {isCourierAssigned ? (
          <div className="text-right">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">Assigned</span>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 justify-end">
              <Truck className="w-3 h-3" />{delivery.delivery_info.courier_name}
            </p>
          </div>
        ) : (
          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">Pending</span>
        )}
      </div>
      <p className="font-medium text-gray-800 text-sm">{delivery.customer?.name || '—'}</p>
      <p className="text-xs text-gray-500 mb-1">{delivery.customer?.address1 || delivery.temp_name || ''}</p>
      <div className="flex items-center justify-between mt-2">
        <div>
          <p className="text-xs text-gray-400">{delivery.customer?.phone1 || '—'}</p>
          <p className="text-xs text-gray-400">{delivery.items?.length || 0} items · {formatAmount(delivery.Total)}</p>
          <p className="text-xs text-gray-400">{formatAddedDate(delivery.created_at)} {formatAddedTime(delivery.created_at)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onView(delivery.id)}
            className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-xs hover:from-teal-600 hover:to-cyan-700 transition-all"
          >
            View
          </button>
          <button
            onClick={() => onUpload(delivery)}
            className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-xs hover:from-teal-600 hover:to-cyan-700 transition-all flex items-center gap-1"
          >
            <Upload className="w-3 h-3" />
            Slip
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Mobile Card for group delivery ───────────────────────────────────────────
const MobileGroupCard = ({ groupId, items, onUpload, onView }) => {
  const [expanded, setExpanded] = useState(false);
  const highPriority = items.some(b => b.priority === 'HIGH');
  return (
    <div className={`border-2 rounded-xl overflow-hidden shadow-sm ${highPriority ? 'border-red-300' : 'border-teal-300'}`}>
      <div className={`px-4 py-3 ${highPriority ? 'bg-red-50' : 'bg-teal-50'}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
            <Layers className="w-4 h-4 text-teal-600" />
          </div>
          <span className="text-xs font-bold text-teal-900">
            Consolidated · {items.length} invoice{items.length !== 1 ? 's' : ''}
          </span>
          {highPriority && (
            <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-300 ml-auto">
              HIGH PRIORITY
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-xs text-teal-600 font-semibold underline"
          >
            {expanded ? 'Hide invoices' : `Show ${items.length} invoices`}
          </button>
          <button
            onClick={() => onUpload(items[0], items)}
            className="px-3 py-1.5 text-white rounded-lg font-semibold text-xs transition-all shadow flex items-center gap-1 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
          >
            <Upload className="w-3 h-3" />
            Upload Slip
          </button>
        </div>
      </div>
      {expanded && (
        <div className="divide-y divide-teal-100">
          {items.map((delivery) => {
            const isCourierAssigned = !!delivery.delivery_info?.courier_name;
            return (
              <div key={delivery.id} className="px-4 py-3 bg-white">
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <p className="font-semibold text-teal-700 text-sm">{delivery.invoice_no}</p>
                    <p className="font-medium text-gray-800 text-sm">{delivery.customer?.name || '—'}</p>
                    <p className="text-xs text-gray-500">{delivery.customer?.address1 || ''}</p>
                    <p className="text-xs text-gray-400">{delivery.customer?.phone1 || '—'}</p>
                    <p className="text-xs text-gray-400">{delivery.items?.length || 0} items · {formatAmount(delivery.Total)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isCourierAssigned ? (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">Assigned</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">Pending</span>
                    )}
                    <button
                      onClick={() => onView(delivery.id)}
                      className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-xs hover:from-teal-600 hover:to-cyan-700 transition-all shadow"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Desktop GroupBlock (table row based) ──────────────────────────────────────
const GroupBlock = ({ groupId, items, onUpload, onView }) => {
  const highPriority = items.some(b => b.priority === 'HIGH');
  const borderColor = '#5eead4';
  const headerBg = '#f0fdfa';

  return (
    <>
      <tr aria-hidden="true">
        <td colSpan={8} className="bg-gray-50 p-0" style={{ height: 10 }} />
      </tr>
      <tr>
        <td colSpan={8} style={{ background: headerBg, borderLeft: `2px solid ${borderColor}`, borderRight: `2px solid ${borderColor}`, borderTop: `2px solid ${borderColor}`, borderRadius: '10px 10px 0 0', padding: '8px 16px' }}>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0" style={{ background: '#ccfbf1' }}>
              <Layers className="w-3.5 h-3.5" style={{ color: '#0d9488' }} />
            </div>
            <span className="text-xs font-bold" style={{ color: '#0f766e' }}>
              Consolidated · {items.length} invoice{items.length !== 1 ? 's' : ''}
            </span>
            {highPriority && (
              <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-300">HIGH PRIORITY</span>
            )}
            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-gray-400 font-mono">{groupId.slice(-6).toUpperCase()}</span>
              <button
                onClick={() => onUpload(items[0], items)}
                className="px-3 py-1.5 text-white rounded-lg font-semibold text-xs transition-all shadow flex items-center gap-1 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
              >
                <Upload className="w-3 h-3" />
                Upload Slip
              </button>
            </div>
          </div>
        </td>
      </tr>
      {items.map((delivery, idx) => {
        const isCourierAssigned = !!delivery.delivery_info?.courier_name;
        const isLast = idx === items.length - 1;
        return (
          <tr key={delivery.id} className={`transition-colors ${idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-teal-50/20 hover:bg-teal-50/60'}`}
            style={{ borderLeft: `2px solid ${borderColor}`, borderRight: `2px solid ${borderColor}`, borderBottom: isLast ? `2px solid ${borderColor}` : `1px solid ${highPriority ? '#fee2e2' : '#ccfbf1'}`, borderRadius: isLast ? '0 0 10px 10px' : undefined }}>
            <td className="px-4 py-3"><p className="font-semibold text-gray-900 text-sm">{delivery.invoice_no}</p><p className="text-xs text-gray-400">{delivery.customer?.code}</p></td>
            <td className="px-4 py-3"><p className="font-medium text-gray-900 text-sm">{delivery.customer?.name || delivery.temp_name || '—'}</p><p className="text-xs text-gray-400">{delivery.customer?.address1 || delivery.customer?.area || ''}</p></td>
            <td className="px-4 py-3"><p className="text-sm text-gray-700">{delivery.customer?.phone1 || '—'}</p></td>
            <td className="px-4 py-3 text-sm text-gray-600">{delivery.items?.length || 0} items</td>
            <td className="px-4 py-3 text-right"><p className="font-semibold text-gray-800 text-sm">{formatAmount(delivery.Total)}</p></td>
            <td className="px-4 py-3"><p className="text-sm text-gray-700">{formatAddedDate(delivery.created_at)}</p><p className="text-xs text-gray-500">{formatAddedTime(delivery.created_at)}</p></td>
            <td className="px-4 py-3">
              {isCourierAssigned ? (
                <div>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium inline-flex mb-0.5">Assigned</span>
                  <span className="text-xs text-gray-500 flex items-center gap-1"><Truck className="w-3 h-3" />{delivery.delivery_info.courier_name}</span>
                </div>
              ) : (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">Pending</span>
              )}
            </td>
            <td className="px-4 py-3">
              <button onClick={() => onView(delivery.id)} className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-xs hover:from-teal-600 hover:to-cyan-700 transition-all shadow">View</button>
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

// ─── Desktop SingleRow ─────────────────────────────────────────────────────────
const SingleRow = ({ delivery, onView, onUpload }) => {
  const isCourierAssigned = !!delivery.delivery_info?.courier_name;
  return (
    <tr className="hover:bg-gray-50 transition border-b border-gray-100">
      <td className="px-4 py-3"><p className="font-semibold text-gray-900">{delivery.invoice_no}</p><p className="text-xs text-gray-500">{delivery.customer?.code}</p></td>
      <td className="px-4 py-3"><p className="font-medium text-gray-900">{delivery.customer?.name || '—'}</p><p className="text-xs text-gray-500">{delivery.customer?.address1 || delivery.temp_name || ''}</p></td>
      <td className="px-4 py-3"><p className="text-sm text-gray-700">{delivery.customer?.phone1 || '—'}</p></td>
      <td className="px-4 py-3 text-sm text-gray-600">{delivery.items?.length || 0} items</td>
      <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatAmount(delivery.Total)}</td>
      <td className="px-4 py-3"><p className="text-sm text-gray-700">{formatAddedDate(delivery.created_at)}</p><p className="text-xs text-gray-500">{formatAddedTime(delivery.created_at)}</p></td>
      <td className="px-4 py-3">
        {isCourierAssigned ? (
          <div>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium inline-flex mb-0.5">Assigned</span>
            <span className="text-xs text-gray-500 flex items-center gap-1"><Truck className="w-3 h-3" />{delivery.delivery_info.courier_name}</span>
          </div>
        ) : (
          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">Pending</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <button onClick={() => onView(delivery.id)} className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm hover:from-teal-600 hover:to-cyan-700 transition-all">View</button>
          <button onClick={() => onUpload(delivery)} className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm hover:from-teal-600 hover:to-cyan-700 transition-all flex items-center gap-1">
            <Upload className="w-3.5 h-3.5" />
            Upload Slip
          </button>
        </div>
      </td>
    </tr>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
const CourierDeliveryListPage = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useUrlPage();
  const [uploadModal, setUploadModal] = useState({ open: false, delivery: null, invoiceNos: [], boxingGroupId: '' });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const itemsPerPage = 10;

  useEffect(() => { loadCourierDeliveries(); }, []);

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
          if (data.delivery_type === 'COURIER' && (data.delivery_status === 'TO_CONSIDER' || data.pod_uploaded)) loadCourierDeliveries();
        } catch (_) {}
      };
      es.onerror = () => { es.close(); attempts++; reconnectTimeout = setTimeout(connect, Math.min(1000 * 2 ** attempts, 30000)); };
    };
    connect();
    return () => { if (reconnectTimeout) clearTimeout(reconnectTimeout); if (es) es.close(); };
  }, []);

  const loadCourierDeliveries = async () => {
    setLoading(true);
    try {
      let all = [];
      let nextUrl = '/sales/delivery/consider-list/?delivery_type=COURIER&status=TO_CONSIDER&page_size=100';
      while (nextUrl) {
        const res = await getByUrl(nextUrl);
        all = [...all, ...(res.data.results || []).map(normalizeCourierDelivery).filter((row) => shouldShowInCourierConsiderList(row))];
        nextUrl = res.data.next;
        if (nextUrl) { const u = new URL(nextUrl, window.location.origin); nextUrl = u.pathname.replace(/^\/api/, '') + u.search; }
      }
      const historyRes = await getDeliveryHistory({ delivery_type: 'COURIER', status: 'TO_CONSIDER', page_size: 10000 });
      const historyRows = (historyRes.data?.results || []).map(normalizeCourierDelivery).filter((row) => row?.invoice_no && shouldShowInCourierConsiderList(row));
      const mergedByInvoice = new Map();
      [...all, ...historyRows].forEach((row) => { if (!row?.invoice_no) return; if (!mergedByInvoice.has(row.invoice_no)) mergedByInvoice.set(row.invoice_no, row); });
      const sorted = [...mergedByInvoice.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setDeliveries(sorted);
    } catch { toast.error('Failed to load courier deliveries'); }
    finally { setLoading(false); }
  };

  const handleViewInvoice = (billId) => navigate(`/delivery/invoices/view/${billId}/courier-delivery`);
  const handleUploadClick = (delivery, groupItems = null) => {
    const invoiceNos = Array.isArray(groupItems) && groupItems.length > 0 ? groupItems.map((item) => item?.invoice_no).filter(Boolean) : [delivery?.invoice_no].filter(Boolean);
    const boxingGroupId = delivery?.packer_info?.boxing_group_id || (Array.isArray(groupItems) && groupItems[0]?.packer_info?.boxing_group_id) || '';
    setUploadModal({ open: true, delivery, invoiceNos, boxingGroupId });
    setUploadedFile(null); setPreviewUrl('');
  };
  const handleRemoveFile = () => { setUploadedFile(null); setPreviewUrl(''); };
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) { toast.error('Please upload an image or PDF file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('File size must be less than 5MB'); return; }
    setUploadedFile(file);
    if (file.type.startsWith('image/')) { const reader = new FileReader(); reader.onloadend = () => setPreviewUrl(reader.result); reader.readAsDataURL(file); }
    else { setPreviewUrl(''); }
  };
  const handleUploadSlip = async () => {
    if (!uploadedFile) { toast.error('Please upload a courier slip/screenshot'); return; }
    setSubmitting(true);
    try {
      const formData = new FormData();
      if ((uploadModal.invoiceNos || []).length > 1) {
        formData.append('invoice_nos', JSON.stringify(uploadModal.invoiceNos));
        if (uploadModal.boxingGroupId) formData.append('boxing_group_id', uploadModal.boxingGroupId);
      } else { formData.append('invoice_no', uploadModal.delivery.invoice_no); }
      formData.append('courier_slip', uploadedFile);
      formData.append('delivery_type', 'COURIER');
      await uploadDeliverySlip(formData);
      const completedInvoiceNos = (uploadModal.invoiceNos || []).length > 0 ? uploadModal.invoiceNos : [uploadModal.delivery?.invoice_no].filter(Boolean);
      setDeliveries((prev) => prev.filter((d) => !completedInvoiceNos.includes(d.invoice_no)));
      toast.success('Courier slip uploaded! Delivery marked as completed.');
      setUploadModal({ open: false, delivery: null, invoiceNos: [], boxingGroupId: '' });
      setUploadedFile(null); setPreviewUrl('');
      await loadCourierDeliveries();
    } catch (error) { toast.error(error.response?.data?.detail || error.response?.data?.message || 'Failed to upload courier slip'); }
    finally { setSubmitting(false); }
  };

  const matchesSearch = (d) => {
    if (!searchTerm.trim()) return true;
    const s = searchTerm.toLowerCase();
    return d.invoice_no?.toLowerCase().includes(s) || d.customer?.name?.toLowerCase().includes(s) || d.customer?.code?.toLowerCase().includes(s) || d.delivery_info?.courier_name?.toLowerCase().includes(s);
  };

  const filtered = deliveries.filter(matchesSearch);
  const tableRows = buildTableRows(filtered);
  const totalCount = tableRows.length;
  const pagedRows = tableRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const closeModal = () => setUploadModal({ open: false, delivery: null, invoiceNos: [], boxingGroupId: '' });

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
      <div className="max-w-7xl mx-auto">

        {/* Page header */}
        <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Courier Delivery - Consider List</h1>
          <div className="flex items-center gap-2">
            {/* Search — full width on mobile */}
            <div className="relative flex-1 sm:flex-none">
              <input
                type="text"
                placeholder="Search invoice or customer..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="px-4 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 w-full sm:w-64 text-sm"
              />
              {searchTerm && (
                <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={async () => { await loadCourierDeliveries(); toast.success('Refreshed'); }}
              className="px-3 sm:px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all whitespace-nowrap"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-500">Loading deliveries...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              <Truck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p>{searchTerm ? 'No matching courier deliveries found' : 'No courier deliveries in consider list'}</p>
            </div>
          ) : (
            <>
              {/* ── Mobile card layout (< md) ── */}
              <div className="md:hidden p-3 space-y-3">
                {pagedRows.map((row) => {
                  if (row.type === 'group') {
                    return <MobileGroupCard key={row.groupId} groupId={row.groupId} items={row.items} onUpload={handleUploadClick} onView={handleViewInvoice} />;
                  }
                  return <MobileSingleCard key={row.delivery.id} delivery={row.delivery} onView={handleViewInvoice} onUpload={handleUploadClick} />;
                })}
              </div>

              {/* ── Desktop table layout (≥ md) ── */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '26%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '19%' }} />
                  </colgroup>
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                    <tr>
                      {['Invoice', 'Customer', 'Contact', 'Items', 'Amount', 'Added At', 'Status', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-gray-50">
                    {pagedRows.map((row) => {
                      if (row.type === 'group') return <GroupBlock key={row.groupId} groupId={row.groupId} items={row.items} onUpload={handleUploadClick} onView={handleViewInvoice} />;
                      return <SingleRow key={row.delivery.id} delivery={row.delivery} onView={handleViewInvoice} onUpload={handleUploadClick} />;
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={currentPage}
                totalItems={totalCount}
                itemsPerPage={itemsPerPage}
                onPageChange={(p) => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                label="orders"
                colorScheme="teal"
              />
            </>
          )}
        </div>
      </div>

      {/* ── Upload Slip Modal ── */}
      {uploadModal.open && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={closeModal} />
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div
              className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-3 flex items-center justify-between rounded-t-2xl sm:rounded-t-xl">
                <h3 className="text-lg font-bold text-white">Upload Courier Slip</h3>
                <button onClick={closeModal} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1.5 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{uploadModal.delivery?.invoice_no}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{uploadModal.delivery?.customer?.name}</p>
                      {(uploadModal.invoiceNos || []).length > 1 && (
                        <p className="text-xs text-teal-700 mt-1 font-semibold">Applies to {(uploadModal.invoiceNos || []).length} grouped invoices</p>
                      )}
                      {uploadModal.delivery?.delivery_info?.courier_name && (
                        <p className="text-xs text-teal-600 mt-1 font-medium">Courier: {uploadModal.delivery.delivery_info.courier_name}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatAmount(uploadModal.delivery?.Total)}</p>
                      <p className="text-xs text-gray-500">{uploadModal.delivery?.items?.length || 0} items</p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Courier Slip/Screenshot <span className="text-red-500">*</span>
                  </label>
                  {!uploadedFile ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-500 transition-colors">
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <label className="cursor-pointer">
                        <span className="text-teal-600 hover:text-teal-700 font-medium text-sm">Click to upload</span>
                        <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">Image or PDF (max. 5MB)</p>
                    </div>
                  ) : (
                    <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center gap-3">
                        {previewUrl ? <img src={previewUrl} alt="Preview" className="w-16 h-16 object-cover rounded border" /> : <div className="w-16 h-16 bg-gray-200 rounded border flex items-center justify-center"><span className="text-2xl">📄</span></div>}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{uploadedFile.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(uploadedFile.size)}</p>
                        </div>
                        <button onClick={handleRemoveFile} className="text-red-500 hover:text-red-700 p-1"><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-5 pb-5 flex gap-3">
                <button onClick={closeModal} disabled={submitting} className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">Cancel</button>
                <button onClick={handleUploadSlip} disabled={submitting || !uploadedFile}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                  {submitting ? 'Uploading...' : 'Upload & Complete'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CourierDeliveryListPage;