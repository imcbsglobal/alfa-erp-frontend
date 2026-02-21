import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import { formatDateDDMMYYYY, formatNumber, formatTime, formatAmount } from '../../../utils/formatters';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

// Always return today's date in YYYY-MM-DD format
const getTodayDate = () => new Date().toISOString().split('T')[0];

export default function BillingInvoiceListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Load when page, itemsPerPage, statusFilter, or searchTerm changes
  useEffect(() => {
    loadInvoices();
  }, [currentPage, itemsPerPage, statusFilter, searchTerm]);

  // 🔴 SSE live updates
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

          // Filter by salesman name - only show if matches logged-in user (unless admin)
          const isAdmin = user?.role === "ADMIN" || user?.is_superuser;
          const salesmanName = data.salesman?.name;
          const userName = user?.username || user?.name;

          if (!isAdmin && salesmanName !== userName) {
            return;
          }

          // Only include invoices from today
          const invoiceDate = data.invoice_date || data.created_at;
          if (invoiceDate && invoiceDate.split('T')[0] !== getTodayDate()) {
            return;
          }

          setInvoices((prev) => {
            if (data.billing_status === "REVIEW") {
              return prev.filter(i => i.id !== data.id);
            }

            const idx = prev.findIndex((i) => i.id === data.id);
            if (idx !== -1) {
              const copy = [...prev];
              copy[idx] = { ...copy[idx], ...data };
              return copy;
            }
            const updated = [...prev, { ...data, _isLive: true }];
            return updated.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          });
        } catch (e) {
          console.error("Bad SSE data", e);
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
  }, [user]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        page_size: itemsPerPage,
        // Always filter by today's date
        date: getTodayDate(),
      };

      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }

      if (searchTerm) {
        params.search = searchTerm;
      }

      const res = await api.get("/sales/billing/invoices/", { params });
      const results = res.data.results || [];
      const count = res.data.count || 0;

      // Filter client-side for non-admin users by salesman name
      const isAdmin = user?.role === "ADMIN" || user?.is_superuser;
      const userName = user?.username || user?.name;

      let filteredResults = results;
      if (!isAdmin) {
        filteredResults = results.filter(
          inv => inv.salesman?.name === userName
        );
      }

      setInvoices(filteredResults);
      setTotalCount(count);
    } catch {
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadInvoices();
    toast.success("Invoices refreshed");
  };

  const handleClearFilters = () => {
    setStatusFilter("ALL");
    setSearchTerm("");
    setItemsPerPage(10);
    setCurrentPage(1);
  };

  const hasActiveFilters = statusFilter !== "ALL" || itemsPerPage !== 10 || searchTerm !== "";

  const handleViewInvoice = (id) => {
    if (user?.role === "BILLER") {
      navigate(`/ops/billing/invoices/view/${id}`);
    } else {
      navigate(`/billing/invoices/view/${id}`);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "INVOICED":
        return "bg-slate-100 text-slate-700 border-slate-300";
      case "PICKING":
      case "PACKING":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "PICKED":
      case "PACKED":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "DISPATCHED":
        return "bg-cyan-100 text-cyan-700 border-cyan-300";
      case "DELIVERED":
        return "bg-green-100 text-green-700 border-green-300";
      case "REVIEW":
        return "bg-red-100 text-red-700 border-red-300";
      case "BILLED":
        return "bg-slate-100 text-slate-700 border-slate-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
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

  const getStatusLabel = (status) => {
    switch (status) {
      case "INVOICED": return "Invoiced";
      case "PICKED":   return "Picked";
      case "PACKED":   return "Packed";
      case "DELIVERED": return "Delivered";
      case "REVIEW":   return "Under Review";
      default:         return status;
    }
  };

  const currentItems = invoices;

  const handlePageChange = (n) => {
    setCurrentPage(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Invoice Management</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
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
                    onClick={() => { setSearchTerm(""); setCurrentPage(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                >
                  <option value="ALL">All</option>
                  <option value="INVOICED">Invoiced</option>
                  <option value="PICKED">Picked</option>
                  <option value="PACKED">Packed</option>
                  <option value="DISPATCHED">Dispatched</option>
                  <option value="DELIVERED">Delivered</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700">Rows:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all flex items-center gap-2 font-medium"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
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

        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-500">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              {statusFilter === "ALL"
                ? "No invoices found for today"
                : `No ${getStatusLabel(statusFilter).toLowerCase()} invoices found for today`}
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
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {currentItems.map((inv) => (
                      <tr
                        key={inv.id}
                        className={`transition hover:bg-gray-50 ${
                          inv.priority === "HIGH" ? "bg-red-50" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold">{inv.invoice_no}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full border text-xs font-bold ${getPriorityBadgeColor(inv.priority)}`}>
                            {inv.priority || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium">{formatDateDDMMYYYY(inv.invoice_date)}</p>
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
                          {formatAmount(inv.Total)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full border text-xs font-bold ${getStatusBadgeColor(inv.status)}`}>
                            {getStatusLabel(inv.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleViewInvoice(inv.id)}
                            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalItems={totalCount}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                label="invoices"
                colorScheme="teal"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}