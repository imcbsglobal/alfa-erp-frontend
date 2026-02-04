import React, { useState, useEffect } from 'react';
import { Package, Eye, RefreshCw, User, Mail, Clock, X } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Pagination from "../../../components/Pagination";
import ActiveUsersDock from '../../../components/ActiveUsersDock';
import { formatNumber, formatAmount, formatDateTime } from '../../../utils/formatters';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const CompanyDeliveryListPage = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const itemsPerPage = 10;

  useEffect(() => {
    loadCompanyDeliveries();

    // Listen for data clear events from developer settings
    const handleDataCleared = (event) => {
      const { tableName } = event.detail;
      if (tableName === 'all' || tableName === 'delivery_sessions') {
        console.log('🔄 Data cleared - reloading company deliveries...');
        loadCompanyDeliveries();
      }
    };

    window.addEventListener('dataCleared', handleDataCleared);
    return () => window.removeEventListener('dataCleared', handleDataCleared);
  }, []);

  // SSE live updates for company delivery assignments
  useEffect(() => {
    let es = null;
    let reconnectTimeout = null;
    let reconnectAttempts = 0;
    const maxReconnectDelay = 30000;
    const baseDelay = 1000;

    const connect = () => {
      if (es) es.close();

      es = new EventSource(`${API_BASE_URL}/sales/sse/invoices/`);

      es.onmessage = (event) => {
        reconnectAttempts = 0;
        try {
          const data = JSON.parse(event.data);

          if (!data.invoice_no) return;

          // Reload when company delivery is assigned
          if (data.delivery_type === 'INTERNAL' && 
              data.delivery_status === 'TO_CONSIDER') {
            console.log('🏢 Company delivery update:', data.invoice_no);
            loadCompanyDeliveries();
          }
        } catch (e) {
          console.error('Company delivery SSE parse error:', e);
        }
      };

      es.onerror = () => {
        es.close();
        reconnectAttempts++;
        const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts), maxReconnectDelay);
        reconnectTimeout = setTimeout(() => connect(), delay);
      };
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (es) es.close();
    };
  }, []); // Empty dependency - SSE monitors global company delivery updates

  const loadCompanyDeliveries = async () => {
    setLoading(true);
    try {
      let allDeliveries = [];
      let nextUrl = '/sales/delivery/consider-list/?delivery_type=INTERNAL&status=TO_CONSIDER&page_size=100';
      
      // Fetch all pages
      while (nextUrl) {
        const res = await api.get(nextUrl);
        const results = res.data.results || [];
        allDeliveries = [...allDeliveries, ...results];
        
        // Get next page URL
        nextUrl = res.data.next;
        if (nextUrl) {
          const urlObj = new URL(nextUrl, window.location.origin);
          nextUrl = urlObj.pathname.replace(/^\/api/, '') + urlObj.search;
        }
      }
      
      setDeliveries(allDeliveries);
      console.log('📊 Total company deliveries loaded:', allDeliveries.length);
    } catch (error) {
      console.error('Failed to load company deliveries:', error);
      toast.error('Failed to load company deliveries');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadCompanyDeliveries();
    toast.success('Deliveries refreshed');
  };

  const handleViewInvoice = (billId) => {
    navigate(`/delivery/invoices/view/${billId}/company-delivery`);
  };

  const getTimeSinceAssignment = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const assigned = new Date(dateString);
    const diffMs = now - assigned;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Filter by search term (client-side filtering)
  const filteredDeliveries = deliveries.filter(delivery => {
    if (!searchTerm.trim()) return true;
    const search = searchTerm.toLowerCase();
    return (
      delivery.invoice_no?.toLowerCase().includes(search) ||
      delivery.customer?.name?.toLowerCase().includes(search) ||
      delivery.customer?.code?.toLowerCase().includes(search) ||
      delivery.delivery_info?.delivery_user_name?.toLowerCase().includes(search) ||
      delivery.delivery_info?.delivery_user_email?.toLowerCase().includes(search)
    );
  });

  // Pagination
  const totalCount = filteredDeliveries.length;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDeliveries.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header - Responsive */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Company Delivery - Consider List
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search invoice, customer, or staff..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 w-full sm:w-64 text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="py-20 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent mb-4"></div>
              <p className="text-gray-500">Loading deliveries...</p>
            </div>
          ) : filteredDeliveries.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-lg font-medium">No company deliveries in consider list</p>
              <p className="text-sm text-gray-400 mt-2">
                {searchTerm ? 'Try adjusting your search' : 'Assigned deliveries will appear here'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Invoice</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Customer</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Contact</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Assigned Staff</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Assigned At</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentItems.map((delivery) => {
                      const isInProgress = delivery.delivery_info?.start_time && !delivery.delivery_info?.end_time;
                      const isPending = !delivery.delivery_info?.start_time;
                      
                      return (
                        <tr key={delivery.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{delivery.invoice_no}</p>
                            <p className="text-xs text-gray-500">
                              {delivery.customer?.code}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{delivery.customer?.name || '—'}</p>
                            <p className="text-xs text-gray-500">{delivery.customer?.area || delivery.customer?.address1 || delivery.temp_name || ''}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">{delivery.customer?.phone1 || '—'}</p>
                            {delivery.customer?.email && (
                              <p className="text-xs text-gray-500">{delivery.customer.email}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="font-semibold text-gray-900">
                              {formatAmount(delivery.Total)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {delivery.items?.length || 0} items
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-start gap-2">
                              <div className={`w-2 h-2 rounded-full mt-1.5 ${
                                isInProgress ? 'bg-yellow-500 animate-pulse' : 
                                isPending ? 'bg-green-500' : 'bg-gray-400'
                              }`}></div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {delivery.delivery_info?.delivery_user_name || 'Staff Member'}
                                  </p>
                                </div>
                                {delivery.delivery_info?.delivery_user_email && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <p className="text-xs text-gray-500 truncate">
                                      {delivery.delivery_info.delivery_user_email}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {isInProgress ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                                In Progress
                              </div>
                            ) : isPending ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                Pending
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                                Assigned
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-gray-900">
                              {formatDateTime(delivery.created_at)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {getTimeSinceAssignment(delivery.created_at)}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleViewInvoice(delivery.id)}
                              className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 shadow hover:from-teal-600 hover:to-cyan-700 transition-all"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalItems={totalCount}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                label="deliveries"
                colorScheme="teal"
              />
            </>
          )}
          <ActiveUsersDock type="delivery" />
        </div>
      </div>
    </div>
  );
};

export default CompanyDeliveryListPage;