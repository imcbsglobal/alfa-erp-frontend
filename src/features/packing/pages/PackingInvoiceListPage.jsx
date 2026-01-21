import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PackInvoiceModal from "../components/PackInvoiceModal";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import ActiveUsersDock from '../../../components/ActiveUsersDock';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatTime(timeStr) {
  if (!timeStr) return "N/A";
  try {
    const date = new Date(timeStr);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  } catch (e) {
    return "N/A";
  }
}

function formatDuration(startTime) {
  if (!startTime) return "N/A";
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now - start;
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export default function PackingInvoiceListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPackModal, setShowPackModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showOngoingModal, setShowOngoingModal] = useState(false);
  const [ongoingTasks, setOngoingTasks] = useState([]);
  const [loadingOngoing, setLoadingOngoing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showActiveWarning, setShowActiveWarning] = useState(false);
  const [activeInvoiceData, setActiveInvoiceData] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    loadInvoices();
  }, []);

  // SSE Live Updates
  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE_URL}/sales/sse/invoices/`);
    eventSource.onmessage = (event) => {
      try {
        const invoice = JSON.parse(event.data);
        
        if (invoice.status === "PICKED") {
          setInvoices((prev) => {
            const exists = prev.find(inv => inv.id === invoice.id);
            if (exists) {
              return prev.map(inv => inv.id === invoice.id ? invoice : inv);
            }
            return [invoice, ...prev];
          });
        } else {
          setInvoices((prev) => prev.filter(inv => inv.id !== invoice.id));
        }
      } catch (e) {
        console.error("Invalid SSE invoice:", e);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      eventSource.close();
    };

    return () => {
      console.log("Closing SSE connection");
      eventSource.close();
    };
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get("/sales/invoices/", {
        params: { status: "PICKED", page_size: 100 }
      });
      
      const invoiceList = res.data.results || [];
      console.log("Loaded invoices:", invoiceList.length);
      setInvoices(invoiceList);
    } catch (err) {
      console.error("Failed to load invoices:", err);
      
      const errorMessage = err.response?.data?.message 
        || "Failed to load invoices. Please try again.";
      
      toast.error(errorMessage);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const loadOngoingTasks = async () => {
    setLoadingOngoing(true);
    try {
      const res = await api.get("/sales/packing/history/?status=IN_PROGRESS");
      const responseData = res.data?.results;
      console.log("Ongoing tasks data:", responseData);
      if (responseData) {
        setOngoingTasks(responseData);
      } else {
        setOngoingTasks([]);
      }
    } catch (err) {
      console.error("Failed to load ongoing tasks:", err);
      
      if (err.response?.status !== 404) {
        toast.error("Failed to load ongoing tasks");
      }
      
      setOngoingTasks([]);
    } finally {
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

  const handlePackClick = (invoice) => {
    if (invoice.status !== "PICKED") {
      toast.error("Only picked invoices can be packed");
      return;
    }
    
    if (!user?.email) {
      toast.error("User session invalid. Please log in again.");
      return;
    }
    
    setSelectedInvoice(invoice);
    setShowPackModal(true);
  };

  const handlePackInvoice = async (employeeEmail) => {
    if (!employeeEmail || !employeeEmail.trim()) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      await api.post("/sales/packing/start/", {
        invoice_no: selectedInvoice.invoice_no,
        user_email: employeeEmail.trim(),
        notes: "Packing started",
      });

      setShowPackModal(false);
      setSelectedInvoice(null);
      await loadInvoices();
      toast.success(`Packing started for invoice ${selectedInvoice.invoice_no}`);
    } catch (err) {
      console.error("Start packing error:", err);
      console.log("Error response:", err.response?.data);
      console.log("Error status:", err.response?.status);
      
      // Check if it's a 409 conflict (active session exists) or error message contains "active"
      if (err.response?.status === 409 || 
          err.response?.data?.message?.toLowerCase().includes("active") ||
          err.response?.data?.error?.toLowerCase().includes("active")) {
        
        console.log("Active session detected, error data:", err.response?.data);
        
        // First try to get invoice number from the error response
        const invoiceNo = err.response?.data?.data?.invoice_no || 
                         err.response?.data?.invoice_no ||
                         "Unknown";
        
        console.log("Invoice number from error:", invoiceNo);
        
        // Try to get full invoice details from the active endpoint
        try {
          const activeRes = await api.get("/sales/packing/active/");
          console.log("Fetching active session after 409:", activeRes.data);
          
          // Try different response structures
          const activeInvoice = activeRes.data?.data?.invoice || 
                               activeRes.data?.invoice || 
                               activeRes.data?.data;
          
          if (activeInvoice && (activeInvoice.id || activeInvoice.invoice_no)) {
            console.log("Active invoice found from API:", activeInvoice);
            setActiveInvoiceData(activeInvoice);
            setShowPackModal(false);
            setShowActiveWarning(true);
            return;
          }
        } catch (activeErr) {
          console.error("Failed to fetch active invoice details:", activeErr);
        }
        
        // If we couldn't get full details, use the invoice number from error
        console.log("Using invoice number from error response:", invoiceNo);
        setActiveInvoiceData({ invoice_no: invoiceNo });
        setShowPackModal(false);
        setShowActiveWarning(true);
        return;
      }
      
      // For other errors, show toast
      const errorMessage = err.response?.data?.message 
        || err.response?.data?.error
        || err.response?.data?.detail
        || "Failed to start packing";
      
      toast.error(errorMessage);
    }
  };

  const handleGoToActiveBill = () => {
    if (activeInvoiceData) {
      // Check if we have an invoice ID to navigate to
      if (!activeInvoiceData.id) {
        toast.error("Cannot navigate: Invoice ID not found");
        setShowActiveWarning(false);
        return;
      }

      const path = user?.role === "PACKER" 
        ? `/ops/packing/invoices/view/${activeInvoiceData.id}`
        : `/packing/invoices/view/${activeInvoiceData.id}/packing`;
      
      console.log("Navigating to:", path);
      navigate(path);
    }
    setShowActiveWarning(false);
  };

  // Sort by invoice_date (latest first) + paginate
  const sortedInvoices = [...invoices].sort(
    (a, b) => new Date(b.invoice_date) - new Date(a.invoice_date)
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedInvoices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewInvoice = (id) => {
    if(user?.role === "PACKER"){
      navigate(`/ops/packing/invoices/view/${id}`);
      return;
    }
    navigate(`/packing/invoices/view/${id}/packing`);
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
      case "PICKED":
        return "bg-green-100 text-green-700 border-green-300";
      case "PACKING":
        return "bg-purple-100 text-purple-700 border-purple-300";
      case "PACKED":
        return "bg-indigo-100 text-indigo-700 border-indigo-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Packing Management
          </h1>
          <div className="flex gap-2">
            <button
              onClick={handleShowOngoingWork}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
            >
              Ongoing Work
            </button>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
            >
              Refresh
            </button>
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
              No picked invoices ready for packing
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
                          inv.priority === "HIGH" ? "bg-red-50" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold">{inv.invoice_no}</p>
                          <p className="text-xs text-gray-500">
                            {inv.customer?.code}
                          </p>
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
                        <td className="px-4 py-3 text-sm">
                          {formatDate(inv.invoice_date)}
                        </td>
                        <td className="px-4 py-3">
                          <p>{inv.customer?.name}</p>
                          <p className="text-xs text-gray-500">
                            {inv.customer?.area}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {inv.salesman?.name}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {inv.total_amount?.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-3 py-1 rounded-full border text-xs font-bold ${getStatusBadgeColor(
                              inv.status
                            )}`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePackClick(inv)}
                              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
                            >
                              Pack
                            </button>
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
                totalItems={sortedInvoices.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                label="invoices"
                colorScheme="teal"
              />
            </>
          )}
        </div>
      </div>

      {/* Pack Invoice Modal */}
      <PackInvoiceModal
        isOpen={showPackModal}
        onClose={() => setShowPackModal(false)}
        onPack={handlePackInvoice}
        invoiceNumber={selectedInvoice?.invoice_no}
      />

      {/* Active Packing Warning Modal - FIXED: Added "Go to Active Bill" button */}
      {showActiveWarning && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setShowActiveWarning(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h2 className="text-xl font-bold text-white">
                    Active Packing Session
                  </h2>
                </div>

                <button
                  onClick={() => setShowActiveWarning(false)}
                  className="text-white text-2xl font-bold leading-none hover:bg-white hover:bg-opacity-20 rounded-lg px-3 py-1 transition"
                >
                  ×
                </button>
              </div>

              <div className="p-6">
                <div className="mb-6">
                  <p className="text-gray-700 text-lg mb-4">
                    You already have an active packing session for:
                  </p>
                  <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
                    <p className="text-2xl font-bold text-orange-900 mb-2">
                      Invoice #{activeInvoiceData?.invoice_no}
                    </p>
                    {activeInvoiceData?.customer?.name && (
                      <p className="text-sm text-gray-600">
                        Customer: {activeInvoiceData.customer.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* FIXED: Added navigation button */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowActiveWarning(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGoToActiveBill}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-red-600 transition-all"
                  >
                    Go to Active Bill
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

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
                  Ongoing Packing Tasks
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
                    No ongoing packing tasks
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left">Invoice</th>
                          <th className="px-4 py-3 text-left">Employee</th>
                          <th className="px-4 py-3 text-left">Customer</th>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Start Time</th>
                          <th className="px-4 py-3 text-left">Duration</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {ongoingTasks.map((task, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="font-semibold">{task.invoice_no}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium">{task?.packer_name || "Current User"}</p>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium">{task.customer_name || "—"}</p>
                              <p className="text-xs text-gray-500">
                                {task.customer_address || "—"}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {formatDate(task?.invoice_date)}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {formatTime(task.start_time)}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold">
                              {formatDuration(task.start_time)}
                            </td>
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
      <ActiveUsersDock type="packing" />
    </div>
  );
}