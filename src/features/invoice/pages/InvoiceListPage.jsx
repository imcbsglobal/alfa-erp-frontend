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

  // Load invoices - Replace with your API call
  useEffect(() => {
    const eventSource = new EventSource("http://localhost:8000/api/sales/sse/invoices/", {
      withCredentials: true
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        setInvoices((prev) => {
          const idx = prev.findIndex(x => x.id === data.id);
          if (idx === -1) return prev;

          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...data };
          return updated;
        });
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
    };

    return () => eventSource.close();
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      // TODO: Replace with your actual API call
      // const response = await getInvoices();
      // setInvoices(response.data.results);
      
      // Mock data for demonstration
      const mockData = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        invoice_number: `INV-2024-${String(i + 1).padStart(4, '0')}`,
        invoice_date: `2024-10-${String((i % 30) + 1).padStart(2, '0')}`,
        customer_name: `Customer ${i + 1}`,
        customer_code: `CUST${String(i + 1).padStart(3, '0')}`,
        sales_man: `Sales Person ${(i % 5) + 1}`,
        created_user: `User ${(i % 3) + 1}`,
        place: `City ${(i % 10) + 1}`,
        total_amount: (Math.random() * 10000 + 500).toFixed(2),
        status: ['Pending', 'Picked', 'ReadyForPacking'][i % 3]
      }));
      
      setInvoices(mockData);
      setFilteredInvoices(mockData);
    } catch (err) {
      console.error("Failed to load invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  // Get unique values for filter dropdowns
  const getUniqueCustomers = () => {
    return [...new Set(invoices.map(inv => inv.customer_name))].sort();
  };

  const getUniqueSalesPeople = () => {
    return [...new Set(invoices.map(inv => inv.sales_man))].sort();
  };

  // Combined search and filter logic
  useEffect(() => {
    let filtered = [...invoices];

    // Search term filter
    if (searchTerm) {
      filtered = filtered.filter(
        (invoice) =>
          invoice.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.customer_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          invoice.sales_man?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Invoice Number filter
    if (filters.invoiceNumber) {
      filtered = filtered.filter(invoice =>
        invoice.invoice_number.toLowerCase().includes(filters.invoiceNumber.toLowerCase())
      );
    }

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(invoice =>
        invoice.invoice_date >= filters.dateFrom
      );
    }
    if (filters.dateTo) {
      filtered = filtered.filter(invoice =>
        invoice.invoice_date <= filters.dateTo
      );
    }

    // Customer filter
    if (filters.customer) {
      filtered = filtered.filter(invoice =>
        invoice.customer_name === filters.customer
      );
    }

    // Sales Person filter
    if (filters.salesPerson) {
      filtered = filtered.filter(invoice =>
        invoice.sales_man === filters.salesPerson
      );
    }

    setFilteredInvoices(filtered);
    setCurrentPage(1);
  }, [invoices, searchTerm, filters]);

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Clear all filters
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

  // Check if any filter is active
  const hasActiveFilters = () => {
    return Object.values(filters).some(value => value !== "") || searchTerm !== "";
  };

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
            <p className="text-gray-600">
              View and manage all invoices
            </p>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          {/* Search Bar and Clear Button */}
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
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
            {/* Invoice Number Filter */}
            <div>
              <input
                type="text"
                value={filters.invoiceNumber}
                onChange={(e) => handleFilterChange("invoiceNumber", e.target.value)}
                placeholder="Invoice Number"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            {/* Date From Filter */}
            <div>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                placeholder="Date From"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            {/* Date To Filter */}
            <div>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                placeholder="Date To"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            {/* Customer Filter */}
            <div>
              <select
                value={filters.customer}
                onChange={(e) => handleFilterChange("customer", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">All Customers</option>
                {getUniqueCustomers().map((customer) => (
                  <option key={customer} value={customer}>
                    {customer}
                  </option>
                ))}
              </select>
            </div>

            {/* Sales Person Filter */}
            <div>
              <select
                value={filters.salesPerson}
                onChange={(e) => handleFilterChange("salesPerson", e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value="">All Sales People</option>
                {getUniqueSalesPeople().map((person) => (
                  <option key={person} value={person}>
                    {person}
                  </option>
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
                <svg
                  className="animate-spin h-10 w-10 text-teal-500 mx-auto mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <p className="text-gray-600">Loading invoices...</p>
              </div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-20">
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No invoices found
              </h3>
              <p className="text-gray-500">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">
                        Invoice Number
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">
                        Customer
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">
                        Sales Person
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-white">
                        Amount
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-800">
                            {invoice.invoice_number}
                          </p>
                          <p className="text-xs text-gray-500">
                            {invoice.customer_code}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-600">
                          {invoice.invoice_date}
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-800">
                            {invoice.customer_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {invoice.place}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-600">
                          {invoice.sales_man}
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-semibold text-right text-gray-800">
                            ${invoice.total_amount}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full border text-xs font-bold ${getStatusBadgeColor(
                              invoice.status
                            )}`}
                          >
                            {invoice.status}
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