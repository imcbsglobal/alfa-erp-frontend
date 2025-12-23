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
  const [reviewModal, setReviewModal] = useState({ open: false, invoice: null });

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
        es.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            setInvoices((prev) => {
            const idx = prev.findIndex((i) => i.id === data.id);
            if (idx !== -1) {
                const copy = [...prev];
                copy[idx] = { ...copy[idx], ...data };
                return copy;
            }
            return [data, ...prev];
            });

            if (data.billing_status === "REVIEW") {
            toast.success(`Invoice ${data.invoice_no} sent to review`);
            }
        } catch (e) {
            console.error("Bad SSE data", e);
        }
        };
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
        const list = res.data.results || [];

        // 🔴 REVIEW first on load too
        const sorted = [...list].sort((a, b) => {
        const aReview = a.billing_status === "REVIEW" || a.status === "REVIEW";
        const bReview = b.billing_status === "REVIEW" || b.status === "REVIEW";
        if (aReview && !bReview) return -1;
        if (!aReview && bReview) return 1;
        return 0;
        });

        setInvoices(sorted);
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
      // Awaiting Action
      case "INVOICED":
        return "bg-slate-100 text-slate-700 border-slate-300";
      
      // Active / In Progress
      case "PICKING":
      case "PACKING":
        return "bg-blue-100 text-blue-700 border-blue-300";
      
      // Completed Steps
      case "PICKED":
      case "PACKED":
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      
      // In Transit / Dispatch
      case "DISPATCHED":
        return "bg-cyan-100 text-cyan-700 border-cyan-300";
      
      // Delivered / Complete
      case "DELIVERED":
        return "bg-green-100 text-green-700 border-green-300";
      
      // Alert / Review Needed
      case "REVIEW":
        return "bg-red-100 text-red-700 border-red-300";
      
      case "BILLED":
        return "bg-slate-100 text-slate-700 border-slate-300";
      
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
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
      case "PACKING":
        return "Packing";
      case "PACKED":
        return "Packed";
      case "DISPATCHED":
        return "Dispatched";
      case "DELIVERED":
        return "Delivered";
      case "BILLED":
        return "Billed";
      case "REVIEW":
        return "Under Review";
      default:
        return status;
    }
  };
  
  // Get the display status - show workflow status unless in review
  const getDisplayStatus = (inv) => {
    if (inv.billing_status === "REVIEW") return "REVIEW";
    return inv.status;
};

  // 🔴 Sort so REVIEW invoices come first
    const sortedInvoices = [...invoices].sort((a, b) => {
    const aReview = a.billing_status === "REVIEW";
    const bReview = b.billing_status === "REVIEW";
    if (aReview && !bReview) return -1;
    if (!aReview && bReview) return 1;
    return 0;
    });


    // Pagination calc (after sorting)
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
            Invoice Management
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
                          
                          {/* Show current handler info */}
                          {inv.current_handler?.status === "REVIEW" && (
                            <div className="text-xs mt-1">
                                <p className="text-orange-600 font-medium">
                                ⚠ Review by: {inv.current_handler.name}
                                </p>
                            </div>
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
                              getDisplayStatus(inv)
                            )}`}
                          >
                            {getStatusLabel(getDisplayStatus(inv))}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            
                            {inv.billing_status === "REVIEW" && (
                                <button
                                    onClick={() => handleReview(inv)}
                                    className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition font-medium"
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
      {reviewModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-gray-900">
                Invoice #{reviewModal.invoice.invoice_no} - Issues
                </h3>
                <button
                onClick={() => setReviewModal({ open: false, invoice: null })}
                className="text-gray-400 hover:text-gray-600"
                >
                ✕
                </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3 text-sm text-gray-700">
                {reviewModal.invoice.current_handler?.name && (
                    <p className="text-orange-600 font-semibold">
                    ⚠ Review by: {reviewModal.invoice.current_handler.name}
                    </p>
                )}

                {reviewModal.invoice.return_info?.return_reason ? (
                    <p className="text-orange-700">
                    <span className="font-semibold">Reason:</span>{" "}
                    {reviewModal.invoice.return_info.return_reason}
                    </p>
                ) : (
                    <p>No issues reported.</p>
                )}

                {reviewModal.invoice.return_info?.returned_from_section && (
                    <p className="text-xs text-gray-500">
                    Returned from: {" "}
                    {reviewModal.invoice.return_info.returned_from_section}
                    </p>
                )}
                </div>

            {/* Footer */}
            <div className="p-4 border-t flex justify-end">
                <button
                onClick={() => setReviewModal({ open: false, invoice: null })}
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