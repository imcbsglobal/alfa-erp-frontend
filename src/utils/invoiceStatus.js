/**
 * Centralized invoice status display helpers.
 * BOXING is an internal intermediate state (tray packed, awaiting address label print).
 * It is always shown as "IN PROGRESS" to end-users.
 */

export const INVOICE_STATUS_COLORS = {
  INVOICED:   "bg-yellow-100 text-yellow-700 border-yellow-300",
  PICKING:    "bg-blue-100 text-blue-700 border-blue-300",
  PICKED:     "bg-green-100 text-green-700 border-green-300",
  PACKING:    "bg-purple-100 text-purple-700 border-purple-300",
  BOXING:     "bg-orange-100 text-orange-700 border-orange-300",
  PACKED:     "bg-emerald-100 text-emerald-700 border-emerald-300",
  DISPATCHED: "bg-teal-100 text-teal-700 border-teal-300",
  DELIVERED:  "bg-gray-200 text-gray-700 border-gray-300",
  REVIEW:     "bg-red-100 text-red-700 border-red-300",
};

/** Raw DB value → user-facing display label */
const LABEL_OVERRIDES = {
  BOXING: "IN PROGRESS",
};

/** Returns the Tailwind class string for a status badge */
export function getInvoiceStatusColor(status) {
  return INVOICE_STATUS_COLORS[status] || "bg-gray-100 text-gray-700 border-gray-300";
}

/** Returns the human-readable label for a status value */
export function getInvoiceStatusLabel(status) {
  if (!status) return "";
  return LABEL_OVERRIDES[status] || status;
}

/** Statuses that count as "in progress" for dashboard counters */
export const IN_PROGRESS_STATUSES = ["ASSIGNED", "PICKING", "PICKED", "PACKING", "BOXING"];

/** Statuses that count as "completed" for dashboard counters */
export const COMPLETED_STATUSES = ["PACKED", "DELIVERED", "COMPLETED"];
