import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { toast } from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function BoxDetailsPage() {
  const { boxId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [boxData, setBoxData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBoxDetails();
  }, [boxId]);

  const loadBoxDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/sales/packing/box-details/${boxId}/`);
      // Extract data from the response wrapper
      const data = response.data?.data || response.data;
      setBoxData(data);
    } catch (err) {
      console.error("Error loading box details:", err);
      setError(err.response?.data?.error || err.response?.data?.message || "Failed to load box details");
      toast.error(err.response?.data?.error || err.response?.data?.message || "Failed to load box details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading box details...</p>
        </div>
      </div>
    );
  }

  if (error || !boxData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Box Not Found</h2>
          <p className="text-gray-600 mb-2">{error || "The box you're looking for doesn't exist."}</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 text-left">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Possible reasons:</strong>
            </p>
            <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
              <li>The box label was printed but packing wasn't completed</li>
              <li>Click "Mark as PACKED" to save boxes to the system</li>
              <li>The box ID might be incorrect</li>
            </ul>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="mt-6 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const formatQuantity = (qty, unit) => {
    if (!qty) return "0";
    const num = parseFloat(qty);
    return num % 1 === 0 ? `${num} ${unit}` : `${num.toFixed(2)} ${unit}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-8 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">Box Details</h1>
                <p className="text-teal-100">Scanned box information</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg px-4 py-3 inline-block">
              <p className="text-sm text-teal-100 mb-1">Box Number</p>
              <p className="text-2xl font-mono font-bold">{boxData.box_id}</p>
            </div>
          </div>

          {/* Customer Information */}
          <div className="px-6 py-6 border-b">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Customer Information
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 mb-1">Customer Name</p>
                <p className="text-lg font-semibold text-gray-800">{boxData.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Delivery Address</p>
                <p className="text-base text-gray-700 leading-relaxed">{boxData.customer_address}</p>
              </div>
              {boxData.customer_phone && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Phone Number</p>
                  <p className="text-base font-medium text-gray-800">
                    <a href={`tel:${boxData.customer_phone}`} className="text-teal-600 hover:text-teal-700">
                      {boxData.customer_phone}
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Invoice Information */}
          <div className="px-6 py-6 border-b bg-gray-50">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Related Invoices
            </h2>
            <div className="flex flex-wrap gap-2">
              {boxData.invoice_numbers?.map((invoiceNo, idx) => (
                <span
                  key={idx}
                  className="px-4 py-2 bg-teal-100 text-teal-800 rounded-lg font-semibold text-sm"
                >
                  #{invoiceNo}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Items Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Items in this Box ({boxData.items?.length || 0})
            </h2>
          </div>
          
          <div className="divide-y">
            {boxData.items?.length > 0 ? (
              boxData.items.map((item, idx) => (
                <div key={idx} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 mb-2 text-lg">{item.item_name}</h3>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="bg-teal-100 px-4 py-2 rounded-lg">
                        <p className="text-xs text-teal-700 mb-1">Quantity</p>
                        <p className="text-xl font-bold text-teal-800">{formatQuantity(item.quantity, 'pcs')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p>No items found in this box</p>
              </div>
            )}
          </div>
        </div>

        {/* Box Status Footer */}
        <div className="mt-6 bg-white rounded-xl shadow-lg px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Box Status</p>
                <p className="font-semibold text-gray-800">{boxData.status || 'Packed & Ready'}</p>
              </div>
            </div>
            {boxData.packed_date && (
              <div className="text-right">
                <p className="text-sm text-gray-500">Packed On</p>
                <p className="font-medium text-gray-700">
                  {new Date(boxData.packed_date).toLocaleDateString('en-GB')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
