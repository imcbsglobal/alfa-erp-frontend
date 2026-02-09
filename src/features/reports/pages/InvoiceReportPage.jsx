import { useState, useEffect, useRef } from "react";
import { getInvoiceReport } from "../../../services/sales";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import { formatDateDDMMYYYY, formatDateTime, formatNumber } from '../../../utils/formatters';
import { X } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export default function InvoiceReportPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const searchInputRef = useRef(null);

  // Auto-focus search input on page load
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Load invoices when filters change
  useEffect(() => {
    loadInvoices();
  }, [currentPage, itemsPerPage, statusFilter, dateFilter]);

  // SSE Live Updates for real-time invoice changes
  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE_URL}/sales/sse/invoices/`);

    eventSource.onmessage = (event) => {
      try {
        const invoice = JSON.parse(event.data);
        
        // Check if invoice matches current filters
        const matchesStatus = !statusFilter || invoice.status === statusFilter;
        
        const matchesDate = !dateFilter || 
          invoice.created_at?.startsWith(dateFilter);

        if (matchesStatus && matchesDate) {
          setInvoices(prev => {
            const exists = prev.find(inv => inv.id === invoice.id);
            if (exists) {
              // Update existing invoice
              return prev.map(inv => inv.id === invoice.id ? invoice : inv);
            } else {
              // Add new invoice at the top
              return [invoice, ...prev];
            }
          });
          
          // Update total count
          setTotalCount(prev => prev + 1);
        }
      } catch (e) {
        console.error("Invalid SSE invoice:", e);
      }
    };

    eventSource.onerror = () => {
      // SSE connection closed - normal behavior during server restarts or timeouts
      eventSource.close();
    };

    return () => eventSource.close();
  }, [statusFilter, dateFilter]); // Re-subscribe when filters change

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        page_size: itemsPerPage,
      };

      if (statusFilter) {
        params.status = statusFilter;
      }

      if (dateFilter) {
        params.start_date = dateFilter;
        params.end_date = dateFilter; // Same date for single day filter
      }

      const res = await getInvoiceReport(params);
      setInvoices(res.data.results || []);
      setTotalCount(res.data.count || 0);
    } catch (err) {
      console.error("❌ Failed to load invoice report:", err);
      toast.error("Failed to load invoice report");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleRefresh = () => {
    loadInvoices();
    toast.success("Report refreshed");
  };

  const handleRowsPerPageChange = (e) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1); // Reset to first page
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800">
              Invoice Reports
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Date:</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => {
                    setDateFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>

              {/* Rows Per Page Selector */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Rows:</label>
                <select
                  value={itemsPerPage}
                  onChange={handleRowsPerPageChange}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white min-w-[80px]"
                >
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all whitespace-nowrap"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-500">
              Loading report...
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              No invoices found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Invoice No
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Created By
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        Customer Name
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoices.map((inv, index) => (
                      <tr
                        key={inv.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {inv.invoice_no}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {inv.salesman?.name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {formatDateTime(inv.created_at)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <p>{inv.customer?.name || inv.temp_name || 'N/A'}</p>
                          <p className="text-xs text-gray-500">
                            {inv.customer?.area || inv.customer?.address1 || inv.temp_name || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                          ₹{formatNumber(inv.Total, 2, '0.00')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalItems={totalCount}
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
