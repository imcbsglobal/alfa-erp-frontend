import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getInvoicesByStatus, updateInvoiceStatus } from "../../../services/sales";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import { formatDateDDMMYYYY, formatTime, formatAmount } from "../../../utils/formatters";
import { Search, X, CheckCircle2, Zap, RefreshCw } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";

export default function ExpressBillingListPage() {
  const { user } = useAuth();
  const searchRef = useRef(null);
  
  const [invoices, setInvoices] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [pickedInvoices, setPickedInvoices] = useState(new Set());

  // Load all INVOICED bills on page load
  useEffect(() => {
    loadAllInvoices();
    searchRef.current?.focus();
  }, []);

  // Filter and paginate invoices based on search
  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) {
      return allInvoices;
    }
    return allInvoices.filter(inv =>
      inv.invoice_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.customer?.name || inv.temp_name || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allInvoices, searchQuery]);

  // Paginate filtered results
  const paginatedInvoices = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredInvoices, currentPage, itemsPerPage]);

  const loadAllInvoices = async () => {
    setLoading(true);
    try {
      const params = {
        page: 1,
        page_size: 500,
        status: "INVOICED",
      };

      const res = await getInvoicesByStatus(params);
      setAllInvoices(res.data.results || []);
    } catch (err) {
      console.error("Failed to load invoices:", err);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadAllInvoices();
    toast.success("Invoices refreshed");
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setItemsPerPage(10);
    setCurrentPage(1);
  };

  const handlePageChange = (n) => {
    setCurrentPage(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleMarkAsPicked = async (invoiceId, invoiceNo) => {
    setProcessingId(invoiceId);
    try {
      await updateInvoiceStatus(invoiceId, { status: "PICKED" });
      toast.success(`✅ ${invoiceNo} marked as PICKED`);
      setPickedInvoices(prev => new Set([...prev, invoiceId]));
    } catch (err) {
      console.error("Failed to mark as picked:", err);
      toast.error(`Failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleMarkAsPacked = async (invoiceId, invoiceNo) => {
    setProcessingId(invoiceId);
    try {
      await updateInvoiceStatus(invoiceId, { status: "PACKED" });
      toast.success(`✅ ${invoiceNo} marked as PACKED - Ready for Delivery!`);
      
      // Remove from list after completing workflow
      setAllInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
      setPickedInvoices(prev => {
        const newSet = new Set(prev);
        newSet.delete(invoiceId);
        return newSet;
      });
    } catch (err) {
      console.error("Failed to mark as packed:", err);
      toast.error(`Failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const hasActiveFilters = searchQuery !== "";

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Zap size={28} className="text-teal-500" />
                Express Billing
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-64">
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search invoice or customer..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 w-full text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700">Rows:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
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
                  Clear
                </button>
              )}

              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-500">
              <div className="inline-block animate-spin mb-2">
                <Zap size={28} className="text-teal-500" />
              </div>
              <p className="text-lg">Loading invoices...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              <Search size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">{searchQuery ? "No invoices match your search" : "No INVOICED invoices found"}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">Invoice</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Customer</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedInvoices.map((invoice, idx) => {
                      const isPicked = pickedInvoices.has(invoice.id);
                      const isProcessing = processingId === invoice.id;

                      return (
                        <tr
                          key={invoice.id}
                          className="hover:bg-gray-50 transition"
                        >
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{invoice.invoice_no}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatTime(invoice.created_at)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium">{formatDateDDMMYYYY(invoice.invoice_date)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm">{invoice.customer?.name || invoice.temp_name || "—"}</p>
                            <p className="text-xs text-gray-500">{invoice.customer?.area || "—"}</p>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            {formatAmount(invoice.Total)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 rounded-full border text-xs font-bold bg-yellow-100 text-yellow-700 border-yellow-300">
                                INVOICED
                              </span>
                              {isPicked && (
                                <span className="px-3 py-1 rounded-full border text-xs font-bold bg-blue-100 text-blue-700 border-blue-300">
                                  PICKED ✓
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {!isPicked ? (
                              <button
                                onClick={() => handleMarkAsPicked(invoice.id, invoice.invoice_no)}
                                disabled={isProcessing}
                                className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition flex items-center gap-2 ${
                                  isProcessing
                                    ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                                    : "bg-blue-500 text-white hover:bg-blue-600 shadow-lg"
                                }`}
                              >
                                {isProcessing ? (
                                  <>
                                    <span className="inline-block animate-spin">⚡</span>
                                    Processing...
                                  </>
                                ) : (
                                  "Mark as Picked"
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleMarkAsPacked(invoice.id, invoice.invoice_no)}
                                disabled={isProcessing}
                                className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition flex items-center gap-2 ${
                                  isProcessing
                                    ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                                    : "bg-green-500 text-white hover:bg-green-600 shadow-lg"
                                }`}
                              >
                                {isProcessing ? (
                                  <>
                                    <span className="inline-block animate-spin">⚡</span>
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 size={16} />
                                    Mark as Packed
                                  </>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
    </div>
  );
}
