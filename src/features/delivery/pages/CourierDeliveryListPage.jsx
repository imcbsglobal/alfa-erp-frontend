import React, { useState, useEffect } from 'react';
import { Truck, Upload, X, CheckCircle } from 'lucide-react';
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
  const [uploadModal, setUploadModal] = useState({ open: false, delivery: null });
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
  };

  const handleUploadClick = (delivery) => {
    setUploadModal({ open: true, delivery });
    setUploadedFile(null);
    setPreviewUrl('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload an image (JPG, PNG, GIF) or PDF file');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      setUploadedFile(file);
      
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl('');
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
      const payload = {
        invoice_no: assignModal.delivery.invoice_no,
        courier_id: selectedCourier,
        delivery_type: 'COURIER',
      };

      await api.post('/sales/delivery/assign/', payload);

      toast.success('Courier assigned successfully! Now upload the courier slip.');
      setAssignModal({ open: false, delivery: null });
      setSelectedCourier('');

      // ✅ UPDATE LOCALLY (do NOT reload)
      setDeliveries(prev =>
        prev.map(d =>
          d.invoice_no === assignModal.delivery.invoice_no
            ? { ...d, courier_assigned: true }
            : d
        )
      );

    } catch (error) {
      console.error('Failed to assign courier:', error);
      const errorMessage = error.response?.data?.detail 
        || error.response?.data?.message 
        || error.response?.data?.error
        || JSON.stringify(error.response?.data)
        || 'Failed to assign courier';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadSlip = async () => {
    if (!uploadedFile) {
      toast.error('Please upload a courier slip/screenshot');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('invoice_no', uploadModal.delivery.invoice_no);
      formData.append('courier_slip', uploadedFile);
      formData.append('delivery_type', 'COURIER');

      await api.post('/sales/delivery/upload-slip/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Courier slip uploaded successfully! Delivery marked as completed.');
      setUploadModal({ open: false, delivery: null });
      setUploadedFile(null);
      setPreviewUrl('');

      // ✅ REMOVE FROM CONSIDER LIST
      setDeliveries(prev =>
        prev.filter(d => d.invoice_no !== uploadModal.delivery.invoice_no)
      );

    } catch (error) {
      console.error('Failed to upload slip:', error);
      const errorMessage = error.response?.data?.detail 
        || error.response?.data?.message 
        || 'Failed to upload courier slip';
      toast.error(errorMessage);
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
                      <th className="px-4 py-3 text-left">Status</th>
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
                          {delivery.courier_assigned ? (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                              Assigned
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewInvoice(delivery.id)}
                              className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm hover:from-teal-600 hover:to-cyan-700 transition-all"
                            >
                              View
                            </button>
                            {!delivery.courier_assigned ? (
                              <button
                                onClick={() => handleAssignClick(delivery)}
                                className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm hover:from-teal-600 hover:to-cyan-700 transition-all flex items-center gap-1"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                Assign
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUploadClick(delivery)}
                                className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm hover:from-teal-600 hover:to-cyan-700 transition-all flex items-center gap-1"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                Upload Slip
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

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
              className="bg-white rounded-xl shadow-2xl max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-5 py-3 flex items-center justify-between rounded-t-xl">
                <h3 className="text-lg font-bold text-white">Assign Courier</h3>
                <button
                  onClick={() => setAssignModal({ open: false, delivery: null })}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1.5 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{assignModal.delivery?.invoice_no}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{assignModal.delivery?.customer?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">₹{assignModal.delivery?.total_amount?.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{assignModal.delivery?.items?.length || 0} items</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Select Courier <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCourier}
                    onChange={(e) => setSelectedCourier(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  >
                    <option value="">-- Select Courier --</option>
                    {couriers.map((courier) => (
                      <option key={courier.courier_id} value={courier.courier_id}>
                        {courier.courier_name} ({courier.courier_code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="px-5 pb-5 flex gap-3">
                <button
                  onClick={() => setAssignModal({ open: false, delivery: null })}
                  disabled={submitting}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignCourier}
                  disabled={submitting || !selectedCourier}
                  className="flex-1 py-2 px-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {submitting ? 'Assigning...' : 'Assign Courier'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Upload Slip Modal */}
      {uploadModal.open && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setUploadModal({ open: false, delivery: null })}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white rounded-xl shadow-2xl max-w-lg w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-teal-500 to-cyan-500 px-5 py-3 flex items-center justify-between rounded-t-xl">
                <h3 className="text-lg font-bold text-white">Upload Courier Slip</h3>
                <button
                  onClick={() => setUploadModal({ open: false, delivery: null })}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-1.5 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{uploadModal.delivery?.invoice_no}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{uploadModal.delivery?.customer?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">₹{uploadModal.delivery?.total_amount?.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">{uploadModal.delivery?.items?.length || 0} items</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Courier Slip/Screenshot <span className="text-red-500">*</span>
                  </label>
                  
                  {!uploadedFile ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-500 transition-colors">
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <label className="cursor-pointer">
                        <span className="text-teal-600 hover:text-teal-700 font-medium text-sm">
                          Click to upload
                        </span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Image or PDF (max. 5MB)
                      </p>
                    </div>
                  ) : (
                    <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center gap-3">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-16 h-16 object-cover rounded border"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-200 rounded border flex items-center justify-center">
                            <span className="text-2xl">📄</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{uploadedFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(uploadedFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          onClick={handleRemoveFile}
                          className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-600 bg-green-50 border border-green-200 rounded p-2.5">
                  ✅ <span className="font-medium">Final Step:</span> Upload the slip to mark delivery as completed.
                </div>
              </div>

              <div className="px-5 pb-5 flex gap-3">
                <button
                  onClick={() => setUploadModal({ open: false, delivery: null })}
                  disabled={submitting}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadSlip}
                  disabled={submitting || !uploadedFile}
                  className="flex-1 py-2 px-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {submitting ? 'Uploading...' : 'Upload & Complete'}
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