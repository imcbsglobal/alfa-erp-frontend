import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}-${m}-${y}`;
}

export default function BillingInvoiceViewPage() {
  const { user } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const navigate = useNavigate();
  const location = useLocation();
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
    const from = location.state?.from;

    if (from) {
      navigate(from);
    } else {
      navigate("/billing/invoices");
    }
  };  

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = invoice?.items?.slice(indexOfFirstItem, indexOfLastItem) || [];
  const totalPages = invoice ? Math.ceil(invoice.items.length / itemsPerPage) : 0;

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return "—";
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

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

  const getWorkflowInfo = (inv) => {
    const rows = [];

    if (inv.picker_info) {
      const pickerValue = `${inv.picker_info.name} (${inv.picker_info.email}) • ${formatDateTime(inv.picker_info.end_time)}`;
      rows.push({
        label: "Picked By",
        value: pickerValue,
      });
    }

    if (inv.packer_info) {
      const packerValue = `${inv.packer_info.name} (${inv.packer_info.email}) • ${formatDateTime(inv.packer_info.end_time)}`;
      rows.push({
        label: "Packed By",
        value: packerValue,
      });
    }

    if (inv.delivery_info) {
      let v = `${inv.delivery_info.name || inv.delivery_info.email || "—"}`;
      if (inv.delivery_info.delivery_type) {
        v += ` • ${inv.delivery_info.delivery_type}`;
      }
      if (inv.delivery_info.start_time) {
        v += ` • ${formatDateTime(inv.delivery_info.start_time)}`;
      }
      rows.push({
        label: "Dispatched By",
        value: v,
      });
    }

    return rows;
  };

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
              <MobileInfoRow
                label="Date & Time"
                value={`${formatDate(invoice.invoice_date)} & ${formatDateTime(invoice.created_at)}`}
              />
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

          {getWorkflowInfo(invoice).length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b-2 border-teal-500">
                Workflow Details
              </h2>
              <div className="space-y-2">
                {getWorkflowInfo(invoice).map((r, i) => (
                  <MobileInfoRow key={i} label={r.label} value={r.value} />
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b-2 border-teal-500">
              Item Details ({invoice.items.length})
            </h2>
            
            <div className="space-y-3">
              {currentItems.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                      <p className="text-xs text-gray-500">Shelf: {item.shelf_location || "—"}</p>
                      {item.company_name && (
                        <p className="text-xs text-gray-500">Company: {item.company_name}</p>
                      )}
                      {item.packing && (
                        <p className="text-xs text-gray-500">Pack: {item.packing}</p>
                      )}
                    </div>
                    <span className="text-sm font-bold text-teal-600">Qty: {item.quantity}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">MRP:</span>
                      <span className="ml-1 font-semibold text-gray-900">{item.mrp != null ? Number(item.mrp).toFixed(2) : '0.00'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Batch:</span>
                      <span className="ml-1 text-gray-700">{item.batch_no || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Exp Date:</span>
                      <span className="ml-1 text-gray-700">{formatDate(item.expiry_date)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Remarks:</span>
                      <span className="ml-1 text-gray-700">{item.remarks || "—"}</span>
                    </div>
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
            <p className="text-2xl font-bold">{invoice.total != null ? Number(invoice.total).toFixed(2) : '0.00'}</p>
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
                  <CompactInfoRowInline label1="Invoice No"value1={invoice.invoice_no}label2="Date & Time"value2={`${formatDate(invoice.invoice_date)} & ${formatDateTime(invoice.created_at)}`}/>
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

              {/* Workflow Details */}
              {getWorkflowInfo(invoice).length > 0 && (
                <div>
                  <div className="border-b border-teal-500 pb-1 mb-3">
                    <h2 className="text-sm font-bold text-gray-900">
                      Workflow Details
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {getWorkflowInfo(invoice).map((r, i) => (
                      <CompactInfoRowInline
                        key={i}
                        label1={r.label}
                        value1={r.value}
                        label2=""
                        value2=""
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Total Amount */}
              <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg p-3 text-center">
                <p className="text-xs font-bold mb-1">Total Amount</p>
                <p className="text-2xl font-bold">{invoice.total != null ? Number(invoice.total).toFixed(2) : '0.00'}</p>
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
                        {item.mrp != null ? Number(item.mrp).toFixed(2) : '0.00'}
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