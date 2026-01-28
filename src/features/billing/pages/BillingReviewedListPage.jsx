import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import { formatDateDDMMYYYY, formatNumber, formatTime, formatMRP, formatQuantity, formatAmount, formatDateTime } from "../../../utils/formatters";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function BillingReviewedListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState({ open: false, invoice: null });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadInvoices();
  }, []);

  // SSE live updates
  useEffect(() => {
    const es = new EventSource(`${API_BASE_URL}/sales/sse/invoices/`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (!data.invoice_no) return;

        // Reload if it's a review-related event
        if (
          data.type === "invoice_review" ||
          data.type === "invoice_returned" ||
          data.type === "invoice_updated"
        ) {
          loadInvoices();
          toast.success(`Invoice ${data.invoice_no} updated`);
        }
      } catch (e) {
        console.error("Bad SSE data", e);
      }
    };

    es.onerror = () => {
      // SSE connection closed - normal behavior during server restarts or timeouts
      es.close();
    };

    return () => es.close();
  }, []); // Empty dependency - SSE monitors global billing review updates

  const loadInvoices = async () => {
    setLoading(true);
    try {
      let allInvoices = [];
      let page = 1;
      let hasMore = true;
      
      // Fetch all pages
      while (hasMore) {
        const res = await api.get("/sales/billing/invoices/", {
          params: { page }
        });
        const data = res.data;
        
        // Add results from this page
        const pageResults = data?.results || data || [];
        allInvoices = [...allInvoices, ...pageResults];
        
        console.log(`📄 Loaded page ${page}: ${pageResults.length} invoices`);
        
        // Check if there's a next page
        if (data?.next) {
          page++;
        } else {
          hasMore = false;
        }
      }

      console.log("=== ALL INVOICES LOADED ===");
      console.log("Total invoices:", allInvoices.length);
      
      // Debug: Check for INV-202601-76259
      const targetInvoice = allInvoices.find(inv => inv.invoice_no === "INV-202601-76259");
      if (targetInvoice) {
        console.log("✅ FOUND INV-202601-76259:", {
          billing_status: targetInvoice.billing_status,
          has_return_info: !!targetInvoice.return_info,
          return_reason: targetInvoice.return_info?.return_reason,
          returned_by: targetInvoice.return_info?.returned_by_email
        });
      } else {
        console.log("❌ INV-202601-76259 NOT FOUND in API response");
      }

      // Filter for reviewed invoices
      const reviewedInvoices = allInvoices.filter(inv => {
        // Include if status is REVIEW or RE_INVOICED
        if (["REVIEW", "RE_INVOICED"].includes(inv.billing_status)) {
          return true;
        }
        
        // Also include BILLED invoices that have been returned for review
        if (inv.billing_status === "BILLED" && inv.return_info && inv.return_info.return_reason) {
          return true;
        }
        
        return false;
      });

      console.log("=== FILTERED REVIEWED INVOICES ===");
      console.log("Count:", reviewedInvoices.length);
      reviewedInvoices.forEach(inv => {
        console.log("✓", inv.invoice_no, "Status:", inv.billing_status);
      });

      setInvoices(reviewedInvoices);
      setCurrentPage(1);
    } catch (err) {
      console.error("Error loading invoices:", err);
      toast.error(
        err.response?.data?.message || "Failed to load reviewed invoices"
      );
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
      return;
    }
    navigate(`/billing/invoices/view/${id}/billing-review`);
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

  // Sort + paginate
  const sortedInvoices = [...invoices].sort(
    (a, b) => new Date(b.created_at || b.invoice_date) - new Date(a.created_at || a.invoice_date)
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedInvoices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedInvoices.length / itemsPerPage);

  const handlePageChange = (n) => {
    setCurrentPage(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gray-50 px-2 sm:px-4 py-4 sm:py-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">
              Reviewed Bills
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} under review
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg hover:from-orange-600 hover:to-red-700 transition-all text-sm sm:text-base"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="bg-white rounded-xl shadow p-12 sm:p-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-4 border-orange-600 border-t-transparent mb-4"></div>
            <p className="text-gray-500 text-sm sm:text-base mt-4">Loading reviewed invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-12 sm:p-20 text-center">
            <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 text-base sm:text-lg font-medium">No reviewed invoices found</p>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              Invoices sent for review will appear here
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View - Cards */}
            <div className="block lg:hidden space-y-3">
              {currentItems.map((inv) => (
                <div
                  key={inv.id}
                  className={`bg-white rounded-lg shadow-md overflow-hidden border-l-4 ${
                    inv.priority === "HIGH" 
                      ? "border-red-500 bg-red-50" 
                      : "border-orange-500"
                  }`}
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-3 py-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{inv.invoice_no}</p>
                        <p className="text-xs opacity-90 mt-0.5">
                          {formatDateDDMMYYYY(inv.invoice_date)} • {formatTime(inv.created_at)}
                        </p>
                      </div>
                      <span
                        className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex-shrink-0 ${getPriorityBadgeColor(
                          inv.priority
                        )}`}
                      >
                        {inv.priority || "LOW"}
                      </span>
                    </div>
                  </div>

                  {/* Return Info Alert */}
                  {inv.return_info && (
                    <div className="bg-orange-50 border-b border-orange-200 px-3 py-2">
                      <p className="text-xs text-orange-700 font-semibold flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Returned by: {inv.return_info.returned_by_name || inv.return_info.returned_by_email}
                      </p>
                      <p className="text-[10px] text-orange-600 mt-0.5">
                        From: {inv.return_info.returned_from_section}
                      </p>
                    </div>
                  )}

                  {/* Card Body */}
                  <div className="px-3 py-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-0.5">Customer</p>
                        <p className="font-semibold text-sm text-gray-900 truncate">{inv.customer?.name}</p>
                        <p className="text-xs text-gray-500 truncate">{inv.customer?.area}</p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-xs text-gray-500 mb-0.5">Amount</p>
                        <p className="font-bold text-base text-orange-600">{formatAmount(inv.Total)}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Created By</p>
                        <p className="text-xs font-medium text-gray-700">{inv.salesman?.name || "—"}</p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase ${getStatusBadgeColor(
                          inv.billing_status
                        )}`}
                      >
                        {getStatusLabel(inv.billing_status)}
                      </span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="px-3 pb-3 flex gap-2">
                    <button
                      onClick={() => handleReview(inv)}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold text-xs shadow hover:from-orange-600 hover:to-red-700 transition-all flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Issues
                    </button>
                    <button
                      onClick={() => handleViewInvoice(inv.id)}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-xs shadow hover:from-teal-600 hover:to-cyan-700 transition-all flex items-center justify-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View - Table */}
            <div className="hidden lg:block bg-white rounded-xl shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Invoice</th>
                      <th className="px-4 py-3 text-left font-semibold">Priority</th>
                      <th className="px-4 py-3 text-left font-semibold">Date</th>
                      <th className="px-4 py-3 text-left font-semibold">Customer</th>
                      <th className="px-4 py-3 text-left font-semibold">Created By</th>
                      <th className="px-4 py-3 text-right font-semibold">Amount</th>
                      <th className="px-4 py-3 text-center font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentItems.map((inv) => (
                      <tr
                        key={inv.id}
                        className={`transition ${
                          inv.priority === "HIGH" 
                            ? "bg-red-50 hover:bg-red-50" 
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">
                            {inv.invoice_no}
                          </p>
                          {inv.return_info && (
                            <div className="mt-1">
                              <p className="text-xs text-orange-600 font-medium">
                                ⚠ Returned by: {inv.return_info.returned_by_name || inv.return_info.returned_by_email}
                              </p>
                              <p className="text-xs text-gray-500">
                                From: {inv.return_info.returned_from_section}
                              </p>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`px-3 py-1 rounded-full border text-xs font-bold uppercase ${getPriorityBadgeColor(
                              inv.priority
                            )}`}
                          >
                            {inv.priority || "LOW"}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <p className="text-sm font-medium">{formatDateDDMMYYYY(inv.invoice_date)}</p>
                          <p className="text-xs text-gray-500">{formatTime(inv.created_at)}</p>
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{inv.customer?.name}</p>
                          <p className="text-xs text-gray-500">
                            {inv.customer?.area}
                          </p>
                        </td>

                        <td className="px-4 py-3 text-sm text-gray-700">
                          {inv.salesman?.name || "—"}
                        </td>

                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {formatAmount(inv.Total)}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-3 py-1 rounded-full border text-xs font-bold uppercase ${getStatusBadgeColor(
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
                              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
                              title="View Issues"
                            >
                              Issues
                            </button>
                            <button
                              onClick={() => handleViewInvoice(inv.id)}
                              className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-orange-600 hover:to-red-700 transition-all"
                              title="View Details"
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
            </div>

            {/* Pagination */}
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalItems={sortedInvoices.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                label="invoices"
                colorScheme="orange"
              />
            </div>
          </>
        )}
      </div>

      {/* Review Issues Modal */}
      {reviewModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 p-3 sm:p-4 border-b border-gray-200 flex justify-between items-center bg-orange-50 z-10">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">
                  Invoice #{reviewModal.invoice.invoice_no} - Review Issues
                </h3>
              </div>
              <button
                onClick={() => setReviewModal({ open: false, invoice: null })}
                className="text-gray-400 hover:text-gray-600 transition ml-2 flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {reviewModal.invoice.return_info ? (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                    <h4 className="font-semibold text-red-900 mb-2 text-sm sm:text-base">Return Reason:</h4>
                    <p className="text-red-800 whitespace-pre-wrap text-xs sm:text-sm">
                      {reviewModal.invoice.return_info.return_reason}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Returned By</p>
                      <p className="font-medium text-gray-900 text-sm">
                        {reviewModal.invoice.return_info.returned_by_name || reviewModal.invoice.return_info.returned_by_email}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Returned From</p>
                      <p className="font-medium text-gray-900 text-sm">
                        {reviewModal.invoice.return_info.returned_from_section}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Returned At</p>
                      <p className="font-medium text-gray-900 text-sm">
                        {reviewModal.invoice.return_info.returned_at 
                          ? formatDateTime(reviewModal.invoice.return_info.returned_at)
                          : "—"}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Current Status</p>
                      <span className={`inline-block px-2.5 py-1 rounded-full border text-xs font-bold ${getStatusBadgeColor(reviewModal.invoice.billing_status)}`}>
                        {getStatusLabel(reviewModal.invoice.billing_status)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">No return information available.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}