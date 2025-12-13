import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";

export default function InvoiceViewPage() {
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
    navigate("/invoice");
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
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600 text-lg">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-600">Invoice not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <br />

      <div className="flex-1 overflow-auto">

        {/* Back Button */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={handleBack}
            className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        </div>

        <div className="h-full">

          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg px-8 py-5">
            <h1 className="text-3xl font-bold text-white-800 mb-2">Invoice Management</h1>
          </div>

          {/* Content Grid */}
          <div className="bg-white">
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
                        <div className="col-span-4">Item Name</div>
                        <div className="col-span-2 text-right">Qty</div>
                        <div className="col-span-2 text-center">MRP</div>
                        <div className="col-span-2 text-center">Shelf</div>
                        <div className="col-span-2 text-left">Remarks</div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 divide-y divide-gray-200 overflow-y-auto">
                      {currentItems.map((item, index) => (
                        <div key={index} className="grid grid-cols-12 gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                          <div className="col-span-4 text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="col-span-2 text-sm text-gray-700 font-semibold text-right">{item.quantity}</div>
                          <div className="col-span-2 text-sm font-semibold text-gray-900 text-right">
                            Rs.{item.mrp?.toFixed(2)}
                          </div>
                          <div className="col-span-2 text-sm text-gray-600 text-center">
                            {item.shelf_location || "N/A"}
                          </div>
                          <div className="col-span-2 text-xs text-gray-500 text-left">{item.remarks}</div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between mt-3">
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
                    <p className="text-3xl font-bold">Rs.{invoice.total_amount?.toFixed(2)}</p>
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
