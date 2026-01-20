import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PickInvoiceModal from "../components/PickInvoiceModal";
import api from "../../../services/api";
import { getActivePickingTask } from "../../../services/sales";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";

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
        if (invoice.status === "INVOICED") {
          setInvoices(prev => {
            const exists = prev.find(inv => inv.id === invoice.id);
            if (exists) {
              return prev.map(inv => inv.id === invoice.id ? invoice : inv);
            }
            return [invoice, ...prev];
          });
        } else {
          setInvoices(prev => prev.filter(inv => inv.id !== invoice.id));
        }
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
      const res = await api.get("/sales/invoices/", {
        params: { status: "INVOICED", page_size: 100 },
      });
      setInvoices(res.data.results || []);
    } catch (err) {
      console.error("Failed to load invoices:", err);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const loadOngoingTasks = async () => {
    setLoadingOngoing(true);
    try {
      const res = await api.get("/sales/picking/history/?status=PREPARING");
      const responseData = res.data?.results;
      console.log("Ongoing tasks data:", responseData);
      if (responseData) {
        setOngoingTasks(responseData);
      } else {
        setOngoingTasks([]);
      }
      setLoadingOngoing(false);
    } catch (err) {
      console.error("Failed to load ongoing tasks:", err);
      toast.error("Failed to load ongoing tasks");
      setOngoingTasks([]);
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
      const activeRes = await api.get("/sales/picking/active/");
      if (activeRes.data?.data) {
        const activeInvoice = activeRes.data.data.invoice;
        setActiveInvoiceData(activeInvoice);
        setShowPickModal(false);
        setShowActiveWarning(true);
        return;
      }

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
      const msg = err.response?.data?.errors?.invoice_no?.[0];

      if (msg?.includes("already exists")) {
        const activeRes = await api.get("/sales/picking/active/");
        if (activeRes.data?.data) {
          const inv = activeRes.data.data.invoice;
          setActiveInvoiceData(inv);
          setShowPickModal(false);
          setShowActiveWarning(true);
        }
        return;
      }

      toast.error(err.response?.data?.message || "Failed to start picking");
    }
  };

  const handleGoToActiveBill = () => {
    if (activeInvoiceData) {
      const path = user?.role === "PICKER" 
        ? `/ops/picking/invoices/view/${activeInvoiceData.id}`
        : `/invoices/view/${activeInvoiceData.id}/picking`;
      navigate(path);
    }
    setShowActiveWarning(false);
  };

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
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Picking Management
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

      {/* Pick Invoice Modal */}
      <PickInvoiceModal
        isOpen={showPickModal}
        onClose={() => setShowPickModal(false)}
        onPick={handlePickInvoice}
        invoiceNumber={selectedInvoice?.invoice_no}
      />

      {/* Active Bill Warning Modal */}
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
                    Active Picking Session
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
                    You already have an active picking session for:
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
                              <p className="font-medium">{task?.picker_name || "Current User"}</p>
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
    </div>
  );
}