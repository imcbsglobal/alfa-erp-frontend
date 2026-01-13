import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PackInvoiceModal from "../components/PackInvoiceModal";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
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
      const res = await api.get("/sales/packing/history/", {
        params: { status: "IN_PROGRESS" }
      });
      
      const tasks = res.data?.results || [];
      console.log("Ongoing tasks loaded:", tasks.length);
      setOngoingTasks(tasks);
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
      
      const errorMessage = err.response?.data?.message 
        || err.response?.data?.error
        || err.response?.data?.detail
        || "Failed to start packing";
      
      toast.error(errorMessage);
    }
  };

  // 🔽 Sort by invoice_date (latest first) + paginate
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

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="flex justify-center gap-2 py-4">
        {[...Array(totalPages)].map((_, i) => (
          <button
            key={i}
            onClick={() => handlePageChange(i + 1)}
            className={`px-3 py-1 rounded ${
              currentPage === i + 1
                ? "bg-teal-600 text-white"
                : "bg-white border hover:bg-teal-50"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    );
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
                      <th className="px-4 py-3 text-left">Salesman</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-left">Status</th>
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
                          ₹{inv.total_amount}
                        </td>
                        <td className="px-4 py-3">
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
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Start Time</th>
                          <th className="px-4 py-3 text-left">Duration</th>
                          <th className="px-4 py-3 text-left">Employee</th>
                          <th className="px-4 py-3 text-left">Progress</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {ongoingTasks.map((task, i) => {
                          const progress = calculateProgress(task);
                          const total = task.invoice?.items?.length || 0;
                          const packed = 0;

                          return (
                            <tr key={i} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-semibold">
                                {task.invoice?.invoice_no}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {task.invoice?.invoice_date || "N/A"}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {task.start_time
                                  ? new Date(task.start_time).toLocaleTimeString()
                                  : "N/A"}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {formatDuration(task.start_time)}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium">
                                {task.packer?.name || task.packer?.email || "Current User"}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-teal-600 h-2 rounded-full"
                                      style={{ width: `${progress}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-semibold min-w-[45px]">
                                    {progress}%
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {packed} / {total} items
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}