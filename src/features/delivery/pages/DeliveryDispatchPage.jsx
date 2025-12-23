import React, { useState, useEffect } from 'react';
import { Eye, Truck, Package, Building2, User, Search, X } from 'lucide-react';
import api from '../../../services/api';

const DeliveryDispatchPage = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [deliveryMode, setDeliveryMode] = useState('');
  const [formData, setFormData] = useState({
    userEmail: '',
    courierName: '',
    trackingNo: '',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    counterPickup: 0,
    courierDispatched: 0,
    companyDelivery: 0,
    total: 0
  });

  useEffect(() => {
    loadPackedInvoices();
    loadStats();
  }, [currentPage, searchTerm]);

  const loadPackedInvoices = async () => {
    setLoading(true);
    try {
      const params = {
        status: 'PACKED',
        page: currentPage,
        page_size: itemsPerPage
      };

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await api.get('/sales/invoices/', { params });
      setBills(response.data.results || []);
      setTotalCount(response.data.count || 0);
      
      // Update pending count in stats
      setStats(prev => ({ ...prev, pending: response.data.count || 0 }));
    } catch (error) {
      console.error('Failed to load packed invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Get delivery history for stats
      const response = await api.get('/sales/delivery/history/', {
        params: {
          start_date: new Date().toISOString().split('T')[0],
          page_size: 100
        }
      });

      const deliveries = response.data.results || [];
      
      setStats(prev => ({
        ...prev,
        counterPickup: deliveries.filter(d => d.delivery_type === 'DIRECT').length,
        courierDispatched: deliveries.filter(d => d.delivery_type === 'COURIER').length,
        companyDelivery: deliveries.filter(d => d.delivery_type === 'INTERNAL').length,
        total: deliveries.length
      }));
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleDeliveryClick = (bill) => {
    setSelectedBill(bill);
    setDeliveryMode('');
    setFormData({
      userEmail: '',
      courierName: '',
      trackingNo: '',
      notes: ''
    });
  };

  const handleClose = () => {
    setSelectedBill(null);
    setDeliveryMode('');
    setFormData({
      userEmail: '',
      courierName: '',
      trackingNo: '',
      notes: ''
    });
  };

  const handleDeliveryModeSelect = (mode) => {
    setDeliveryMode(mode);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleConfirmDelivery = async () => {
    if (!selectedBill || !deliveryMode) return;

    setSubmitting(true);
    try {
      let payload = {
        invoice_no: selectedBill.invoice_no,
        delivery_type: deliveryMode === 'counter' ? 'DIRECT' : 
                       deliveryMode === 'courier' ? 'COURIER' : 'INTERNAL',
        notes: formData.notes || ''
      };

      // Add fields based on delivery mode
      if (deliveryMode === 'counter' || deliveryMode === 'company') {
        if (!formData.userEmail) {
          alert('User email is required');
          setSubmitting(false);
          return;
        }
        payload.user_email = formData.userEmail;
      }

      if (deliveryMode === 'courier') {
        if (!formData.courierName) {
          alert('Courier name is required');
          setSubmitting(false);
          return;
        }
        payload.courier_name = formData.courierName;
        if (formData.trackingNo) {
          payload.tracking_no = formData.trackingNo;
        }
        if (formData.userEmail) {
          payload.user_email = formData.userEmail;
        }
      }

      // Start delivery
      await api.post('/sales/delivery/start/', payload);

      alert('Delivery started successfully!');
      handleClose();
      loadPackedInvoices();
      loadStats();
    } catch (error) {
      console.error('Failed to start delivery:', error);
      alert(error.response?.data?.detail || 'Failed to start delivery');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewInvoice = (billId) => {
    window.open(`/billing/invoices/view/${billId}`, '_blank');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const renderDeliveryForm = () => {
    if (!deliveryMode) return null;

    return (
      <div className="mt-6 space-y-4 animate-fadeIn">
        {/* User Email - for all modes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="inline w-4 h-4 mr-1" />
            User Email {(deliveryMode === 'counter' || deliveryMode === 'company') && <span className="text-red-500">*</span>}
          </label>
          <input
            type="email"
            name="userEmail"
            value={formData.userEmail}
            onChange={handleInputChange}
            placeholder="Enter user email"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            required={deliveryMode === 'counter' || deliveryMode === 'company'}
          />
          <p className="text-xs text-gray-500 mt-1">Scan or enter the delivery person's email</p>
        </div>

        {/* Courier Delivery specific fields */}
        {deliveryMode === 'courier' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Truck className="inline w-4 h-4 mr-1" />
                Courier Service Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="courierName"
                value={formData.courierName}
                onChange={handleInputChange}
                placeholder="e.g., BlueDart, Delhivery, DTDC"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tracking Number (Optional)
              </label>
              <input
                type="text"
                name="trackingNo"
                value={formData.trackingNo}
                onChange={handleInputChange}
                placeholder="Enter tracking number"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </>
        )}

        {/* Notes - for all modes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Delivery Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Add any delivery notes..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dispatch Management</h1>
        <p className="text-gray-600 mt-1">Manage and process deliveries for packed orders</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by invoice number, customer name..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            <p className="text-gray-600 mt-2">Loading packed orders...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Invoice #</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Customer</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Contact</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Items</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Packed At</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {bills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-teal-600">
                        {bill.invoice_no}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-800">{bill.customer?.name || '-'}</div>
                        <div className="text-xs text-gray-500">{bill.customer?.area || ''}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">{bill.customer?.phone1 || '-'}</div>
                        <div className="text-xs text-gray-500">{bill.customer?.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {bill.items?.length || 0} items
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">
                        ₹{bill.total_amount?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDateTime(bill.packer_info?.end_time)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewInvoice(bill.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeliveryClick(bill)}
                            className="p-2 text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
                            title="Start Delivery"
                          >
                            <Truck className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {bills.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No packed orders ready for delivery</p>
              </div>
            )}

            {/* Pagination */}
            {totalCount > itemsPerPage && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} orders
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage * itemsPerPage >= totalCount}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delivery Modal */}
      {selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Process Delivery</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Invoice #{selectedBill.invoice_no} for {selectedBill.customer?.name || 'Customer'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Amount: ₹{selectedBill.total_amount?.toFixed(2)} • Items: {selectedBill.items?.length || 0}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Delivery Mode</h3>
              
              {/* Delivery Mode Options */}
              <div className="space-y-3">
                {/* Counter Pickup - DIRECT */}
                <button
                  onClick={() => handleDeliveryModeSelect('counter')}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    deliveryMode === 'counter'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${deliveryMode === 'counter' ? 'bg-green-500' : 'bg-gray-100'}`}>
                      <Building2 className={`w-6 h-6 ${deliveryMode === 'counter' ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">Counter Pickup</p>
                      <p className="text-sm text-gray-600">Customer collects medicine directly from counter</p>
                    </div>
                  </div>
                </button>

                {/* Courier Delivery - COURIER */}
                <button
                  onClick={() => handleDeliveryModeSelect('courier')}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    deliveryMode === 'courier'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${deliveryMode === 'courier' ? 'bg-orange-500' : 'bg-gray-100'}`}>
                      <Truck className={`w-6 h-6 ${deliveryMode === 'courier' ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">Courier Delivery</p>
                      <p className="text-sm text-gray-600">Hand over to courier service for delivery</p>
                    </div>
                  </div>
                </button>

                {/* Company Delivery - INTERNAL */}
                <button
                  onClick={() => handleDeliveryModeSelect('company')}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    deliveryMode === 'company'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${deliveryMode === 'company' ? 'bg-blue-500' : 'bg-gray-100'}`}>
                      <Package className={`w-6 h-6 ${deliveryMode === 'company' ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">Company Delivery</p>
                      <p className="text-sm text-gray-600">Deliver via company's own delivery staff</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Dynamic Form */}
              {renderDeliveryForm()}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                onClick={handleClose}
                disabled={submitting}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelivery}
                disabled={!deliveryMode || submitting || 
                  (deliveryMode === 'counter' && !formData.userEmail) ||
                  (deliveryMode === 'company' && !formData.userEmail) ||
                  (deliveryMode === 'courier' && !formData.courierName)}
                className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Processing...' : 'Confirm Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default DeliveryDispatchPage;