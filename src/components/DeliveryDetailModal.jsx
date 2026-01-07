import { useEffect, useState } from "react";

export default function DeliveryDetailModal({ isOpen, onClose, deliveryData }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && deliveryData) {
      setLoading(false);
    }
  }, [isOpen, deliveryData]);

  if (!isOpen || !deliveryData) return null;

  const formatDateTime = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return "In Progress";
    return minutes.toFixed(2);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING": return "bg-gray-100 text-gray-700";
      case "IN_TRANSIT": return "bg-yellow-100 text-yellow-700";
      case "DELIVERED": return "bg-green-100 text-green-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "PENDING": return "Pending";
      case "IN_TRANSIT": return "In Transit";
      case "DELIVERED": return "Delivered";
      default: return status;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "DIRECT": return "Counter Pickup";
      case "COURIER": return "Courier";
      case "INTERNAL": return "Company Delivery";
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <div>
              <h2 className="text-xl font-bold">Delivery Details</h2>
              <p className="text-sm text-teal-100">Invoice #{deliveryData.invoice_no}</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-teal-600 border-t-transparent"></div>
            <p className="text-gray-500 mt-4">Loading delivery details...</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            <div className="p-6">
              {/* DELIVERY TIMELINE */}
              <div className="mb-6">
                <h3 className="text-teal-600 font-bold text-sm mb-3 uppercase">Delivery Timeline</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Started</p>
                    <p className="text-sm font-medium text-gray-900">{formatDateTime(deliveryData.start_time)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Ended</p>
                    <p className="text-sm font-medium text-gray-900">
                      {deliveryData.end_time ? formatDateTime(deliveryData.end_time) : "In Progress"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Duration (mins)</p>
                    <p className="text-sm font-medium text-gray-900">{formatDuration(deliveryData.duration)}</p>
                  </div>
                </div>
              </div>

              {/* INFO GRID */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* DELIVERY INFORMATION */}
                <div>
                  <h3 className="text-teal-600 font-bold text-sm mb-3 uppercase">Delivery Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500">Delivery Type</p>
                      <p className="text-sm font-medium text-gray-900">{getTypeLabel(deliveryData.delivery_type)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(deliveryData.delivery_status)}`}>
                        {getStatusLabel(deliveryData.delivery_status)}
                      </span>
                    </div>

                    {deliveryData.delivery_type === "COURIER" && (
                      <>
                        <div>
                          <p className="text-xs text-gray-500">Courier Service</p>
                          <p className="text-sm font-medium text-gray-900">{deliveryData.courier_name || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Tracking Number</p>
                          <p className="text-sm font-medium text-gray-900">{deliveryData.tracking_no || "—"}</p>
                        </div>
                        {deliveryData.courier_contact && (
                          <div>
                            <p className="text-xs text-gray-500">Courier Contact</p>
                            <p className="text-sm font-medium text-gray-900">{deliveryData.courier_contact}</p>
                          </div>
                        )}
                      </>
                    )}

                    {deliveryData.delivery_type === "INTERNAL" && (
                      <>
                        <div>
                          <p className="text-xs text-gray-500">Delivery Personnel</p>
                          <p className="text-sm font-medium text-gray-900">{deliveryData.delivery_user_name || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Personnel Email</p>
                          <p className="text-sm font-medium text-gray-900">{deliveryData.delivery_user_email || "—"}</p>
                        </div>
                        {deliveryData.delivery_user_phone && (
                          <div>
                            <p className="text-xs text-gray-500">Personnel Phone</p>
                            <p className="text-sm font-medium text-gray-900">{deliveryData.delivery_user_phone}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* CUSTOMER INFORMATION */}
                <div>
                  <h3 className="text-teal-600 font-bold text-sm mb-3 uppercase">Customer Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500">Customer Name</p>
                      <p className="text-sm font-medium text-gray-900">{deliveryData.customer_name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-900">{deliveryData.customer_email || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-medium text-gray-900">{deliveryData.customer_phone || "—"}</p>
                    </div>
                    {deliveryData.delivery_address && (
                      <div>
                        <p className="text-xs text-gray-500">Address</p>
                        <p className="text-sm font-medium text-gray-900">{deliveryData.delivery_address}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* NOTES */}
              {deliveryData.notes && (
                <div className="mb-6">
                  <h3 className="text-teal-600 font-bold text-sm mb-3 uppercase">Notes</h3>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{deliveryData.notes}</p>
                  </div>
                </div>
              )}

              {/* METADATA */}
              {deliveryData.created_by_name && (
                <div className="text-xs text-gray-500 pt-4 border-t">
                  Created by <span className="font-medium text-gray-700">{deliveryData.created_by_name}</span>
                  {deliveryData.created_at && <span> on {formatDateTime(deliveryData.created_at)}</span>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}