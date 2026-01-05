import React, { useState, useEffect } from 'react';
import { Eye, Truck, Package, Search } from 'lucide-react';
import api from '../../../services/api';
import DeliveryModal from '../components/DeliveryModal';
import DeliveryStatusBadge from '../components/DeliveryStatusBadge';
import toast from 'react-hot-toast';

const DeliveryDispatchPage = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
      setBills(response.data.results || []);
      setTotalCount(response.data.count || 0);
    } catch (error) {
      console.error('Failed to load packed invoices:', error);
      toast.error('Failed to load packed invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDeliveryClick = (bill) => {
    setSelectedBill(bill);
  };

  const handleConfirmDelivery = async (payload) => {
    setSubmitting(true);
    try {
      if (payload.complete_immediately) {
        // Counter Pickup - Start and Complete immediately
        const startPayload = {
          invoice_no: payload.invoice_no,
          delivery_type: payload.delivery_type,
          counter_sub_mode: payload.counter_sub_mode, // 'patient' or 'company'
          notes: payload.notes
        };

        // Add sub-type specific fields
        if (payload.counter_sub_mode === 'patient') {
          startPayload.customer_phone = payload.customer_phone;
        } else if (payload.counter_sub_mode === 'company') {
          startPayload.person_name = payload.person_name;
          startPayload.person_phone = payload.person_phone;
          startPayload.company_name = payload.company_name;
          startPayload.company_id = payload.company_id;
        }

        // Start delivery
        await api.post('/sales/delivery/start/', startPayload);

        // Immediately complete it
        await api.post('/sales/delivery/complete/', {
          invoice_no: payload.invoice_no,
          delivery_status: 'DELIVERED',
          notes: payload.notes || 'Counter pickup completed'
        });

        toast.success('Counter pickup completed successfully!');
      } else if (payload.add_to_consider) {
        // Courier or Company Delivery - Add to consider list
        const considerPayload = {
          invoice_no: payload.invoice_no,
          delivery_type: payload.delivery_type,
          notes: payload.notes
        };

        // Call the add-to-consider endpoint
        await api.post('/sales/delivery/add-to-consider/', considerPayload);

        const typeLabel = payload.delivery_type === 'COURIER' ? 'Courier' : 'Company';
        toast.success(`✓ Moved to ${typeLabel} Delivery Consider List! Invoice removed from dispatch.`);
      }

      setSelectedBill(null);
      // Reload to show the invoice is gone from this page
      loadPackedInvoices();
    } catch (error) {
      console.error('Failed to process delivery:', error);
      toast.error(error.response?.data?.detail || 'Failed to process delivery');
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
                        <DeliveryStatusBadge status={bill.status} showIcon={false} />
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
      <DeliveryModal
        isOpen={!!selectedBill}
        onClose={() => setSelectedBill(null)}
        onConfirm={handleConfirmDelivery}
        invoice={selectedBill}
        submitting={submitting}
      />
    </div>
  );
};

export default DeliveryDispatchPage;