import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";
import Pagination from "../../../components/Pagination";
import { formatDateDDMMYYYY, formatDateTime } from '../../../utils/formatters';
import { Clock, Package, RefreshCw } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export default function PendingInvoicesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef(null);
  const itemsPerPage = 15;

  // Auto-focus search input on page load
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    loadPendingInvoices();
  }, []);

  // SSE Live Updates - Remove invoice when picked
  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE_URL}/sales/sse/invoices/`);

    eventSource.onmessage = (event) => {
      try {
        const invoice = JSON.parse(event.data);
        
        // If invoice status is INVOICED, add/update it in the list
        if (invoice.status === "INVOICED") {
          setInvoices(prev => {
            const exists = prev.find(inv => inv.id === invoice.id);
            if (exists) {
              return prev.map(inv => inv.id === invoice.id ? invoice : inv);
            }
            const updated = [invoice, ...prev];
            return updated.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
          });
        } else {
          // Remove invoice if status changed from INVOICED (e.g., picked)
          setInvoices(prev => prev.filter(inv => inv.id !== invoice.id));
        }
      } catch (e) {
        console.error("Invalid SSE invoice:", e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, []);

  const loadPendingInvoices = async () => {
    setLoading(true);
    try {
      let allInvoices = [];
      let nextUrl = "/sales/invoices/?status=INVOICED&page_size=100";
      
      // Fetch all pages
      while (nextUrl) {
        const res = await api.get(nextUrl);
        const results = res.data.results || [];
        allInvoices = [...allInvoices, ...results];
        
        // Get next page URL
        nextUrl = res.data.next;
        if (nextUrl) {
          const urlObj = new URL(nextUrl, window.location.origin);
          nextUrl = urlObj.pathname.replace(/^\/api/, '') + urlObj.search;
        }
      }

      setInvoices(allInvoices);
      console.log('📊 Total pending invoices loaded:', allInvoices.length);
    } catch (err) {
      console.error("❌ Failed to load pending invoices:", err);
      toast.error("Failed to load pending invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadPendingInvoices();
    toast.success("Refreshed successfully");
  };

  const handleInvoiceClick = (invoice) => {
    navigate(`/invoices/view/${invoice.id}`, { state: { fromPendingInvoices: true } });
  };

  // Filter and search logic
  const filteredInvoices = invoices.filter(invoice => {
    const matchSearch = searchTerm === '' || 
      invoice.invoice_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer?.customer_code?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIdx, startIdx + itemsPerPage);

  // Calculate age of invoice
  const calculateInvoiceAge = (createdAt) => {
    if (!createdAt) return 'N/A';
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now - created;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h`;
    }
    return `${diffHours}h`;
  };

  const getAgeColor = (createdAt) => {
    if (!createdAt) return 'text-gray-600';
    const created = new Date(createdAt);
    const now = new Date();
    const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 2) return 'text-red-600 font-bold';
    if (diffDays >= 1) return 'text-orange-600 font-semibold';
    return 'text-blue-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Hold/Pending Invoices</h1>
              <p className="text-gray-600 text-sm mt-1">Invoices awaiting picking assignment</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-64">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search invoice or customer..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 w-full text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
              >
                <RefreshCw className={`w-4 h-4 inline mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Invoice Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-500">
              Loading invoices...
            </div>
          ) : paginatedInvoices.length === 0 ? (
            <div className="py-20 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100 rounded-full mb-4">
                <Package className="w-8 h-8 text-teal-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Pending Invoices</h3>
              <p className="text-gray-600">All invoices have been assigned for picking!</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">Invoice</th>
                      <th className="px-4 py-3 text-left">Customer</th>
                      <th className="px-4 py-3 text-left">Created Date/Time</th>
                      <th className="px-4 py-3 text-left">Delay</th>
                      <th className="px-4 py-3 text-left">Items</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedInvoices.map((invoice) => (
                      <tr
                        key={invoice.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleInvoiceClick(invoice)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500" />
                            <div>
                              <p className="font-semibold text-gray-900">{invoice.invoice_no}</p>
                              <p className="text-xs text-gray-500">{invoice.customer?.customer_code || ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{invoice.customer?.name || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{invoice.customer?.area || invoice.customer?.address1 || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm">
                            {formatDateDDMMYYYY(invoice.created_at)}{' '}
                            <span className="text-gray-500">{new Date(invoice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-semibold ${getAgeColor(invoice.created_at)}`}>
                            {calculateInvoiceAge(invoice.created_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">{invoice.items?.length || 0}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInvoiceClick(invoice);
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredInvoices.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  label="invoices"
                  colorScheme="teal"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
