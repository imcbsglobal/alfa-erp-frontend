import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PickInvoiceModal from "../components/PickInvoiceModal";
import api from "../../../services/api";
import { getActivePickingTask } from "../../../services/sales";
import { useAuth } from "../../auth/AuthContext";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export default function InvoiceListPage() {
  const { user } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");

  const [activePicking, setActivePicking] = useState(null);

  // Modal state
  const [showPickModal, setShowPickModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  // Ongoing work modal state
  const [showOngoingModal, setShowOngoingModal] = useState(false);
  const [ongoingTasks, setOngoingTasks] = useState([]);
  const [loadingOngoing, setLoadingOngoing] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Show success message if redirected from picking page
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      setTimeout(() => setSuccessMessage(""), 5000);
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Load invoices
  useEffect(() => {
    loadInvoices();
  }, []);

  // 🔥 SSE Live Updates
  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE_URL}/sales/sse/invoices/`);

    eventSource.onmessage = (event) => {
      try {
        const invoice = JSON.parse(event.data);
        setInvoices((prev) => {
          // Update existing or add new
          const exists = prev.find(inv => inv.id === invoice.id);
          if (exists) {
            return prev.map(inv => inv.id === invoice.id ? invoice : inv);
          }
          return [invoice, ...prev];
        });
      } catch (e) {
        console.error("Invalid SSE invoice:", e);
      }
    };

    eventSource.onerror = () => {
      console.error("SSE connection lost");
      eventSource.close();
    };

    return () => eventSource.close();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get("/sales/invoices/?status=PENDING&page_size=100");
      const data = res.data;

      setInvoices(data.results || []);
    } catch (err) {
      console.error("Failed to load invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load ongoing picking tasks
  const loadOngoingTasks = async () => {
    setLoadingOngoing(true);
    try {
      const res = await api.get("/sales/picking/active/");
      // Handle the response structure: { success, message, data }
      // data can be null or a single task object
      const responseData = res.data?.data;
      if (responseData) {
        // Convert single task object to array
        setOngoingTasks([responseData]);
      } else {
        setOngoingTasks([]);
      }
    } catch (err) {
      console.error("Failed to load ongoing tasks:", err);
      setOngoingTasks([]);
    } finally {
      setLoadingOngoing(false);
    }
  };

  // Handle showing ongoing work
  const handleShowOngoingWork = () => {
    setShowOngoingModal(true);
    loadOngoingTasks();
  };

  // Handle refresh
  const handleRefresh = () => {
    loadInvoices();
    setSuccessMessage("Invoices refreshed successfully");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // Calculate progress percentage
  const calculateProgress = (task) => {
    if (!task.invoice?.items) return 0;
    const totalItems = task.invoice.items.length;
    const pickedItems = task.invoice.items.filter(item => item.picked).length;
    if (totalItems === 0) return 0;
    return Math.round((pickedItems / totalItems) * 100);
  };

  // Format time duration
  const formatDuration = (startTime) => {
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
  };

  // Handle Pick Invoice
  const handlePickClick = (invoice) => {
    const invoiceStatus = invoice.status || "Pending"; // Default to Pending if no status
    
    if (invoiceStatus !== "PENDING") {
      alert("Only pending invoices can be picked");
      return;
    }
    setSelectedInvoice(invoice);
    setShowPickModal(true);
  };

  const handlePickInvoice = async (employeeEmail) => {
    try {
      await api.post("/sales/picking/start/", {
        invoice_no: selectedInvoice.invoice_no,
        user_email: employeeEmail,
        notes: "Picking started",
      });

      setShowPickModal(false);

      navigate("/invoices/my");

    } catch (err) {
      throw new Error(
        err.response?.data?.message || "Failed to start picking"
      );
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = invoices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(invoices.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewInvoice = (id) => {
    if(user?.role === "PICKER"){
      navigate(`/ops/picking/invoices/view/${id}`);
      return;
    }
    navigate(`/invoices/view/${id}`);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "PREPARING":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "PICKED":
        return "bg-green-100 text-green-700 border-green-200";
      case "READY_FOR_PACKING":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "PACKED":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "SHIPPED":
        return "bg-teal-100 text-teal-700 border-teal-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusLabel = (status) => {
    const actualStatus = status || "Pending"; // Default to Pending if no status
    
    switch (actualStatus) {
      case "ReadyForPacking":
        return "Ready for Packing";
      default:
        return actualStatus;
    }
  };

  // Pagination UI renderer
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, invoices.length)} of {invoices.length} invoices
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-2 rounded-lg font-medium transition-all ${
                currentPage === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-cyan-50 hover:text-cyan-600 border border-gray-300"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {startPage > 1 && (
              <>
                <button
                  onClick={() => handlePageChange(1)}
                  className="px-4 py-2 rounded-lg font-medium bg-white text-gray-700 hover:bg-cyan-50 hover:text-cyan-600 border border-gray-300 transition-all"
                >
                  1
                </button>
                {startPage > 2 && <span className="text-gray-400">...</span>}
              </>
            )}

            {pageNumbers.map((number) => (
              <button
                key={number}
                onClick={() => handlePageChange(number)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  currentPage === number
                    ? "bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-cyan-50 hover:text-cyan-600 border border-gray-300"
                }`}
              >
                {number}
              </button>
            ))}

            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && <span className="text-gray-400">...</span>}
                <button
                  onClick={() => handlePageChange(totalPages)}
                  className="px-4 py-2 rounded-lg font-medium bg-white text-gray-700 hover:bg-cyan-50 hover:text-cyan-600 border border-gray-300 transition-all"
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 rounded-lg font-medium transition-all ${
                currentPage === totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-cyan-50 hover:text-cyan-600 border border-gray-300"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-green-800 font-semibold">{successMessage}</p>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Invoice Management
            </h1>
            <p className="text-gray-600">Pick and manage invoices</p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleShowOngoingWork}
              className="px-5 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Ongoing Work
            </button>

            <button
              onClick={handleRefresh}
              className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <svg className="animate-spin h-10 w-10 text-cyan-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">Loading invoices...</p>
              </div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-20">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No invoices found</h3>
              <p className="text-gray-500">No pending invoices at the moment</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">Invoice Number</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">Customer</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">Sales Person</th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-white">Amount</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-800">{invoice.invoice_no}</p>
                          <p className="text-xs text-gray-500">{invoice.customer?.code}</p>
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-600">
                          {invoice.invoice_date}
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-800">
                            {invoice.customer?.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {invoice.customer?.area}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-600">
                          {invoice.salesman?.name}
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-semibold text-right text-gray-800">
                            ₹{invoice.total_amount}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full border text-xs font-bold ${getStatusBadgeColor(invoice.status)}`}>
                            {getStatusLabel(invoice.status)}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {/* Pick Button - Only show for Pending invoices */}
                            {invoice.status === "PENDING" && !activePicking && (
                              <button
                                onClick={() => handlePickClick(invoice)}
                                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                </svg>
                                Pick
                              </button>
                            )}
                            
                            {/* View Button - Always show */}
                            <button
                              onClick={() => handleViewInvoice(invoice.id)}
                              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {renderPagination()}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <h2 className="text-xl font-bold text-white">Ongoing Picking Tasks</h2>
              </div>
              <button
                onClick={() => setShowOngoingModal(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {loadingOngoing ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <svg className="animate-spin h-10 w-10 text-purple-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-600">Loading ongoing tasks...</p>
                  </div>
                </div>
              ) : ongoingTasks.length === 0 ? (
                <div className="text-center py-20">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No Ongoing Tasks</h3>
                  <p className="text-gray-500">There are no active picking tasks at the moment</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-purple-500 to-indigo-600">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-bold text-white">Invoice No</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-white">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-white">Start Time</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-white">Duration</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-white">Employee ID</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-white">Employee Name</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-white">Progress</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {ongoingTasks.map((task, index) => {
                        const progress = calculateProgress(task);
                        const totalItems = task.invoice?.items?.length || 0;
                        const pickedItems = task.invoice?.items?.filter(item => item.picked)?.length || 0;
                        
                        return (
                          <tr key={index} className="hover:bg-purple-50 transition">
                            <td className="px-4 py-4">
                              <p className="font-semibold text-gray-800">{task.invoice?.invoice_no}</p>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {task.invoice?.invoice_date || "N/A"}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {task.start_time ? new Date(task.start_time).toLocaleTimeString() : "N/A"}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {formatDuration(task.start_time)}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">
                              {task.invoice?.customer?.code || "N/A"}
                            </td>
                            <td className="px-4 py-4 text-sm font-medium text-gray-800">
                              {user?.email || "Current User"}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                                  <div 
                                    className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2.5 rounded-full transition-all"
                                    style={{ width: `${progress}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-semibold text-gray-700 min-w-[45px]">
                                  {progress}%
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {pickedItems} / {totalItems} items
                              </p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={loadOngoingTasks}
                className="px-5 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button
                onClick={() => setShowOngoingModal(false)}
                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}