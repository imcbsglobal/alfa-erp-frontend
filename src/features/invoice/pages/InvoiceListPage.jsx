// src/features/invoice/pages/InvoiceListPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function InvoiceListPage() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Filter states
  const [filters, setFilters] = useState({
    invoiceNumber: "",
    dateFrom: "",
    dateTo: "",
    customer: "",
    salesPerson: "",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Load invoices
  useEffect(() => {
    loadInvoices();
  }, []);

  // 🔥 SSE Live Updates
  useEffect(() => {
    const eventSource = new EventSource("http://localhost:8000/api/sales/sse/invoices/");

    eventSource.onmessage = (event) => {
      try {
        const invoice = JSON.parse(event.data);

        setInvoices((prev) => [invoice, ...prev]);
        setFilteredInvoices((prev) => [invoice, ...prev]);
      } catch (e) {
        console.error("Invalid SSE invoice:", e);
      }
    };

    eventSource.onerror = () => {
      console.error("SSE connection lost");
      eventSource.close();
    };

    return () => eventSource.close();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/sales/invoices/");
      const data = await res.json();

      setInvoices(data.results || []);
      setFilteredInvoices(data.results || []);
    } catch (err) {
      console.error("Failed to load invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  // Unique dropdown values
  const getUniqueCustomers = () => {
    return [...new Set(invoices.map(inv => inv.customer?.name))].sort();
  };

  const getUniqueSalesPeople = () => {
    return [...new Set(invoices.map(inv => inv.salesman?.name))].sort();
  };

  // Combined search + filter logic
  useEffect(() => {
    let filtered = [...invoices];

    // Search term
    if (searchTerm) {
      filtered = filtered.filter((invoice) =>
        invoice.invoice_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customer?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.salesman?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Invoice Number filter
    if (filters.invoiceNumber) {
      filtered = filtered.filter(inv =>
        inv.invoice_no.toLowerCase().includes(filters.invoiceNumber.toLowerCase())
      );
    }

    // Date range
    if (filters.dateFrom) {
      filtered = filtered.filter(inv => inv.invoice_date >= filters.dateFrom);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(inv => inv.invoice_date <= filters.dateTo);
    }

    // Customer filter
    if (filters.customer) {
      filtered = filtered.filter(inv => inv.customer?.name === filters.customer);
    }

    // Sales Person filter
    if (filters.salesPerson) {
      filtered = filtered.filter(inv => inv.salesman?.name === filters.salesPerson);
    }

    setFilteredInvoices(filtered);
    setCurrentPage(1);
  }, [invoices, searchTerm, filters]);

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({
      invoiceNumber: "",
      dateFrom: "",
      dateTo: "",
      customer: "",
      salesPerson: "",
    });
    setSearchTerm("");
  };

  const hasActiveFilters = () => {
    return Object.values(filters).some(v => v !== "") || searchTerm !== "";
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewInvoice = (id) => {
    navigate(`/invoice/view/${id}`);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Picked":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "ReadyForPacking":
        return "bg-purple-100 text-purple-700 border-purple-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  // Pagination UI renderer (unchanged)
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredInvoices.length)} of {filteredInvoices.length} invoices
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-2 rounded-lg font-medium transition-all ${
                currentPage === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-teal-50 hover:text-teal-600 border border-gray-300"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {startPage > 1 && (
              <>
                <button
                  onClick={() => handlePageChange(1)}
                  className="px-4 py-2 rounded-lg font-medium bg-white text-gray-700 hover:bg-teal-50 hover:text-teal-600 border border-gray-300 transition-all"
                >
                  1
                </button>
                {startPage > 2 && <span className="text-gray-400">...</span>}
              </>
            )}

            {pageNumbers.map((number) => (
              <button
                key={number}
                onClick={() => handlePageChange(number)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  currentPage === number
                    ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-teal-50 hover:text-teal-600 border border-gray-300"
                }`}
              >
                {number}
              </button>
            ))}

            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && <span className="text-gray-400">...</span>}
                <button
                  onClick={() => handlePageChange(totalPages)}
                  className="px-4 py-2 rounded-lg font-medium bg-white text-gray-700 hover:bg-teal-50 hover:text-teal-600 border border-gray-300 transition-all"
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 rounded-lg font-medium transition-all ${
                currentPage === totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-teal-50 hover:text-teal-600 border border-gray-300"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Invoice Management
            </h1>
            <p className="text-gray-600">View and manage all invoices</p>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by invoice number, customer name, code, or sales person..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
            </div>

            {hasActiveFilters() && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition-all border border-red-200 whitespace-nowrap"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear All
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <input
                type="text"
                value={filters.invoiceNumber}
                onChange={(e) => handleFilterChange("invoiceNumber", e.target.value)}
                placeholder="Invoice Number"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <select
                value={filters.customer}
                onChange={(e) => handleFilterChange("customer", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">All Customers</option>
                {getUniqueCustomers().map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={filters.salesPerson}
                onChange={(e) => handleFilterChange("salesPerson", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">All Sales People</option>
                {getUniqueSalesPeople().map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <svg className="animate-spin h-10 w-10 text-teal-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">Loading invoices...</p>
              </div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-20">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No invoices found</h3>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">Invoice Number</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">Customer</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">Sales Person</th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-white">Amount</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-800">{invoice.invoice_no}</p>
                          <p className="text-xs text-gray-500">{invoice.customer?.code}</p>
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-600">
                          {invoice.invoice_date}
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-800">
                            {invoice.customer?.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {invoice.customer?.area}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-600">
                          {invoice.salesman?.name}
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-semibold text-right text-gray-800">
                            ₹{invoice.total_amount}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          <span className="px-3 py-1 rounded-full border text-xs font-bold bg-blue-100 text-blue-700 border-blue-200">
                            READY
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleViewInvoice(invoice.id)}
                            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
                          >
                            View
                          </button>
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
