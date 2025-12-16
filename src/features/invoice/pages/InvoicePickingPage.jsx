import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";

export default function InvoicePickingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pickedItems, setPickedItems] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get(`/sales/invoices/${id}/`);
      const status = res.data.status || "PENDING";

      if (!["PICKING", "PICKED"].includes(status)) {
        throw new Error("This invoice is not available for picking");
      }

      setInvoice(res.data);

      const initialState = {};
      res.data.items?.forEach(item => {
        initialState[item.id] = false;
      });
      setPickedItems(initialState);

    } catch (err) {
      setError(err.message || "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (itemId) => {
    setPickedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const getProgress = () => {
    const total = Object.keys(pickedItems).length;
    const picked = Object.values(pickedItems).filter(Boolean).length;
    return {
      picked,
      total,
      percentage: total ? Math.round((picked / total) * 100) : 0,
    };
  };

  const confirmComplete = async () => {
    if (!user?.email) {
      setError("User email missing");
      return;
    }

    setCompleting(true);
    try {
      await api.post("/sales/picking/complete/", {
        invoice_no: invoice.invoice_no,
        user_email: user.email,
        notes: "Picked all items",
      });

      navigate(-1);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to complete picking");
    } finally {
      setCompleting(false);
      setShowConfirmDialog(false);
    }
  };

  const handleBack = () => {
    if (Object.values(pickedItems).some(Boolean)) {
      if (!window.confirm("You have unsaved progress. Leave anyway?")) return;
    }
    navigate(-1);
  };

  const progress = getProgress();

  const handleStopPicking = () => {
    setShowConfirmDialog(true);
  };

  if (loading) return null;
    if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Invoice Picking</h1>
              <p className="text-gray-600 mt-1">Pick items for invoice #{invoice.invoice_no}</p>
            </div>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
          </div>

          {/* Invoice Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <InfoCard label="Invoice Number" value={invoice.invoice_no} />
            <InfoCard label="Customer" value={invoice.customer?.name} />
            <InfoCard label="Picked By" value={invoice.picked_by || "Current User"} icon="👤" />
            <InfoCard label="Started At" value={invoice.picked_start_time ? new Date(invoice.picked_start_time).toLocaleTimeString() : new Date().toLocaleTimeString()} icon="🕐" />
          </div>

          {/* Progress Bar */}
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">
                Progress: {progress.picked} / {progress.total} items
              </span>
              <span className="text-sm font-bold text-teal-600">
                {progress.percentage}%
              </span>
            </div>
            <div className="w-full bg-gray-300 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-500 to-cyan-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progress.percentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4">
            <h2 className="text-xl font-bold text-white">Items to Pick</h2>
          </div>

          <div className="divide-y divide-gray-200">
              {invoice.items?.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 hover:bg-gray-50 transition-all cursor-pointer ${
                    pickedItems[item.id] ? "bg-green-50" : ""
                  }`}
                  onClick={() => toggleItem(item.id)}
                >
                <div className="flex items-center gap-4">
                  {/* Checkbox */}
                  <div className="flex-shrink-0">
                    <div
                      className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
                        pickedItems[item.id]
                          ? "bg-green-500 border-green-500"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      {pickedItems[item.id] && (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <p className={`font-semibold ${pickedItems[item.id] ? "text-green-700 line-through" : "text-gray-800"}`}>
                        {item.name}
                      </p>
                      {item.remarks && (
                        <p className="text-xs text-gray-500 mt-1">{item.remarks}</p>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Quantity</p>
                      <p className="font-bold text-gray-800">{item.quantity}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Shelf Location</p>
                      <p className="font-semibold text-teal-600">
                        {item.shelf_location || "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Status Icon */}
                  <div className="flex-shrink-0">
                    {pickedItems[item.id] ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Picked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stop Picking Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleStopPicking}
            disabled={progress.picked === 0}
            className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold text-lg shadow-lg hover:from-red-600 hover:to-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Stop Picking & Complete
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4 rounded-t-xl">
              <h3 className="text-xl font-bold text-white">Confirm Completion</h3>
            </div>

            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to complete picking for this invoice?
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Progress: <span className="font-bold">{progress.picked} / {progress.total}</span> items picked
              </p>
              {progress.picked < progress.total && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Warning: Not all items have been marked as picked
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                  disabled={completing}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmComplete}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg disabled:opacity-50"
                  disabled={completing}
                >
                  {completing ? "Processing..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Component
function InfoCard({ label, value, icon }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="font-semibold text-gray-800 flex items-center gap-2">
        {icon && <span>{icon}</span>}
        {value}
      </p>
    </div>
  );
}