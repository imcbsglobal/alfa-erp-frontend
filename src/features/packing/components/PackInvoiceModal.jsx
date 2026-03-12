import { useState, useEffect } from "react";
import { formatQuantity } from "../../../utils/formatters";

// Props:
//   isOpen, onClose                   — modal open/close
//   invoiceNumber, customerName       — header info
//   items                             — array of items (pass [singleItem] from row click)
//   boxes                             — open (unsealed) boxes to assign into
//   onConfirm(item, boxId, quantity)  — called when user confirms assignment
//
// ─── Used as standalone "Take this bill" modal ──────────────────────────────
//   onPack, actionLabel               — confirm action (no boxes/onConfirm needed)
// ────────────────────────────────────────────────────────────────────────────

export default function PackInvoiceModal({
  isOpen,
  onClose,
  onPack,
  onConfirm,
  invoiceNumber,
  customerName,
  items = [],
  boxes = [],
  title = "Start Packing",
  actionLabel = "Yes, Take This Bill",
}) {
  const singleItemMode = items.length === 1 && typeof onConfirm === "function";

  const [viewItem, setViewItem] = useState(null);
  const [selectedBoxId, setSelectedBoxId] = useState("");
  const [quantity, setQuantity] = useState("");

  useEffect(() => {
    if (isOpen) {
      setViewItem(singleItemMode ? items[0] : null);
      setSelectedBoxId(boxes.length === 1 ? boxes[0].id : "");
      setQuantity(singleItemMode ? String(items[0]?.quantity || items[0]?.qty || "") : "");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!selectedBoxId) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;
    onConfirm(viewItem, Number(selectedBoxId), qty);
  };

  // ── Item detail + assign view ─────────────────────────────────────────────
  if (viewItem) {
    const fields = [
      { label: "Item Name", value: viewItem.name || viewItem.item_name },
      { label: "Qty",       value: formatQuantity(viewItem.quantity || viewItem.qty || 0, "pcs") },
      { label: "Batch No.", value: viewItem.batch_no || viewItem.batch || viewItem.batch_number },
      { label: "Exp. Date", value: viewItem.expiry_date ? new Date(viewItem.expiry_date).toLocaleDateString("en-GB") : null },
      { label: "MRP",       value: viewItem.mrp ? `₹${parseFloat(viewItem.mrp).toFixed(2)}` : null },
      { label: "Packing",   value: viewItem.package || viewItem.packaging || viewItem.pkg || viewItem.packing },
    ];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-teal-600">
            <div className="flex items-center gap-3">
              {!singleItemMode && (
                <button onClick={() => setViewItem(null)} className="text-white/70 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <h2 className="text-base font-bold text-white">Item Details</h2>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Item name banner */}
          <div className="px-6 pt-5 pb-3">
            <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3">
              <p className="text-[10px] text-teal-500 font-semibold uppercase tracking-wide mb-0.5">Item</p>
              <p className="text-sm font-bold text-teal-800 leading-snug">{viewItem.name || viewItem.item_name}</p>
              {(viewItem.code || viewItem.item_code) && (
                <p className="text-xs text-teal-600 mt-0.5">{viewItem.code || viewItem.item_code}</p>
              )}
            </div>
          </div>

          {/* Detail fields */}
          <div className="px-6 divide-y divide-gray-100">
            {fields.slice(1).map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-2.5 gap-4">
                <span className="text-sm text-gray-400 font-medium flex-shrink-0 w-24">{label}</span>
                <span className="text-sm font-semibold text-gray-800 text-right break-words">
                  {value || <span className="text-gray-300 font-normal">—</span>}
                </span>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className={`px-6 pb-5 ${singleItemMode ? "pt-3" : "pt-4"} flex gap-3`}>
            <button
              onClick={onClose}
              className="flex-1 py-3 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            {singleItemMode && (
              <button
                onClick={handleConfirm}
                disabled={!selectedBoxId || !quantity || boxes.length === 0}
                className="flex-1 py-3 text-sm font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Confirm & Add
              </button>
            )}
          </div>

        </div>
      </div>
    );
  }

  // ── Standard "Take this bill" modal view ──────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-teal-600">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-white">{title}</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Invoice + Customer pills */}
        <div className="px-6 pt-5 pb-2 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-lg px-4 py-2.5 flex-1 min-w-0">
            <svg className="w-4 h-4 text-teal-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="min-w-0">
              <p className="text-[10px] text-teal-500 font-semibold uppercase tracking-wide">Invoice</p>
              <p className="text-sm font-bold text-teal-800 truncate">#{invoiceNumber}</p>
            </div>
          </div>
          {customerName && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 flex-1 min-w-0">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Customer</p>
                <p className="text-sm font-bold text-gray-700 truncate">{customerName}</p>
              </div>
            </div>
          )}
        </div>

        {/* Items list */}
        {items.length > 0 && (
          <div className="px-6 py-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Items ({items.length})</p>
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
              {items.map((item, idx) => (
                <div
                  key={item.id || idx}
                  onClick={() => setViewItem(item)}
                  className={`flex items-center justify-between px-3 py-2.5 gap-3 cursor-pointer hover:bg-teal-50 transition-colors group
                    ${idx !== items.length - 1 ? "border-b border-gray-100" : ""}
                    ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/60"}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.name || item.item_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {(item.batch_no || item.batch || item.batch_number) && (
                        <span className="text-[10px] text-blue-600 font-semibold">Batch: {item.batch_no || item.batch || item.batch_number}</span>
                      )}
                      {item.expiry_date && (
                        <span className="text-[10px] text-orange-500">Exp: {new Date(item.expiry_date).toLocaleDateString("en-GB")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-bold text-teal-700">{formatQuantity(item.quantity || item.qty || 0, "pcs")}</span>
                    <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-teal-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning */}
        <div className="px-6 py-3">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3.5">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">Are you sure you want to take this bill for packing?</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                This bill will be assigned to you. Other staff won't be able to take it once you confirm.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-5 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-3 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            No, Cancel
          </button>
          <button type="button" onClick={onPack}
            className="flex-1 py-3 text-sm font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {actionLabel}
          </button>
        </div>

      </div>
    </div>
  );
}