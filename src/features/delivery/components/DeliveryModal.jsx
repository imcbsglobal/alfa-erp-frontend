import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Truck, Package, User, Phone, Building, Hash, Mail, Layers, CheckCircle, Search } from 'lucide-react';
import { formatAmount, formatItemCount } from '../../../utils/formatters';
import { getEligibleDeliveryStaff } from '../../../services/sales';
import { resolveMediaUrl } from '../../../utils/media';

const CourierAvatar = ({ courier, size = 'w-8 h-8' }) => {
  const logo = resolveMediaUrl(courier?.courier_logo_url || courier?.courier_logo);

  if (logo) {
    return (
      <img
        src={logo}
        alt={`${courier?.courier_name || 'Courier'} logo`}
        className={`${size} rounded-lg object-cover border border-gray-200 bg-white flex-shrink-0`}
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

/**
 * CourierDropdown
 * Renders via React Portal so it escapes the modal's overflow-y-auto clipping.
 */
const CourierDropdown = ({ anchorRef, isOpen, loading, couriers, selected, onSelect, onClose }) => {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const update = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (r) setRect(r);
    };

    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [isOpen, anchorRef]);

  if (!isOpen || !rect) return null;

  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const dropdownHeight = Math.min(260, couriers.length * 60 + 16);
  const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

  const style = {
    position: 'fixed',
    left: rect.left,
    width: rect.width,
    zIndex: 9999,
    ...(openUpward
      ? { bottom: window.innerHeight - rect.top + 4, maxHeight: Math.min(spaceAbove - 8, 260) }
      : { top: rect.bottom + 4, maxHeight: Math.min(spaceBelow - 8, 260) }),
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div
        style={style}
        className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-y-auto z-[9999]"
      >
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400 text-sm gap-2">
            <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            Loading couriers...
          </div>
        ) : couriers.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">No couriers found</div>
        ) : (
          couriers.map((courier, idx) => (
            <button
              key={courier.courier_id}
              onClick={() => onSelect(courier)}
              className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors
                ${idx !== couriers.length - 1 ? 'border-b border-gray-100' : ''}
                ${selected === courier.courier_id
                  ? 'bg-teal-50 text-teal-800'
                  : 'hover:bg-gray-50 text-gray-800'
                }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <CourierAvatar courier={courier} size="w-9 h-9" />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{courier.courier_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{courier.courier_code}</p>
                </div>
              </div>
              {selected === courier.courier_id && (
                <CheckCircle className="w-4 h-4 text-teal-500 flex-shrink-0" />
              )}
            </button>
          ))
        )}
      </div>
    </>,
    document.body
  );
};

/**
 * DeliveryModal
 *
 * Patient pickup  → requires: pickup_person_phone (+ optional notes)
 * Company pickup  → requires: pickup_person_name, pickup_person_phone, pickup_company_name
 *                              (+ optional pickup_company_id, notes)
 *
 * `invoice` prop can be:
 *   - A single bill object  → normal single-invoice dispatch
 *   - An array of bill objects → group dispatch
 */
const DeliveryModal = ({ isOpen, onClose, onConfirm, invoice, submitting, initialMode = null }) => {
  const isGroup    = Array.isArray(invoice);
  const invoiceArr = isGroup ? invoice : (invoice ? [invoice] : []);
  const repInvoice = invoiceArr[0] ?? null;

  const [step, setStep]                 = useState(1);
  const [deliveryType, setDeliveryType] = useState(null);
  const [subType, setSubType]           = useState(null);

  // ── Counter Pickup fields ──────────────────────────────────────────────────
  // REMOVED: pickupPersonUsername (not required by backend for either sub-mode)
  const [pickupPersonName, setPickupPersonName]   = useState('');  // company only
  const [pickupPersonPhone, setPickupPersonPhone] = useState('');  // both modes
  const [companyName, setCompanyName]             = useState('');  // company only
  const [companyId, setCompanyId]                 = useState('');  // company only
  const [notes, setNotes]                         = useState('');  // both modes (optional)

  // ── Courier ───────────────────────────────────────────────────────────────
  const [couriers, setCouriers]                       = useState([]);
  const [selectedCourier, setSelectedCourier]         = useState('');
  const [selectedCourierName, setSelectedCourierName] = useState('');
  const [selectedCourierData, setSelectedCourierData] = useState(null);
  const [courierSearch, setCourierSearch]             = useState('');
  const [loadingCouriers, setLoadingCouriers]         = useState(false);
  const [showCourierDropdown, setShowCourierDropdown] = useState(false);
  const courierInputRef = useRef(null);

  // ── Company Delivery ──────────────────────────────────────────────────────
  const [staffEmail, setStaffEmail] = useState('');
  const [staffOptions, setStaffOptions] = useState([]);
  const [loadingStaffOptions, setLoadingStaffOptions] = useState(false);

  // ── Load couriers ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && deliveryType === 'COURIER') loadCouriers();
  }, [isOpen, deliveryType]);

  // ── Load assignable delivery staff (users with My Assigned Delivery access) ──
  useEffect(() => {
    if (!isOpen || deliveryType !== 'COMPANY_DELIVERY') return;

    const loadAssignableStaff = async () => {
      setLoadingStaffOptions(true);
      try {
        const res = await getEligibleDeliveryStaff();
        const allowedStaff = (res?.data?.data?.results || [])
          .sort((a, b) => a.name.localeCompare(b.name));

        setStaffOptions(allowedStaff);

        if (staffEmail && !allowedStaff.some((s) => s.email === staffEmail)) {
          setStaffEmail('');
        }
      } catch {
        setStaffOptions([]);
      } finally {
        setLoadingStaffOptions(false);
      }
    };

    loadAssignableStaff();
  }, [isOpen, deliveryType]);

  // ── Initialise step from parent mode ──────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (initialMode === 'COUNTER_PICKUP')   { setDeliveryType('COUNTER_PICKUP');   setStep(2); return; }
    if (initialMode === 'COURIER')          { setDeliveryType('COURIER');          setStep(4); return; }
    if (initialMode === 'COMPANY_DELIVERY') { setDeliveryType('COMPANY_DELIVERY'); setStep(5); return; }
    setStep(1);
    setDeliveryType(null);
  }, [isOpen, initialMode]);

  const loadCouriers = async () => {
    setLoadingCouriers(true);
    try {
      const { getCouriers } = await import('../../../services/sales');
      const response = await getCouriers();
      const apiData  = response?.data;
      const arr      = Array.isArray(apiData?.data) ? apiData.data : [];
      setCouriers(arr.filter(c => c.status === 'ACTIVE'));
    } catch { setCouriers([]); }
    finally { setLoadingCouriers(false); }
  };

  const resetForm = () => {
    setStep(1); setDeliveryType(null); setSubType(null);
    // REMOVED: setPickupPersonUsername('')
    setPickupPersonName(''); setPickupPersonPhone('');
    setCompanyName(''); setCompanyId(''); setNotes('');
    setSelectedCourier(''); setSelectedCourierName(''); setCourierSearch('');
    setSelectedCourierData(null);
    setStaffEmail('');
    setShowCourierDropdown(false);
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleTypeSelect = (type) => {
    setDeliveryType(type);
    if (type === 'COUNTER_PICKUP')       setStep(2);
    else if (type === 'COURIER')         setStep(4);
    else if (type === 'COMPANY_DELIVERY') setStep(5);
  };

  const handleSubTypeSelect = (sub) => { setSubType(sub); setStep(3); };

  const handleBack = () => {
    if (step === 3 && deliveryType === 'COUNTER_PICKUP') { setStep(2); setSubType(null); }
    else if (initialMode) { handleClose(); }
    else if ([2, 4, 5].includes(step)) {
      setStep(1); setDeliveryType(null); setSubType(null);
      setSelectedCourier(''); setSelectedCourierName('');
      setStaffEmail('');
      setShowCourierDropdown(false);
    }
  };

  const handleCourierSelect = (courier) => {
    setSelectedCourier(courier.courier_id);
    setSelectedCourierName(courier.courier_name);
    setSelectedCourierData(courier);
    setCourierSearch(courier.courier_name);
    setShowCourierDropdown(false);
  };

  const handleClearCourier = () => {
    setSelectedCourier('');
    setSelectedCourierName('');
    setSelectedCourierData(null);
    setCourierSearch('');
    setShowCourierDropdown(false);
  };

  const selectedStaff = staffOptions.find((s) => s.email === staffEmail) || null;

  const handleSubmit = () => {
    // ── base payload (single or group) ──────────────────────────────────────
    const basePayload = isGroup
      ? { invoice_nos: invoiceArr.map(b => b.invoice_no), notes: notes || '' }
      : { invoice_no: repInvoice?.invoice_no, notes: notes || '' };

    if (deliveryType === 'COUNTER_PICKUP') {

      // ── PATIENT pickup ─────────────────────────────────────────────────────
      // Required: pickup_person_phone
      // Optional: notes
      if (subType === 'PATIENT') {
        if (!pickupPersonName.trim()) {
          alert('Please enter person name');
          return;
        }
        if (!/^\d{10}$/.test(pickupPersonPhone)) {
          alert('Enter a valid 10-digit phone number');
          return;
        }
        onConfirm({
          ...basePayload,
          delivery_type:       'DIRECT',
          counter_sub_mode:    'patient',
          pickup_person_name:  pickupPersonName.trim(),
          pickup_person_phone: pickupPersonPhone.trim(),
        });

      // ── COMPANY pickup ─────────────────────────────────────────────────────
      // Required: pickup_person_name, pickup_person_phone, pickup_company_name
      // Optional: pickup_company_id, notes
      } else if (subType === 'COMPANY') {
        if (!/^\d{10}$/.test(pickupPersonPhone)) {
          alert('Enter a valid 10-digit phone number');
          return;
        }
        if (
          !pickupPersonName.trim() ||
          !pickupPersonPhone.trim() ||
          !companyName.trim()
        ) {
          alert('Please fill all required company fields');
          return;
        }
        onConfirm({
          ...basePayload,
          delivery_type:        'DIRECT',
          counter_sub_mode:     'company',
          pickup_person_name:   pickupPersonName.trim(),
          pickup_person_phone:  pickupPersonPhone.trim(),
          pickup_company_name:  companyName.trim(),
          pickup_company_id:    companyId.trim(),
          // pickup_person_username intentionally omitted
        });
      }

    } else if (deliveryType === 'COURIER') {
      if (!selectedCourier) { alert('Please select a courier'); return; }
      onConfirm({ ...basePayload, delivery_type: 'COURIER', courier_id: selectedCourier });

    } else if (deliveryType === 'COMPANY_DELIVERY') {
      if (!staffEmail.trim()) { alert('Please enter staff email'); return; }
      onConfirm({ ...basePayload, delivery_type: 'INTERNAL', user_email: staffEmail.trim() });
    }
  };

  // ── Form validation ────────────────────────────────────────────────────────
  const isFormValid = () => {
    if (deliveryType === 'COUNTER_PICKUP') {
      if (subType === 'PATIENT') {
        // Only phone required
        return pickupPersonName.trim() !== '' && /^\d{10}$/.test(pickupPersonPhone);
      }
      if (subType === 'COMPANY') {
        // Name + phone + company name required (company ID is optional)
        return (
          pickupPersonName.trim() !== '' &&
          /^\d{10}$/.test(pickupPersonPhone) &&
          companyName.trim() !== ''
        );
      }
    }
    if (deliveryType === 'COURIER')          return !!selectedCourier;
    if (deliveryType === 'COMPANY_DELIVERY') return staffEmail.trim() !== '';
    return true;
  };

  const filteredCouriers = couriers.filter(c =>
    c.courier_name.toLowerCase().includes(courierSearch.toLowerCase()) ||
    c.courier_code.toLowerCase().includes(courierSearch.toLowerCase())
  );

  if (!isOpen) return null;

  // ── Shared sub-components ──────────────────────────────────────────────────

  const GroupSummaryStrip = () => {
    if (!isGroup || invoiceArr.length === 0) return null;
    const totalItems = invoiceArr.reduce((s, b) => s + (b.items?.length || 0), 0);
    return (
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Layers className="w-4 h-4 text-teal-600" />
          </div>
          <span className="text-sm font-bold text-teal-700">
            Group Dispatch — {invoiceArr.length} invoices · {totalItems} items
          </span>
        </div>
        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
          {invoiceArr.map(b => (
            <div key={b.id}
              className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-2
                         border border-teal-100 shadow-sm">
              <span className="font-semibold text-gray-800">{b.invoice_no}</span>
              <span className="text-teal-600 truncate ml-2 max-w-[160px]">
                {b.customer?.name || b.temp_name || '—'}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-teal-600 mt-2.5 font-medium">
          All invoices above will be assigned together.
        </p>
      </div>
    );
  };

  const SingleSummaryStrip = () => {
    if (isGroup) return null;
    return (
      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">{repInvoice?.invoice_no}</p>
            <p className="text-sm text-gray-500 mt-0.5 truncate">{repInvoice?.customer?.name}</p>
          </div>
          <div className="text-right flex-shrink-0 ml-3">
            <p className="font-semibold text-gray-900">{formatAmount(repInvoice?.Total)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatItemCount(repInvoice?.items?.length)}</p>
          </div>
        </div>
      </div>
    );
  };

  const BackButton = () => (
    <button onClick={handleBack}
      className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 mb-3 font-medium">
      ← Back
    </button>
  );

  const ActionButtons = ({ confirmLabel, confirmDisabled }) => (
    <div className="flex gap-3 pt-4 border-t border-gray-100 mt-2">
      <button onClick={handleBack} disabled={submitting}
        className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-600 rounded-xl
                   hover:bg-gray-50 disabled:opacity-50 font-medium text-sm transition-colors">
        Back
      </button>
      <button onClick={handleSubmit} disabled={submitting || confirmDisabled}
        className="flex-1 py-2.5 px-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white
                   rounded-xl hover:from-teal-600 hover:to-cyan-700 disabled:opacity-50
                   disabled:cursor-not-allowed font-semibold text-sm transition-all shadow-sm">
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </span>
        ) : confirmLabel}
      </button>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Start Delivery Process</h3>
            {isGroup ? (
              <p className="text-sm text-teal-600 font-medium flex items-center gap-1 mt-0.5">
                <Layers className="w-3.5 h-3.5" />
                Group of {invoiceArr.length} invoices
              </p>
            ) : (
              <p className="text-sm text-gray-400 mt-0.5">Invoice: {repInvoice?.invoice_no}</p>
            )}
          </div>
          <button onClick={handleClose} disabled={submitting}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5">

          {/* ── Step 1 — delivery type ── */}
          {step === 1 && (
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Select Delivery Type
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { type: 'COUNTER_PICKUP',   label: 'Counter Pickup',   sub: 'Direct patient or company', Icon: User,    border: 'hover:border-teal-400',   bg: 'hover:bg-teal-50',   iconBg: 'bg-teal-100',   iconClr: 'text-teal-600'   },
                  { type: 'COURIER',           label: 'Courier Delivery', sub: 'Send via courier service',  Icon: Truck,   border: 'hover:border-orange-400', bg: 'hover:bg-orange-50', iconBg: 'bg-orange-100', iconClr: 'text-orange-600' },
                  { type: 'COMPANY_DELIVERY',  label: 'Company Delivery', sub: 'Internal delivery staff',   Icon: Package, border: 'hover:border-blue-400',   bg: 'hover:bg-blue-50',   iconBg: 'bg-blue-100',   iconClr: 'text-blue-600'   },
                ].map(({ type, label, sub, Icon, border, bg, iconBg, iconClr }) => (
                  <button key={type} onClick={() => handleTypeSelect(type)}
                    className={`p-5 border-2 border-gray-200 rounded-xl transition-all group ${border} ${bg}`}>
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className={`w-14 h-14 ${iconBg} rounded-full flex items-center justify-center`}>
                        <Icon className={`w-7 h-7 ${iconClr}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2 — counter pickup sub-type ── */}
          {step === 2 && deliveryType === 'COUNTER_PICKUP' && (
            <div>
              <BackButton />
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Select Pickup Type</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { sub: 'PATIENT', label: 'Direct Patient',  sub2: 'Customer picks up directly',         Icon: User     },
                  { sub: 'COMPANY', label: 'Direct Company',  sub2: 'Company representative pickup',      Icon: Building },
                ].map(({ sub, label, sub2, Icon }) => (
                  <button key={sub} onClick={() => handleSubTypeSelect(sub)}
                    className="p-6 border-2 border-gray-200 rounded-xl hover:border-teal-400 hover:bg-teal-50 transition-all group">
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="w-14 h-14 bg-teal-100 rounded-full flex items-center justify-center group-hover:bg-teal-200 transition-colors">
                        <Icon className="w-7 h-7 text-teal-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{sub2}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3 — counter pickup form ── */}
          {step === 3 && deliveryType === 'COUNTER_PICKUP' && (
            <div>
              <BackButton />
              <p className="font-semibold text-gray-800 mb-4">
                {subType === 'PATIENT' ? 'Direct Patient Pickup' : 'Direct Company Pickup'}
              </p>

              <div className="space-y-4">

                {/* ── PATIENT: only Phone + Notes ─────────────────────────── */}
                {subType === 'PATIENT' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Person Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          value={pickupPersonName}
                          onChange={e => setPickupPersonName(e.target.value)}
                          placeholder="Enter person name"
                          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm
                                    focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          type="tel"
                          value={pickupPersonPhone}
                          onChange={e => setPickupPersonPhone(e.target.value)}
                          placeholder="10-digit phone number"
                          maxLength={10}
                          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm
                                    focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                      {pickupPersonPhone && !/^\d{10}$/.test(pickupPersonPhone) && (
                        <p className="text-xs text-red-500 mt-1">Enter a valid 10-digit phone number</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Notes <span className="text-gray-400">(Optional)</span>
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Add any additional notes..."
                      rows={2}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none
                                focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

                {/* ── COMPANY: Name + Phone + Company Name + Company ID + Notes ── */}
                {subType === 'COMPANY' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          Person Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <input
                            type="text"
                            value={pickupPersonName}
                            onChange={e => setPickupPersonName(e.target.value)}
                            placeholder="Enter person name"
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm
                                       focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <input
                            type="tel"
                            value={pickupPersonPhone}
                            onChange={e => setPickupPersonPhone(e.target.value)}
                            placeholder="10-digit phone number"
                            maxLength={10}
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm
                                       focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>
                        {pickupPersonPhone && !/^\d{10}$/.test(pickupPersonPhone) && (
                          <p className="text-xs text-red-500 mt-1">Enter a valid 10-digit phone number</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          Company Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <input
                            type="text"
                            value={companyName}
                            onChange={e => setCompanyName(e.target.value)}
                            placeholder="Enter company name"
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm
                                       focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          Company ID <span className="text-gray-400">(Optional)</span>
                        </label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          <input
                            type="text"
                            value={companyId}
                            onChange={e => setCompanyId(e.target.value)}
                            placeholder="Enter company ID"
                            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm
                                       focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                        Notes <span className="text-gray-400">(Optional)</span>
                      </label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Add any additional notes..."
                        rows={2}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none
                                   focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}

              </div>

              <ActionButtons confirmLabel="Complete Pickup" confirmDisabled={!isFormValid()} />
            </div>
          )}

          {/* ── Step 4 — courier selection ── */}
          {step === 4 && deliveryType === 'COURIER' && (
            <div>
              <BackButton />
              <p className="font-semibold text-gray-800 mb-4">Assign Courier</p>

              {isGroup ? <GroupSummaryStrip /> : <SingleSummaryStrip />}

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Select Courier <span className="text-red-500">*</span>
                </label>

                <div className="relative" ref={courierInputRef}>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={courierSearch}
                    onChange={e => {
                      setCourierSearch(e.target.value);
                      setShowCourierDropdown(true);
                      setSelectedCourier('');
                      setSelectedCourierName('');
                    }}
                    onFocus={() => setShowCourierDropdown(true)}
                    placeholder="Search by name or code..."
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm
                               focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>

                <CourierDropdown
                  anchorRef={courierInputRef}
                  isOpen={showCourierDropdown}
                  loading={loadingCouriers}
                  couriers={filteredCouriers}
                  selected={selectedCourier}
                  onSelect={handleCourierSelect}
                  onClose={() => setShowCourierDropdown(false)}
                />

                {selectedCourier && !showCourierDropdown && (
                  <div className="mt-2 flex items-center justify-between bg-teal-50 border border-teal-200
                                  rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <CourierAvatar courier={selectedCourierData} size="w-9 h-9" />
                      <div>
                        <p className="text-sm font-semibold text-teal-800">{selectedCourierName}</p>
                        <p className="text-xs text-teal-600">Courier selected</p>
                      </div>
                    </div>
                    <button onClick={handleClearCourier}
                      className="text-teal-400 hover:text-teal-600 p-1 rounded-lg hover:bg-teal-100 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <ActionButtons
                confirmLabel={isGroup ? `Assign Courier to ${invoiceArr.length} Invoices` : 'Assign Courier'}
                confirmDisabled={!isFormValid()}
              />
            </div>
          )}

          {/* ── Step 5 — company delivery ── */}
          {step === 5 && deliveryType === 'COMPANY_DELIVERY' && (
            <div>
              <BackButton />
              <p className="font-semibold text-gray-800 mb-4">Assign Delivery Staff</p>

              {isGroup ? <GroupSummaryStrip /> : (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">{repInvoice?.invoice_no}</p>
                      <p className="text-sm text-gray-500 mt-0.5 truncate">{repInvoice?.customer?.name}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-400">{formatItemCount(repInvoice?.items?.length)}</p>
                        <p className="font-semibold text-gray-900 text-sm">{formatAmount(repInvoice?.Total)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Staff Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select
                    value={staffEmail}
                    onChange={e => setStaffEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm appearance-none bg-white
                               focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">
                      {loadingStaffOptions
                        ? 'Loading staff...'
                        : staffOptions.length > 0
                        ? 'Select delivery staff'
                        : 'No eligible staff found'}
                    </option>
                    {staffOptions.map((staff) => (
                      <option key={staff.id} value={staff.email}>
                        {staff.name} ({staff.email})
                      </option>
                    ))}
                  </select>
                </div>
                {selectedStaff && (
                  <p className="text-xs text-teal-600 mt-1.5">
                    Selected: {selectedStaff.name}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1.5">
                  {isGroup
                    ? `All ${invoiceArr.length} invoices will be assigned to this staff member.`
                    : 'The invoice will be assigned to this staff member for delivery.'}
                </p>
              </div>

              <ActionButtons
                confirmLabel={isGroup ? `Assign ${invoiceArr.length} Invoices to Staff` : 'Assign to Staff'}
                confirmDisabled={!isFormValid()}
              />
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default DeliveryModal;