import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export default function BillingInvoiceListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Initial load
  useEffect(() => {
    loadInvoices();
  }, []);

  // 🔴 SSE live updates
  useEffect(() => {
    const es = new EventSource(`${API_BASE_URL}/sales/sse/invoices/`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Returned event - invoice sent to review
        if (data.type === "invoice_returned") {
          setInvoices((prev) =>
            prev.map((inv) =>
              inv.invoice_no === data.invoice_no
                ? {
                    ...inv,
                    billing_status: "REVIEW",
                    status: "REVIEW",
                    return_reason: data.return_reason,
                  }
                : inv
            )
          );
          toast.success(`Invoice ${data.invoice_no} sent to review`);
          return;
        }

        // Normal invoice update/add
        setInvoices((prev) => {
          const idx = prev.findIndex((i) => i.id === data.id);
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...data };
            return copy;
          }
          return [data, ...prev];
        });
      } catch (e) {
        console.error("Bad SSE data", e);
      }
    };

    es.onerror = () => {
      console.error("SSE connection closed");
      es.close();
    };

    return () => es.close();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get("/sales/billing/invoices/");
      setInvoices(res.data.results || []);
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

  const handleReview = (invoice) => {
    navigate(`/billing/invoices/review/${invoice.id}`, {
      state: { invoice }
    });
  };

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
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "PICKED":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "PICKING":
        return "bg-indigo-100 text-indigo-700 border-indigo-200";
      case "BILLED":
        return "bg-green-100 text-green-700 border-green-200";
      case "REVIEW":
        return "bg-orange-100 text-orange-700 border-orange-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "INVOICED":
        return "Invoiced";
      case "PICKED":
        return "Picked";
      case "PICKING":
        return "Picking";
      case "BILLED":
        return "Billed";
      case "REVIEW":
        return "Under Review";
      default:
        return status;
    }
  };

  // Pagination calc
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = invoices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(invoices.length / itemsPerPage);

  const handlePageChange = (n) => {
    setCurrentPage(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
                ? "bg-cyan-600 text-white"
                : "bg-white border"
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
            Billing Management
          </h1>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg font-semibold shadow hover:bg-cyan-700 transition"
          >
            Refresh
          </button>
        </div>

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
                  <thead className="bg-cyan-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">Invoice</th>
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
                      <tr key={inv.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <p className="font-semibold">{inv.invoice_no}</p>
                          {inv.status === "PICKED" && inv.picker_info && (
                            <p className="text-xs text-blue-600">
                              Picked by: {inv.picker_info.name}
                            </p>
                          )}
                          {inv.status === "REVIEW" && inv.return_reason && (
                            <p className="text-xs text-orange-600">
                              Reason: {inv.return_reason}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {inv.invoice_date}
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
                              inv.billing_status || inv.status
                            )}`}
                          >
                            {getStatusLabel(inv.billing_status || inv.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {/* Show Review button for REVIEW status */}
                            {(inv.billing_status === "REVIEW" || inv.status === "REVIEW") && (
                              <button
                                onClick={() => handleReview(inv)}
                                className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition font-medium"
                              >
                                Review
                              </button>
                            )}
                            
                            {/* Show Review button for BILLED status */}
                            {inv.billing_status === "BILLED" && (
                              <button
                                onClick={() => handleReview(inv)}
                                className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition font-medium"
                              >
                                Review
                              </button>
                            )}
                            
                            {/* View button for all */}
                            <button
                              onClick={() => handleViewInvoice(inv.id)}
                              className="px-3 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition font-medium"
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
              {renderPagination()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}