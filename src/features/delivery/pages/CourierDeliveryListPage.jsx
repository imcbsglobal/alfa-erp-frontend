import React, { useState, useEffect } from 'react';
import { Truck, Search, User, Eye } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const CourierDeliveryListPage = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [assignModal, setAssignModal] = useState({ open: false, delivery: null });
  const [assignEmail, setAssignEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    loadCourierDeliveries();
  }, [currentPage, searchTerm]);

  const loadCourierDeliveries = async () => {
    setLoading(true);
    try {
      const params = {
        delivery_type: 'COURIER',
        status: 'TO_CONSIDER', // or whatever status your backend uses
        page: currentPage,
        page_size: itemsPerPage,
      };

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await api.get('/sales/delivery/consider-list/', { params });
      setDeliveries(response.data.results || []);
      setTotalCount(response.data.count || 0);
    } catch (error) {
      console.error('Failed to load courier deliveries:', error);
      toast.error('Failed to load courier deliveries');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignClick = (delivery) => {
    setAssignModal({ open: true, delivery });
    setAssignEmail('');
  };

  const handleAssignStaff = async () => {
    if (!assignEmail.trim()) {
      toast.error('Please enter staff email');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/sales/delivery/assign/', {
        invoice_no: assignModal.delivery.invoice_no,
        user_email: assignEmail.trim(),
        delivery_type: 'COURIER',
      });

      toast.success('Staff assigned successfully!');
      setAssignModal({ open: false, delivery: null });
      setAssignEmail('');
      loadCourierDeliveries();
    } catch (error) {
      console.error('Failed to assign staff:', error);
      toast.error(error.response?.data?.detail || 'Failed to assign staff');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Truck className="w-8 h-8 text-orange-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Courier Delivery - Consider List</h1>
            <p className="text-gray-600 mt-1">Assign staff to handle courier deliveries</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by invoice number, customer name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <p className="text-gray-600 mt-2">Loading deliveries...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-orange-500 to-red-500">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Invoice #</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Customer</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Contact</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Items</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Added At</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {deliveries.map((delivery) => (
                    <tr key={delivery.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-orange-600">
                        {delivery.invoice_no}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-800">{delivery.customer?.name || '-'}</div>
                        <div className="text-xs text-gray-500">{delivery.customer?.area || ''}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">{delivery.customer?.phone1 || '-'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {delivery.items?.length || 0} items
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-800">
                        ₹{delivery.total_amount?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDateTime(delivery.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAssignClick(delivery)}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                          >
                            <User className="w-4 h-4" />
                            Assign Staff
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {deliveries.length === 0 && (
              <div className="text-center py-12">
                <Truck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No courier deliveries in consider list</p>
              </div>
            )}

            {/* Pagination */}
            {totalCount > itemsPerPage && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} deliveries
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

      {/* Assign Staff Modal */}
      {assignModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-gray-900">Assign Staff for Courier Delivery</h3>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-semibold text-gray-900">{assignModal.delivery?.invoice_no}</p>
                <p className="text-sm text-gray-600">{assignModal.delivery?.customer?.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline w-4 h-4 mr-1" />
                  Staff Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={assignEmail}
                  onChange={(e) => setAssignEmail(e.target.value)}
                  placeholder="Enter staff email or scan barcode"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Staff will enter courier details when completing delivery
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setAssignModal({ open: false, delivery: null })}
                disabled={submitting}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignStaff}
                disabled={submitting || !assignEmail.trim()}
                className="flex-1 py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {submitting ? 'Assigning...' : 'Assign Staff'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourierDeliveryListPage;