import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}-${m}-${y}`;
}

export default function InvoiceViewPage() {
  const { user } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    loadInvoice();
  }, []);

  const loadInvoice = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/sales/invoices/${id}/`);
      setInvoice(res.data);
    } catch (err) {
      console.error("Failed to load invoice:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (user?.role === "PICKER") {
      navigate(`/ops/picking/invoices/`);
      return;
    }
    if (user?.role === "PACKER") {
      navigate(`/ops/packing/invoices/`);
      return;
    }
    navigate("/packing/invoices");
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = invoice?.items?.slice(indexOfFirstItem, indexOfLastItem) || [];
  const totalPages = invoice ? Math.ceil(invoice.items.length / itemsPerPage) : 0;

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4 border-teal-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600 text-base sm:text-lg">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Invoice not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-5">
        
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl sm:text-3xl font-bold text-gray-800">Invoice Management</h1>
            <button
              onClick={handleBack}
              className="px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
          </div>
        </div>

        {/* Mobile View */}
        <div className="block lg:hidden space-y-4">
          
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b-2 border-teal-500">
              Invoice Information
            </h2>
            <div className="space-y-2">
              <MobileInfoRow label="Invoice Number" value={invoice.invoice_no} />
              <MobileInfoRow label="Invoice Date" value={formatDate(invoice.invoice_date)} />
              <MobileInfoRow label="Salesman" value={invoice.salesman?.name} />
              <MobileInfoRow label="Created By" value={invoice.created_by} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b-2 border-teal-500">
              Customer Information
            </h2>
            <div className="space-y-2">
              <MobileInfoRow label="Customer Name" value={invoice.customer?.name} />
              <MobileInfoRow label="Customer Code" value={invoice.customer?.code} />
              <MobileInfoRow label="Place" value={invoice.customer?.area} />
              <MobileInfoRow label="Address" value={invoice.customer?.address1} />
              <MobileInfoRow label="Phone 1" value={invoice.customer?.phone1} />
              <MobileInfoRow label="Phone 2" value={invoice.customer?.phone2} />
              <MobileInfoRow label="Email" value={invoice.customer?.email} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b-2 border-teal-500">
              Item Details ({invoice.items.length})
            </h2>
            
            <div className="space-y-3">
              {currentItems.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  {/* Ultra compact single-line row */}
                  <div className="text-[11px] text-gray-700 flex items-center gap-3 whitespace-nowrap overflow-x-auto">
                    <span>📍 <b>{item.shelf_location || "—"}</b></span>
                    <span><b>{item.name}</b></span>
                    <span>Pack: <b>{item.packing || "—"}</b></span>
                    <span>Qty: <b>{item.quantity}</b></span>
                    <span>MRP: <b>₹{item.mrp}</b></span>
                    <span>Batch: <b>{item.batch_no || "—"}</b></span>
                    <span>
                      Exp:{" "}
                      <b>
                        {item.expiry_date
                          ? new Date(item.expiry_date).toLocaleDateString("en-GB")
                          : "—"}
                      </b>
                    </span>
                  </div>
                  
                  {/* Compact item details row */}
                  <div className="mt-1 text-[11px] text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
                    <span>📍 <b>{item.shelf_location || "—"}</b></span>
                    <span><b>{item.name}</b></span>
                    <span>Pack: <b>{item.packing || "—"}</b></span>
                    <span>Qty: <b>{item.quantity}</b></span>
                    <span>MRP: <b>₹{item.mrp}</b></span>
                    <span>Batch: <b>{item.batch_no || "—"}</b></span>
                    <span>
                      Exp:{" "}
                      <b>
                        {item.expiry_date
                          ? new Date(item.expiry_date).toLocaleDateString("en-GB")
                          : "—"}
                      </b>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <button
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className={`px-3 py-1.5 rounded-md border text-sm transition-all ${
                    currentPage === 1
                      ? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                      : "bg-white border-gray-300 text-gray-700 hover:border-teal-500"
                  }`}
                >
                  ‹ Prev
                </button>

                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className={`px-3 py-1.5 rounded-md border text-sm transition-all ${
                    currentPage === totalPages
                      ? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                      : "bg-white border-gray-300 text-gray-700 hover:border-teal-500"
                  }`}
                >
                  Next ›
                </button>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg p-4 text-center shadow-md">
            <p className="text-sm font-bold tracking-wider mb-1">Total Amount</p>
            <p className="text-2xl font-bold">₹{invoice.total_amount?.toFixed(2)}</p>
          </div>
        </div>

        {/* Desktop View - Compact Layout */}
        <div className="hidden lg:block bg-white rounded-lg shadow-md">
          <div className="grid grid-cols-5 min-h-[calc(100vh-180px)]">

            {/* Left Section - 2 columns */}
            <div className="col-span-2 border-r border-gray-200 p-4 space-y-4 overflow-y-auto">

              {/* Invoice Information */}
              <div>
                <div className="border-b border-teal-500 pb-1 mb-3">
                  <h2 className="text-sm font-bold text-gray-900">Invoice Info</h2>
                </div>
                <div className="space-y-2">
                  <CompactInfoRowInline label1="Invoice No" value1={invoice.invoice_no} label2="Date" value2={formatDate(invoice.invoice_date)} />
                  <CompactInfoRowInline label1="Salesman" value1={invoice.salesman?.name} label2="Created By" value2={invoice.created_by} />
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <div className="border-b border-teal-500 pb-1 mb-3">
                  <h2 className="text-sm font-bold text-gray-900">Customer Info</h2>
                </div>
                <div className="space-y-2">
                  <CompactInfoRowInline label1="Name" value1={invoice.customer?.name} label2="Code" value2={invoice.customer?.code} />
                  <CompactInfoRowInline label1="Place" value1={invoice.customer?.area} label2="Address" value2={invoice.customer?.address1} />
                  <CompactInfoRowInline label1="Phone" value1={invoice.customer?.phone1} label2="Email" value2={invoice.customer?.email} />
                </div>
              </div>

              {/* Total Amount */}
              <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg p-3 text-center">
                <p className="text-xs font-bold mb-1">Total Amount</p>
                <p className="text-2xl font-bold">₹{invoice.total_amount?.toFixed(2)}</p>
              </div>

            </div>

            {/* Right Section - 3 columns for table */}
            <div className="col-span-3 p-4 flex flex-col">

              <div className="border-b border-teal-500 pb-1 mb-3">
                <h2 className="text-sm font-bold text-gray-900">Item Details</h2>
              </div>

              {/* Table Container */}
              <div className="flex-1 flex flex-col border border-gray-300 rounded-lg overflow-hidden">

                {/* Table Header */}
                <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white flex-shrink-0">
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-bold">
                    <div className="col-span-1 text-center">Shelf</div>
                    <div className="col-span-3">Item Name</div>
                    <div className="col-span-1 text-center">Pack</div>
                    <div className="col-span-1 text-center">Qty</div>
                    <div className="col-span-1 text-right">MRP</div>
                    <div className="col-span-2 text-center">Batch No</div>
                    <div className="col-span-2 text-center">Exp</div>
                    <div className="col-span-1 text-center">Remarks</div>
                  </div>
                </div>

                {/* Table Body */}
                <div className="flex-1 divide-y divide-gray-200 overflow-y-auto">
                  {currentItems.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-2 px-3 py-2 hover:bg-gray-50 transition-colors items-center"
                    >
                      <div className="col-span-1 text-xs text-center font-semibold text-teal-700">
                        {item.shelf_location}
                      </div>

                      <div className="col-span-3 text-xs font-medium text-gray-900 overflow-hidden">
                        <div className="truncate font-semibold" title={item.name}>{item.name}</div>
                        <div className="truncate text-gray-500 text-[10px] mt-0.5" title={item.company_name}>{item.company_name || "—"}</div>
                      </div>

                      <div className="col-span-1 text-xs text-center text-gray-600 overflow-hidden">
                        <div className="truncate" title={item.packing}>{item.packing || "—"}</div>
                      </div>

                      <div className="col-span-1 text-xs text-center font-semibold text-gray-800">
                        {item.quantity}
                      </div>

                      <div className="col-span-1 text-xs font-semibold text-gray-900 text-right">
                        ₹{item.mrp?.toFixed(2)}
                      </div>

                      <div className="col-span-2 text-xs text-center text-gray-700 overflow-hidden">
                        <div className="truncate" title={item.batch_no}>{item.batch_no || "—"}</div>
                      </div>

                      <div className="col-span-2 text-xs text-center text-gray-600">
                        {formatDate(item.expiry_date)}
                      </div>

                      <div className="col-span-1 text-xs text-center text-gray-500 overflow-hidden">
                        <div className="truncate" title={item.remarks}>{item.remarks || "—"}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                  <p className="text-xs text-gray-600">
                    Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, invoice.items.length)} of {invoice.items.length}
                  </p>

                  <div className="flex items-center gap-1">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={`w-7 h-7 flex items-center justify-center rounded border text-xs transition-all
                      ${currentPage === 1
                        ? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                        : "bg-white border-gray-300 text-gray-700 hover:border-teal-500 hover:text-teal-600"}`}
                    >
                      ‹
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        onClick={() => handlePageChange(num)}
                        className={`w-7 h-7 flex items-center justify-center rounded text-xs font-semibold transition-all
                        ${currentPage === num
                          ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow"
                          : "bg-white border border-gray-300 text-gray-700 hover:border-teal-500 hover:text-teal-600"}`}
                      >
                        {num}
                      </button>
                    ))}

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={`w-7 h-7 flex items-center justify-center rounded border text-xs transition-all
                      ${currentPage === totalPages
                        ? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                        : "bg-white border-gray-300 text-gray-700 hover:border-teal-500 hover:text-teal-600"}`}
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function CompactInfoRowInline({ label1, value1, label2, value2 }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold text-gray-500 uppercase">{label1}</span>
        <div className="text-xs font-medium text-gray-900 break-words">{value1}</div>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold text-gray-500 uppercase">{label2}</span>
        <div className="text-xs font-medium text-gray-900 break-words">{value2}</div>
      </div>
    </div>
  );
}

function MobileInfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs font-semibold text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}