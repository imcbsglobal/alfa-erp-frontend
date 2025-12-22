import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PackInvoiceModal from "../components/PackInvoiceModal";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

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
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadInvoices();
  }, []);

    // SSE Live Updates
        useEffect(() => {
        const eventSource = new EventSource(`${API_BASE_URL.replace("/api", "")}/events/invoices/`);

        eventSource.onmessage = (event) => {
            try {
            const invoice = JSON.parse(event.data);
            
            // Update PICKED invoices list
            if (invoice.status === "PICKED") {
                setInvoices((prev) => {
                const exists = prev.find(inv => inv.id === invoice.id);
                if (exists) {
                    // Update existing invoice
                    return prev.map(inv => inv.id === invoice.id ? invoice : inv);
                }
                // Add new invoice to the top
                return [invoice, ...prev];
                });
            } else {
                // Remove invoice if status changed from PICKED
                setInvoices((prev) => prev.filter(inv => inv.id !== invoice.id));
            }
            } catch (e) {
            console.error("Invalid SSE invoice:", e);
            }
        };

        eventSource.onerror = (error) => {
            console.error("SSE connection error:", error);
            eventSource.close();
            
            // Optional: Show a toast notification
            // toast.error("Live updates disconnected. Click refresh to reload.");
        };

        return () => {
            console.log("Closing SSE connection");
            eventSource.close();
        };
        }, []); // Empty dependency array is correct

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
                setInvoices([]); // Clear invoices on error
            } finally {
                setLoading(false);
            }
            };

  const loadOngoingTasks = async () => {
    setLoadingOngoing(true);
    try {
        const res = await api.get("/sales/packing/history/", {
        params: { status: "IN_PROGRESS" }
        });
        
        const tasks = res.data?.results || [];
        console.log("Ongoing tasks loaded:", tasks.length);
        setOngoingTasks(tasks);
    } catch (err) {
        console.error("Failed to load ongoing tasks:", err);
        
        // Don't show error toast for 404 (no tasks found)
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

  const calculateProgress = () => {
    return 0;
  };

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

  const handlePackClick = (invoice) => {
    // Validate invoice status
    if (invoice.status !== "PICKED") {
        toast.error("Only picked invoices can be packed");
        return;
    }
    
    // Check if user is logged in with email
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
        
        // Extract error message
        const errorMessage = err.response?.data?.message 
        || err.response?.data?.error
        || err.response?.data?.detail
        || "Failed to start packing";
        
        toast.error(errorMessage);
        
        // Don't close modal on error so user can retry
    }
    };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = invoices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(invoices.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewInvoice = (id) => {
    navigate(`view/${id}`);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "PICKED":
        return "bg-green-100 text-green-700 border-green-200";
      case "PACKING":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "PACKED":
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

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
      <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs sm:text-sm text-gray-600">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, invoices.length)} of {invoices.length} invoices
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-2 sm:px-3 py-2 rounded-lg font-medium transition-all ${
                currentPage === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-teal-50 hover:text-teal-600 border border-gray-300"
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {startPage > 1 && (
              <>
                <button
                  onClick={() => handlePageChange(1)}
                  className="hidden sm:block px-3 sm:px-4 py-2 rounded-lg font-medium bg-white text-gray-700 hover:bg-teal-50 hover:text-teal-600 border border-gray-300 transition-all text-sm"
                >
                  1
                </button>
                {startPage > 2 && <span className="hidden sm:inline text-gray-400">...</span>}
              </>
            )}

            {pageNumbers.map((number) => (
              <button
                key={number}
                onClick={() => handlePageChange(number)}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                  currentPage === number
                    ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-teal-50 hover:text-teal-600 border border-gray-300"
                }`}
              >
                {number}
              </button>
            ))}

            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && <span className="hidden sm:inline text-gray-400">...</span>}
                <button
                  onClick={() => handlePageChange(totalPages)}
                  className="hidden sm:block px-3 sm:px-4 py-2 rounded-lg font-medium bg-white text-gray-700 hover:bg-teal-50 hover:text-teal-600 border border-gray-300 transition-all text-sm"
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-2 sm:px-3 py-2 rounded-lg font-medium transition-all ${
                currentPage === totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-teal-50 hover:text-teal-600 border border-gray-300"
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-6 gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">
              Packing Management
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleShowOngoingWork}
              className="flex-1 sm:flex-initial px-3 sm:px-5 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <span className="hidden sm:inline">Ongoing Work</span>
              <span className="sm:hidden">Ongoing</span>
            </button>

            <button
              onClick={handleRefresh}
              className="flex-1 sm:flex-initial px-3 sm:px-5 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <svg className="animate-spin h-10 w-10 text-teal-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">Loading invoices...</p>
              </div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-20">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No picked invoices</h3>
              <p className="text-gray-500">No picked invoices ready for packing</p>
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
                          <p className="font-medium text-gray-800">{invoice.customer?.name}</p>
                          <p className="text-xs text-gray-500">{invoice.customer?.area}</p>
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
                            {invoice.status}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePackClick(invoice)}
                              className="flex-1 sm:flex-initial px-3 sm:px-5 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all text-sm sm:text-base"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                              Pack
                            </button>
                            
                            <button
                              onClick={() => handleViewInvoice(invoice.id)}
                              className="flex-1 sm:flex-initial px-3 sm:px-5 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all text-sm sm:text-base"
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

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <svg className="animate-spin h-10 w-10 text-teal-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600 text-sm">Loading invoices...</p>
              </div>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl shadow-md">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No picked invoices</h3>
              <p className="text-gray-500 text-sm">No picked invoices ready for packing</p>
            </div>
          ) : (
            <>
              {currentItems.map((invoice) => (
                <div key={invoice.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-base mb-1">{invoice.invoice_no}</p>
                        <p className="text-xs text-gray-500">{invoice.customer?.code}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full border text-xs font-bold ${getStatusBadgeColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>

                    <div className="space-y-2 mb-3 pb-3 border-b border-gray-200">
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-gray-700 font-medium">{invoice.customer?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        <span>{invoice.customer?.area}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                      <div>
                        <p className="text-gray-500 mb-1">Date</p>
                        <p className="text-gray-800 font-medium">{invoice.invoice_date}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 mb-1">Amount</p>
                        <p className="text-gray-800 font-bold">₹{invoice.total_amount}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-500 mb-1">Sales Person</p>
                        <p className="text-gray-800 font-medium">{invoice.salesman?.name}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePackClick(invoice)}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        Pack
                      </button>
                      
                      <button
                        onClick={() => handleViewInvoice(invoice.id)}
                        className="flex-1 px-3 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {renderPagination()}
            </>
          )}
        </div>
      </div>

      <PackInvoiceModal
        isOpen={showPackModal}
        onClose={() => setShowPackModal(false)}
        onPack={handlePackInvoice}
        invoiceNumber={selectedInvoice?.invoice_no}
      />

      {showOngoingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <h2 className="text-base sm:text-xl font-bold text-white">Ongoing Packing Tasks</h2>
              </div>
              <button
                onClick={() => setShowOngoingModal(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1.5 sm:p-2 transition-all"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {loadingOngoing ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-center">
                    <svg className="animate-spin h-10 w-10 text-teal-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-gray-600 text-sm">Loading ongoing tasks...</p>
                  </div>
                </div>
              ) : ongoingTasks.length === 0 ? (
                <div className="text-center py-20">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">No Ongoing Tasks</h3>
                  <p className="text-gray-500 text-sm">There are no active packing tasks at the moment</p>
                </div>
              ) : (
                <>
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-bold text-white">Invoice No</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-white">Date</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-white">Start Time</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-white">Duration</th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-white">Employee</th>
                          <th className="px-4 py-3 text-center text-sm font-bold text-white">Progress</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {ongoingTasks.map((task, index) => {
                          const progress = calculateProgress(task);
                          const totalItems = task.invoice?.items?.length || 0;
                          const packedItems = 0;
                          
                          return (
                            <tr key={index} className="hover:bg-teal-50 transition">
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
                              <td className="px-4 py-4 text-sm font-medium text-gray-800">
                                {task.packer?.name || task.packer?.email || "Current User"}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                                    <div 
                                      className="bg-gradient-to-r from-teal-500 to-cyan-600 h-2.5 rounded-full transition-all"
                                      style={{ width: `${progress}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-semibold text-gray-700 min-w-[45px]">
                                    {progress}%
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {packedItems} / {totalItems} items
                                </p>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="lg:hidden space-y-3">
                    {ongoingTasks.map((task, index) => {
                      const progress = calculateProgress(task);
                      const totalItems = task.invoice?.items?.length || 0;
                      const packedItems = 0;
                      
                      return (
                        <div key={index} className="bg-white rounded-lg border-2 border-teal-200 p-4 shadow-sm">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-bold text-gray-900 mb-1">{task.invoice?.invoice_no}</p>
                              <p className="text-xs text-gray-500">{task.invoice?.invoice_date || "N/A"}</p>
                            </div>
                            <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-bold">
                              {progress}%
                            </span>
                          </div>

                          <div className="space-y-2 mb-3 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-500">Employee:</span>
                              <span className="font-medium text-gray-800">{task.packer?.name || task.packer?.email || "Current User"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Start Time:</span>
                              <span className="font-medium text-gray-800">
                                {task.start_time ? new Date(task.start_time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : "N/A"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">Duration:</span>
                              <span className="font-medium text-gray-800">{formatDuration(task.start_time)}</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                              <div 
                                className="bg-gradient-to-r from-teal-500 to-cyan-600 h-2.5 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 text-center">
                              {packedItems} / {totalItems} items packed
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}