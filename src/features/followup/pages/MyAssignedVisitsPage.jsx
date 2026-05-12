import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Calendar,
  MapPin,
  User,
  IndianRupee,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
} from "lucide-react";
import { getMyAssignedVisits } from "../../../services/followup";

function formatCurrency(val) {
  const n = parseFloat(val || 0);
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

// ── Calendar ──────────────────────────────────────────────
function CalendarView({ visits, selectedDate, onDateSelect }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split("-").map(Number);
      return new Date(y, m - 1);
    }
    return new Date();
  });

  // Build a set of dates that have visits
  const visitDates = new Set();
  visits.forEach((visit) => {
    if (!visit.bill_details) return;
    visit.bill_details.forEach((bill) => {
      if (bill.payment_date) {
        visitDates.add(bill.payment_date.split("T")[0]);
      }
      if (bill.next_collection_date) {
        visitDates.add(bill.next_collection_date.split("T")[0]);
      }
    });
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const today = new Date().toISOString().split("T")[0];

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const monthLabel = currentMonth.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const toDateStr = (d) =>
    d
      ? `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Month header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-teal-50/60">
        <button
          onClick={() => setCurrentMonth(new Date(year, month - 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-teal-100 transition-colors"
        >
          <ChevronLeft size={16} className="text-teal-700" />
        </button>
        <span className="text-sm font-bold text-gray-800">{monthLabel}</span>
        <button
          onClick={() => setCurrentMonth(new Date(year, month + 1))}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-teal-100 transition-colors"
        >
          <ChevronRight size={16} className="text-teal-700" />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[11px] font-semibold text-gray-400"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 p-2 gap-1">
        {days.map((day, idx) => {
          const dateStr = toDateStr(day);
          const hasVisit = dateStr && visitDates.has(dateStr);
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;

          return (
            <button
              key={idx}
              disabled={!day}
              onClick={() => day && onDateSelect(dateStr)}
              className={`
                relative aspect-square rounded-xl text-xs font-semibold transition-all flex flex-col items-center justify-center gap-0.5
                ${!day ? "pointer-events-none" : ""}
                ${isSelected
                  ? "bg-teal-500 text-white shadow-md shadow-teal-200"
                  : hasVisit
                  ? "bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200"
                  : isToday
                  ? "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  : day
                  ? "text-gray-600 hover:bg-gray-50"
                  : ""}
              `}
            >
              <span>{day}</span>
              {hasVisit && (
                <span
                  className={`w-1 h-1 rounded-full ${
                    isSelected ? "bg-white/70" : "bg-teal-400"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block" />
          <span className="text-[11px] text-gray-500">Has visits</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
          <span className="text-[11px] text-gray-500">Selected</span>
        </div>
      </div>
    </div>
  );
}

// ── Bill Details Modal ─────────────────────────────────────
function BillDetailsModal({ bills, clientName, onClose, onSave }) {
  const [collections, setCollections] = useState(() =>
    Object.fromEntries(
      bills.map((b) => {
        const alreadyCollected = parseFloat(b.collected_amount || 0);
        const billAmt = parseFloat(b.amount || 0);
        const remaining = alreadyCollected > 0 ? Math.max(0, billAmt - alreadyCollected) : billAmt;
        return [
          b.id,
          {
            collected: "",
            remaining: alreadyCollected > 0 ? String(remaining.toFixed(2)) : "",
            remaining_date: b.next_collection_date ? b.next_collection_date.split("T")[0] : "",
            remarks: b.remarks || "",
          },
        ];
      })
    )
  );
  const [saving, setSaving] = useState(false);

  if (!bills) return null;

  // Total = remaining (original minus already collected in previous sessions)
  const total = bills.reduce((s, b) => {
    const billAmt = parseFloat(b.amount || 0);
    const alreadyCollected = parseFloat(b.collected_amount || 0);
    return s + Math.max(0, billAmt - alreadyCollected);
  }, 0);
  const originalTotal = bills.reduce((s, b) => s + parseFloat(b.amount || 0), 0);

  const setField = (billId, field, value) =>
    setCollections((prev) => ({
      ...prev,
      [billId]: { ...prev[billId], [field]: value },
    }));

  const hasAnyCollection = Object.values(collections).some(
    (c) => c.collected && parseFloat(c.collected) > 0
  );

  const handleSave = async () => {
    // Validate: require Next Collection Date for partial collections
    for (const bill of bills) {
      const originalAmt = parseFloat(bill.amount || 0);
      const alreadyCollected = parseFloat(bill.collected_amount || 0);
      const remainingToCollect = Math.max(0, originalAmt - alreadyCollected);
      const col = parseFloat(collections[bill.id]?.collected || 0);
      const isPartial = col > 0 && col < remainingToCollect;
      
      if (isPartial && !collections[bill.id]?.remaining_date) {
        toast.error(`Next Collection Date is required for partial collections (Invoice: ${bill.invoice_no})`);
        return;
      }
    }

    setSaving(true);
    try {
      const { saveCollectionDetails } = await import("../../../services/followup");
      await saveCollectionDetails({ collections });
      toast.success("Collection details saved!");
      if (onSave) {
        await onSave();
      }
      onClose();
    } catch (error) {
      console.error("Save error:", error);
      const errorMsg = error?.response?.data?.error || error?.message || "Failed to save";
      toast.error(`Error: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full sm:max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <p className="font-bold text-gray-800 text-sm">{clientName}</p>
            <p className="text-xs text-gray-400 mt-0.5">Bill Details & Collection</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Bill Cards */}
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
          {bills.map((bill) => {
            const originalAmt = parseFloat(bill.amount || 0);
            const alreadyCollected = parseFloat(bill.collected_amount || 0);
            const remainingToCollect = Math.max(0, originalAmt - alreadyCollected);
            const col = parseFloat(collections[bill.id]?.collected || 0);
            const remStr = collections[bill.id]?.remaining;
            const rem = remStr !== "" && remStr !== undefined
              ? parseFloat(remStr)
              : col > 0 ? Math.max(0, remainingToCollect - col) : remainingToCollect;
            const isFullyPaid = col >= remainingToCollect && col > 0;

            return (
              <div key={bill.id} className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">

                {/* Bill info row */}
                <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                      <FileText size={14} className="text-teal-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800 font-mono">{bill.invoice_no}</p>
                      <p className="text-[10px] text-gray-400">
                        {bill.invoice_date
                          ? new Date(bill.invoice_date).toLocaleDateString("en-IN")
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-800 tabular-nums">
                      {formatCurrency(remainingToCollect)}
                    </p>
                    {alreadyCollected > 0 && (
                      <p className="text-[10px] text-gray-400">
                        Collected: {formatCurrency(alreadyCollected)}
                      </p>
                    )}
                    {bill.payment_date && (
                      <p className="text-[10px] text-gray-400">
                        Due: {new Date(bill.payment_date).toLocaleDateString("en-IN")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Collection inputs */}
                <div className="px-4 py-3 space-y-3">

                  {/* Collected + Remaining row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                        Collected (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={collections[bill.id]?.collected ?? ""}
                        onChange={(e) => {
                          setField(bill.id, "collected", e.target.value);
                          const col = parseFloat(e.target.value || 0);
                          const rem = remainingToCollect - col;
                          setField(bill.id, "remaining", rem > 0 ? rem.toFixed(2) : "0");
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-teal-400 tabular-nums bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                        Remaining (₹)
                      </label>
                      <div className={`w-full px-3 py-2 rounded-xl text-sm font-bold tabular-nums text-center border
                        ${isFullyPaid
                          ? "bg-green-50 text-green-600 border-green-200"
                          : col > 0
                          ? "bg-orange-50 text-orange-600 border-orange-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"}`}
                      >
                        {formatCurrency(rem)}
                      </div>
                    </div>
                  </div>

                  {/* Next date + Remarks row — only show if partial */}
                  {col > 0 && !isFullyPaid && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                          Next Collection Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={collections[bill.id]?.remaining_date ?? ""}
                          onChange={(e) => setField(bill.id, "remaining_date", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide block mb-1">
                          Remarks
                        </label>
                        <input
                          type="text"
                          placeholder="notes…"
                          value={collections[bill.id]?.remarks ?? ""}
                          onChange={(e) => setField(bill.id, "remarks", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Fully paid badge */}
                  {isFullyPaid && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                      <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold">✓</span>
                      <span className="text-xs font-semibold text-green-700">Fully collected</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 flex-shrink-0">
          <span className="text-xs font-semibold text-gray-500">
            {bills.length} bill{bills.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-sm font-bold text-orange-600">
                To Collect: {formatCurrency(total)}
              </span>
              {originalTotal !== total && (
                <p className="text-[10px] text-gray-400">
                  Original: {formatCurrency(originalTotal)}
                </p>
              )}
            </div>
            {hasAnyCollection && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold rounded-lg shadow transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Collection"}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Customer Details Modal ────────────────────────────────
function CustomerDetailsModal({ customer, clientName, onClose }) {
  if (!customer) return null;

  const fullAddress = [customer.address1, customer.address2, customer.address3]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full sm:max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-bold text-gray-800 text-sm">{clientName}</p>
            <p className="text-xs text-gray-400 mt-0.5">Contact & Address</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <X size={16} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[70vh] overflow-y-auto space-y-4">
          {/* Address Section */}
          {fullAddress && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Full Address
              </p>
              <div className="flex gap-2">
                <MapPin size={14} className="text-teal-500 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-700 leading-relaxed">{fullAddress}</p>
              </div>
            </div>
          )}

          {/* Area */}
          {customer.area && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Area
              </p>
              <p className="text-sm text-gray-700">{customer.area}</p>
            </div>
          )}

          {/* Pincode */}
          {customer.pincode && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Pincode
              </p>
              <p className="text-sm text-gray-700 font-mono">{customer.pincode}</p>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-100 pt-4" />

          {/* Contact Section */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Contact Information
            </p>
            <div className="space-y-2.5">
              {customer.phone1 && (
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-teal-700">P1</span>
                  </span>
                  <span className="text-sm text-gray-700 font-mono">{customer.phone1}</span>
                </div>
              )}
              {customer.phone2 && (
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-cyan-700">P2</span>
                  </span>
                  <span className="text-sm text-gray-700 font-mono">{customer.phone2}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-blue-700">E</span>
                  </span>
                  <span className="text-sm text-gray-700 truncate">{customer.email}</span>
                </div>
              )}
              {!customer.phone1 && !customer.phone2 && !customer.email && (
                <p className="text-sm text-gray-400 italic">No contact information available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Visit Card ─────────────────────────────────────────────
function VisitCard({ visit, onViewBills, onViewDetails }) {
  const fullAddress = visit.customer_details
    ? [
        visit.customer_details.address1,
        visit.customer_details.address2,
        visit.customer_details.address3,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Top strip */}
      <div className="h-1 bg-gradient-to-r from-teal-400 to-cyan-400" />

      <div className="p-3">
        {/* Client name + code + badge */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex-1">
            <h3 className="font-bold text-gray-800 text-sm leading-tight">
              {visit.client_name}
            </h3>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
              {visit.client_code}
            </p>
          </div>
          <span className="shrink-0 bg-teal-50 text-teal-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-teal-100 whitespace-nowrap">
            {visit.bill_count} bill{visit.bill_count !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mb-2.5 text-[10px]">
          <div className="flex items-center gap-1 text-gray-500">
            <User size={10} className="text-teal-400" />
            <span>{visit.created_by_name || "—"}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <Clock size={10} className="text-blue-400" />
            <span>
              {new Date(visit.created_at).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Address & Contact Section */}
        {visit.customer_details && (fullAddress || visit.customer_details.area || visit.customer_details.pincode || visit.customer_details.phone1 || visit.customer_details.phone2 || visit.customer_details.email) && (
          <div className="mb-2.5 p-2.5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-100 space-y-1.5 text-[11px]">
            {/* Full Address */}
            {fullAddress && (
              <div className="flex gap-2">
                <MapPin size={12} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="flex-1 text-gray-700 leading-snug">
                  <p className="font-semibold text-gray-800">{fullAddress}</p>
                </div>
              </div>
            )}

            {/* Area & Pincode on same line */}
            <div className="flex gap-2 text-[10px]">
              {visit.customer_details.area && (
                <div className="flex-1">
                  <p className="text-gray-500 font-medium">Area</p>
                  <p className="text-gray-700">{visit.customer_details.area}</p>
                </div>
              )}
              {visit.customer_details.pincode && (
                <div className="flex-1">
                  <p className="text-gray-500 font-medium">Pincode</p>
                  <p className="text-gray-700 font-mono">{visit.customer_details.pincode}</p>
                </div>
              )}
            </div>

            {/* Contact Details */}
            {(visit.customer_details.phone1 || visit.customer_details.phone2 || visit.customer_details.email) && (
              <div className="border-t border-blue-200 pt-1.5">
                <div className="space-y-1">
                  {visit.customer_details.phone1 && (
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="w-4 h-4 rounded bg-teal-100 flex items-center justify-center shrink-0">
                        <span className="text-[7px] font-bold text-teal-700">P1</span>
                      </span>
                      <span className="text-gray-700 font-mono">{visit.customer_details.phone1}</span>
                    </div>
                  )}
                  {visit.customer_details.phone2 && (
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="w-4 h-4 rounded bg-cyan-100 flex items-center justify-center shrink-0">
                        <span className="text-[7px] font-bold text-cyan-700">P2</span>
                      </span>
                      <span className="text-gray-700 font-mono">{visit.customer_details.phone2}</span>
                    </div>
                  )}
                  {visit.customer_details.email && (
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="w-4 h-4 rounded bg-blue-100 flex items-center justify-center shrink-0">
                        <span className="text-[7px] font-bold text-blue-700">E</span>
                      </span>
                      <span className="text-gray-700 truncate">{visit.customer_details.email}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Amounts */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="flex-1 bg-teal-50 rounded-lg px-2.5 py-1.5 text-center">
            <p className="text-[9px] text-gray-500 font-medium">Total</p>
            <p className="text-xs font-bold text-teal-700 tabular-nums">
              {formatCurrency(visit.total_amount)}
            </p>
          </div>
          {visit.promised_amount && (
            <div className="flex-1 bg-orange-50 rounded-lg px-2.5 py-1.5 text-center">
              <p className="text-[9px] text-gray-500 font-medium">Promised</p>
              <p className="text-xs font-bold text-orange-600 tabular-nums">
                {formatCurrency(visit.promised_amount)}
              </p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={() => onViewBills(visit)}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold transition-colors shadow-md shadow-teal-200"
        >
          <Eye size={14} />
          View Bills
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function MyAssignedVisitsPage() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBills, setSelectedBills] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    loadVisits();
  }, []);

  const loadVisits = async () => {
    setLoading(true);
    try {
      const response = await getMyAssignedVisits();
      const results = response.data.results || [];
      setVisits(results);

      if (results.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const todayHasVisits = results.some((v) =>
          v.bill_details?.some((b) => {
            const paymentMatch = b.payment_date && b.payment_date.split("T")[0] === today;
            const collectionMatch = b.next_collection_date && b.next_collection_date.split("T")[0] === today;
            return paymentMatch || collectionMatch;
          })
        );
        if (!todayHasVisits) {
          const allDates = results
            .flatMap((v) => v.bill_details || [])
            .flatMap((b) => [b.payment_date, b.next_collection_date])
            .filter(Boolean)
            .map((d) => d.split("T")[0])
            .sort();
          if (allDates.length > 0) setSelectedDate(allDates[0]);
        }
      }
    } catch {
      toast.error("Failed to load assigned visits");
    } finally {
      setLoading(false);
    }
  };

  const visitsForDate = visits.filter((v) =>
    v.bill_details?.some((b) => {
      const paymentMatch = b.payment_date && b.payment_date.split("T")[0] === selectedDate;
      const collectionMatch = b.next_collection_date && b.next_collection_date.split("T")[0] === selectedDate;
      return paymentMatch || collectionMatch;
    })
  );

  const formattedDate = (() => {
    if (!selectedDate) return "";
    const [y, m, d] = selectedDate.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      {selectedBills && (
        <BillDetailsModal
          bills={selectedBills.bills}
          clientName={selectedBills.clientName}
          onClose={() => setSelectedBills(null)}
          onSave={loadVisits}
        />
      )}

      <div className="max-w-5xl mx-auto px-3 py-4 sm:px-5 sm:py-6">
        {/* Page title */}
        <div className="mb-5">
          <h1 className="text-xl font-bold text-gray-800 sm:text-2xl">
            My Assigned Visits
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Tap a date to view scheduled visits
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading visits…</p>
          </div>
        ) : visits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
              <MapPin size={28} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">No visits assigned</p>
            <p className="text-xs text-gray-400 text-center max-w-xs">
              When visits are assigned to you, they will appear here.
            </p>
          </div>
        ) : (
          /* ── Two-column on desktop, stacked on mobile ── */
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:items-stretch">

            {/* Left: Calendar — always visible */}
            <div className="w-full lg:w-72 lg:shrink-0 lg:sticky lg:top-4 h-fit">
              <CalendarView
                visits={visits}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
            </div>

            {/* Right: Visit cards for selected date */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* Date heading */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-gray-700">{formattedDate}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {visitsForDate.length > 0
                      ? `${visitsForDate.length} visit${visitsForDate.length !== 1 ? "s" : ""} scheduled`
                      : "No visits on this date"}
                  </p>
                </div>
                {visitsForDate.length > 0 && (
                  <span className="bg-teal-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    {visitsForDate.length}
                  </span>
                )}
              </div>

              {visitsForDate.length === 0 ? (
                <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-12 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                    <Calendar size={22} className="text-gray-300" />
                  </div>
                  <p className="text-sm font-semibold text-gray-500">
                    No visits on this date
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Select a highlighted date on the calendar
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 gap-3 max-w-2xl">
                    {visitsForDate.map((visit) => (
                      <VisitCard
                        key={visit.id}
                        visit={visit}
                        onViewBills={(v) =>
                          setSelectedBills({
                            bills: v.bill_details,
                            clientName: v.client_name,
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}