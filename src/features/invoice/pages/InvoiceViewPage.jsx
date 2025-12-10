import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function InvoiceViewPage() {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const navigate = useNavigate();

  useEffect(() => {
    loadInvoice();

    const eventSource = new EventSource(`http://localhost:8000/api/sales/sse/invoices/`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id == invoice?.id) {
        setInvoice(prev => ({ ...prev, ...data }));
      }
    };

    return () => eventSource.close();
  }, []);

  const loadInvoice = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration
      const mockInvoice = {
        id: "1",
        invoice_number: `INV-2024-0001`,
        invoice_date: "2024-10-30",
        customer_name: "Alpha Enterprises",
        customer_code: "CUST001",
        sales_man: "Nova Tx7",
        place: "123m Blue",
        address_1: "Suite 400",
        address_2: "Manhattan District",
        phone_1: "+1 (555) 123-4567",
        phone_2: "+1 (555) 987-6543",
        email: "contact@alpha.com",
        area: "Manhattan",
        created_user: "Jane Smith",
        created_by: "Jane Smith",
        total_amount: 575.00,
        items: [
          {
            item_name: "Product A",
            quantity: 10,
            mrp: 15.00,
            shelf: "A-01",
            remarks: "Bulk purchase"
          },
          {
            item_name: "Product B",
            quantity: 5,
            mrp: 28.00,
            shelf: "B-02",
            remarks: "Discounted"
          },
          {
            item_name: "Service C",
            quantity: 1,
            mrp: 8.00,
            shelf: "N/A",
            remarks: "Standard"
          },
          {
            item_name: "Service D",
            quantity: 2,
            mrp: 190.00,
            shelf: "N/A",
            remarks: "Consultation fee"
          },
          {
            item_name: "Product D",
            quantity: 20,
            mrp: 3.00,
            shelf: "C-05",
            remarks: "New client offer"
          },
          {
            item_name: "Product E",
            quantity: 3,
            mrp: 45.00,
            shelf: "A-12",
            remarks: "Premium"
          },
          {
            item_name: "Product D",
            quantity: 20,
            mrp: 3.00,
            shelf: "C-05",
            remarks: "New client offer"
          },
          {
            item_name: "Product E",
            quantity: 3,
            mrp: 45.00,
            shelf: "A-12",
            remarks: "Premium"
          },
          {
            item_name: "Product E",
            quantity: 3,
            mrp: 45.00,
            shelf: "A-12",
            remarks: "Premium"
          },
          {
            item_name: "Product D",
            quantity: 20,
            mrp: 3.00,
            shelf: "C-05",
            remarks: "New client offer"
          }
        ]
      };

      setTimeout(() => {
        setInvoice(mockInvoice);
        setLoading(false);
      }, 500);
    } catch (err) {
      console.error("Failed to load invoice:", err);
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/invoice");
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = invoice?.items.slice(indexOfFirstItem, indexOfLastItem) || [];
  const totalPages = invoice ? Math.ceil(invoice.items.length / itemsPerPage) : 0;

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

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
      <br></br>
      {/* Main Content - Single View */}
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
            <h1 className="text-3xl font-bold text-white-800 mb-2">
              Invoice Management
            </h1>
          </div>

          {/* Content Grid - 2:3 Ratio */}
          <div className="bg-white">
            <div className="grid grid-cols-5 min-h-[calc(100vh-180px)]">
              
              {/* LEFT COLUMN - 2/5 */}
              <div className="col-span-2 border-r border-gray-200 p-6 space-y-6">
                
                {/* Invoice Information */}
                <div>
                  <div className="border-b-2 border-teal-500 pb-2 mb-4">
                    <h2 className="text-xl font-bold text-gray-900 ">
                      Invoice Information
                    </h2>
                  </div>
                  
                  <div className="space-y-3">
                    <InfoRow label="Invoice Number" value={invoice.invoice_number} />
                    <InfoRow label="Invoice Date" value={invoice.invoice_date} />
                    <InfoRow label="Salesman" value={invoice.sales_man} />
                    <InfoRow label="Created User" value={invoice.created_user} />
                    <InfoRow label="Created By" value={invoice.created_by} />
                  </div>
                </div>

                {/* Customer Information */}
                <div>
                  <div className="border-b-2 border-teal-500 pb-2 mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      Customer Information
                    </h2>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <InfoField label="Customer Name" value={invoice.customer_name} />
                      <InfoField label="Customer Code" value={invoice.customer_code} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <InfoField label="Place" value={invoice.place} />
                      <InfoField label="Address" value={invoice.address_1} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <InfoField label="Phone 1" value={invoice.phone_1} />
                      <InfoField label="Phone 2" value={invoice.phone_2} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <InfoField label="Email" value={invoice.email} />
                      <InfoField label="Area" value={invoice.area} />
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT COLUMN - 3/5 */}
              <div className="col-span-3 p-8">
                {/* Item Details */}
                <div className="h-full flex flex-col">
                  <div className="border-b-2 border-teal-500 pb-2 mb-4">
                    <h2 className="text-xl font-bold text-gray-900">
                      Item Details
                    </h2>
                  </div>

                  {/* Table */}
                  <div className="flex-1 flex flex-col border border-gray-300 rounded-lg overflow-hidden">
                    {/* Table Header */}
                    <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white flex-shrink-0">
                      <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs font-bold uppercase">
                        <div className="col-span-4">Item Name</div>
                        <div className="col-span-2 text-right">Qty</div>
                        <div className="col-span-2 text-center">MRP</div>
                        <div className="col-span-2 text-center">Shelf</div>
                        <div className="col-span-2 text-left">Remarks</div>
                      </div>
                    </div>

                    {/* Table Body - Scrollable */}
                    <div className="flex-1 divide-y divide-gray-200 overflow-y-auto">
                      {currentItems.map((item, index) => (
                        <div 
                          key={index} 
                          className="grid grid-cols-12 gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="col-span-4 text-sm font-medium text-gray-900">
                            {item.item_name}
                          </div>
                          <div className="col-span-2 text-sm text-gray-700 font-semibold text-right">
                            {item.quantity}
                          </div>
                          <div className="col-span-2 text-sm font-semibold text-gray-900 text-right">
                            ${item.mrp.toFixed(2)}
                          </div>
                          <div className="col-span-2 text-sm text-gray-600 text-center">
                            {item.shelf || 'N/A'}
                          </div>
                          <div className="col-span-2 text-xs text-gray-500 text-left">
                            {item.remarks}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Pagination & Row Count */}
                    <div className="flex items-center justify-between mt-3">

                      {/* Showing text */}
                      <p className="text-sm text-gray-600">
                        Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, invoice.items.length)} of {invoice.items.length} items
                      </p>

                      {/* Pagination */}
                      <div className="flex items-center gap-2">

                        {/* Prev */}
                        <button
                          disabled={currentPage === 1}
                          onClick={() => handlePageChange(currentPage - 1)}
                          className={`w-8 h-8 flex items-center justify-center rounded-md border text-sm transition-all
                            ${currentPage === 1
                              ? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                              : "bg-white border-gray-300 text-gray-700 hover:border-teal-500 hover:text-teal-600"}
                          `}
                        >
                          ‹
                        </button>

                        {/* Page Numbers */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                          <button
                            key={num}
                            onClick={() => handlePageChange(num)}
                            className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-semibold transition-all
                              ${currentPage === num
                                ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
                                : "bg-white border border-gray-300 text-gray-700 hover:border-teal-500 hover:text-teal-600"}
                            `}
                          >
                            {num}
                          </button>
                        ))}

                        {/* Next */}
                        <button
                          disabled={currentPage === totalPages}
                          onClick={() => handlePageChange(currentPage + 1)}
                          className={`w-8 h-8 flex items-center justify-center rounded-md border text-sm transition-all
                            ${currentPage === totalPages
                              ? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                              : "bg-white border-gray-300 text-gray-700 hover:border-teal-500 hover:text-teal-600"}
                          `}
                        >
                          ›
                        </button>

                      </div>
                    </div>
                  </div>

                  {/* Total Amount */}
                  <div className="mt-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg px-6 py-4 text-center shadow-md flex-shrink-0">
                    <p className="text-m font-bold tracking-wider mb-1">
                      Total Amount
                    </p>
                    <p className="text-3xl font-bold">
                      ${invoice.total_amount.toFixed(2)}
                    </p>
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

// Reusable Info Row Component
function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs font-semibold text-gray-500 uppercase">
        {label}
      </span>
      <span className="text-sm font-semibold text-gray-900">
        {value}
      </span>
    </div>
  );
}

// Reusable Info Field Component
function InfoField({ label, value }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">
        {label}
      </label>
      <p className="text-sm font-medium text-gray-900 truncate">
        {value}
      </p>
    </div>
  );
}