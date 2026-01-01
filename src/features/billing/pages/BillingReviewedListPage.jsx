import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination"; 

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export default function BillingReviewedListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState({ open: false, invoice: null });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ✅ statuses we consider as "Reviewed"
  const REVIEW_STATUSES = ["REVIEW", "RE_INVOICED"];

  useEffect(() => {
    loadInvoices();
  }, []);

  // 🔴 SSE live updates
  useEffect(() => {
    const es = new EventSource(`${API_BASE_URL}/sales/sse/invoices/`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        setInvoices((prev) => {
          if (REVIEW_STATUSES.includes(data.billing_status)) {
            const idx = prev.findIndex((i) => i.id === data.id);
            if (idx !== -1) {
              const copy = [...prev];
              copy[idx] = { ...copy[idx], ...data };
              return copy;
            }
            return [data, ...prev];
          } else {
            return prev.filter((i) => i.id !== data.id);
          }
        });

        if (REVIEW_STATUSES.includes(data.billing_status)) {
          toast.success(`Invoice ${data.invoice_no} updated`);
        }
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
      const list = res.data.results || [];

      const reviewedInvoices = list.filter((inv) =>
        REVIEW_STATUSES.includes(inv.billing_status)
      );

      setInvoices(reviewedInvoices);
    } catch {
      toast.error("Failed to load reviewed invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadInvoices();
    toast.success("Reviewed invoices refreshed");
  };

  const handleReview = (invoice) => {
    setReviewModal({ open: true, invoice });
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
      case "REVIEW":
        return "bg-red-100 text-red-700 border-red-300";
      case "RE_INVOICED":
        return "bg-orange-100 text-orange-700 border-orange-300";
      case "BILLED":
        return "bg-slate-100 text-slate-700 border-slate-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "REVIEW":
        return "Under Review";
      case "RE_INVOICED":
        return "Re-Invoiced";
      case "BILLED":
        return "Billed";
      default:
        return status;
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

  // 🔽 Sort + paginate
  const sortedInvoices = [...invoices].sort(
    (a, b) => new Date(b.invoice_date) - new Date(a.invoice_date)
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedInvoices.slice(
    indexOfFirstItem,
    indexOfLastItem
  );
  const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage);

  const handlePageChange = (n) => {
    setCurrentPage(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Reviewed Bills
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
              Loading reviewed invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              No reviewed invoices found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-orange-600 text-white">
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
                        className="transition hover:bg-orange-50"
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold">
                            {inv.invoice_no}
                          </p>
                          {inv.return_info && (
                            <p className="text-xs text-orange-600 mt-1">
                              ⚠ Reviewed by:{" "}
                              {inv.return_info.returned_by_name}
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
                          {inv.salesman?.name || "—"}
                        </td>

                        <td className="px-4 py-3 text-right font-semibold">
                          ₹{inv.total_amount}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`px-3 py-1 rounded-full border text-xs font-bold ${getStatusBadgeColor(
                              inv.billing_status
                            )}`}
                          >
                            {getStatusLabel(inv.billing_status)}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReview(inv)}
                              className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition font-medium"
                            >
                              Issues
                            </button>
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
              <Pagination
                currentPage={currentPage}
                totalItems={sortedInvoices.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                label="invoices"
              />
            </>
          )}
        </div>
      </div>

      {reviewModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-900">
                Invoice #{reviewModal.invoice.invoice_no} - Issues
              </h3>
              <button
                onClick={() =>
                  setReviewModal({ open: false, invoice: null })
                }
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 text-sm text-gray-700">
              {reviewModal.invoice.return_info ? (
                <>
                  <p className="text-orange-700">
                    <span className="font-semibold">Reason:</span>{" "}
                    {reviewModal.invoice.return_info.return_reason}
                  </p>
                  <p className="text-xs text-gray-500">
                    Returned from:{" "}
                    {
                      reviewModal.invoice.return_info
                        .returned_from_section
                    }
                  </p>
                </>
              ) : (
                <p>No issues reported.</p>
              )}
            </div>

            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() =>
                  setReviewModal({ open: false, invoice: null })
                }
                className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700"
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
