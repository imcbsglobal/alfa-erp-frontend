import React, { useState, useEffect } from 'react';
import { Eye, Truck, Package, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import DeliveryModal from '../components/DeliveryModal';
import { useAuth } from "../../auth/AuthContext";
import DeliveryStatusBadge from '../components/DeliveryStatusBadge';
import toast from 'react-hot-toast';
import Pagination from "../../../components/Pagination";

const DeliveryDispatchPage = () => {
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showOngoingModal, setShowOngoingModal] = useState(false);
  const [ongoingDeliveries, setOngoingDeliveries] = useState([]);
  const [loadingOngoing, setLoadingOngoing] = useState(false);
  const { user } = useAuth();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    loadPackedInvoices();
  }, [currentPage, searchTerm]);

  const loadPackedInvoices = async () => {
    setLoading(true);
    try {
      const params = {
        status: 'PACKED',
        page: currentPage,
        page_size: itemsPerPage,
        ordering: '-packer_info__end_time'
      };

    if (searchTerm.trim()) {
      params.search = searchTerm.trim();
    }

      const response = await api.get('/sales/invoices/', { params });
      
      // Filter out invoices that have delivery sessions
      const filteredResults = (response.data.results || []).filter(
        bill => !bill.delivery_info || bill.delivery_info.delivery_status === 'PENDING'
      );
      
      setBills(filteredResults);
      setTotalCount(response.data.count || 0);
    } catch (error) {
      console.error('Failed to load packed invoices:', error);
      toast.error('Failed to load packed invoices');
    } finally {
      setLoading(false);
    }
  };

  const loadOngoingDeliveries = async () => {
    setLoadingOngoing(true);
    try {
      const res = await api.get('/sales/delivery/history/?status=IN_TRANSIT');
      const responseData = res.data?.results;
      console.log('Ongoing deliveries data:', responseData);
      if (responseData) {
        setOngoingDeliveries(responseData);
      } else {
        setOngoingDeliveries([]);
      }
    } catch (err) {
      console.error('Failed to load ongoing deliveries:', err);
      toast.error('Failed to load ongoing deliveries');
      setOngoingDeliveries([]);
    } finally {
      setLoadingOngoing(false);
    }
  };

  const handleShowOngoingWork = () => {
    setShowOngoingModal(true);
    loadOngoingDeliveries();
  };

  const handleRefresh = async () => {
    await loadPackedInvoices();
    toast.success('Invoices refreshed');
  };

  const handleDeliveryClick = (bill) => {
    setSelectedBill(bill);
  };

  const handleConfirmDelivery = async (payload) => {
    setSubmitting(true);
    try {
      const response = await api.post('/sales/delivery/start/', payload);

      if (response.data.success) {
        toast.success(response.data.message);
        setSelectedBill(null);
        loadPackedInvoices();
      }
    } catch (error) {
      console.error('Failed to process delivery:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.detail || 
                          'Failed to process delivery';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewInvoice = (billId) => {
    if (user?.role === "DELIVERY") {
      navigate(`/ops/delivery/invoices/view/${billId}`);
      return;
    }
    navigate(`/delivery/invoices/view/${billId}/delivery`);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDuration = (startTime) => {
    if (!startTime) return "N/A";
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now - start;
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-700 border-red-300";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "LOW":
        return "bg-gray-100 text-gray-600 border-gray-300";
      default:
        return "bg-gray-100 text-gray-600 border-gray-300";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Dispatch Management
          </h1>
          <div className="flex gap-2">
            <button
              onClick={handleShowOngoingWork}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
            >
              Ongoing Work
            </button>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-500">
              Loading packed orders...
            </div>
          ) : bills.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              No packed orders ready for delivery
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">Invoice</th>
                      <th className="px-4 py-3 text-left">Priority</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Customer</th>
                      <th className="px-4 py-3 text-left">Contact</th>
                      <th className="px-4 py-3 text-left">Items</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bills.map((bill) => (
                      <tr 
                        key={bill.id}
                        className={`transition hover:bg-grey-50 ${
                          bill.priority === "HIGH" ? "bg-red-50" : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold">{bill.invoice_no}</p>
                          <p className="text-xs text-gray-500">
                            {bill.customer?.code}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-3 py-1 rounded-full border text-xs font-bold ${getPriorityBadgeColor(
                              bill.priority
                            )}`}
                          >
                            {bill.priority || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {formatDateTime(bill.invoice_date)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{bill.customer?.name || '—'}</p>
                          <p className="text-xs text-gray-500">{bill.customer?.area || ''}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm">{bill.customer?.phone1 || '—'}</p>
                          <p className="text-xs text-gray-500">{bill.customer?.email || ''}</p>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {bill.items?.length || 0} items
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          ₹{bill.total_amount?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-3 py-1 rounded-full border text-xs font-bold bg-emerald-100 text-emerald-700 border-emerald-300">
                            {bill.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeliveryClick(bill)}
                              className="p-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
                              title="Start Delivery"
                            >
                              <Truck className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleViewInvoice(bill.id)}
                              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
                            >
                              View
                            </button>
                          </div>
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
                onPageChange={setCurrentPage}
                label="orders"
                colorScheme="teal"
              />
            </>
          )}
        </div>
      </div>

      {/* Delivery Modal */}
      <DeliveryModal
        isOpen={!!selectedBill}
        onClose={() => setSelectedBill(null)}
        onConfirm={handleConfirmDelivery}
        invoice={selectedBill}
        submitting={submitting}
      />

      {/* Ongoing Work Modal */}
      {showOngoingModal && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setShowOngoingModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  Ongoing Delivery Tasks
                </h2>
                <button
                  onClick={() => setShowOngoingModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                {loadingOngoing ? (
                  <div className="py-20 text-center text-gray-500">
                    Loading ongoing deliveries...
                  </div>
                ) : ongoingDeliveries.length === 0 ? (
                  <div className="py-20 text-center text-gray-500">
                    No ongoing deliveries
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left">Invoice</th>
                          <th className="px-4 py-3 text-left">Customer</th>
                          <th className="px-4 py-3 text-left">Start Time</th>
                          <th className="px-4 py-3 text-left">Duration</th>
                          <th className="px-4 py-3 text-left">Driver</th>
                          <th className="px-4 py-3 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {ongoingDeliveries.map((delivery, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-semibold">
                              {delivery.invoice_no}
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium">{delivery.customer_name || 'N/A'}</p>
                              <p className="text-xs text-gray-500">{delivery.customer_area || ''}</p>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {delivery.start_time
                                ? new Date(delivery.start_time).toLocaleTimeString()
                                : "N/A"}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {formatDuration(delivery.start_time)}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">
                              {delivery.driver_name || "Current User"}
                            </td>
                            <td className="px-4 py-3">
                              <span className="px-3 py-1 rounded-full border text-xs font-bold bg-blue-100 text-blue-700 border-blue-300">
                                IN TRANSIT
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DeliveryDispatchPage;