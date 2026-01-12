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

  const handleDownloadSlip = () => {
    if (deliveryData.courier_slip) {
      window.open(deliveryData.courier_slip, '_blank');
    }
  };

  const isImage = (url) => {
    if (!url) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    return imageExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  const isPDF = (url) => {
    if (!url) return false;
    return url.toLowerCase().includes('.pdf');
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

              {/* COURIER SLIP SECTION - Only for Courier Deliveries */}
              {deliveryData.delivery_type === "COURIER" && deliveryData.courier_slip && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-teal-600 font-bold text-sm uppercase">Courier Slip / Screenshot</h3>
                    <button
                      onClick={handleDownloadSlip}
                      className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-xs font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </button>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {isImage(deliveryData.courier_slip) ? (
                      <div className="flex justify-center">
                        <img
                          src={deliveryData.courier_slip}
                          alt="Courier Slip"
                          className="max-w-full max-h-96 rounded-lg shadow-md object-contain"
                        />
                      </div>
                    ) : isPDF(deliveryData.courier_slip) ? (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-600">
                        <svg className="w-16 h-16 text-teal-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <p className="font-medium mb-2">PDF Document</p>
                        <p className="text-sm text-gray-500 mb-4">Click download to view the courier slip</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-gray-600">
                        <svg className="w-16 h-16 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm">Courier slip available</p>
                        <p className="text-xs text-gray-500">Click download to view</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

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