import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PickInvoiceModal from "../components/PickInvoiceModal";
import api from "../../../services/api";
import { getActivePickingTask } from "../../../services/sales";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import ActiveUsersDock from '../../../components/ActiveUsersDock';
import { formatDateDDMMYYYY, formatTime, formatDuration, formatNumber, formatDate, formatDateTime } from '../../../utils/formatters';
import { X } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export default function InvoiceListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePicking, setActivePicking] = useState(null);
  const [showPickModal, setShowPickModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showOngoingModal, setShowOngoingModal] = useState(false);
  const [ongoingTasks, setOngoingTasks] = useState([]);
  const [loadingOngoing, setLoadingOngoing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [invoiceToComplete, setInvoiceToComplete] = useState(null);
  const [isManualCompletionEnabled, setIsManualCompletionEnabled] = useState(false);
  const [showConfirmComplete, setShowConfirmComplete] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');

  // Fetch developer settings from API
  useEffect(() => {
    const fetchDeveloperSettings = async () => {
      try {
        const response = await api.get('/common/developer-settings/');
        const enabled = response.data.data.enable_manual_picking_completion;
        console.log('🔧 Manual Completion Check (from API):', {
          enabled,
          currentPath: location.pathname,
          userRole: user?.role,
          userEmail: user?.email
        });
        setIsManualCompletionEnabled(enabled);
      } catch (error) {
        console.error('❌ Failed to fetch developer settings:', error);
      }
    };

    fetchDeveloperSettings();
    
    // Poll for changes every 10 seconds
    const interval = setInterval(fetchDeveloperSettings, 10000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadInvoices();
    
    // Update state when localStorage changes (e.g., when developer option is toggled)
    const handleStorageChange = () => {
      const newValue = localStorage.getItem('enableManualPickingCompletion') === 'true';
      if (newValue !== isManualCompletionEnabled) {
        setIsManualCompletionEnabled(newValue);
        loadInvoices(); // Reload to fetch appropriate invoices
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isManualCompletionEnabled]);

  // SSE Live Updates
  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE_URL}/sales/sse/invoices/`);

    eventSource.onmessage = (event) => {
      try {
        const invoice = JSON.parse(event.data);
        
        // Only keep INVOICED status invoices in main list
        // PICKING invoices appear in Ongoing Work modal instead
        if (invoice.status === "INVOICED") {
          setInvoices(prev => {
            const exists = prev.find(inv => inv.id === invoice.id);
            if (exists) {
              return prev.map(inv => inv.id === invoice.id ? invoice : inv);
            }
            return [invoice, ...prev];
          });
        } else {
          // Remove invoice if status changed from INVOICED
          setInvoices(prev => prev.filter(inv => inv.id !== invoice.id));
        }
      } catch (e) {
        console.error("Invalid SSE invoice:", e);
      }
    };

    eventSource.onerror = () => {
      // SSE connection closed - normal behavior during server restarts or timeouts
      eventSource.close();
    };

    return () => eventSource.close();
  }, []); // Empty dependency - SSE monitors global invoiced status updates

  const loadInvoices = async () => {
    setLoading(true);
    try {
      // Fetch INVOICED status bills only
      // When manual completion is enabled, PICKING invoices will appear in Ongoing Work modal instead
      const res = await api.get("/sales/invoices/", {
        params: { status: "INVOICED", page_size: 100 },
      });
      const allInvoices = res.data.results || [];

      setInvoices(allInvoices);
      console.log('📊 Total invoices loaded:', allInvoices.length);
    } catch (err) {
      console.error("❌ Failed to load invoices:", err);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const loadOngoingTasks = async () => {
    setLoadingOngoing(true);
    try {
      // Fetch from picking history API which has start_time and duration fields
      // Use status=PREPARING to get ongoing picking sessions
      const res = await api.get("/sales/picking/history/?status=PREPARING");
      const responseData = res.data?.results || [];
      
      console.log("Ongoing tasks data:", responseData);
      setOngoingTasks(responseData);
      setLoadingOngoing(false);
    } catch (err) {
      console.error("Failed to load ongoing tasks:", err);
      toast.error("Failed to load ongoing tasks");
      setOngoingTasks([]);
      setLoadingOngoing(false);
    }
  };

  const handleShowOngoingWork = () => {
    setShowOngoingModal(true);
    loadOngoingTasks();
  };

  const handleRefresh = async () => {
    await loadInvoices();
    toast.success("Invoices refreshed");
  };

  const handleCompleteClick = (invoice) => {
    console.log("Complete button clicked", {
      invoice: invoice.invoice_no,
      picker_email: invoice.picker_info?.email,
      picker_name: invoice.picker_info?.name
    });
    
    // Check if the invoice has a picking session
    if (!invoice.picker_info) {
      toast.error("No picker information found for this invoice", { duration: 4000 });
      return;
    }
    
    // Allow any logged-in user to click, but they must scan the picker's email
    setInvoiceToComplete(invoice);
    setShowCompleteModal(true);
  };

  const handleCompletePicking = async (employeeEmail) => {
    if (!invoiceToComplete) return;

    // Verify the email matches the user who picked it (case-insensitive comparison)
    // Handle both data structures: picker_info (from invoice API) or direct fields (from picking history API)
    const pickerEmail = (invoiceToComplete.picker_info?.email || invoiceToComplete.picker_email)?.toLowerCase().trim();
    const pickerName = invoiceToComplete.picker_info?.name || invoiceToComplete.picker_name;
    const enteredEmail = employeeEmail?.toLowerCase().trim();
    
    if (!pickerEmail) {
      toast.error("No picker information found for this invoice", { duration: 4000 });
      return;
    }
    
    if (pickerEmail !== enteredEmail) {
      toast.error(`Email does not match! This invoice was picked by ${pickerName}.`, { duration: 6000 });
      return;
    }

    // Email verified - now show confirmation
    setVerifiedEmail(employeeEmail.trim());
    setShowCompleteModal(false);
    setShowConfirmComplete(true);
  };

  const handleConfirmCompleteYes = async () => {
    try {
      await api.post("/sales/picking/complete/", {
        invoice_no: invoiceToComplete.invoice_no,
        user_email: verifiedEmail,
        notes: "Manual completion from Ongoing Work modal",
      });

      toast.success(`Picking completed for ${invoiceToComplete.invoice_no}`);
      setShowConfirmComplete(false);
      setInvoiceToComplete(null);
      setVerifiedEmail('');
      
      // Reload ongoing tasks to update the modal
      await loadOngoingTasks();
      // Also reload main list in case any new invoices arrived
      await loadInvoices();
    } catch (err) {
      console.error("Error completing picking:", err);
      const errorMsg = err.response?.data?.message || err.response?.data?.errors?.invoice_no?.[0] || err.response?.data?.errors?.user_email?.[0] || "Failed to complete picking";
      toast.error(errorMsg, { duration: 4000 });
    }
  };

  const handleConfirmCompleteNo = () => {
    setShowConfirmComplete(false);
    setInvoiceToComplete(null);
    setVerifiedEmail('');
    toast.info('Completion cancelled');
  };

  const handlePickClick = async (invoice) => {
    await loadInvoices();

    if (invoice.status !== "INVOICED") {
      toast.error("This invoice is no longer available for picking");
      return;
    }

    setSelectedInvoice(invoice);
    setShowPickModal(true);
  };

  const handlePickInvoice = async (employeeEmail) => {
    try {
      // First check if there's already an active picking session
      console.log("Checking for active picking session...");
      const activeRes = await api.get("/sales/picking/active/");
      console.log("Active picking response:", activeRes.data);
      
      if (activeRes.data?.data) {
        const activeInvoice = activeRes.data.data.invoice;
        console.log("Active invoice found:", activeInvoice);
        const customerName = activeInvoice?.customer?.name ? ` for ${activeInvoice.customer.name}` : '';
        toast.error(`You already have an active picking session for Invoice #${activeInvoice?.invoice_no}${customerName}`, { duration: 7000 });
        setShowPickModal(false);
        return;
      }

      // No active session, proceed with starting picking
      await api.post("/sales/picking/start/", {
        invoice_no: selectedInvoice.invoice_no,
        user_email: employeeEmail,
        notes: "Picking started",
      });

      setShowPickModal(false);
      setSelectedInvoice(null);
      await loadInvoices();

      toast.success(`Picking started for ${selectedInvoice.invoice_no}`);
    } catch (err) {
      console.error("Error in handlePickInvoice:", err);
      console.log("Error response:", err.response?.data);
      console.log("Error status:", err.response?.status);
      
      // Check if it's a 409 Conflict error (active session exists)
      if (err.response?.status === 409) {
        console.log("409 Conflict - Active session detected, fetching details...");
        try {
          const activeRes = await api.get("/sales/picking/active/");
          console.log("Fetched active session:", activeRes.data);
          
          // Try different possible response structures
          const activeInvoice = activeRes.data?.data?.invoice || 
                               activeRes.data?.invoice || 
                               activeRes.data?.data;
          
          if (activeInvoice && (activeInvoice.id || activeInvoice.invoice_no)) {
            console.log("Active invoice details:", activeInvoice);
            const customerName = activeInvoice?.customer?.name ? ` for ${activeInvoice.customer.name}` : '';
            toast.error(`You already have an active picking session for Invoice #${activeInvoice?.invoice_no}${customerName}`, { duration: 7000 });
            setShowPickModal(false);
            return;
          }
          
          // If we can't get invoice details, try to extract from error response
          const errorInvoiceNo = err.response?.data?.invoice_no || 
                                err.response?.data?.data?.invoice_no ||
                                err.response?.data?.details?.invoice_no;
          
          if (errorInvoiceNo) {
            console.log("Using invoice number from error:", errorInvoiceNo);
            toast.error(`You already have an active picking session for Invoice #${errorInvoiceNo}`, { duration: 7000 });
            setShowPickModal(false);
            return;
          }
          
          // Last resort - show generic warning
          console.log("Could not get invoice details, showing generic warning");
          toast.error("You already have an active picking session", { duration: 7000 });
          setShowPickModal(false);
          return;
        } catch (activeErr) {
          console.error("Failed to fetch active session:", activeErr);
          // Still show warning even if fetch fails
          toast.error("You already have an active picking session", { duration: 7000 });
          setShowPickModal(false);
          return;
        }
      }
      
      // Check for other error messages indicating active session
      const msg = err.response?.data?.errors?.invoice_no?.[0];
      const errorMessage = err.response?.data?.message || '';

      if (msg?.includes("already exists") || 
          errorMessage.toLowerCase().includes("active") ||
          errorMessage.toLowerCase().includes("already")) {
        console.log("Active session error detected from message, fetching details...");
        try {
          const activeRes = await api.get("/sales/picking/active/");
          console.log("Fetched active session:", activeRes.data);
          
          if (activeRes.data?.data) {
            const inv = activeRes.data.data.invoice;
            const customerName = inv?.customer?.name ? ` for ${inv.customer.name}` : '';
            toast.error(`You already have an active picking session for Invoice #${inv?.invoice_no}${customerName}`, { duration: 7000 });
            setShowPickModal(false);
            return;
          }
        } catch (activeErr) {
          console.error("Failed to fetch active session:", activeErr);
        }
      }

      // Check for user not found vs privilege not given
      const userEmailError = err.response?.data?.errors?.user_email?.[0] || err.response?.data?.errors?.user_email || '';
      
      // User doesn't exist in database
      if (err.response?.status === 404 || 
          userEmailError.toLowerCase().includes('user not found') ||
          userEmailError.toLowerCase().includes('please scan a valid email') ||
          err.response?.data?.detail?.toLowerCase().includes('user not found')) {
        toast.error("No user found with this email address", { duration: 5000 });
        return;
      }
      
      // User exists but doesn't have privilege/menu access
      if (errorMessage === 'Privilege Not Given' || 
          userEmailError.toLowerCase().includes('does not have access') ||
          userEmailError.toLowerCase().includes('please contact admin')) {
        toast.error("Privilege Not Given - User does not have access to picking functionality", { duration: 5000 });
        return;
      }

      toast.error(err.response?.data?.message || "Failed to start picking");
    }
  };

  const sortedInvoices = [...invoices].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  // Filter by search term
  const filteredInvoices = sortedInvoices.filter(inv => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    return (
      inv.invoice_no?.toLowerCase().includes(search) ||
      inv.customer?.name?.toLowerCase().includes(search) ||
      inv.customer?.code?.toLowerCase().includes(search)
    );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewInvoice = (id) => {
    if(user?.role === "PICKER"){
      navigate(`/ops/picking/invoices/view/${id}`);
      return;
    }
    navigate(`/invoices/view/${id}/picking`);
  };

  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-700 border-red-300";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "LOW":
        return "bg-gray-100 text-gray-600 border-gray-300";
      default:
        return "bg-gray-100 text-gray-600 border-gray-300";
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "INVOICED":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "PICKING":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "PICKED":
        return "bg-green-100 text-green-700 border-green-300";
      case "PACKING":
        return "bg-purple-100 text-purple-700 border-purple-300";
      case "PACKED":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "DISPATCHED":
        return "bg-teal-100 text-teal-700 border-teal-300";
      case "DELIVERED":
        return "bg-gray-200 text-gray-700 border-gray-300";
      case "REVIEW":
        return "bg-red-100 text-red-700 border-red-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getStatusLabel = (status) => status || "INVOICED";

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header - Responsive */}
        <div className="mb-6">
          {/* Desktop: flex-row, Mobile: flex-col */}
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800">
              Picking Management
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search invoice or customer..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 w-full text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={handleShowOngoingWork}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all whitespace-nowrap"
              >
                Ongoing Work
              </button>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-500">
              Loading invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              No invoices found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">Invoice</th>
                      <th className="px-4 py-3 text-left">Priority</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Customer</th>
                      <th className="px-4 py-3 text-left">Created By</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {currentItems.map((inv) => (
                      <tr
                        key={inv.id}
                        className={`transition hover:bg-grey-50 ${
                          inv.priority === "HIGH" ? "bg-red-50" : inv.status === "PICKING" && isManualCompletionEnabled ? "" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold">{inv.invoice_no}</p>
                          <p className="text-xs text-gray-500">
                            {inv.customer?.code}
                          </p>
                          {/* Show picker info if invoice is being picked */}
                          {isManualCompletionEnabled && inv.status === "PICKING" && inv.picker_info && (
                            <p className="text-xs text-blue-600 font-medium mt-1">
                              👤 {inv.picker_info.name}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-3 py-1 rounded-full border text-xs font-bold ${getPriorityBadgeColor(
                              inv.priority
                            )}`}
                          >
                            {inv.priority || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium">{formatDate(inv.invoice_date)}</p>
                          <p className="text-xs text-gray-500">{formatTime(inv.created_at)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p>{inv.customer?.name}</p>
                          <p className="text-xs text-gray-500">
                            {inv.customer?.area || inv.customer?.address1 || inv.temp_name || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {inv.salesman?.name}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatNumber(inv.Total, 2, '0.00')}
                        </td>
                        <td className="px-4 py-3 text-center ">
                          <span
                            className={`px-3 py-1 rounded-full border text-xs font-bold ${getStatusBadgeColor(
                              inv.status
                            )}`}
                          >
                            {getStatusLabel(inv.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {inv.status === "INVOICED" && (
                              <button
                                onClick={() => handlePickClick(inv)}
                                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
                              >
                                Pick
                              </button>
                            )}
                            <button
                              onClick={() => handleViewInvoice(inv.id)}
                              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalItems={filteredInvoices.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                label="invoices"
                colorScheme="teal"
              />
            </>
          )}
        </div>
      </div>

      {/* Pick Invoice Modal */}
      <PickInvoiceModal
        isOpen={showPickModal}
        onClose={() => setShowPickModal(false)}
        onPick={handlePickInvoice}
        invoiceNumber={selectedInvoice?.invoice_no}
      />

      {/* Ongoing Work Modal */}
      {showOngoingModal && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setShowOngoingModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  Ongoing Picking Tasks
                </h2>
                <button
                  onClick={() => setShowOngoingModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {loadingOngoing ? (
                  <div className="py-20 text-center text-gray-500">
                    Loading ongoing tasks...
                  </div>
                ) : ongoingTasks.length === 0 ? (
                  <div className="py-20 text-center text-gray-500">
                    No ongoing tasks
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left">Invoice</th>
                          <th className="px-4 py-3 text-left">{isManualCompletionEnabled ? 'Picker' : 'Date'}</th>
                          <th className="px-4 py-3 text-left">Customer</th>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Start Time</th>
                          <th className="px-4 py-3 text-left">Duration</th>
                          {isManualCompletionEnabled && <th className="px-4 py-3 text-left">Actions</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {ongoingTasks.map((task, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-semibold">{task.invoice_no}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium">{task?.picker_info?.name || task?.picker_name || "Current User"}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium">{task.customer?.name || task.customer_name || "—"}</p>
                              <p className="text-xs text-gray-500">
                                {task.customer?.area || task.customer_address || task.customer?.address1 || task.temp_name || "—"}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {formatDate(task?.invoice_date)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {formatTime(task.start_time || task.picker_info?.picked_at)}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold">
                              {formatDuration(task.start_time || task.picker_info?.picked_at)}
                            </td>
                            {isManualCompletionEnabled && (
                              <td className="px-4 py-3">
                                <button
                                  onClick={() => {
                                    setInvoiceToComplete(task);
                                    setShowCompleteModal(true);
                                    setShowOngoingModal(false);
                                  }}
                                  className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold hover:from-teal-600 hover:to-cyan-700 transition-all"
                                  title={`Complete picking for ${task.picker_info?.name || 'picker'}`}
                                >
                                  Complete
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Complete Picking Modal */}
      <PickInvoiceModal
        isOpen={showCompleteModal}
        onClose={() => {
          setShowCompleteModal(false);
          setInvoiceToComplete(null);
        }}
        onPick={handleCompletePicking}
        invoiceNumber={invoiceToComplete?.invoice_no}
        title="Complete Picking"
        actionLabel="Complete"
      />

      {/* Confirmation Modal */}
      {showConfirmComplete && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={handleConfirmCompleteNo}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 rounded-t-xl">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Confirm Completion
                </h2>
              </div>

              <div className="p-6">
                <div className="mb-6">
                  <p className="text-lg font-semibold text-gray-900 mb-2">
                    Complete picking for Invoice #{invoiceToComplete?.invoice_no}?
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Picked by: <span className="font-semibold">{invoiceToComplete?.picker_info?.name || invoiceToComplete?.picker_name}</span>
                  </p>
                  <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    ⚠️ This action will mark the picking as complete and move the invoice to packing stage. This cannot be undone.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmCompleteNo}
                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                  >
                    No, Cancel
                  </button>
                  <button
                    onClick={handleConfirmCompleteYes}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-lg"
                  >
                    Yes, Complete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <ActiveUsersDock type="picking" />
    </div>
  );
}