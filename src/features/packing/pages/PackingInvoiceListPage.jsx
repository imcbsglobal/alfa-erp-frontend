import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PackInvoiceModal from "../components/PackInvoiceModal";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import ActiveUsersDock from '../../../components/ActiveUsersDock';
import { formatDateDDMMYYYY, formatTime, formatDuration, formatNumber, formatDate, formatDateTime } from '../../../utils/formatters';
import { X } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export default function PackingInvoiceListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Only SUPERADMIN and ADMIN can see Ongoing Work and Active Users Dock
  const isAdminOrSuperadmin = user?.role === "SUPERADMIN" || user?.role === "ADMIN";

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPackModal, setShowPackModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showOngoingModal, setShowOngoingModal] = useState(false);
  const [ongoingTasks, setOngoingTasks] = useState([]);
  const [loadingOngoing, setLoadingOngoing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
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
      eventSource.close();
    };

    return () => eventSource.close();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      let allInvoices = [];
      let nextUrl = "/sales/invoices/?status=PICKED&page_size=100";
      
      while (nextUrl) {
        const res = await api.get(nextUrl);
        const results = res.data.results || [];
        allInvoices = [...allInvoices, ...results];
        
        nextUrl = res.data.next;
        if (nextUrl) {
          const urlObj = new URL(nextUrl, window.location.origin);
          nextUrl = urlObj.pathname.replace(/^\/api/, '') + urlObj.search;
        }
      }
      
      setInvoices(allInvoices);
      console.log('📊 Total invoices loaded:', allInvoices.length);
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
      const res = await api.get("/sales/packing/history/?status=IN_PROGRESS");
      const responseData = res.data?.results;
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

  const handlePackClick = async (invoice) => {
    await loadInvoices();

    if (invoice.status !== "PICKED") {
      toast.error("This invoice is no longer available for packing");
      return;
    }

    setSelectedInvoice(invoice);
    setShowPackModal(true);
  };

  const handlePackInvoice = async () => {
    if (!user?.email) {
      toast.error("Could not determine your account. Please log in again.");
      return;
    }

    try {
      const activeRes = await api.get("/sales/packing/active/");
      
      if (activeRes.data?.data) {
        const activeInvoice = activeRes.data.data.invoice;
        const customerName = activeInvoice?.customer?.name ? ` for ${activeInvoice.customer.name}` : '';
        toast.error(`You already have an active packing session for Invoice #${activeInvoice?.invoice_no}${customerName}`, { duration: 7000 });
        setShowPackModal(false);
        return;
      }

      await api.post("/sales/packing/start/", {
        invoice_no: selectedInvoice.invoice_no,
        user_email: user.email,
        notes: "Packing started",
      });

      setShowPackModal(false);
      setSelectedInvoice(null);
      await loadInvoices();

      toast.success(`Packing started for ${selectedInvoice.invoice_no}`);
    } catch (err) {
      console.error("Error in handlePackInvoice:", err);
      
      if (err.response?.status === 409) {
        try {
          const activeRes = await api.get("/sales/packing/active/");
          const activeInvoice = activeRes.data?.data?.invoice || activeRes.data?.invoice || activeRes.data?.data;
          
          if (activeInvoice && (activeInvoice.id || activeInvoice.invoice_no)) {
            const customerName = activeInvoice?.customer?.name ? ` for ${activeInvoice.customer.name}` : '';
            toast.error(`You already have an active packing session for Invoice #${activeInvoice?.invoice_no}${customerName}`, { duration: 7000 });
            setShowPackModal(false);
            return;
          }
          
          const errorInvoiceNo = err.response?.data?.invoice_no || 
                                err.response?.data?.data?.invoice_no ||
                                err.response?.data?.details?.invoice_no;
          
          if (errorInvoiceNo) {
            toast.error(`You already have an active packing session for Invoice #${errorInvoiceNo}`, { duration: 7000 });
            setShowPackModal(false);
            return;
          }
          
          toast.error("You already have an active packing session", { duration: 7000 });
          setShowPackModal(false);
          return;
        } catch (activeErr) {
          toast.error("You already have an active packing session", { duration: 7000 });
          setShowPackModal(false);
          return;
        }
      }
      
      const msg = err.response?.data?.errors?.invoice_no?.[0];
      const errorMessage = err.response?.data?.message || '';

      if (msg?.includes("already exists") || 
          errorMessage.toLowerCase().includes("active") ||
          errorMessage.toLowerCase().includes("already")) {
        try {
          const activeRes = await api.get("/sales/packing/active/");
          if (activeRes.data?.data) {
            const inv = activeRes.data.data.invoice;
            const customerName = inv?.customer?.name ? ` for ${inv.customer.name}` : '';
            toast.error(`You already have an active packing session for Invoice #${inv?.invoice_no}${customerName}`, { duration: 7000 });
            setShowPackModal(false);
            return;
          }
        } catch (activeErr) {
          console.error("Failed to fetch active session:", activeErr);
        }
      }

      const userEmailError = err.response?.data?.errors?.user_email?.[0] || err.response?.data?.errors?.user_email || '';
      
      if (err.response?.status === 404 || 
          userEmailError.toLowerCase().includes('user not found') ||
          userEmailError.toLowerCase().includes('please scan a valid email') ||
          err.response?.data?.detail?.toLowerCase().includes('user not found')) {
        toast.error("No user found with this email address", { duration: 5000 });
        return;
      }
      
      if (errorMessage === 'Privilege Not Given' || 
          userEmailError.toLowerCase().includes('does not have access') ||
          userEmailError.toLowerCase().includes('please contact admin')) {
        toast.error("Privilege Not Given - User does not have access to packing functionality", { duration: 5000 });
        return;
      }

      toast.error(err.response?.data?.message || "Failed to start packing");
    }
  };

  const sortedInvoices = [...invoices].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

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
    if (user?.role === "PACKER") {
      navigate(`/ops/packing/invoices/view/${id}`);
      return;
    }
    navigate(`/packing/invoices/view/${id}/packing`);
  };

  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case "HIGH": return "bg-red-100 text-red-700 border-red-300";
      case "MEDIUM": return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "LOW": return "bg-gray-100 text-gray-600 border-gray-300";
      default: return "bg-gray-100 text-gray-600 border-gray-300";
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "INVOICED": return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "PICKING": return "bg-blue-100 text-blue-700 border-blue-300";
      case "PICKED": return "bg-green-100 text-green-700 border-green-300";
      case "PACKING": return "bg-purple-100 text-purple-700 border-purple-300";
      case "PACKED": return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "DISPATCHED": return "bg-teal-100 text-teal-700 border-teal-300";
      case "DELIVERED": return "bg-gray-200 text-gray-700 border-gray-300";
      case "REVIEW": return "bg-red-100 text-red-700 border-red-300";
      default: return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getStatusLabel = (status) => status || "PICKED";

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Packing Management</h1>
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
                    onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Ongoing Work — admin/superadmin only */}
              {isAdminOrSuperadmin && (
                <button
                  onClick={handleShowOngoingWork}
                  className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all whitespace-nowrap"
                >
                  Ongoing Work
                </button>
              )}

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
            <div className="py-20 text-center text-gray-500">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="py-20 text-center text-gray-500">No invoices found</div>
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
                        className={`transition hover:bg-grey-50 ${inv.priority === "HIGH" ? "bg-red-50" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold">{inv.invoice_no}</p>
                          <p className="text-xs text-gray-500">{inv.customer?.code}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full border text-xs font-bold ${getPriorityBadgeColor(inv.priority)}`}>
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
                        <td className="px-4 py-3 text-sm">{inv.salesman?.name}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {formatNumber(inv.Total, 2, '0.00')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-3 py-1 rounded-full border text-xs font-bold ${getStatusBadgeColor(inv.status)}`}>
                            {getStatusLabel(inv.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {inv.status === "PICKED" && (
                              <button
                                onClick={() => handlePackClick(inv)}
                                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
                              >
                                Pack
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

      {/* Pack Invoice Modal */}
      <PackInvoiceModal
        isOpen={showPackModal}
        onClose={() => setShowPackModal(false)}
        onPack={handlePackInvoice}
        invoiceNumber={selectedInvoice?.invoice_no}
        customerName={selectedInvoice?.customer?.name}
      />

      {/* Ongoing Work Modal — admin/superadmin only */}
      {isAdminOrSuperadmin && showOngoingModal && (
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
                <h2 className="text-xl font-bold text-white">Ongoing Packing Tasks</h2>
                <button
                  onClick={() => setShowOngoingModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {loadingOngoing ? (
                  <div className="py-20 text-center text-gray-500">Loading ongoing tasks...</div>
                ) : ongoingTasks.length === 0 ? (
                  <div className="py-20 text-center text-gray-500">No ongoing tasks</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left">Invoice</th>
                          <th className="px-4 py-3 text-left">Date</th>
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
                                {task.customer_address || task.customer?.area || task.customer?.address1 || task.temp_name || "—"}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-sm">{formatDate(task?.invoice_date)}</td>
                            <td className="px-4 py-3 text-sm">{formatTime(task.start_time)}</td>
                            <td className="px-4 py-3 text-sm font-semibold">{formatDuration(task.start_time)}</td>
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

      {/* Active Users Dock — admin/superadmin only */}
      {isAdminOrSuperadmin && <ActiveUsersDock type="packing" />}
    </div>
  );
}