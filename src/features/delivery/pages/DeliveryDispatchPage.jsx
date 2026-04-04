import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Truck, Package, User, X, RefreshCw,
  ScanLine, CheckCircle, ChevronDown, ChevronUp, Layers, Plus, Send,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useUrlPage from '../../../utils/useUrlPage';
import {
  getByUrl,
  getDeliveryHistory,
  startDelivery,
  getCouriers,
  getEligibleDeliveryStaff,
} from '../../../services/sales';
import DeliveryModal from '../components/DeliveryModal';
import { useAuth } from '../../auth/AuthContext';
import toast from 'react-hot-toast';
import Pagination from '../../../components/Pagination';
import { formatDate, formatTime } from '../../../utils/formatters';
import { resolveMediaUrl } from '../../../utils/media';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ─── constants ────────────────────────────────────────────────────────────────
const MODES = [
  {
    key: 'COUNTER_PICKUP',
    label: 'Counter Pickup',
    sub: 'Patient / Company',
    icon: User,
    activeClasses: 'border-teal-500 bg-teal-50',
    idleClasses: 'border-teal-200 bg-teal-50/40 hover:border-teal-300 hover:bg-teal-50/70',
    iconBg: 'bg-teal-100',
    iconBgIdle: 'bg-teal-50',
    iconColor: 'text-teal-600',
    iconColorIdle: 'text-teal-400',
    textActive: 'text-teal-700',
    textIdle: 'text-teal-700',
    check: 'text-teal-500',
  },
  {
    key: 'COURIER',
    label: 'Courier Delivery',
    sub: 'External courier',
    icon: Truck,
    activeClasses: 'border-orange-500 bg-orange-50',
    idleClasses: 'border-orange-200 bg-orange-50/40 hover:border-orange-300 hover:bg-orange-50/70',
    iconBg: 'bg-orange-100',
    iconBgIdle: 'bg-orange-50',
    iconColor: 'text-orange-600',
    iconColorIdle: 'text-orange-400',
    textActive: 'text-orange-700',
    textIdle: 'text-orange-700',
    check: 'text-orange-500',
  },
  {
    key: 'COMPANY_DELIVERY',
    label: 'Company Delivery',
    sub: 'Internal staff',
    icon: Package,
    activeClasses: 'border-blue-500 bg-blue-50',
    idleClasses: 'border-blue-200 bg-blue-50/40 hover:border-blue-300 hover:bg-blue-50/70',
    iconBg: 'bg-blue-100',
    iconBgIdle: 'bg-blue-50',
    iconColor: 'text-blue-600',
    iconColorIdle: 'text-blue-400',
    textActive: 'text-blue-700',
    textIdle: 'text-blue-700',
    check: 'text-blue-500',
  },
];

/** Group multi-packed bills by boxing_group_id */
const groupByBoxingGroup = (bills) => {
  const map = {};
  bills.forEach((bill) => {
    const gid = bill.packer_info?.boxing_group_id || 'UNGROUPED';
    if (!map[gid]) map[gid] = [];
    map[gid].push(bill);
  });
  return Object.entries(map).map(([groupId, items]) => ({ groupId, items }));
};

const normalizeGroupToken = (value = '') => (
  String(value)
    .trim()
    .replace(/^group\s*[.:·-]?\s*/i, '')
    .replace(/\s+/g, '')
    .toUpperCase()
);

const CourierAvatar = ({ courier, size = 'w-8 h-8' }) => {
  const logo = resolveMediaUrl(courier?.courier_logo_url || courier?.courier_logo);

  if (logo) {
    return (
      <img
        src={logo}
        alt={`${courier?.courier_name || 'Courier'} logo`}
        className={`${size} rounded-lg object-contain border border-gray-200 bg-white flex-shrink-0 p-0.5`}
      />
    );
  }

  return (
    <div className={`${size} rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0`}>
      <span className="text-xs font-semibold text-gray-500">
        {(courier?.courier_name || 'C').charAt(0).toUpperCase()}
      </span>
    </div>
  );
};

const StaffAvatar = ({ staff, size = 'w-8 h-8' }) => {
  const avatar = resolveMediaUrl(staff?.avatar);

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={staff?.name || 'Staff'}
        className={`${size} rounded-full object-contain border border-gray-200 bg-white flex-shrink-0 p-0.5`}
      />
    );
  }

  return (
    <div className={`${size} rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0`}>
      <span className="text-xs font-semibold text-blue-600">
        {(staff?.name || 'S').charAt(0).toUpperCase()}
      </span>
    </div>
  );
};

// ─── SingleRow ────────────────────────────────────────────────────────────────
const SingleRow = ({ bill, onDispatch, onView, batchMode, onAddToBatch, batchIds, batchDisabled }) => {
  const inBatch = batchIds?.has(bill.id);
  return (
    <tr className={`hover:bg-gray-50 transition-colors
      ${bill.priority === 'HIGH' ? 'bg-red-50' : ''}
      ${inBatch ? 'bg-teal-50/60' : ''}`}
    >
      <td className="px-4 py-3">
        <p className="font-semibold text-gray-900 text-sm">{bill.invoice_no}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-gray-800">{formatDate(bill.created_at)}</p>
        <p className="text-xs text-gray-400">{formatTime(bill.created_at)}</p>
      </td>
      <td className="px-4 py-3">
        <p className="font-medium text-gray-900 text-sm">{bill.customer?.name || '—'}</p>
        <p className="text-xs text-gray-400">
          {bill.customer?.area || bill.customer?.address1 || bill.temp_name || '—'}
        </p>
      </td>
      <td className="px-4 py-3">
        {(() => {
          const count = bill.tray_codes?.length || bill.packer_info?.label_count || 0;
          const courier = bill.packer_info?.courier_name || '';
          return count > 0 ? (
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold rounded-lg">
                📦 {count}
              </span>
              {courier && (
                <p className="text-xs text-blue-600 font-medium truncate max-w-[80px]">{courier}</p>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          );
        })()}
      </td>
      <td className="px-4 py-3">
        {batchMode ? (
          <button
            onClick={() => !batchDisabled && onAddToBatch(bill)}
            disabled={batchDisabled && !inBatch}
            title={batchDisabled ? 'Select a courier first' : ''}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow flex items-center gap-1
              ${inBatch
                ? 'bg-teal-100 text-teal-700 border border-teal-400 hover:bg-teal-200'
                : batchDisabled
                  ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:from-teal-600 hover:to-cyan-700'
              }`}
          >
            {inBatch ? <CheckCircle className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {inBatch ? 'Added' : 'Add'}
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => onDispatch(bill)}
              className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white
                         rounded-lg text-xs font-semibold hover:from-teal-600 hover:to-cyan-700
                         transition-all shadow flex items-center gap-1"
            >
              <Truck className="w-4 h-4" />
              <span className="hidden sm:inline">Dispatch</span>
            </button>
            <button
              onClick={() => onView(bill.id)}
              className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white
                         rounded-lg text-sm font-semibold hover:from-teal-600 hover:to-cyan-700
                         transition-all shadow"
            >
              View
            </button>
          </div>
        )}
      </td>
    </tr>
  );
};

// ─── GroupCard ────────────────────────────────────────────────────────────────
const GroupCard = ({ groupId, items, onDispatchGroup, onView, openRequest, batchMode, onAddGroupToBatch, batchIds, batchDisabled }) => {
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef(null);

  const totalItems   = items.reduce((s, b) => s + (b.items?.length || 0), 0);
  const highPriority = items.some(b => b.priority === 'HIGH');
  const repBill      = items[0];
  const repCustomer  = repBill?.customer;

  const allInBatch  = batchMode && items.length > 0 && items.every(b => batchIds?.has(b.id));
  const someInBatch = batchMode && items.some(b => batchIds?.has(b.id));

  useEffect(() => {
    if (openRequest?.groupId !== groupId) return;
    setExpanded(true);
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [openRequest, groupId]);

  return (
    <div
      ref={cardRef}
      className={`rounded-xl border-2 overflow-hidden mb-3 shadow-sm transition-all
        ${highPriority ? 'border-red-300' : allInBatch ? 'border-teal-400' : 'border-teal-200'}`}
    >
      {/* ── header ── */}
      <div
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none
          ${highPriority ? 'bg-red-50' : allInBatch ? 'bg-teal-50/60' : 'bg-white'}`}
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
          <Layers className="w-4 h-4 text-teal-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {highPriority && (
              <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-300">
                HIGH PRIORITY
              </span>
            )}
            {batchMode && someInBatch && !allInBatch && (
              <span className="text-xs font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full border border-teal-300">
                PARTIAL
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">
            {repCustomer?.name || '—'}
          </p>
          <p className="text-xs text-gray-400 truncate">
            {repCustomer?.area || repCustomer?.address1 || repBill?.temp_name || '—'}
          </p>
        </div>

        <div className="text-right flex-shrink-0 hidden sm:block">
          <p className="text-sm font-bold text-gray-800">{items.length} invoices</p>
          <p className="text-xs text-gray-400">{totalItems} total items</p>
          {(() => {
            const totalBoxes = items.reduce((sum, b) => sum + (b.tray_codes?.length || b.packer_info?.label_count || 0), 0);
            return totalBoxes > 0 ? (
              <p className="text-xs text-teal-600 font-semibold">📦 {totalBoxes} box{totalBoxes !== 1 ? 'es' : ''}</p>
            ) : null;
          })()}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {batchMode ? (
            <button
              onClick={() => !batchDisabled && onAddGroupToBatch(items)}
              disabled={batchDisabled && !allInBatch}
              title={batchDisabled ? 'Select a courier first' : ''}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow flex items-center gap-1
                ${allInBatch
                  ? 'bg-teal-100 text-teal-700 border border-teal-400 hover:bg-teal-200'
                  : batchDisabled
                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                    : 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:from-teal-600 hover:to-cyan-700'
                }`}
            >
              {allInBatch ? <CheckCircle className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{allInBatch ? 'Added' : 'Add All'}</span>
            </button>
          ) : (
            <button
              onClick={() => onDispatchGroup(items)}
              className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white
                         rounded-lg text-xs font-semibold hover:from-teal-600 hover:to-cyan-700
                         transition-all shadow flex items-center gap-1"
            >
              <Truck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dispatch</span>
            </button>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── expanded rows ── */}
      {expanded && (
        <div className="border-t border-gray-200">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-gray-50
                          text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
            <div className="col-span-3">Invoice</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-3">Customer</div>
            <div className="col-span-2 text-center">Boxes</div>
            <div className="col-span-2 text-center">Action</div>
          </div>

          {items.map((bill, idx) => {
            const inBatch = batchIds?.has(bill.id);
            return (
              <div
                key={bill.id}
                className={`grid grid-cols-12 gap-2 px-4 py-3 items-start border-b border-gray-100 last:border-b-0
                  ${bill.priority === 'HIGH' ? 'bg-red-50' : inBatch ? 'bg-teal-50/60' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}
              >
                <div className="col-span-3">
                  <p className="font-semibold text-gray-900 text-sm">{bill.invoice_no}</p>
                  <p className="text-xs text-gray-400">{bill.customer?.code}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-700">{formatDate(bill.created_at)}</p>
                  <p className="text-xs text-gray-400">{formatTime(bill.created_at)}</p>
                </div>
                <div className="col-span-3">
                  <p className="font-medium text-gray-900 text-sm truncate">{bill.customer?.name || '—'}</p>
                  <p className="text-xs text-gray-400">
                    {bill.customer?.area || bill.customer?.address1 || bill.temp_name || '—'}
                  </p>
                </div>
                <div className="col-span-2 flex justify-center items-start">
                  {(() => {
                    const count = bill.tray_codes?.length || bill.packer_info?.label_count || 0;
                    return count > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold rounded-lg">
                        📦 {count}
                      </span>
                    ) : <span className="text-xs text-gray-400">—</span>;
                  })()}
                </div>
                <div className="col-span-2 flex justify-center">
                  {batchMode ? (
                    <button
                      onClick={() => !batchDisabled && onAddGroupToBatch([bill])}
                      disabled={batchDisabled && !inBatch}
                      title={batchDisabled ? 'Select a courier first' : ''}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all shadow flex items-center gap-1
                        ${inBatch
                          ? 'bg-teal-100 text-teal-700 border border-teal-400'
                          : batchDisabled
                            ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                            : 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:from-teal-600 hover:to-cyan-700'
                        }`}
                    >
                      {inBatch ? <CheckCircle className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                    </button>
                  ) : (
                    <button
                      onClick={() => onView(bill.id)}
                      className="px-2 py-1 bg-gradient-to-r from-teal-500 to-cyan-600 text-white
                                 rounded-lg text-xs font-semibold hover:from-teal-600 hover:to-cyan-700
                                 transition-all shadow"
                    >
                      View
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── CourierBatchPanel ─────────────────────────────────────────────────────────
const CourierBatchPanel = ({
  couriers, loadingCouriers, selectedCourier, onSelectCourier,
  batchBills, onDispatchBatch, submitting, singleBillsCount, multiBillsCount,
}) => {
  const [courierSearch, setCourierSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const filtered = useMemo(() =>
    couriers.filter(c =>
      c.courier_name.toLowerCase().includes(courierSearch.toLowerCase()) ||
      c.courier_code.toLowerCase().includes(courierSearch.toLowerCase())
    ), [couriers, courierSearch]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // FIX: courier is required to dispatch, but bills can be queued before selecting one
  const canDispatch = selectedCourier && batchBills.length > 0 && !submitting;

  return (
    <div className="flex flex-col gap-4">

      {/* Step 1 */}
      <div className="bg-white rounded-xl shadow p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Step 1 — Select Courier
        </p>

        <div className="relative" ref={dropdownRef}>
          <div
            className={`w-full flex items-center gap-2 px-3 py-2.5 border-2 rounded-xl cursor-pointer transition-all
              ${selectedCourier ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50/40'}`}
            onClick={() => setDropdownOpen(v => !v)}
          >
            <Truck className={`w-4 h-4 flex-shrink-0 ${selectedCourier ? 'text-teal-500' : 'text-gray-400'}`} />
            {selectedCourier ? (
              <div className="flex-1 min-w-0 flex items-center gap-3">
                <CourierAvatar courier={selectedCourier} size="w-20 h-20" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-teal-700 truncate">{selectedCourier.courier_name}</p>
                  <p className="text-xs text-teal-500">{selectedCourier.courier_code}</p>
                </div>
              </div>
            ) : (
              <p className="flex-1 text-sm text-gray-400">
                {loadingCouriers ? 'Loading couriers...' : 'Choose a courier service...'}
              </p>
            )}
            {selectedCourier ? (
              <button
                className="p-0.5 text-teal-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                onClick={(e) => { e.stopPropagation(); onSelectCourier(null); setCourierSearch(''); }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            )}
          </div>

          {dropdownOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <ScanLine className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={courierSearch}
                    onChange={e => setCourierSearch(e.target.value)}
                    placeholder="Search courier..."
                    autoFocus
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto">
                {loadingCouriers ? (
                  <div className="py-6 text-center text-gray-400 text-sm">Loading...</div>
                ) : filtered.length === 0 ? (
                  <div className="py-6 text-center text-gray-400 text-sm">No couriers found</div>
                ) : filtered.map((c, idx) => (
                  <button
                    key={c.courier_id}
                    onClick={() => { onSelectCourier(c); setDropdownOpen(false); setCourierSearch(''); }}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors
                      ${idx !== filtered.length - 1 ? 'border-b border-gray-50' : ''}
                      hover:bg-teal-50`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CourierAvatar courier={c} size="w-20 h-20" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{c.courier_name}</p>
                        <p className="text-xs text-gray-400">{c.courier_code}</p>
                      </div>
                    </div>
                    {selectedCourier?.courier_id === c.courier_id && (
                      <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step 2 */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Step 2 — Assign to Courier
          </p>
          {batchBills.length > 0 && (
            <span className="text-xs font-bold bg-teal-100 text-teal-700 px-2.5 py-1 rounded-full">
              {batchBills.length} bill{batchBills.length !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>

        {batchBills.length > 0 && !selectedCourier && null}

        {canDispatch ? (
          <div className="space-y-3">
            <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2.5">
              <p className="text-xs text-teal-700">
                <span className="font-semibold">{batchBills.length} bill{batchBills.length !== 1 ? 's' : ''}</span>
                {' '}will be assigned to{' '}
                <span className="font-semibold">{selectedCourier.courier_name}</span>
              </p>
            </div>
            <button
              onClick={onDispatchBatch}
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white
                         rounded-xl font-semibold text-sm hover:from-teal-600 hover:to-cyan-700
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow
                         flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Dispatching...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Assign to {selectedCourier.courier_name}
                </>
              )}
            </button>
          </div>
        ) : !batchBills.length ? (
          <p className="text-sm text-gray-400 text-center py-2">
            {!selectedCourier ? 'Select a courier first, then add bills →' : 'Click Add on bills in the table →'}
          </p>
        ) : null}
      </div>

      {/* Queue summary */}
      <div className="bg-white rounded-xl shadow p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Queue Summary</p>
        <div className="space-y-3">
          {[
            { label: 'Single Packed', count: singleBillsCount },
            { label: 'Multi Packed',  count: multiBillsCount  },
          ].map(row => (
            <div key={row.label} className="flex justify-between items-center">
              <span className="text-base text-gray-600">{row.label}</span>
              <span className="text-base font-bold bg-gray-100 text-gray-700 px-3 py-0.5 rounded-full">
                {row.count}
              </span>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
            <span className="text-base font-semibold text-gray-700">Total</span>
            <span className="text-base font-bold bg-teal-50 text-teal-700 px-3 py-0.5 rounded-full">
              {singleBillsCount + multiBillsCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── CompanyDeliveryBatchPanel ─────────────────────────────────────────────────
const CompanyDeliveryBatchPanel = ({
  staff, loadingStaff, selectedStaff, onSelectStaff,
  batchBills, onDispatchBatch, submitting, singleBillsCount, multiBillsCount,
}) => {
  const [staffSearch, setStaffSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const filtered = useMemo(() =>
    staff.filter(s =>
      s.name?.toLowerCase().includes(staffSearch.toLowerCase()) ||
      s.email?.toLowerCase().includes(staffSearch.toLowerCase())
    ), [staff, staffSearch]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const canDispatch = selectedStaff && batchBills.length > 0 && !submitting;

  return (
    <div className="flex flex-col gap-4">

      {/* Step 1 */}
      <div className="bg-white rounded-xl shadow p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Step 1 — Select Staff Member
        </p>

        <div className="relative" ref={dropdownRef}>
          <div
            className={`w-full flex items-center gap-2 px-3 py-2.5 border-2 rounded-xl cursor-pointer transition-all
              ${selectedStaff ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'}`}
            onClick={() => setDropdownOpen(v => !v)}
          >
            <Package className={`w-4 h-4 flex-shrink-0 ${selectedStaff ? 'text-blue-500' : 'text-gray-400'}`} />
            {selectedStaff ? (
              <div className="flex-1 min-w-0 flex items-center gap-3">
                <StaffAvatar staff={selectedStaff} size="w-20 h-20" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-blue-700 truncate">{selectedStaff.name}</p>
                  <p className="text-xs text-blue-500">{selectedStaff.email}</p>
                </div>
              </div>
            ) : (
              <p className="flex-1 text-sm text-gray-400">
                {loadingStaff ? 'Loading staff...' : 'Choose a staff member...'}
              </p>
            )}
            {selectedStaff ? (
              <button
                className="p-0.5 text-blue-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                onClick={(e) => { e.stopPropagation(); onSelectStaff(null); setStaffSearch(''); }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            )}
          </div>

          {dropdownOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <ScanLine className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={staffSearch}
                    onChange={e => setStaffSearch(e.target.value)}
                    placeholder="Search staff..."
                    autoFocus
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto">
                {loadingStaff ? (
                  <div className="py-6 text-center text-gray-400 text-sm">Loading...</div>
                ) : filtered.length === 0 ? (
                  <div className="py-6 text-center text-gray-400 text-sm">No staff found</div>
                ) : filtered.map((s, idx) => (
                  <button
                    key={s.email}
                    onClick={() => { onSelectStaff(s); setDropdownOpen(false); setStaffSearch(''); }}
                    className={`w-full text-left px-4 py-4 flex items-center justify-between transition-colors
                      ${idx !== filtered.length - 1 ? 'border-b border-gray-50' : ''}
                      hover:bg-blue-50`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <StaffAvatar staff={s} size="w-20 h-20" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.email}</p>
                      </div>
                    </div>
                    {selectedStaff?.email === s.email && (
                      <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step 2 */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Step 2 — Assign Bills
          </p>
          {batchBills.length > 0 && (
            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
              {batchBills.length} bill{batchBills.length !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>

        {canDispatch ? (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
              <p className="text-xs text-blue-700">
                <span className="font-semibold">{batchBills.length} bill{batchBills.length !== 1 ? 's' : ''}</span>
                {' '}will be assigned to{' '}
                <span className="font-semibold">{selectedStaff.name}</span>
              </p>
            </div>
            <button
              onClick={onDispatchBatch}
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white
                         rounded-xl font-semibold text-sm hover:from-blue-600 hover:to-indigo-700
                         disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow
                         flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Dispatching...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Assign to {selectedStaff.name}
                </>
              )}
            </button>
          </div>
        ) : !batchBills.length ? (
          <p className="text-sm text-gray-400 text-center py-2">
            {!selectedStaff ? 'Select a staff member first, then add bills →' : 'Click Add on bills in the table →'}
          </p>
        ) : null}
      </div>

      {/* Queue summary */}
      <div className="bg-white rounded-xl shadow p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Queue Summary</p>
        <div className="space-y-3">
          {[
            { label: 'Single Packed', count: singleBillsCount },
            { label: 'Multi Packed',  count: multiBillsCount  },
          ].map(row => (
            <div key={row.label} className="flex justify-between items-center">
              <span className="text-base text-gray-600">{row.label}</span>
              <span className="text-base font-bold bg-gray-100 text-gray-700 px-3 py-0.5 rounded-full">
                {row.count}
              </span>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
            <span className="text-base font-semibold text-gray-700">Total</span>
            <span className="text-base font-bold bg-blue-50 text-blue-700 px-3 py-0.5 rounded-full">
              {singleBillsCount + multiBillsCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── DefaultLeftPanel ─────────────────────────────────────────────────────────
const DefaultLeftPanel = ({ singleBillsCount, multiBillsCount, totalCount }) => (
  <div className="bg-white rounded-xl shadow p-5">
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Queue Summary</p>
    <div className="space-y-3">
      {[
        { label: 'Single Packed', count: singleBillsCount },
        { label: 'Multi Packed',  count: multiBillsCount  },
      ].map(row => (
        <div key={row.label} className="flex justify-between items-center">
          <span className="text-base text-gray-600">{row.label}</span>
          <span className="text-base font-bold bg-gray-100 text-gray-700 px-3 py-0.5 rounded-full">
            {row.count}
          </span>
        </div>
      ))}
      <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
        <span className="text-base font-semibold text-gray-700">Total</span>
        <span className="text-base font-bold bg-teal-50 text-teal-700 px-3 py-0.5 rounded-full">
          {totalCount}
        </span>
      </div>
    </div>
  </div>
);

// ─── main page ────────────────────────────────────────────────────────────────
const DeliveryDispatchPage = () => {
  const navigate = useNavigate();
  const [bills, setBills]                   = useState([]);
  const [loading, setLoading]               = useState(false);
  const [selectedBill, setSelectedBill]     = useState(null);
  const [submitting, setSubmitting]         = useState(false);
  const [showOngoingModal, setShowOngoingModal] = useState(false);
  const [ongoingDeliveries, setOngoingDeliveries] = useState([]);
  const [loadingOngoing, setLoadingOngoing] = useState(false);
  const { user } = useAuth();

  const [activeMode, setActiveMode]   = useState(null);
  const [scanInput, setScanInput]     = useState('');
  const [scanError, setScanError]     = useState('');
  const scanInputRef = useRef(null);

  const [activeTab, setActiveTab]     = useState('single');
  const [currentPage, setCurrentPage] = useUrlPage();
  const [groupOpenRequest, setGroupOpenRequest] = useState(null);
  const itemsPerPage = 10;

  // ── Courier batch state ───────────────────────────────────────────────────
  const [couriers, setCouriers]               = useState([]);
  const [loadingCouriers, setLoadingCouriers] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [batchBills, setBatchBills]           = useState([]);
  const batchIds = useMemo(() => new Set(batchBills.map(b => b.id)), [batchBills]);

  // ── Company delivery state ────────────────────────────────────────────────
  const [deliveryStaff, setDeliveryStaff]         = useState([]);
  const [loadingStaff, setLoadingStaff]           = useState(false);
  const [selectedStaff, setSelectedStaff]         = useState(null);
  const [companyBatchBills, setCompanyBatchBills] = useState([]);
  const companyBatchIds = useMemo(() => new Set(companyBatchBills.map(b => b.id)), [companyBatchBills]);
  // Load couriers when COURIER mode selected
  useEffect(() => {
    if (activeMode !== 'COURIER' || couriers.length > 0) return;
    const load = async () => {
      setLoadingCouriers(true);
      try {
        const res = await getCouriers();
        const arr = Array.isArray(res?.data?.data) ? res.data.data : [];
        setCouriers(arr.filter(c => c.status === 'ACTIVE'));
      } catch { setCouriers([]); }
      finally { setLoadingCouriers(false); }
    };
    load();
  }, [activeMode]);

  // Reset courier batch when mode changes
  useEffect(() => {
    if (activeMode !== 'COURIER') { setSelectedCourier(null); setBatchBills([]); }
  }, [activeMode]);

  // Load delivery staff when COMPANY_DELIVERY mode selected
  useEffect(() => {
    if (activeMode !== 'COMPANY_DELIVERY' || deliveryStaff.length > 0) return;
    const load = async () => {
      setLoadingStaff(true);
      try {
        const res = await getEligibleDeliveryStaff();
        setDeliveryStaff(res?.data?.data?.results || []);
      } catch { setDeliveryStaff([]); }
      finally { setLoadingStaff(false); }
    };
    load();
  }, [activeMode]);

  // Reset company delivery batch when mode changes
  useEffect(() => {
    if (activeMode !== 'COMPANY_DELIVERY') { setSelectedStaff(null); setCompanyBatchBills([]); }
  }, [activeMode]);

  // ── data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadPackedInvoices();
    const handleDataCleared = (e) => {
      const { tableName } = e.detail;
      if (['all', 'invoices', 'delivery_sessions'].includes(tableName)) loadPackedInvoices();
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
          if (data.status === 'PACKED' || data.delivery_status) loadPackedInvoices();
        } catch (_) {}
      };
      es.onerror = () => {
        es.close();
        attempts++;
        reconnectTimeout = setTimeout(connect, Math.min(1000 * 2 ** attempts, 30000));
      };
    };
    connect();
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (es) es.close();
    };
  }, []);

  useEffect(() => {
    if (activeMode && scanInputRef.current) scanInputRef.current.focus();
  }, [activeMode]);

  const loadPackedInvoices = async () => {
    setLoading(true);
    try {
      const baseUrl = '/sales/invoices/?status=PACKED&page_size=200&ordering=-created_at&exclude_delivery_status=TO_CONSIDER';
      const firstRes = await getByUrl(baseUrl);
      const firstResults = firstRes.data.results || [];
      setBills(firstResults);
      setLoading(false);

      const totalCount = firstRes.data.count || 0;
      if (totalCount > 200) {
        const totalPages = Math.ceil(totalCount / 200);
        const remaining = Array.from({ length: totalPages - 1 }, (_, i) => getByUrl(`${baseUrl}&page=${i + 2}`));
        const results = await Promise.all(remaining);
        setBills([...firstResults, ...results.flatMap(r => r.data.results || [])]);
      }
    } catch {
      toast.error('Failed to load packed invoices');
      setLoading(false);
    }
  };

  const loadOngoingDeliveries = async () => {
    setLoadingOngoing(true);
    try {
      const res = await getDeliveryHistory({ status: 'IN_TRANSIT' });
      setOngoingDeliveries(res.data?.results || []);
    } catch { setOngoingDeliveries([]); }
    finally { setLoadingOngoing(false); }
  };

  // ── Batch helpers ─────────────────────────────────────────────────────────
  // Core toggle: accepts array of bills, toggles entire array in/out
  const handleAddToBatch = useCallback((billsToToggle) => {
    setBatchBills(prev => {
      const ids = new Set(prev.map(b => b.id));
      const allPresent = billsToToggle.every(b => ids.has(b.id));
      if (allPresent) {
        const removeIds = new Set(billsToToggle.map(b => b.id));
        return prev.filter(b => !removeIds.has(b.id));
      }
      const toAdd = billsToToggle.filter(b => !ids.has(b.id));
      return [...prev, ...toAdd];
    });
  }, []);

  // Group-aware add: if any bill belongs to a boxing_group_id, auto-include ALL siblings.
  // Ensures a grouped multi-pack always enters the batch as a complete set.
  const handleAddToBatchGroupAware = useCallback((billsToToggle, allBillsRef) => {
    const expanded = [];
    const seen = new Set();
    billsToToggle.forEach(bill => {
      const gid = bill.packer_info?.boxing_group_id;
      if (gid) {
        allBillsRef.forEach(b => {
          if (b.packer_info?.boxing_group_id === gid && !seen.has(b.id)) {
            seen.add(b.id);
            expanded.push(b);
          }
        });
      } else {
        if (!seen.has(bill.id)) {
          seen.add(bill.id);
          expanded.push(bill);
        }
      }
    });
    handleAddToBatch(expanded);
  }, [handleAddToBatch]);

  // ── scan ──────────────────────────────────────────────────────────────────
  const handleScanSubmit = (value) => {
    if (!activeMode) { setScanError('Please select a delivery mode first'); return; }
    const rawValue = value.trim();
    if (!rawValue) return;

    let invoiceNo = rawValue;
    let scannedGroupId = '';

    try {
      const parsedUrl = new URL(rawValue);
      const pathToken = parsedUrl.pathname.split('/').filter(Boolean).pop();
      if (pathToken) invoiceNo = pathToken;
      const invoiceFromQuery = parsedUrl.searchParams.get('invoice_no');
      if (invoiceFromQuery) invoiceNo = invoiceFromQuery;
      const groupFromQuery = parsedUrl.searchParams.get('group_id');
      if (groupFromQuery) scannedGroupId = groupFromQuery;
    } catch (_) {
      if (invoiceNo.includes('/')) invoiceNo = invoiceNo.split('/').pop();
    }

    invoiceNo = invoiceNo.split('?')[0].split('#')[0];

    try {
      const payload = JSON.parse(decodeURIComponent(rawValue));
      if (payload?.invoice_no) invoiceNo = payload.invoice_no;
      if (payload?.group_id) scannedGroupId = payload.group_id;
    } catch (_) {
      try {
        const payload = JSON.parse(invoiceNo);
        if (payload?.invoice_no) invoiceNo = payload.invoice_no;
        if (payload?.group_id) scannedGroupId = payload.group_id;
      } catch (_) {}
    }

    // Courier batch mode: courier must be selected before adding bills
    if (activeMode === 'COURIER') {
      if (!selectedCourier) { setScanError('Please select a courier before adding bills'); return; }
      const found = bills.find(b => b.invoice_no?.toLowerCase() === invoiceNo.toLowerCase());
      if (found) {
        if (batchIds.has(found.id)) {
          setScanError(`${found.invoice_no} is already in the batch`);
        } else {
          // If it belongs to a group, add all bills in that group together
          // Group-aware: auto-includes all siblings if bill belongs to a boxing group
          const gid = found.packer_info?.boxing_group_id;
          const toAdd = gid
            ? bills.filter(b => b.packer_info?.boxing_group_id === gid)
            : [found];
          handleAddToBatch(toAdd);
          setScanError('');
          setScanInput('');
          toast.success(
            gid && toAdd.length > 1
              ? `Group (${toAdd.length} bills) added to batch`
              : `${found.invoice_no} added to batch`
          );
        }
      } else {
        setScanError(`Invoice "${invoiceNo}" not found in packed orders`);
      }
      return;
    }

    // Normal modes
    const groupInput = normalizeGroupToken(scannedGroupId || rawValue);
    const uniqueGroupIds = [...new Set(bills.map(b => b.packer_info?.boxing_group_id).filter(Boolean))];
    const matchedGroupId = uniqueGroupIds.find(gid => {
      const n = normalizeGroupToken(gid);
      return n === groupInput || n.endsWith(groupInput);
    });

    if (matchedGroupId) {
      const groupedMulti = groupByBoxingGroup(bills.filter(b => !!b.packer_info?.boxing_group_id));
      const groupIndex = groupedMulti.findIndex(g => g.groupId === matchedGroupId);
      const targetPage = groupIndex >= 0 ? Math.floor(groupIndex / itemsPerPage) + 1 : 1;
      setScanError(''); setScanInput('');
      setCurrentPage(targetPage); setActiveTab('multi');
      setGroupOpenRequest({ groupId: matchedGroupId, token: Date.now() });
      return;
    }

    const found = bills.find(b => b.invoice_no?.toLowerCase() === invoiceNo.toLowerCase());
    if (found) { setScanError(''); setScanInput(''); setSelectedBill(found); }
    else setScanError(`Invoice/group "${invoiceNo}" not found in packed orders`);
  };

  // ── dispatch handlers ─────────────────────────────────────────────────────
  const handleOpenDispatch = (bill) => {
    if (!activeMode) { toast.error('Select delivery mode first.'); return; }
    setScanError(''); setSelectedBill(bill);
  };

  const handleOpenGroupDispatch = (groupItems) => {
    if (!activeMode) { toast.error('Select delivery mode first.'); return; }
    setScanError(''); setSelectedBill(groupItems);
  };

  const handleConfirmDelivery = async (payload) => {
    setSubmitting(true);
    try {
      const response = await startDelivery(payload);
      if (response.data.success) {
        const msgs = { DIRECT: 'Counter pickup completed!', COURIER: 'Courier assigned!', INTERNAL: 'Staff assigned!' };
        toast.success(msgs[payload.delivery_type] || 'Done');
        setSelectedBill(null);
        loadPackedInvoices();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.detail || 'Failed to process delivery');
    } finally { setSubmitting(false); }
  };

  // FIX: Send boxing_group_id per bill so the backend can consolidate group bills correctly
  const handleDispatchBatch = async () => {
    if (!selectedCourier || batchBills.length === 0) return;
    setSubmitting(true);
    try {
      // Build enriched list: each entry carries invoice_no + boxing_group_id (if any)
      const invoiceEntries = batchBills.map(b => ({
        invoice_no: b.invoice_no,
        ...(b.packer_info?.boxing_group_id
          ? { boxing_group_id: b.packer_info.boxing_group_id }
          : {}),
      }));

      const response = await startDelivery({
        // Keep invoice_nos for backwards compatibility
        invoice_nos: batchBills.map(b => b.invoice_no),
        // Send enriched entries so backend can group multi-packed bills correctly
        invoice_entries: invoiceEntries,
        delivery_type: 'COURIER',
        courier_id: selectedCourier.courier_id,
      });
      if (response.data.success) {
        const count = batchBills.length;
        toast.success(`${count} bill${count !== 1 ? 's' : ''} assigned to ${selectedCourier.courier_name}`);
        setBatchBills([]);
        loadPackedInvoices();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.detail || 'Failed to dispatch batch');
    } finally { setSubmitting(false); }
  };

  const handleDispatchCompanyBatch = async () => {
    if (!selectedStaff || companyBatchBills.length === 0) return;
    setSubmitting(true);
    try {
      const response = await startDelivery({
        invoice_nos: companyBatchBills.map(b => b.invoice_no),
        delivery_type: 'INTERNAL',
        user_email: selectedStaff.email,
      });
      if (response.data.success) {
        const count = companyBatchBills.length;
        toast.success(`${count} bill${count !== 1 ? 's' : ''} assigned to ${selectedStaff.name}`);
        setCompanyBatchBills([]);
        loadPackedInvoices();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.response?.data?.detail || 'Failed to dispatch');
    } finally { setSubmitting(false); }
  };

  const handleViewInvoice = (billId) => {
    if (user?.role === 'DELIVERY') { navigate(`/ops/delivery/invoices/view/${billId}`); return; }
    navigate(`/delivery/invoices/view/${billId}/delivery`);
  };

  // ── derived data ──────────────────────────────────────────────────────────
  const singleBills = useMemo(() => bills.filter(b => !b.packer_info?.boxing_group_id), [bills]);
  const multiBills  = useMemo(() => bills.filter(b => !!b.packer_info?.boxing_group_id), [bills]);
  const groups      = useMemo(() => groupByBoxingGroup(multiBills), [multiBills]);
  const pagedSingle = useMemo(() => singleBills.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [singleBills, currentPage]);
  const pagedGroups = useMemo(() => groups.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage), [groups, currentPage]);

  const activeModeObj        = MODES.find(m => m.key === activeMode);
  const isCourierBatchMode   = activeMode === 'COURIER';
  const isCompanyBatchMode   = activeMode === 'COMPANY_DELIVERY';
  const isBatchMode          = isCourierBatchMode || isCompanyBatchMode;

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-[1440px] mx-auto">

        {/* header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <h1 className="text-2xl font-bold text-gray-800">Dispatch Management</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowOngoingModal(true); loadOngoingDeliveries(); }}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white
                         rounded-lg font-semibold text-sm shadow hover:from-teal-600 hover:to-cyan-700 transition-all"
            >
              Ongoing Work
            </button>
            <button
              onClick={async () => { await loadPackedInvoices(); toast.success('Refreshed'); }}
              className="p-2 bg-white border border-gray-200 text-gray-600 rounded-lg shadow hover:bg-gray-50 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-4">

          {/* ════ LEFT PANEL ════ */}
          <div className="xl:basis-1/3 xl:max-w-[34%] flex flex-col gap-4">
            {/* Mode selector */}
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-base font-bold text-gray-700">Select Delivery Mode</p>
                {activeMode && (
                  <button
                    onClick={() => { setActiveMode(null); setScanError(''); setScanInput(''); }}
                    className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Change
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-3">
                {MODES.filter(mode => !activeMode || mode.key === activeMode).map((mode) => {
                  const Icon   = mode.icon;
                  const active = activeMode === mode.key;
                  return (
                    <button
                      key={mode.key}
                      onClick={() => { setActiveMode(mode.key); setScanError(''); setScanInput(''); }}
                      className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 text-left
                        ${active ? mode.activeClasses : mode.idleClasses}`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
                        ${active ? mode.iconBg : mode.iconBgIdle}`}>
                        <Icon className={`w-6 h-6 ${active ? mode.iconColor : mode.iconColorIdle}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-base font-semibold truncate ${active ? mode.textActive : mode.textIdle}`}>
                          {mode.label}
                        </p>
                        <p className="text-sm text-gray-500">{mode.sub}</p>
                      </div>
                      {active && <CheckCircle className={`w-6 h-6 flex-shrink-0 ${mode.check}`} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {isCourierBatchMode ? (
              <CourierBatchPanel
                couriers={couriers}
                loadingCouriers={loadingCouriers}
                selectedCourier={selectedCourier}
                onSelectCourier={setSelectedCourier}
                batchBills={batchBills}
                onDispatchBatch={handleDispatchBatch}
                submitting={submitting}
                singleBillsCount={singleBills.length}
                multiBillsCount={multiBills.length}
              />
            ) : activeMode === 'COMPANY_DELIVERY' ? (
              <CompanyDeliveryBatchPanel
                staff={deliveryStaff}
                loadingStaff={loadingStaff}
                selectedStaff={selectedStaff}
                onSelectStaff={setSelectedStaff}
                batchBills={companyBatchBills}
                onDispatchBatch={handleDispatchCompanyBatch}
                submitting={submitting}
                singleBillsCount={singleBills.length}
                multiBillsCount={multiBills.length}
              />
            ) : (
              <DefaultLeftPanel
                singleBillsCount={singleBills.length}
                multiBillsCount={multiBills.length}
                totalCount={bills.length}
              />
            )}
          </div>

          {/* ════ RIGHT PANEL ════ */}
          <div className="xl:basis-2/3 min-w-0">
            <div className="bg-white rounded-xl shadow overflow-hidden">

              {/* tab bar + scan */}
              <div className="border-b border-gray-200 px-4 pt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
                  {[
                    { key: 'single', label: 'Single Packed', count: singleBills.length },
                    { key: 'multi',  label: 'Multi Packed',  count: multiBills.length  },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
                      className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                        activeTab === tab.key ? 'bg-white text-teal-700 shadow' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {tab.label}
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-bold ${
                        activeTab === tab.key ? 'bg-teal-100 text-teal-700' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="sm:ml-auto mb-3 sm:mb-0 min-w-[320px] sm:min-w-[440px]">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        ref={scanInputRef}
                        type="text"
                        value={scanInput}
                        onChange={(e) => { setScanInput(e.target.value); setScanError(''); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleScanSubmit(scanInput); }}
                        placeholder={
                          isCourierBatchMode
                            ? selectedCourier ? `Scan to add to ${selectedCourier.courier_name} batch...` : 'Select a courier first...'
                            : isCompanyBatchMode
                              ? selectedStaff ? `Scan to add to ${selectedStaff.name} batch...` : 'Select a staff member first...'
                              : 'Scan QR or type invoice / group id...'
                        }
                        className="w-full pl-9 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm
                                   focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      {scanInput && (
                        <button onClick={() => setScanInput('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => handleScanSubmit(scanInput)}
                      className="px-4 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white
                                 rounded-lg text-sm font-semibold hover:from-teal-600 hover:to-cyan-700 transition-all"
                    >
                      {isBatchMode ? 'Add' : 'Scan'}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mt-1.5">
                    {activeModeObj && (
                      <p className="text-xs text-gray-500">
                        Mode: <span className="font-semibold text-gray-700">{activeModeObj.label}</span>
                      </p>
                    )}
                    {isCourierBatchMode && batchBills.length > 0 && (
                      <span className="text-xs font-bold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">
                        {batchBills.length} in batch
                      </span>
                    )}
                    {isCompanyBatchMode && companyBatchBills.length > 0 && (
                      <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {companyBatchBills.length} in batch
                      </span>
                    )}
                  </div>
                  {scanError && <p className="text-red-500 text-xs mt-1.5">⚠️ {scanError}</p>}
                </div>
              </div>

              {/* courier hint banner — updated: no longer requires courier first */}
              {isBatchMode && (
                <div className={`mx-4 mt-3 px-3 py-2 border rounded-lg flex items-center gap-2
                  ${isCourierBatchMode ? 'bg-teal-50 border-teal-200' : 'bg-blue-50 border-blue-200'}`}>
                  {isCourierBatchMode
                    ? <Truck className="w-4 h-4 text-teal-500 flex-shrink-0" />
                    : <Package className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  }
                  <p className={`text-xs ${isCourierBatchMode ? 'text-teal-700' : 'text-blue-700'}`}>
                    {isCourierBatchMode
                      ? selectedCourier
                        ? <>Click <span className="font-semibold">Add</span> to add bills to the <span className="font-semibold">{selectedCourier.courier_name}</span> batch.</>
                        : <>Select a courier first, then click <span className="font-semibold">Add</span> on bills.</>
                      : selectedStaff
                        ? <>Click <span className="font-semibold">Add</span> to assign bills to <span className="font-semibold">{selectedStaff.name}</span>.</>
                        : <>Select a staff member first, then click <span className="font-semibold">Add</span> on bills.</>
                    }
                  </p>
                </div>
              )}

              {/* ── SINGLE TAB ── */}
              {activeTab === 'single' && (
                loading ? (
                  <div className="py-20 text-center text-gray-400 text-sm">Loading packed orders...</div>
                ) : singleBills.length === 0 ? (
                  <div className="py-20 text-center text-gray-400">
                    <Package className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No single packed orders</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-sm">
                            {['Invoice', 'Date', 'Customer', 'Boxes', 'Actions'].map(h => (
                              <th key={h} className="px-4 py-3 font-semibold text-left">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {pagedSingle.map(bill => (
                            <SingleRow
                              key={bill.id}
                              bill={bill}
                              onDispatch={handleOpenDispatch}
                              onView={handleViewInvoice}
                              batchMode={isBatchMode}
                              onAddToBatch={(b) => {
                                if (isCourierBatchMode) handleAddToBatchGroupAware([b], bills);
                                else setCompanyBatchBills(prev => prev.find(x => x.id === b.id) ? prev.filter(x => x.id !== b.id) : [...prev, b]);
                              }}
                              batchIds={isCourierBatchMode ? batchIds : companyBatchIds}
                              batchDisabled={isCourierBatchMode ? !selectedCourier : !selectedStaff}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Pagination
                      currentPage={currentPage}
                      totalItems={singleBills.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={(p) => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      label="orders"
                      colorScheme="teal"
                    />
                  </>
                )
              )}

              {/* ── MULTI TAB ── */}
              {activeTab === 'multi' && (
                loading ? (
                  <div className="py-20 text-center text-gray-400 text-sm">Loading packed orders...</div>
                ) : groups.length === 0 ? (
                  <div className="py-20 text-center text-gray-400">
                    <Layers className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No multi-packed orders</p>
                  </div>
                ) : (
                  <div className="p-4">
                    {pagedGroups.map(({ groupId, items }) => (
                      <GroupCard
                        key={groupId}
                        groupId={groupId}
                        items={items}
                        onDispatchGroup={handleOpenGroupDispatch}
                        onView={handleViewInvoice}
                        openRequest={groupOpenRequest}
                        batchMode={isBatchMode}
                        onAddGroupToBatch={(bs) => {
                          if (isCourierBatchMode) handleAddToBatchGroupAware(bs, bills);
                          else setCompanyBatchBills(prev => {
                            const ids = new Set(prev.map(b => b.id));
                            const allIn = bs.every(b => ids.has(b.id));
                            return allIn ? prev.filter(b => !bs.find(x => x.id === b.id)) : [...prev, ...bs.filter(b => !ids.has(b.id))];
                          });
                        }}
                        batchIds={isCourierBatchMode ? batchIds : companyBatchIds}
                        batchDisabled={isCourierBatchMode ? !selectedCourier : !selectedStaff}
                      />
                    ))}
                    <Pagination
                      currentPage={currentPage}
                      totalItems={groups.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={(p) => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      label="groups"
                      colorScheme="teal"
                    />
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Modal */}
      <DeliveryModal
        isOpen={!!selectedBill}
        onClose={() => setSelectedBill(null)}
        onConfirm={handleConfirmDelivery}
        invoice={selectedBill}
        submitting={submitting}
        initialMode={activeMode}
      />

      {/* Ongoing Work Modal */}
      {showOngoingModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowOngoingModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Ongoing Delivery Tasks</h2>
                <button onClick={() => setShowOngoingModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition">✕</button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {loadingOngoing ? (
                  <div className="py-20 text-center text-gray-400 text-sm">Loading...</div>
                ) : ongoingDeliveries.length === 0 ? (
                  <div className="py-20 text-center text-gray-400 text-sm">No ongoing deliveries</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                        <tr>
                          {['Invoice', 'Customer', 'Start Time', 'Driver', 'Status'].map(h => (
                            <th key={h} className="px-4 py-3 text-left text-sm font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {ongoingDeliveries.map((d, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-semibold text-sm">{d.invoice_no}</td>
                            <td className="px-4 py-3 text-sm">{d.customer_name || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm">
                              {d.start_time ? new Date(d.start_time).toLocaleTimeString() : 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">{d.driver_name || 'Current User'}</td>
                            <td className="px-4 py-3">
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold
                                             bg-teal-100 text-teal-700 border border-teal-300">
                                IN TRANSIT
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DeliveryDispatchPage;