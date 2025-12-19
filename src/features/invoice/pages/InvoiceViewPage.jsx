import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";

export default function InvoiceViewPage() {
  const { user } = useAuth();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
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
    if(user?.role=="PICKER"){
      navigate(`/ops/picking/invoices/`);
      return;
    }
    navigate("/invoices");
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = invoice?.items?.slice(indexOfFirstItem, indexOfLastItem) || [];
  const totalPages = invoice ? Math.ceil(invoice.items.length / itemsPerPage) : 0;

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
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
        
        {/* Header with Back Button */}
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
          
          {/* Invoice Information Card */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b-2 border-teal-500">
              Invoice Information
            </h2>
            <div className="space-y-2">
              <MobileInfoRow label="Invoice Number" value={invoice.invoice_no} />
              <MobileInfoRow label="Invoice Date" value={invoice.invoice_date} />
              <MobileInfoRow label="Salesman" value={invoice.salesman?.name} />
              <MobileInfoRow label="Created By" value={invoice.created_by} />
            </div>
          </div>

          {/* Customer Information Card */}
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

          {/* Items Card */}
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
                    </div>
                    <span className="text-sm font-bold text-teal-600">Qty: {item.quantity}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">MRP:</span>
                      <span className="ml-1 font-semibold text-gray-900">₹{item.mrp?.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Batch:</span>
                      <span className="ml-1 text-gray-700">{item.batch_no || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Exp Date:</span>
                      <span className="ml-1 text-gray-700">{item.exp_date || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Remarks:</span>
                      <span className="ml-1 text-gray-700">{item.remarks || "—"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Pagination */}
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

          {/* Total Amount Card */}
          <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg p-4 text-center shadow-md">
            <p className="text-sm font-bold tracking-wider mb-1">Total Amount</p>
            <p className="text-2xl font-bold">₹{invoice.total_amount?.toFixed(2)}</p>
          </div>
        </div>

        {/* Desktop View */}
        <div className="hidden lg:block bg-white rounded-lg shadow-md">
          <div className="grid grid-cols-5 min-h-[calc(100vh-180px)]">

            {/* LEFT COLUMN */}
            <div className="col-span-2 border-r border-gray-200 p-6 space-y-6">

              {/* Invoice Information */}
              <div>
                <div className="border-b-2 border-teal-500 pb-2 mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Invoice Information</h2>
                </div>

                <div className="space-y-3">
                  <InfoRow label="Invoice Number" value={invoice.invoice_no} />
                  <InfoRow label="Invoice Date" value={invoice.invoice_date} />
                  <InfoRow label="Salesman" value={invoice.salesman?.name} />
                  <InfoRow label="Created By" value={invoice.created_by} />
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <div className="border-b-2 border-teal-500 pb-2 mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Customer Information</h2>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InfoField label="Customer Name" value={invoice.customer?.name} />
                    <InfoField label="Customer Code" value={invoice.customer?.code} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <InfoField label="Place" value={invoice.customer?.area} />
                    <InfoField label="Address" value={invoice.customer?.address1} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <InfoField label="Phone 1" value={invoice.customer?.phone1} />
                    <InfoField label="Phone 2" value={invoice.customer?.phone2} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <InfoField label="Email" value={invoice.customer?.email} />
                    <InfoField label="Area" value={invoice.customer?.area} />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="col-span-3 p-8">

              <div className="h-full flex flex-col">

                <div className="border-b-2 border-teal-500 pb-2 mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Item Details</h2>
                </div>

                {/* Table */}
                <div className="flex-1 flex flex-col border border-gray-300 rounded-lg overflow-hidden">

                  {/* Header */}
                  <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white flex-shrink-0">
                    <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-bold uppercase">
                      <div className="col-span-1 text-center">Shelf</div>
                      <div className="col-span-3">Item Name</div>
                      <div className="col-span-1 text-right">Qty</div>
                      <div className="col-span-2 text-right">MRP</div>
                      <div className="col-span-2 text-center">Batch No</div>
                      <div className="col-span-1 text-center">Exp Date</div>
                      <div className="col-span-2 text-center">Remarks</div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 divide-y divide-gray-200 overflow-y-auto">
                    {currentItems.map((item, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-12 gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        {/* Shelf */}
                        <div className="col-span-1 text-sm text-center font-semibold text-gray-700">
                          {item.shelf_location || "—"}
                        </div>

                        {/* Item Name */}
                        <div className="col-span-3 text-sm font-medium text-gray-900">
                          {item.name}
                        </div>

                        {/* Qty */}
                        <div className="col-span-1 text-sm text-right font-semibold text-gray-800">
                          {item.quantity}
                        </div>

                        {/* MRP */}
                        <div className="col-span-2 text-sm font-semibold text-gray-900 text-right">
                          ₹{item.mrp?.toFixed(2)}
                        </div>

                        {/* Batch No */}
                        <div className="col-span-2 text-sm text-center text-gray-700">
                          {item.batch_no || "—"}
                        </div>

                        {/* Exp Date */}
                        <div className="col-span-1 text-xs text-center text-gray-600">
                          {item.exp_date || "—"}
                        </div>

                        {/* Remarks */}
                        <div className="col-span-2 text-xs text-center text-gray-500 truncate">
                          {item.remarks || "—"}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-3 px-4 pb-3">
                    <p className="text-sm text-gray-600">
                      Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, invoice.items.length)} of {invoice.items.length} items
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                        className={`w-8 h-8 flex items-center justify-center rounded-md border text-sm transition-all
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
                          className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-semibold transition-all
                          ${currentPage === num
                            ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
                            : "bg-white border border-gray-300 text-gray-700 hover:border-teal-500 hover:text-teal-600"}`}
                        >
                          {num}
                        </button>
                      ))}

                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                        className={`w-8 h-8 flex items-center justify-center rounded-md border text-sm transition-all
                        ${currentPage === totalPages
                          ? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                          : "bg-white border-gray-300 text-gray-700 hover:border-teal-500 hover:text-teal-600"}`}
                      >
                        ›
                      </button>
                    </div>
                  </div>
                </div>

                {/* Total Amount */}
                <div className="mt-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg px-6 py-4 text-center shadow-md flex-shrink-0">
                  <p className="text-m font-bold tracking-wider mb-1">Total Amount</p>
                  <p className="text-3xl font-bold">₹{invoice.total_amount?.toFixed(2)}</p>
                </div>

              </div>
            </div>  

          </div>
        </div>

      </div>
    </div>
  );
}


// Components
function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs font-semibold text-gray-500 uppercase">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">{label}</label>
      <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
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