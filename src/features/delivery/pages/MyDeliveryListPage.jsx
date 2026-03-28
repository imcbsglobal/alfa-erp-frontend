import { useEffect, useState } from "react";
import {
  getConsiderList,
  getDeliveryHistory,
  assignDelivery,
  completeDelivery,
  cancelSession,
} from "../../../services/sales";
import { useAuth } from "../../auth/AuthContext";
import { Truck, Package, CheckCircle, Clock, MapPin, PlayCircle } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmationModal from '../../../components/ConfirmationModal';
import { formatDate, getTodayISOString, formatNumber, formatCoordinate, formatTime, formatAmount } from '../../../utils/formatters';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const toIsoDate = (value) => {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
};

export default function MyDeliveryListPage() {
  const GROUP_ADDR_BY_GROUP_KEY = "packing.groupAddressByGroupId";
  const GROUP_ADDR_BY_INVOICES_KEY = "packing.groupAddressByInvoices";

  const [pendingDeliveries, setPendingDeliveries] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedDelivery, setExpandedDelivery] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [completeModal, setCompleteModal] = useState({ open: false, delivery: null, deliveries: null });
  const [deliveryStatus, setDeliveryStatus] = useState("DELIVERED");
  const [notes, setNotes] = useState("");
  const [courierName, setCourierName] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [locationData, setLocationData] = useState(null);
  const [cancelModal, setCancelModal] = useState({ open: false, delivery: null, deliveries: null });
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);

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

  const handleAttachmentChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachmentFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setAttachmentPreview({ type: "image", url: ev.target.result });
      reader.readAsDataURL(file);
    } else if (file.type === "application/pdf") {
      setAttachmentPreview({ type: "pdf", name: file.name });
    }
  };

  useEffect(() => {
    loadAllDeliveries();

    const handler = () => {
      loadAllDeliveries();
    };
    window.addEventListener('session:cancelled', handler);
    return () => window.removeEventListener('session:cancelled', handler);
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
      const res = await getConsiderList({
        delivery_type: 'INTERNAL',
        status: 'TO_CONSIDER',
        search: user.email,
        page_size: 50
      });
      
      // Filter for deliveries assigned to current user with TO_CONSIDER status
      const pending = (res.data?.results || []).filter(delivery => 
        (delivery.delivery_info?.delivery_user_email || delivery.delivery_info?.email) === user.email &&
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
      const res = await getDeliveryHistory({
        search: user.email,
        status: 'IN_TRANSIT',
        page_size: 50
      });
      
      if (res.data?.results && res.data.results.length > 0) {
        const activeDeliveries = res.data.results.filter(delivery => 
          (delivery.delivery_user_email || delivery.delivery_info?.delivery_user_email || delivery.delivery_info?.email) === user.email && 
          delivery.delivery_status === 'IN_TRANSIT' &&
          !delivery.end_time
        );
        
        setActiveDelivery(activeDeliveries.length > 0 ? activeDeliveries : null);
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
      const res = await getDeliveryHistory({
        search: user.email,
        status: 'DELIVERED',
        page_size: 500
      });
      
      const completed = (res.data?.results || []).filter(delivery => 
        (delivery.delivery_user_email || delivery.delivery_info?.delivery_user_email || delivery.delivery_info?.email) === user.email &&
        delivery.end_time &&
        toIsoDate(delivery.end_time) === today &&
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

      await assignDelivery(payload);
      toast.success("Delivery started successfully!");
      
      await loadAllDeliveries();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || err.response?.data?.message || "Failed to start delivery");
    }
  };

  const handleStartGroupDelivery = async (invoices) => {
    if (!Array.isArray(invoices) || invoices.length === 0) return;

    try {
      const results = await Promise.allSettled(
        invoices.map((invoice) =>
          assignDelivery({
            invoice_no: invoice.invoice_no,
            user_email: user.email,
            delivery_type: 'INTERNAL'
          })
        )
      );

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        toast.success(
          successCount === invoices.length
            ? `Started grouped delivery (${successCount} invoices)`
            : `Started ${successCount} of ${invoices.length} grouped invoices`
        );
      }

      if (failCount > 0) {
        toast.error(`Failed to start ${failCount} invoice${failCount > 1 ? 's' : ''} in group`);
      }

      await loadAllDeliveries();
    } catch (err) {
      console.error(err);
      toast.error("Failed to start grouped delivery");
    }
  };

  const openCompleteModal = (delivery) => {
    setCompleteModal({ open: true, delivery, deliveries: null });
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

  const openCompleteGroupModal = (deliveries) => {
    if (!Array.isArray(deliveries) || deliveries.length === 0) return;
    const representative = deliveries[0];
    setCompleteModal({ open: true, delivery: representative, deliveries });
    setDeliveryStatus("DELIVERED");
    setNotes("");
    setCourierName(representative.courier_name || "");
    setTrackingNo(representative.tracking_no || "");
    setLocationData(null);

    if (representative.delivery_type === 'INTERNAL') {
      fetchCurrentLocation();
    }
  };

  const closeCompleteModal = () => {
    setCompleteModal({ open: false, delivery: null, deliveries: null });
    setDeliveryStatus("DELIVERED");
    setNotes("");
    setCourierName("");
    setTrackingNo("");
    setLocationData(null);
    setAttachmentFile(null);
    setAttachmentPreview(null);
  };

  const handleCompleteDelivery = async () => {
    if (!completeModal.delivery || !user?.email) return;

    const targetDeliveries = Array.isArray(completeModal.deliveries) && completeModal.deliveries.length > 0
      ? completeModal.deliveries
      : [completeModal.delivery];

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
      const buildPayload = (delivery) => {
        const formData = new FormData();
        formData.append('invoice_no', delivery.invoice_no);
        formData.append('user_email', user.email);
        formData.append('delivery_status', deliveryStatus);
        formData.append('notes', notes || "Delivery completed");

        if (delivery.delivery_type === 'COURIER') {
          formData.append('courier_name', courierName.trim());
          if (trackingNo.trim()) {
            formData.append('tracking_no', trackingNo.trim());
          }
        }

        if (delivery.delivery_type === 'INTERNAL' && locationData) {
          formData.append('delivery_latitude', parseFloat(locationData.latitude.toFixed(6)));
          formData.append('delivery_longitude', parseFloat(locationData.longitude.toFixed(6)));
          formData.append('delivery_location_address', locationData.address);
          formData.append('delivery_location_accuracy', Math.round(locationData.accuracy));
        }

        // THIS IS THE KEY FIX - attach the file
        if (attachmentFile) {
          formData.append('attachment', attachmentFile);
        }

        return formData;
      };

      const results = await Promise.allSettled(
        targetDeliveries.map((delivery) => completeDelivery(buildPayload(delivery)))
      );

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        toast.success(
          successCount === targetDeliveries.length
            ? (targetDeliveries.length > 1
              ? `Completed grouped delivery (${successCount} invoices)`
              : "Delivery completed successfully!")
            : `Completed ${successCount} of ${targetDeliveries.length} invoices`
        );
      }

      if (failCount > 0) {
        toast.error(`Failed to complete ${failCount} invoice${failCount > 1 ? 's' : ''}`);
      }

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

    setCancelModal({ open: true, delivery, deliveries: null });
  };

  const handleCancelGroupDelivery = async (deliveries) => {
    if (!Array.isArray(deliveries) || deliveries.length === 0) {
      toast.error("Cannot cancel at this time");
      return;
    }

    const hasDelivered = deliveries.some((d) => d.delivery_status === 'DELIVERED');
    if (hasDelivered) {
      toast.error("Cannot cancel a completed delivery");
      return;
    }

    setCancelModal({ open: true, delivery: deliveries[0], deliveries });
  };

  const confirmCancelDelivery = async () => {
    try {
      setLoading(true);

      const targetDeliveries = Array.isArray(cancelModal.deliveries) && cancelModal.deliveries.length > 0
        ? cancelModal.deliveries
        : [cancelModal.delivery];

      const results = await Promise.allSettled(
        targetDeliveries.map((delivery) =>
          cancelSession({
            invoice_no: delivery.invoice_no,
            user_email: user.email,
            session_type: "DELIVERY",
            cancel_reason: "User cancelled delivery"
          })
        )
      );

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        toast.success(
          successCount === targetDeliveries.length
            ? (targetDeliveries.length > 1
              ? `Cancelled grouped delivery (${successCount} invoices)`
              : "Delivery cancelled. Invoice is now available for anyone to deliver.")
            : `Cancelled ${successCount} of ${targetDeliveries.length} invoices`
        );
      }

      if (failCount > 0) {
        toast.error(`Failed to cancel ${failCount} invoice${failCount > 1 ? 's' : ''}`);
      }
      
      // Notify other pages that a delivery was cancelled
      try {
        window.dispatchEvent(new CustomEvent('session:cancelled', {
          detail: { invoice_no: cancelModal.delivery?.invoice_no, session_type: 'DELIVERY' }
        }));
      } catch (e) {}

      await loadAllDeliveries();
      
    } catch (err) {
      console.error("Cancel error:", err);
      toast.error(err.response?.data?.message || "Failed to cancel delivery");
    } finally {
      setCancelModal({ open: false, delivery: null, deliveries: null });
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

  const getCustomerName = (invoice) => {
    return invoice?.customer?.name || invoice?.customer_name || "Unknown Customer";
  };

  const getCustomerArea = (invoice) => {
    return invoice?.customer?.area || invoice?.temp_name || "-";
  };

  const getCustomerAddress = (invoice) => {
    const customer = invoice?.customer || {};
    const address = [
      customer.address1 || invoice?.delivery_address || invoice?.temp_name,
      customer.address2,
      customer.address3,
      customer.pincode,
    ]
      .filter(Boolean)
      .join(", ");
    return address || "-";
  };

  const getPreferredGroupedInvoiceNo = (groupId, items) => {
    try {
      const invoiceNos = (items || []).map((item) => item?.invoice_no).filter(Boolean);
      if (invoiceNos.length === 0) return null;

      if (groupId) {
        const byGroup = JSON.parse(localStorage.getItem(GROUP_ADDR_BY_GROUP_KEY) || "{}");
        const preferredByGroup = byGroup[groupId];
        if (preferredByGroup && invoiceNos.includes(preferredByGroup)) {
          return preferredByGroup;
        }
      }

      const invoiceSetKey = [...invoiceNos].sort().join(",");
      const byInvoices = JSON.parse(localStorage.getItem(GROUP_ADDR_BY_INVOICES_KEY) || "{}");
      const preferredByInvoices = byInvoices[invoiceSetKey];
      if (preferredByInvoices && invoiceNos.includes(preferredByInvoices)) {
        return preferredByInvoices;
      }

      return invoiceNos[0];
    } catch {
      return (items || []).map((item) => item?.invoice_no).filter(Boolean)[0] || null;
    }
  };

  const pendingRows = (() => {
    const groupMap = {};
    const singles = [];

    pendingDeliveries.forEach((invoice) => {
      const groupId = invoice?.packer_info?.boxing_group_id;
      if (groupId) {
        if (!groupMap[groupId]) groupMap[groupId] = [];
        groupMap[groupId].push(invoice);
      } else {
        singles.push(invoice);
      }
    });

    const groups = Object.entries(groupMap).map(([groupId, items]) => {
      const preferredInvoiceNo = getPreferredGroupedInvoiceNo(groupId, items);
      const preferredInvoice = items.find((item) => item.invoice_no === preferredInvoiceNo) || items[0];

      return {
        type: 'group',
        id: `group-${groupId}`,
        groupId,
        items,
        representative: items[0],
        preferredInvoice,
      };
    });

    const singleRows = singles.map((invoice) => ({
      type: 'single',
      id: `single-${invoice.id}`,
      invoice,
    }));

    return [...groups, ...singleRows];
  })();

  const activeRows = (() => {
    const groupMap = {};
    const singles = [];

    (activeDelivery || []).forEach((delivery) => {
      const groupId = delivery?.boxing_group_id || delivery?.packer_info?.boxing_group_id;
      if (groupId) {
        if (!groupMap[groupId]) groupMap[groupId] = [];
        groupMap[groupId].push(delivery);
      } else {
        singles.push(delivery);
      }
    });

    const groups = Object.entries(groupMap).map(([groupId, items]) => {
      const preferredInvoiceNo = getPreferredGroupedInvoiceNo(groupId, items);
      const preferredInvoice = items.find((item) => item.invoice_no === preferredInvoiceNo) || items[0];

      return {
        type: 'group',
        id: `active-group-${groupId}`,
        groupId,
        items,
        representative: items[0],
        preferredInvoice,
      };
    });

    const singleRows = singles.map((delivery) => ({
      type: 'single',
      id: `active-single-${delivery.id}`,
      delivery,
    }));

    return [...groups, ...singleRows];
  })();

  const completedRows = (() => {
    const groupMap = {};

    completedDeliveries.forEach((delivery) => {
      const groupId = delivery?.boxing_group_id || delivery?.packer_info?.boxing_group_id || `single-${delivery.id}`;
      if (!groupMap[groupId]) groupMap[groupId] = [];
      groupMap[groupId].push(delivery);
    });

    return Object.entries(groupMap)
      .map(([groupId, items]) => {
        const sortedItems = [...items].sort((a, b) => new Date(b.end_time) - new Date(a.end_time));
        const preferredInvoiceNo = getPreferredGroupedInvoiceNo(groupId.startsWith('single-') ? null : groupId, sortedItems);
        const preferredInvoice = sortedItems.find((item) => item.invoice_no === preferredInvoiceNo) || sortedItems[0];

        return {
          id: `completed-group-${groupId}`,
          groupId,
          items: sortedItems,
          representative: sortedItems[0],
          preferredInvoice,
          isGrouped: sortedItems.length > 1,
        };
      })
      .sort((a, b) => new Date(b.representative.end_time) - new Date(a.representative.end_time));
  })();

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

        {/* Delivery Tabs */}
        <div className="mb-3 rounded-lg border border-gray-200 bg-white p-1.5 shadow-sm">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`rounded-md px-3 py-2 text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "pending"
                  ? "bg-teal-600 text-white shadow"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Pending Deliveries ({pendingRows.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("active")}
              className={`rounded-md px-3 py-2 text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "active"
                  ? "bg-blue-600 text-white shadow"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Active Deliveries ({activeRows.length})
            </button>
          </div>
        </div>

        {/* Pending Deliveries Section */}
        {activeTab === "pending" && (
          pendingRows.length > 0 ? (
          <div className="mb-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />
              <h2 className="text-sm sm:text-base font-semibold text-gray-700">Pending Deliveries</h2>
              <span className="px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded-full text-[10px] sm:text-xs font-semibold">
                {pendingRows.length}
              </span>
            </div>

            <div className="space-y-2">
              {pendingRows.map((row) => {
                const isGroup = row.type === 'group';
                const rowId = row.id;
                const representative = isGroup ? row.representative : row.invoice;
                const headerInvoice = isGroup ? (row.preferredInvoice || representative) : representative;

                return (
                  <div key={rowId} className="bg-white rounded-lg border-2 border-teal-200 shadow overflow-hidden">
                    <div
                      onClick={() => toggleExpand(rowId)}
                      className="p-2 sm:p-3 bg-teal-50 border-b border-teal-200 cursor-pointer hover:bg-teal-100 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 flex-shrink-0 bg-teal-500 rounded-full"></div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                              {isGroup
                                ? getCustomerName(headerInvoice)
                                : `#${representative.invoice_no}`}
                            </h3>
                            <p className="text-[10px] sm:text-xs text-gray-600 truncate">
                              {isGroup
                                ? `${row.items.length} invoices grouped • ${getDeliveryTypeLabel(representative.delivery_info?.delivery_type)}`
                                : `${representative.customer?.name} • ${getDeliveryTypeLabel(representative.delivery_info?.delivery_type)}`}
                            </p>
                          </div>
                        </div>
                        <button className="text-gray-500 hover:text-gray-700">
                          <svg
                            className={`w-4 h-4 transition-transform ${
                              expandedDelivery === rowId ? "rotate-180" : ""
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

                    {expandedDelivery === rowId && (
                      <div className="p-2 sm:p-3 space-y-2">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">
                            {isGroup ? 'Grouped Invoices' : 'Customer Information'}
                          </h4>

                          {isGroup ? (
                            <div className="space-y-2 text-sm">
                              <div className="rounded-md border border-teal-100 bg-teal-50 px-2.5 py-2">
                                <p className="text-xs font-semibold text-teal-900">Label Address</p>
                                <p className="text-xs text-teal-800 mt-0.5">Area: {getCustomerArea(headerInvoice)}</p>
                                <p className="text-xs text-teal-800 mt-0.5 break-words">Address: {getCustomerAddress(headerInvoice)}</p>
                              </div>
                              {row.items.map((invoice) => (
                                <div key={invoice.id} className="border border-gray-200 rounded-lg p-2.5 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <p className="font-semibold text-gray-800 text-sm">#{invoice.invoice_no}</p>
                                    <p className="text-xs font-medium text-gray-600">{invoice.customer?.name || '-'}</p>
                                  </div>
                                  <div className="border-t border-gray-100 pt-1.5">
                                    <p className="text-xs font-medium text-gray-600 mb-0.5">Invoice Details</p>
                                    <p className="text-xs text-gray-500">Items: {invoice.items?.length || 0}</p>
                                    <p className="text-xs text-gray-500">Total Amount: {formatAmount(invoice.Total)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-1 text-sm">
                              <p><span className="text-gray-500">Name:</span> {representative.customer?.name}</p>
                              <p><span className="text-gray-500">Phone:</span> {representative.customer?.phone1 || "-"}</p>
                              <p><span className="text-gray-500">Address:</span> {representative.customer?.address1 || representative.temp_name || "-"}</p>
                              <p><span className="text-gray-500">Area:</span> {representative.customer?.area || representative.temp_name || "-"}</p>
                            </div>
                          )}
                        </div>

                        {!isGroup && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Invoice Details</h4>
                            <div className="space-y-1 text-sm">
                              <p><span className="text-gray-500">Items:</span> {representative.items?.length || 0}</p>
                              <p><span className="text-gray-500">Total Amount:</span> {formatAmount(representative.Total)}</p>
                            </div>
                          </div>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isGroup) {
                              handleStartGroupDelivery(row.items);
                            } else {
                              handleStartDelivery(representative);
                            }
                          }}
                          className="w-full py-2 sm:py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm rounded-lg font-semibold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5"
                        >
                          <PlayCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          {isGroup ? `Start Group Delivery (${row.items.length})` : 'Start Delivery'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          ) : (
            <div className="mb-3 bg-white rounded-lg shadow p-8 text-center border border-gray-200">
              <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm sm:text-base font-semibold text-gray-600">No pending deliveries</p>
            </div>
          )
        )}

        {/* Active Delivery Section */}
        {activeTab === "active" && (
          activeRows.length > 0 ? (
          <div className="mb-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <h2 className="text-sm sm:text-base font-semibold text-gray-700">Active Deliveries</h2>
              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] sm:text-xs font-semibold">
                {activeRows.length}
              </span>
            </div>

            <div className="space-y-2">
              {activeRows.map((row) => {
                const isGroup = row.type === 'group';
                const rowId = row.id;
                const representative = isGroup ? row.representative : row.delivery;
                const headerInvoice = isGroup ? (row.preferredInvoice || representative) : representative;

                return (
                <div key={rowId} className="bg-white rounded-lg border-2 border-blue-400 shadow overflow-hidden">
                  <div
                    onClick={() => toggleExpand(rowId)}
                    className="p-2 sm:p-3 bg-blue-50 border-b border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 flex-shrink-0 bg-blue-500 rounded-full animate-pulse"></div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                            {isGroup ? getCustomerName(headerInvoice) : `#${representative.invoice_no}`}
                          </h3>
                          <p className="text-[10px] sm:text-xs text-gray-600 truncate">
                            {isGroup
                              ? `${row.items.length} invoices grouped • ${getDeliveryTypeLabel(representative.delivery_type)}`
                              : `${representative.customer_name} • ${getDeliveryTypeLabel(representative.delivery_type)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold border border-blue-200">
                          IN TRANSIT
                        </span>
                        <svg
                          className={`w-4 h-4 transition-transform text-gray-500 ${
                            expandedDelivery === rowId ? "rotate-180" : ""
                          }`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {expandedDelivery === rowId && (
                    <div className="p-2 sm:p-3 space-y-2">
                      {isGroup ? (
                        <>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Grouped Invoices</h4>
                            <div className="space-y-2 text-sm">
                              <div className="rounded-md border border-teal-100 bg-teal-50 px-2.5 py-2">
                                <p className="text-xs font-semibold text-teal-900">Label Address</p>
                                <p className="text-xs text-teal-800 mt-0.5">Area: {getCustomerArea(headerInvoice)}</p>
                                <p className="text-xs text-teal-800 mt-0.5 break-words">Address: {getCustomerAddress(headerInvoice)}</p>
                              </div>
                              {row.items.map((delivery) => (
                                <div key={delivery.id} className="border border-gray-200 rounded-lg p-2.5 space-y-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="font-semibold text-sm text-gray-800">#{delivery.invoice_no}</p>
                                      <p className="text-xs font-medium text-gray-600">{delivery.customer_name || '-'}</p>
                                    </div>
                                  </div>
                                  <div className="border-t border-gray-100 pt-1.5">
                                    <p className="text-xs font-medium text-gray-600 mb-0.5">Invoice Details</p>
                                    <p className="text-xs text-gray-500">Items: {delivery.items?.length || 0}</p>
                                    <p className="text-xs text-gray-500">Total Amount: {formatAmount(delivery.Total)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCancelGroupDelivery(row.items); }}
                              disabled={loading}
                              className="flex-1 py-2 sm:py-2.5 bg-red-100 text-red-700 text-xs sm:text-sm hover:bg-red-200 rounded-lg font-semibold transition-all shadow-md border border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Cancel Group Delivery ({row.items.length})
                            </button>

                            <button
                              onClick={(e) => { e.stopPropagation(); openCompleteGroupModal(row.items); }}
                              className="flex-1 py-2 sm:py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                            >
                              Complete Group Delivery ({row.items.length})
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Customer Information</h4>
                            <div className="space-y-1 text-sm">
                              <p><span className="text-gray-500">Name:</span> {representative.customer_name}</p>
                              <p><span className="text-gray-500">Phone:</span> {representative.customer_phone || "-"}</p>
                              <p><span className="text-gray-500">Address:</span> {representative.customer_address || representative.temp_name || "-"}</p>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-3">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Delivery Information</h4>
                            <div className="space-y-1 text-sm">
                              <p><span className="text-gray-500">Type:</span> {getDeliveryTypeLabel(representative.delivery_type)}</p>
                              <p><span className="text-gray-500">Started:</span> {formatTime(representative.start_time)}</p>
                            </div>
                          </div>

                          {representative.items && representative.items.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                Items ({representative.items.length})
                              </h4>
                              <div className="space-y-2">
                                {representative.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-sm">
                                    <span className="text-gray-700">{item.name}</span>
                                    <span className="font-medium">Qty: {formatNumber(item.quantity)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {!isGroup && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCancelDelivery(representative); }}
                            disabled={loading}
                            className="w-full py-2 sm:py-2.5 bg-red-100 text-red-700 text-xs sm:text-sm hover:bg-red-200 rounded-lg font-semibold transition-all shadow-md border border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel Delivery
                          </button>

                          <button
                            onClick={(e) => { e.stopPropagation(); openCompleteModal(representative); }}
                            className="w-full py-2 sm:py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                          >
                            Complete Delivery
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );})}
            </div>
          </div>
          ) : (
            <div className="mb-3 bg-white rounded-lg shadow p-8 text-center border border-gray-200">
              <Truck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm sm:text-base font-semibold text-gray-600">No active deliveries</p>
            </div>
          )
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
            <div className="divide-y divide-gray-200">
              {completedRows.map((group) => {
                const rowId = group.id;
                const headerInvoice = group.preferredInvoice || group.representative;
                const uniqueCustomers = [...new Set(group.items.map((item) => item.customer_name).filter(Boolean))];

                return (
                  <div key={rowId} className="mx-2 my-2 rounded-xl overflow-hidden border border-teal-100">
                    <div
                      onClick={() => toggleExpand(rowId)}
                      className="bg-teal-50 px-3 py-2.5 flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-md bg-teal-500 flex items-center justify-center flex-shrink-0">
                          <Truck className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-teal-900 leading-tight truncate">
                            {group.isGrouped ? (uniqueCustomers.join(" · ") || getCustomerName(headerInvoice)) : `#${headerInvoice.invoice_no}`}
                          </p>
                          <p className="text-[10px] text-teal-700">
                            {group.isGrouped
                              ? `Grouped · ${group.items.length} invoices · ${formatDate(group.representative.end_time)}`
                              : `${headerInvoice.customer_name || "-"} · ${getDeliveryTypeLabel(headerInvoice.delivery_type)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="px-2.5 py-0.5 bg-teal-700 text-white text-[10px] font-semibold rounded-full whitespace-nowrap">
                          DELIVERED
                        </span>
                        <svg
                          className={`w-4 h-4 transition-transform text-teal-700 ${
                            expandedDelivery === rowId ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {expandedDelivery === rowId && (
                      <div className="bg-white border-t border-teal-100">
                        {group.items.map((del) => (
                          <div key={del.id} className="px-3 py-2.5 border-b border-gray-100 last:border-b-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-xs text-gray-900">#{del.invoice_no}</p>
                                <p className="text-[10px] text-gray-600 truncate">{del.customer_name || "-"}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">
                                  {getDeliveryTypeLabel(del.delivery_type)} · {formatDate(del.end_time)}
                                </p>
                                <p className="text-[10px] text-gray-500 mt-0.5">
                                  {formatTime(del.start_time)} → {formatTime(del.end_time)}
                                  {` (${del.duration ? `${del.duration} min` : "-"})`}
                                </p>
                                {del.notes && <p className="text-[10px] text-gray-500 mt-0.5">Notes: {del.notes}</p>}
                              </div>
                              <span className="text-[10px] font-medium px-2 py-0.5 bg-teal-100 text-teal-800 rounded whitespace-nowrap">
                                DELIVERED
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-teal-600 border-t-transparent mb-2"></div>
                      <p className="text-sm text-teal-700">Fetching location...</p>
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

                <div className="mt-2">
                  <label
                    htmlFor="delivery-attachment"
                    className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-dashed border-gray-300 rounded-lg hover:border-teal-400 hover:bg-teal-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="text-xs text-gray-500">
                      {attachmentFile ? attachmentFile.name : "Attach photo or PDF (optional)"}
                    </span>
                  </label>
                  <input
                    id="delivery-attachment"
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleAttachmentChange}
                  />
                </div>

                {attachmentPreview && (
                  <div className="mt-2 relative">
                    {attachmentPreview.type === "image" ? (
                      <img
                        src={attachmentPreview.url}
                        alt="attachment preview"
                        className="w-full max-h-40 object-contain rounded-lg border border-gray-200"
                      />
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs text-red-700 truncate">{attachmentPreview.name}</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => { setAttachmentFile(null); setAttachmentPreview(null); }}
                      className="absolute top-1 right-1 w-5 h-5 bg-gray-800 bg-opacity-60 text-white rounded-full flex items-center justify-center text-xs hover:bg-opacity-80"
                    >
                      ×
                    </button>
                  </div>
                )}
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
        onClose={() => setCancelModal({ open: false, delivery: null, deliveries: null })}
        onConfirm={confirmCancelDelivery}
        title="Cancel Delivery"
        message={Array.isArray(cancelModal.deliveries) && cancelModal.deliveries.length > 1
          ? `Are you sure you want to cancel grouped delivery for ${cancelModal.deliveries.length} invoices?\n\nAll invoices in this group will be returned to the delivery list and can be delivered by you or any other user.`
          : `Are you sure you want to cancel delivery for ${cancelModal.delivery?.invoice_no}?\n\nThe invoice will be returned to the delivery list and can be delivered by you or any other user.`}
        confirmText="Yes, Cancel Delivery"
        cancelText="No, Keep Delivery"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
      />
    </div>
  );
}