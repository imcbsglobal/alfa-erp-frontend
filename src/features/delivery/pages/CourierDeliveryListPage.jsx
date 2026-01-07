import React, { useState, useEffect } from 'react';
import { Truck, Upload, X } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { getCouriers } from '../../../services/sales';

const CourierDeliveryListPage = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [assignModal, setAssignModal] = useState({ open: false, delivery: null });
  const [couriers, setCouriers] = useState([]);
  const [selectedCourier, setSelectedCourier] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const itemsPerPage = 10;

  useEffect(() => {
    loadCourierDeliveries();
  }, [currentPage, searchTerm]);

  useEffect(() => {
    loadCouriers();
  }, []);

  const loadCouriers = async () => {
    try {
      const response = await getCouriers();
      let courierArray = [];
      const apiData = response?.data;

      if (Array.isArray(apiData?.data)) {
        courierArray = apiData.data;
      } else {
        courierArray = [];
      }

      // Filter only active couriers
      const activeCouriers = courierArray.filter(c => c.status === 'ACTIVE');
      setCouriers(activeCouriers);
    } catch (error) {
      console.error('Failed to load couriers:', error);
      toast.error('Failed to load couriers');
      setCouriers([]);
    }
  };

  const loadCourierDeliveries = async () => {
    setLoading(true);
    try {
      const params = {
        delivery_type: 'COURIER',
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
      console.error('Failed to load courier deliveries:', error);
      toast.error('Failed to load courier deliveries');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadCourierDeliveries();
    toast.success('Deliveries refreshed');
  };

  const handleViewInvoice = (billId) => {
    navigate(`/delivery/invoices/view/${billId}/courier-delivery`);
  };

  const handleAssignClick = (delivery) => {
    setAssignModal({ open: true, delivery });
    setSelectedCourier('');
    setUploadedFile(null);
    setPreviewUrl('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload an image (JPG, PNG, GIF) or PDF file');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      setUploadedFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(''); // No preview for PDFs
      }
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setPreviewUrl('');
  };

  const handleAssignCourier = async () => {
    if (!selectedCourier) {
      toast.error('Please select a courier');
      return;
    }

    setSubmitting(true);
    try {
      // Send only courier assignment without file
      const payload = {
        invoice_no: assignModal.delivery.invoice_no,
        courier_id: selectedCourier,
        delivery_type: 'COURIER',
      };

      await api.post('/sales/delivery/assign/', payload);

      toast.success('Courier assigned successfully! Upload slip when delivery is completed.');
      setAssignModal({ open: false, delivery: null });
      setSelectedCourier('');
      setUploadedFile(null);
      setPreviewUrl('');
      loadCourierDeliveries();
    } catch (error) {
      console.error('Failed to assign courier:', error);
      toast.error(error.response?.data?.detail || 'Failed to assign courier');
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
            Courier Delivery - Consider List
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
              <Truck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p>No courier deliveries in consider list</p>
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
                              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-600 transition-all"
                            >
                              Assign Courier
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} orders
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded bg-white border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-1 bg-teal-600 text-white rounded">
                    {currentPage}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage * itemsPerPage >= totalCount}
                    className="px-3 py-1 rounded bg-white border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Assign Courier Modal */}
      {assignModal.open && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setAssignModal({ open: false, delivery: null })}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-3 flex items-center justify-between rounded-t-xl sticky top-0">
                <h3 className="text-lg font-bold text-white">Assign Courier for Delivery</h3>
                <button
                  onClick={() => setAssignModal({ open: false, delivery: null })}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Delivery Info */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <p className="font-semibold text-gray-900 text-lg">{assignModal.delivery?.invoice_no}</p>
                  <p className="text-sm text-gray-700 mt-1">{assignModal.delivery?.customer?.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{assignModal.delivery?.customer?.area}</p>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span className="text-gray-600">Amount: <span className="font-semibold text-gray-900">₹{assignModal.delivery?.total_amount?.toFixed(2)}</span></span>
                    <span className="text-gray-600">Items: <span className="font-semibold text-gray-900">{assignModal.delivery?.items?.length || 0}</span></span>
                  </div>
                </div>

                {/* Courier Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Truck className="inline w-4 h-4 mr-1" />
                    Select Courier <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCourier}
                    onChange={(e) => setSelectedCourier(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-base"
                  >
                    <option value="">-- Select Courier --</option>
                    {couriers.map((courier) => (
                      <option key={courier.courier_id} value={courier.courier_id}>
                        {courier.courier_name} ({courier.courier_code}) - {courier.type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Upload className="inline w-4 h-4 mr-1" />
                    Upload Courier Slip/Screenshot <span className="text-gray-400">(Optional - Can be uploaded later)</span>
                  </label>
                  
                  {!uploadedFile ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-teal-500 transition-colors">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <label className="cursor-pointer">
                        <span className="text-teal-600 hover:text-teal-700 font-semibold">
                          Click to upload
                        </span>
                        <span className="text-gray-600"> or drag and drop</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-2">
                        PNG, JPG, GIF or PDF (max. 5MB)
                      </p>
                    </div>
                  ) : (
                    <div className="border border-gray-300 rounded-lg p-4">
                      <div className="flex items-start gap-4">
                        {previewUrl && (
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-32 h-32 object-cover rounded border"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                              <p className="text-sm text-gray-500">
                                {(uploadedFile.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                            <button
                              onClick={handleRemoveFile}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                          {uploadedFile.type === 'application/pdf' && (
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                              📄 PDF Document
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 pt-0 flex gap-3 sticky bottom-0 bg-white border-t">
                <button
                  onClick={() => setAssignModal({ open: false, delivery: null })}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignCourier}
                  disabled={submitting || !selectedCourier}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg font-semibold shadow-lg hover:from-teal-600 hover:to-cyan-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Assigning...' : 'Assign Courier'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CourierDeliveryListPage;