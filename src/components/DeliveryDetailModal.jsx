import { useEffect, useState } from "react";

export default function DeliveryDetailModal({ isOpen, onClose, deliveryData }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && deliveryData) {
      setLoading(false);
      console.log("📦 Delivery Data:", deliveryData);
      console.log("📄 Courier Slip URL:", deliveryData.courier_slip_url);
      console.log("📍 Location Data:", {
        lat: deliveryData.delivery_latitude,
        lon: deliveryData.delivery_longitude,
        address: deliveryData.delivery_location_address
      });
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

  const courierSlipUrl = deliveryData.courier_slip_url || deliveryData.courier_slip;

  const handleDownloadSlip = () => {
    if (courierSlipUrl) {
      window.open(courierSlipUrl, '_blank');
    }
  };

  const handleOpenMap = () => {
    if (deliveryData.delivery_latitude && deliveryData.delivery_longitude) {
      const googleMapsUrl = `https://www.google.com/maps?q=${deliveryData.delivery_latitude},${deliveryData.delivery_longitude}`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  const isImage = (url) => {
    if (!url) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    return imageExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  const isPDF = (url) => {
    if (!url) return false;
    return url.toLowerCase().includes('.pdf');
  };

  const hasLocation = deliveryData.delivery_latitude && deliveryData.delivery_longitude;

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

              {/* LOCATION SECTION - Only for Company Deliveries */}
              {deliveryData.delivery_type === "INTERNAL" && hasLocation && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-teal-600 font-bold text-sm uppercase">Delivery Location</h3>
                    <button
                      onClick={handleOpenMap}
                      className="flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition text-xs font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Open in Maps
                    </button>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-lg p-4 border border-green-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">📍 Coordinates</p>
                        <div className="bg-white rounded-lg p-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Latitude:</span>
                            <span className="text-sm font-mono font-medium text-gray-900">
                              {parseFloat(deliveryData.delivery_latitude).toFixed(6)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Longitude:</span>
                            <span className="text-sm font-mono font-medium text-gray-900">
                              {parseFloat(deliveryData.delivery_longitude).toFixed(6)}
                            </span>
                          </div>
                          {deliveryData.delivery_location_accuracy && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">Accuracy:</span>
                              <span className="text-sm font-medium text-gray-900">
                                ±{Math.round(deliveryData.delivery_location_accuracy)}m
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-2">📌 Address</p>
                        <div className="bg-white rounded-lg p-3">
                          <p className="text-sm text-gray-800 leading-relaxed">
                            {deliveryData.delivery_location_address || "Address not available"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Info Banner */}
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-xs text-blue-800">
                      <p className="font-medium mb-1">GPS Location Captured</p>
                      <p className="text-blue-700">This location was automatically captured when the delivery was completed.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* No Location Warning - Only for Company Deliveries */}
              {deliveryData.delivery_type === "INTERNAL" && !hasLocation && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                  <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-800 mb-1">No Location Data</p>
                    <p className="text-xs text-yellow-700">GPS location was not captured for this delivery.</p>
                  </div>
                </div>
              )}

              {/* COURIER SLIP SECTION - Only for Courier Deliveries */}
              {deliveryData.delivery_type === "COURIER" && courierSlipUrl && (
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
                      Open in New Tab
                    </button>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {isImage(courierSlipUrl) ? (
                      <div className="relative">
                        <img
                          src={courierSlipUrl}
                          alt="Courier Slip"
                          className="w-full max-h-[500px] rounded-lg shadow-md object-contain mx-auto bg-white"
                          onError={(e) => {
                            console.error("Failed to load image:", courierSlipUrl);
                            e.target.style.display = 'none';
                            const errorDiv = e.target.nextElementSibling;
                            if (errorDiv) errorDiv.style.display = 'flex';
                          }}
                        />
                        <div style={{ display: 'none' }} className="flex flex-col items-center justify-center py-12 text-gray-600">
                          <svg className="w-16 h-16 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm font-medium mb-1">Failed to load image</p>
                          <p className="text-xs text-gray-500 mb-3">Click "Open in New Tab" to view</p>
                          <code className="text-xs bg-gray-200 px-2 py-1 rounded">{courierSlipUrl}</code>
                        </div>
                      </div>
                    ) : isPDF(courierSlipUrl) ? (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-600">
                        <svg className="w-20 h-20 text-teal-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <p className="font-semibold text-lg mb-2">PDF Document</p>
                        <p className="text-sm text-gray-500 mb-4">Click "Open in New Tab" to view the courier slip</p>
                        <div className="bg-white px-4 py-2 rounded-lg border border-gray-300">
                          <p className="text-xs text-gray-600 font-mono">📄 {courierSlipUrl.split('/').pop()}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-600">
                        <svg className="w-16 h-16 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm font-medium mb-2">Courier Slip Available</p>
                        <p className="text-xs text-gray-500 mb-3">Click "Open in New Tab" to view</p>
                        <div className="bg-white px-4 py-2 rounded-lg border border-gray-300 max-w-full overflow-hidden">
                          <p className="text-xs text-blue-600 font-mono truncate">{courierSlipUrl}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Additional Info Banner */}
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-xs text-blue-800">
                      <p className="font-medium mb-1">Courier Slip Uploaded</p>
                      <p className="text-blue-700">This document serves as proof of delivery to the courier service.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Warning - No Courier Slip */}
              {deliveryData.delivery_type === "COURIER" && !courierSlipUrl && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                  <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-800 mb-1">No Courier Slip Uploaded</p>
                    <p className="text-xs text-yellow-700">The courier slip/screenshot has not been uploaded for this delivery yet.</p>
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