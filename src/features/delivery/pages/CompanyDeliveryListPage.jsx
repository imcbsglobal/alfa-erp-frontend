import React, { useState, useEffect } from 'react';
import { Package, Search, User, Eye } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Pagination from "../../../components/Pagination";

const CompanyDeliveryListPage = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [assignModal, setAssignModal] = useState({ open: false, delivery: null });
  const [assignEmail, setAssignEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const itemsPerPage = 10;

  useEffect(() => {
    loadCompanyDeliveries();
  }, [currentPage, searchTerm]);

  const loadCompanyDeliveries = async () => {
    setLoading(true);
    try {
      const params = {
        delivery_type: 'INTERNAL',
        status: 'TO_CONSIDER',
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
        delivery_type: 'INTERNAL',
      });

      toast.success('Staff assigned successfully!');
      setAssignModal({ open: false, delivery: null });
      setAssignEmail('');
      loadCompanyDeliveries();
    } catch (error) {
      console.error('Failed to assign staff:', error);
      toast.error(error.response?.data?.detail || 'Failed to assign staff');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '—';
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
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Company Delivery - Consider List
          </h1>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
          >
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-500">
              Loading deliveries...
            </div>
          ) : deliveries.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p>No company deliveries in consider list</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left">Invoice</th>
                      <th className="px-4 py-3 text-left">Customer</th>
                      <th className="px-4 py-3 text-left">Contact</th>
                      <th className="px-4 py-3 text-left">Items</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-left">Added At</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {deliveries.map((delivery) => (
                      <tr key={delivery.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3">
                          <p className="font-semibold">{delivery.invoice_no}</p>
                          <p className="text-xs text-gray-500">
                            {delivery.customer?.code}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{delivery.customer?.name || '—'}</p>
                          <p className="text-xs text-gray-500">{delivery.customer?.area || ''}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm">{delivery.customer?.phone1 || '—'}</p>
                          <p className="text-xs text-gray-500">{delivery.customer?.email || ''}</p>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {delivery.items?.length || 0} items
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          ₹{delivery.total_amount?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {formatDateTime(delivery.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewInvoice(delivery.id)}
                              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleAssignClick(delivery)}
                              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
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

              {/* Pagination */}
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

      {/* Assign Staff Modal */}
      {assignModal.open && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setAssignModal({ open: false, delivery: null })}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-xl shadow-2xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4 flex items-center justify-between rounded-t-xl">
                <h3 className="text-xl font-bold text-white">Assign Delivery Staff</h3>
                <button
                  onClick={() => setAssignModal({ open: false, delivery: null })}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="font-semibold text-gray-900">{assignModal.delivery?.invoice_no}</p>
                  <p className="text-sm text-gray-600">{assignModal.delivery?.customer?.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{assignModal.delivery?.customer?.area}</p>
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Staff will complete this delivery
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0 flex gap-3">
                <button
                  onClick={() => setAssignModal({ open: false, delivery: null })}
                  disabled={submitting}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignStaff}
                  disabled={submitting || !assignEmail.trim()}
                  className="flex-1 py-2 px-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Assigning...' : 'Assign Staff'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CompanyDeliveryListPage;