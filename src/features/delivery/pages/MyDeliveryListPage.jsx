import { useEffect, useState } from "react";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";
import { Truck, Package, CheckCircle, Clock } from "lucide-react";
import toast from "react-hot-toast";

export default function MyDeliveryListPage() {
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedDelivery, setExpandedDelivery] = useState(null);
  const [completeModal, setCompleteModal] = useState({ open: false, delivery: null });
  const [deliveryStatus, setDeliveryStatus] = useState("DELIVERED");
  const [notes, setNotes] = useState("");
  const [courierName, setCourierName] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [locationData, setLocationData] = useState(null);

  const { user } = useAuth();

  // Function to fetch current location
  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setFetchingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        try {
          // Reverse geocode to get address
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          
          setLocationData({
            latitude,
            longitude,
            accuracy,
            address: data.display_name || 'Address not available'
          });
          
          toast.success('Location captured successfully');
        } catch (error) {
          console.error('Reverse geocoding failed:', error);
          setLocationData({
            latitude,
            longitude,
            accuracy,
            address: 'Address lookup failed'
          });
          toast.success('Location captured (address lookup failed)');
        } finally {
          setFetchingLocation(false);
        }
      },
      (error) => {
        console.error('Location error:', error);
        setFetchingLocation(false);
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location permission denied. Please enable location access.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Location information unavailable');
            break;
          case error.TIMEOUT:
            toast.error('Location request timed out');
            break;
          default:
            toast.error('Failed to get location');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    loadActiveDelivery();
    loadTodayCompletedDeliveries();
  }, []);

  const loadActiveDelivery = async () => {
    try {
      setLoading(true);
      const res = await api.get("/sales/delivery/history/", {
        params: {
          search: user.email,
          status: 'IN_TRANSIT',
          page_size: 1
        }
      });
      
      if (res.data?.results && res.data.results.length > 0) {
        const activeDeliveries = res.data.results.filter(delivery => 
          delivery.delivery_user_email === user.email && 
          delivery.delivery_status === 'IN_TRANSIT' &&
          !delivery.end_time
        );
        
        if (activeDeliveries.length > 0) {
          setActiveDelivery(activeDeliveries[0]);
        } else {
          setActiveDelivery(null);
        }
      } else {
        setActiveDelivery(null);
      }
    } catch (err) {
      console.error("Failed to load active delivery", err);
      setActiveDelivery(null);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayCompletedDeliveries = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await api.get("/sales/delivery/history/", {
        params: {
          search: user.email,
          status: 'DELIVERED',
          start_date: today,
          end_date: today,
          page_size: 50
        }
      });
      
      const completed = (res.data?.results || []).filter(delivery => 
        delivery.delivery_user_email === user.email &&
        delivery.end_time && 
        delivery.delivery_status === 'DELIVERED'
      );
      
      setCompletedDeliveries(completed);
    } catch (err) {
      console.error("Failed to load completed deliveries", err);
    }
  };

  const openCompleteModal = (delivery) => {
    setCompleteModal({ open: true, delivery });
    setDeliveryStatus("DELIVERED");
    setNotes("");
    setCourierName(delivery.courier_name || "");
    setTrackingNo(delivery.tracking_no || "");
    setLocationData(null);
    
    // Auto-fetch location for company delivery
    if (delivery.delivery_type === 'INTERNAL') {
      fetchCurrentLocation();
    }
  };

  const closeCompleteModal = () => {
    setCompleteModal({ open: false, delivery: null });
    setDeliveryStatus("DELIVERED");
    setNotes("");
    setCourierName("");
    setTrackingNo("");
    setLocationData(null);
  };

  const handleCompleteDelivery = async () => {
    if (!completeModal.delivery || !user?.email) return;

    // Validation
    if (completeModal.delivery.delivery_type === 'COURIER' && deliveryStatus === 'DELIVERED') {
      if (!courierName.trim()) {
        toast.error('Please enter courier name');
        return;
      }
    }

    // For company delivery, location is recommended
    if (completeModal.delivery.delivery_type === 'INTERNAL' && !locationData) {
      const confirmWithoutLocation = window.confirm(
        'Location was not captured. Do you want to complete delivery without location data?'
      );
      if (!confirmWithoutLocation) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        invoice_no: completeModal.delivery.invoice_no,
        user_email: user.email,
        delivery_status: deliveryStatus,
        notes: notes || "Delivery completed"
      };

      // Add courier details if it's a courier delivery
      if (completeModal.delivery.delivery_type === 'COURIER') {
        payload.courier_name = courierName.trim();
        if (trackingNo.trim()) {
          payload.tracking_no = trackingNo.trim();
        }
      }

      // Add location data for company delivery
      if (completeModal.delivery.delivery_type === 'INTERNAL' && locationData) {
        payload.delivery_latitude = locationData.latitude;
        payload.delivery_longitude = locationData.longitude;
        payload.delivery_location_address = locationData.address;
        payload.delivery_location_accuracy = locationData.accuracy;
      }

      await api.post("/sales/delivery/complete/", payload);

      toast.success("Delivery completed successfully!");
      closeCompleteModal();
      
      await loadActiveDelivery();
      await loadTodayCompletedDeliveries();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || err.response?.data?.message || "Failed to complete delivery");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const toggleExpand = (deliveryId) => {
    setExpandedDelivery(expandedDelivery === deliveryId ? null : deliveryId);
  };

  const getDeliveryTypeLabel = (type) => {
    const labels = {
      DIRECT: "Counter Pickup",
      COURIER: "Courier Delivery",
      INTERNAL: "Company Delivery"
    };
    return labels[type] || type;
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-2"></div>
        <p className="text-gray-600">Loading deliveries...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">My Delivery Tasks</h1>
          <p className="text-gray-600 mt-1">Manage your assigned deliveries</p>
        </div>

        {/* Active Delivery Section */}
        {activeDelivery ? (
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <Truck className="w-6 h-6 text-teal-600" />
              <h2 className="text-lg font-semibold text-gray-700">Active Delivery</h2>
              <span className="px-2 py-1 bg-teal-100 text-teal-800 text-xs rounded-full">
                In Progress
              </span>
            </div>

            <div className="bg-white rounded-lg border-2 border-teal-500 shadow overflow-hidden">
              <div
                onClick={() => toggleExpand(activeDelivery.id)}
                className="p-4 bg-teal-50 border-b border-teal-200 cursor-pointer hover:bg-teal-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-teal-500 rounded-full animate-pulse"></div>
                    <div>
                      <h3 className="font-bold text-gray-900">
                        Invoice #{activeDelivery.invoice_no}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {activeDelivery.customer_name} • {getDeliveryTypeLabel(activeDelivery.delivery_type)}
                      </p>
                    </div>
                  </div>
                  <button className="text-gray-500 hover:text-gray-700">
                    <svg
                      className={`w-5 h-5 transition-transform ${
                        expandedDelivery === activeDelivery.id ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {expandedDelivery === activeDelivery.id && (
                <div className="p-4 space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Customer Information</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-gray-500">Name:</span> {activeDelivery.customer_name}</p>
                      <p><span className="text-gray-500">Phone:</span> {activeDelivery.customer_phone || "-"}</p>
                      <p><span className="text-gray-500">Address:</span> {activeDelivery.customer_address || "-"}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Delivery Information</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-gray-500">Type:</span> {getDeliveryTypeLabel(activeDelivery.delivery_type)}</p>
                      <p><span className="text-gray-500">Started:</span> {formatTime(activeDelivery.start_time)}</p>
                    </div>
                  </div>

                  {activeDelivery.items && activeDelivery.items.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Items ({activeDelivery.items.length})
                      </h4>
                      <div className="space-y-2">
                        {activeDelivery.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-gray-700">{item.name}</span>
                            <span className="font-medium">Qty: {item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openCompleteModal(activeDelivery);
                    }}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                  >
                    Complete Delivery
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-6 bg-white rounded-lg shadow p-8 text-center">
            <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 text-lg font-medium">No Active Deliveries</p>
            <p className="text-gray-400 text-sm mt-1">
              You don't have any deliveries assigned at the moment
            </p>
          </div>
        )}

        {/* Completed Deliveries Section */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-semibold text-gray-700">
              Completed Deliveries Today
            </h2>
            {completedDeliveries.length > 0 && (
              <span className="ml-auto px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                {completedDeliveries.length} completed
              </span>
            )}
          </div>

          {completedDeliveries.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">No completed deliveries yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Completed deliveries will appear here
              </p>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 text-sm font-semibold">
                  <div className="col-span-2">Invoice</div>
                  <div className="col-span-2">Customer</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Start Time</div>
                  <div className="col-span-2">End Time</div>
                  <div className="col-span-2">Duration</div>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {completedDeliveries.map((del) => (
                  <div key={del.id}>
                    <div
                      className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => toggleExpand(del.id)}
                    >
                      <div className="col-span-2 font-semibold text-gray-900">
                        #{del.invoice_no}
                      </div>
                      <div className="col-span-2 text-gray-600">
                        {del.customer_name}
                      </div>
                      <div className="col-span-2 text-gray-600">
                        {getDeliveryTypeLabel(del.delivery_type)}
                      </div>
                      <div className="col-span-2 text-gray-600">
                        {formatTime(del.start_time)}
                      </div>
                      <div className="col-span-2 text-gray-600">
                        {formatTime(del.end_time)}
                      </div>
                      <div className="col-span-2 flex items-center justify-between">
                        <span className="text-gray-600">
                          {del.duration ? `${del.duration} min` : "-"}
                        </span>
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            expandedDelivery === del.id ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>

                    {expandedDelivery === del.id && (
                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Customer</h4>
                            <p className="text-sm text-gray-600">{del.customer_name}</p>
                            <p className="text-xs text-gray-500">{del.customer_phone}</p>
                            <p className="text-xs text-gray-500">{del.customer_address}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Delivery Info</h4>
                            <p className="text-sm text-gray-600">Type: {getDeliveryTypeLabel(del.delivery_type)}</p>
                            {del.notes && (
                              <p className="text-xs text-gray-500">Notes: {del.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Complete Delivery Modal */}
      {completeModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-bold text-gray-900">Complete Delivery</h3>
              <button
                onClick={closeCompleteModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-semibold text-gray-900">{completeModal.delivery?.invoice_no}</p>
                <p className="text-sm text-gray-600">{completeModal.delivery?.customer_name}</p>
                <p className="text-xs text-gray-500 mt-1">{getDeliveryTypeLabel(completeModal.delivery?.delivery_type)}</p>
              </div>

              {/* Courier Details */}
              {completeModal.delivery?.delivery_type === 'COURIER' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Courier Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      placeholder="e.g., DHL, FedEx, Blue Dart"
                      className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tracking Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={trackingNo}
                      onChange={(e) => setTrackingNo(e.target.value)}
                      placeholder="Enter tracking number"
                      className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </>
              )}

              {/* Location Info - Only for INTERNAL */}
              {completeModal.delivery?.delivery_type === 'INTERNAL' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Location
                  </label>
                  
                  {fetchingLocation ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2"></div>
                      <p className="text-sm text-blue-700">Fetching location...</p>
                    </div>
                  ) : locationData ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-green-800">Location Captured</p>
                          <p className="text-xs text-green-700 mt-1 break-words">{locationData.address}</p>
                          <p className="text-xs text-green-600 mt-1">
                            Lat: {locationData.latitude.toFixed(6)}, Lon: {locationData.longitude.toFixed(6)}
                          </p>
                          <p className="text-xs text-green-600">
                            Accuracy: ±{Math.round(locationData.accuracy)}m
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={fetchCurrentLocation}
                        disabled={fetchingLocation}
                        className="w-full text-xs text-green-700 hover:text-green-800 font-medium disabled:opacity-50"
                      >
                        Refresh Location
                      </button>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-2 mb-3">
                        <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-800">Location Not Captured</p>
                          <p className="text-xs text-yellow-700 mt-1">
                            Click the button below to capture your current location
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={fetchCurrentLocation}
                        disabled={fetchingLocation}
                        className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm font-medium disabled:opacity-50"
                      >
                        📍 Capture Current Location
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Status
                </label>
                <select
                  value={deliveryStatus}
                  onChange={(e) => setDeliveryStatus(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-teal-500"
                >
                  <option value="DELIVERED">Delivered</option>
                  <option value="IN_TRANSIT">In Transit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add delivery notes..."
                  rows={3}
                  className="w-full border border-gray-300 px-3 py-2 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-3 sticky bottom-0 bg-white">
              <button
                onClick={closeCompleteModal}
                disabled={submitting}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteDelivery}
                disabled={submitting || fetchingLocation}
                className="flex-1 py-2 px-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {submitting ? "Completing..." : "Complete Delivery"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}