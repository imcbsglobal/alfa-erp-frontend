import { useEffect, useState } from "react";
import { X } from "lucide-react";
import api from "../services/api";
import { formatNumber, formatDateTime, formatInvoiceDate, formatMRP, formatQuantity, formatAmount, formatLineTotal } from "../utils/formatters";

export default function PackingDetailModal({ isOpen, onClose, invoiceId }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && invoiceId) {
      fetchPackingDetails();
    }
  }, [isOpen, invoiceId]);

  const fetchPackingDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/sales/packing/history/?search=${invoiceId}`
      );
      setInvoice(res.data.results?.[0] || null);
    } catch (error) {
      console.error("Failed to fetch packing details:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50"
        style={{ zIndex: 999 }}
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div 
        className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 pointer-events-none"
        style={{ zIndex: 1000 }}
      >
        <div 
          className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col relative pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white px-3 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-white bg-opacity-20 p-1.5 sm:p-2 rounded">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-bold">Packing Details</h2>
                {invoice && (
                  <p className="text-xs sm:text-sm opacity-90">Invoice #{invoice.invoice_no}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="hover:bg-white hover:bg-opacity-20 rounded p-1 transition-all"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {loading ? (
              <div className="text-center py-12 text-gray-500">
                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-teal-500 mx-auto"></div>
                <p className="mt-4 text-sm sm:text-base">Loading packing details...</p>
              </div>
            ) : invoice ? (
              <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
                {/* Packing Timeline */}
                {(invoice.packing_status || invoice.start_time) && (
                  <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200">
                    <h3 className="text-xs sm:text-sm font-bold text-teal-600 mb-2 sm:mb-3 uppercase tracking-wide">
                      Packing Timeline
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Started</p>
                        <p className="font-semibold text-xs sm:text-sm text-gray-800">
                          {invoice.start_time ? formatDateTime(invoice.start_time) : "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Ended</p>
                        <p className="font-semibold text-xs sm:text-sm text-gray-800">
                          {invoice.end_time
                            ? formatDateTime(invoice.end_time)
                            : "In Progress"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 mb-1">Duration (mins)</p>
                        <p className="font-semibold text-xs sm:text-sm text-gray-800">
                          {invoice.duration ?? "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Invoice and Customer Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200">
                    <h3 className="text-xs sm:text-sm font-bold text-teal-600 mb-2 sm:mb-3 uppercase tracking-wide">
                      Invoice Information
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Invoice Number</span>
                        <span className="text-xs sm:text-sm font-semibold text-gray-800">{invoice.invoice_no}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Invoice Date</span>
                        <span className="text-xs sm:text-sm font-semibold text-gray-800">
                          {formatInvoiceDate(invoice.invoice_date)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Packer</span>
                        <span className="text-xs sm:text-sm font-semibold text-gray-800">{invoice.packer_name || "N/A"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Status</span>
                        <StatusBadge status={invoice.packing_status} />
                      </div>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200">
                    <h3 className="text-xs sm:text-sm font-bold text-teal-600 mb-2 sm:mb-3 uppercase tracking-wide">
                      Customer Information
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Customer Name</span>
                        <span className="text-xs sm:text-sm font-semibold text-gray-800 text-right ml-2 break-words">{invoice.customer_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Email</span>
                        <span className="text-xs sm:text-sm font-semibold text-gray-800 text-right ml-2 break-all">{invoice.customer_email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500">Phone</span>
                        <span className="text-xs sm:text-sm font-semibold text-gray-800">{invoice.customer_phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-500 flex-shrink-0">Address</span>
                        <span className="text-xs sm:text-sm font-semibold text-gray-800 text-right ml-2">{invoice.customer_address}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Item Details */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-bold uppercase tracking-wide">Shelf</th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-bold uppercase tracking-wide">Item Name</th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-center text-xs font-bold uppercase tracking-wide">Qty</th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs font-bold uppercase tracking-wide">MRP</th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-bold uppercase tracking-wide">Batch No</th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-bold uppercase tracking-wide">Exp Date</th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs font-bold uppercase tracking-wide">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {invoice.items?.map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-800">{item.shelf_location}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-800">{item.name}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center text-gray-800">{formatQuantity(item.quantity, 'pcs', false)}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-right text-gray-800">{formatMRP(item.mrp)}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-800">{item.batch_no}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-800">{item.expiry_date || '—'}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-right font-semibold text-gray-800">
                              {formatLineTotal(item.quantity, item.mrp)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Total Amount */}
                  <div className="bg-gray-50 border-t border-gray-200 px-3 sm:px-4 py-3 flex justify-end">
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Amount</p>
                      <p className="text-xl sm:text-2xl font-bold text-teal-600">{formatAmount(invoice.Total)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm sm:text-base">No packing data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Helper component for status badges
function StatusBadge({ status }) {
  const styles = {
    PENDING: "bg-gray-100 text-gray-700 border-gray-200",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700 border-yellow-200",
    PACKED: "bg-green-100 text-green-700 border-green-200",
  };

  const labels = {
    PENDING: "Pending",
    IN_PROGRESS: "In Progress",
    PACKED: "Packed",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border inline-block ${styles[status] || "bg-gray-100 text-gray-700"}`}>
      {labels[status] || status}
    </span>
  );
}