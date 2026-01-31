import { useEffect, useState } from "react";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";
import { Truck, Package, CheckCircle, Clock, MapPin, PlayCircle } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmationModal from '../../../components/ConfirmationModal';
import { formatDate, getTodayISOString, formatNumber, formatCoordinate, formatTime, formatAmount } from '../../../utils/formatters';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function MyDeliveryListPage() {
  const [pendingDeliveries, setPendingDeliveries] = useState([]);
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
  const [cancelModal, setCancelModal] = useState({ open: false, delivery: null });

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
    loadAllDeliveries();
  }, []);

  // SSE live updates for delivery assignments and status changes
  useEffect(() => {
    let es = null;
    let reconnectTimeout = null;
    let reconnectAttempts = 0;
    const maxReconnectDelay = 30000;
    const baseDelay = 1000;

    const connect = () => {
      if (es) es.close();

      es = new EventSource(`${API_BASE_URL}/sales/sse/invoices/`);

      es.onmessage = (event) => {
        reconnectAttempts = 0;
        try {
          const data = JSON.parse(event.data);

          if (!data.invoice_no) return;

          // Reload deliveries when:
          // 1. Invoice is PACKED (new delivery assignment possible)
          // 2. Delivery is assigned to current user
          // 3. Delivery status changes
          if (data.status === 'PACKED' || 
              data.delivery_status || 
              data.delivery_assigned_to === user?.email) {
            console.log('🚚 My Delivery update received:', data.invoice_no);
            loadAllDeliveries();
          }
        } catch (e) {
          console.error('My Delivery SSE parse error:', e);
        }
      };

      es.onerror = () => {
        es.close();
        reconnectAttempts++;
        const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts), maxReconnectDelay);
        reconnectTimeout = setTimeout(() => connect(), delay);
      };
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (es) es.close();
    };
  }, [user?.email]); // Include user email to prevent stale closure

  const loadAllDeliveries = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPendingDeliveries(),
        loadActiveDelivery(),
        loadTodayCompletedDeliveries()
      ]);
    } catch (err) {
      console.error("Failed to load deliveries", err);
    } finally {
      setLoading(false);
    }
  };

  // Load pending deliveries assigned to this user
  const loadPendingDeliveries = async () => {
    try {
      const res = await api.get("/sales/delivery/consider-list/", {
        params: {
          delivery_type: 'INTERNAL',
          status: 'TO_CONSIDER',
          search: user.email,
          page_size: 50
        }
      });
      
      // Filter for deliveries assigned to current user with TO_CONSIDER status
      const pending = (res.data?.results || []).filter(delivery => 
        delivery.delivery_info?.email === user.email &&
        delivery.delivery_info?.delivery_status === 'TO_CONSIDER'
      );
      
      setPendingDeliveries(pending);
    } catch (err) {
      console.error("Failed to load pending deliveries", err);
      setPendingDeliveries([]);
    }
  };

  const loadActiveDelivery = async () => {
    try {
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
          setExpandedDelivery(activeDeliveries[0].id);
        } else {
          setActiveDelivery(null);
        }
      } else {
        setActiveDelivery(null);
      }
    } catch (err) {
      console.error("Failed to load active delivery", err);
      setActiveDelivery(null);
    }
  };

  const loadTodayCompletedDeliveries = async () => {
    try {
      const today = getTodayISOString();
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

  // Start a pending delivery
  const handleStartDelivery = async (invoice) => {
    try {
      const payload = {
        invoice_no: invoice.invoice_no,
        user_email: user.email,
        delivery_type: 'INTERNAL'
      };

      await api.post("/sales/delivery/assign/", payload);
      toast.success("Delivery started successfully!");
      
      await loadAllDeliveries();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || err.response?.data?.message || "Failed to start delivery");
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
        // Round coordinates to 6 decimal places to fit backend validation
        // Backend expects max 10 digits for latitude (e.g., -90.123456)
        // and max 11 digits for longitude (e.g., -180.123456)
        payload.delivery_latitude = parseFloat(locationData.latitude.toFixed(6));
        payload.delivery_longitude = parseFloat(locationData.longitude.toFixed(6));
        payload.delivery_location_address = locationData.address;
        payload.delivery_location_accuracy = Math.round(locationData.accuracy);
      }

      await api.post("/sales/delivery/complete/", payload);

      toast.success("Delivery completed successfully!");
      closeCompleteModal();
      
      await loadAllDeliveries();
    } catch (err) {
      console.error('Complete delivery error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Full error response data:', JSON.stringify(err.response?.data, null, 2));
      
      // Extract detailed error message
      const errorData = err.response?.data;
      let errorMessage = "Failed to complete delivery";
      
      if (errorData) {
        // Check for errors object with validation details
        if (errorData.errors && typeof errorData.errors === 'object') {
          console.error('Validation errors:', errorData.errors);
          // Extract first validation error
          const firstErrorKey = Object.keys(errorData.errors)[0];
          const firstErrorValue = errorData.errors[firstErrorKey];
          if (Array.isArray(firstErrorValue)) {
            errorMessage = `${firstErrorKey}: ${firstErrorValue[0]}`;
          } else {
            errorMessage = `${firstErrorKey}: ${firstErrorValue}`;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (typeof errorData === 'object') {
          // If it's a validation error object, extract first error
          const firstError = Object.values(errorData)[0];
          if (Array.isArray(firstError)) {
            errorMessage = firstError[0];
          } else if (typeof firstError === 'string') {
            errorMessage = firstError;
          }
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelDelivery = async (delivery) => {
    if (!delivery || !user?.email) {
      toast.error("Cannot cancel at this time");
      return;
    }

    if (delivery.delivery_status === 'DELIVERED') {
      toast.error("Cannot cancel a completed delivery");
      return;
    }

    setCancelModal({ open: true, delivery });
  };

  const confirmCancelDelivery = async () => {
    try {
      setLoading(true);
      
      await api.post("/sales/cancel-session/", {
        invoice_no: cancelModal.delivery.invoice_no,
        user_email: user.email,
        session_type: "DELIVERY",
        cancel_reason: "User cancelled delivery"
      });

      toast.success("Delivery cancelled. Invoice is now available for anyone to deliver.");
      
      await loadAllDeliveries();
      
    } catch (err) {
      console.error("Cancel error:", err);
      toast.error(err.response?.data?.message || "Failed to cancel delivery");
    } finally {
      setLoading(false);
    }
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

  if (loading && !activeDelivery && completedDeliveries.length === 0 && pendingDeliveries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-teal-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600 text-base sm:text-lg">Loading deliveries...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 py-2 sm:py-3">
        {/* Header */}
        <div className="mb-2">
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">My Delivery Tasks</h1>
        </div>

        {/* Pending Deliveries Section */}
        {pendingDeliveries.length > 0 && (
          <div className="mb-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <h2 className="text-sm sm:text-base font-semibold text-gray-700">Pending Deliveries</h2>
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] sm:text-xs font-semibold">
                {pendingDeliveries.length}
              </span>
            </div>

            <div className="space-y-2">
              {pendingDeliveries.map((invoice) => (
                <div key={invoice.id} className="bg-white rounded-lg border-2 border-blue-200 shadow overflow-hidden">
                  <div
                    onClick={() => toggleExpand(invoice.id)}
                    className="p-2 sm:p-3 bg-blue-50 border-b border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 flex-shrink-0 bg-blue-500 rounded-full"></div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                            #{invoice.invoice_no}
                          </h3>
                          <p className="text-[10px] sm:text-xs text-gray-600 truncate">
                            {invoice.customer?.name} • {getDeliveryTypeLabel(invoice.delivery_type)}
                          </p>
                        </div>
                      </div>
                      <button className="text-gray-500 hover:text-gray-700">
                        <svg
                          className={`w-4 h-4 transition-transform ${
                            expandedDelivery === invoice.id ? "rotate-180" : ""
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

                  {expandedDelivery === invoice.id && (
                    <div className="p-2 sm:p-3 space-y-2">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Customer Information</h4>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-gray-500">Name:</span> {invoice.customer?.name}</p>
                          <p><span className="text-gray-500">Phone:</span> {invoice.customer?.phone1 || "-"}</p>
                          <p><span className="text-gray-500">Address:</span> {invoice.customer?.address1 || invoice.temp_name || "-"}</p>
                          <p><span className="text-gray-500">Area:</span> {invoice.customer?.area || invoice.temp_name || "-"}</p>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Invoice Details</h4>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-gray-500">Items:</span> {invoice.items?.length || 0}</p>
                          <p><span className="text-gray-500">Total Amount:</span> {formatAmount(invoice.Total)}</p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartDelivery(invoice);
                        }}
                        className="w-full py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5"
                      >
                        <PlayCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Start Delivery
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Delivery Section */}
        {activeDelivery && (
          <div className="mb-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
              <h2 className="text-sm sm:text-base font-semibold text-gray-700">Active Delivery</h2>
            </div>

            <div className="bg-white rounded-lg border-2 border-teal-500 shadow overflow-hidden">
              <div
                onClick={() => toggleExpand(activeDelivery.id)}
                className="p-2 sm:p-3 bg-teal-50 border-b border-teal-200 cursor-pointer hover:bg-teal-100 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 flex-shrink-0 bg-teal-500 rounded-full animate-pulse"></div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                        #{activeDelivery.invoice_no}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-gray-600 truncate">
                        {activeDelivery.customer_name} • {getDeliveryTypeLabel(activeDelivery.delivery_type)}
                      </p>
                    </div>
                  </div>
                  <button className="text-gray-500 hover:text-gray-700">
                    <svg
                      className={`w-4 h-4 transition-transform ${
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
                <div className="p-2 sm:p-3 space-y-2">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Customer Information</h4>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-gray-500">Name:</span> {activeDelivery.customer_name}</p>
                      <p><span className="text-gray-500">Phone:</span> {activeDelivery.customer_phone || "-"}</p>
                      <p><span className="text-gray-500">Address:</span> {activeDelivery.customer_address || activeDelivery.temp_name || "-"}</p>
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
                            <span className="font-medium">Qty: {formatNumber(item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelDelivery(activeDelivery);
                    }}
                    disabled={loading}
                    className="w-full py-2 sm:py-2.5 bg-red-100 text-red-700 text-xs sm:text-sm hover:bg-red-200 rounded-lg font-semibold transition-all shadow-md border border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel Delivery
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openCompleteModal(activeDelivery);
                    }}
                    className="w-full py-2 sm:py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                  >
                    Complete Delivery
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completed Deliveries Section */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-3 sm:px-6 py-3 sm:py-4 bg-white border-b border-gray-200 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-700">
              Completed Deliveries Today
            </h2>
          </div>

          {completedDeliveries.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">No completed deliveries yet</p>
            </div>
          ) : (
            <>
              {/* ===== DESKTOP TABLE ===== */}
              <div className="hidden md:block">
                <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                  <div className="grid grid-cols-12 gap-4 px-6 py-3 text-sm font-semibold">
                    <div className="col-span-2">Invoice</div>
                    <div className="col-span-2">Date</div>
                    <div className="col-span-2">Customer</div>
                    <div className="col-span-2">Type</div>
                    <div className="col-span-2">Start</div>
                    <div className="col-span-2">End</div>
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  {completedDeliveries.map((del) => (
                    <div key={del.id}>
                      {/* Main Row */}
                      <div
                        onClick={() => toggleExpand(del.id)}
                        className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="col-span-2 font-semibold">#{del.invoice_no}</div>
                        <div className="col-span-2">{formatDate(del.start_time)}</div>
                        <div className="col-span-2">{del.customer_name}</div>
                        <div className="col-span-2">{getDeliveryTypeLabel(del.delivery_type)}</div>
                        <div className="col-span-2">{formatTime(del.start_time)}</div>
                        <div className="col-span-2 flex justify-between">
                          <span>{formatTime(del.end_time)}</span>
                          <svg
                            className={`w-4 h-4 transition-transform ${
                              expandedDelivery === del.id ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* Expanded Desktop */}
                      {expandedDelivery === del.id && (
                        <div className="px-6 py-4 bg-gray-50 border-t">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="font-semibold">Customer</p>
                              <p>{del.customer_name}</p>
                              <p>{del.customer_phone || "-"}</p>
                              <p>{del.customer_address || del.temp_name || "-"}</p>
                            </div>
                            <div>
                              <p className="font-semibold">Delivery Info</p>
                              <p>Type: {getDeliveryTypeLabel(del.delivery_type)}</p>
                              <p>Duration: {del.duration ? `${del.duration} min` : "-"}</p>
                              {del.notes && <p>Notes: {del.notes}</p>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ===== MOBILE CARD VIEW ===== */}
              <div className="block md:hidden p-4 space-y-4">
                {completedDeliveries.map((del) => (
                  <div key={del.id} className="border rounded-lg bg-white shadow-sm">
                    {/* Header */}
                    <div
                      onClick={() => toggleExpand(del.id)}
                      className="p-4 flex justify-between items-center cursor-pointer"
                    >
                      <p className="font-bold">#{del.invoice_no}</p>
                      <svg
                        className={`w-4 h-4 transition-transform ${
                          expandedDelivery === del.id ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    {/* Basic Info */}
                    <div className="px-4 pb-3 text-sm space-y-1">
                      <p><b>Date:</b> {formatDate(del.start_time)}</p>
                      <p><b>Customer:</b> {del.customer_name}</p>
                      <p><b>Type:</b> {getDeliveryTypeLabel(del.delivery_type)}</p>
                      <p><b>Start:</b> {formatTime(del.start_time)}</p>
                      <p><b>End:</b> {formatTime(del.end_time)}</p>
                      <p><b>Duration:</b> {del.duration ? `${del.duration} min` : "-"}</p>
                    </div>

                    {/* Expanded Mobile */}
                    {expandedDelivery === del.id && (
                      <div className="border-t bg-gray-50 p-4 text-sm">
                        <p className="font-semibold">Customer</p>
                        <p>{del.customer_name}</p>
                        <p>{del.customer_phone || "-"}</p>
                        <p>{del.customer_address || del.temp_name || "-"}</p>

                        <p className="font-semibold mt-2">Delivery Info</p>
                        <p>Type: {getDeliveryTypeLabel(del.delivery_type)}</p>
                        {del.notes && <p>Notes: {del.notes}</p>}
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
                        <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-green-800">Location Captured</p>
                          <p className="text-xs text-green-700 mt-1 break-words">{locationData.address}</p>
                          <p className="text-xs text-green-600 mt-1">
                            Lat: {formatCoordinate(locationData.latitude)}, Lon: {formatCoordinate(locationData.longitude)}
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
                        className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <MapPin className="w-4 h-4" />
                        Capture Current Location
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
      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={cancelModal.open}
        onClose={() => setCancelModal({ open: false, delivery: null })}
        onConfirm={confirmCancelDelivery}
        title="Cancel Delivery"
        message={`Are you sure you want to cancel delivery for ${cancelModal.delivery?.invoice_no}?\n\nThe invoice will be returned to the delivery list and can be delivered by you or any other user.`}
        confirmText="Yes, Cancel Delivery"
        cancelText="No, Keep Delivery"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
      />
    </div>
  );
}