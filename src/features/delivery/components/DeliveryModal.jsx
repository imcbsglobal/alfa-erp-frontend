import { useState } from "react";
import { X, Building2, Truck, Package, User } from "lucide-react";

export default function DeliveryModal({
  isOpen,
  onClose,
  onConfirm,
  invoice,
  submitting = false,
}) {
  const [deliveryMode, setDeliveryMode] = useState("");
  const [formData, setFormData] = useState({
    userEmail: "",
    courierName: "",
    trackingNo: "",
    notes: "",
  });

  if (!isOpen || !invoice) return null;

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleConfirm = () => {
    if (!deliveryMode) {
      alert("Please select a delivery mode");
      return;
    }

    // Validation based on delivery mode
    if ((deliveryMode === "counter" || deliveryMode === "company") && !formData.userEmail) {
      alert("User email is required for this delivery mode");
      return;
    }

    if (deliveryMode === "courier" && !formData.courierName) {
      alert("Courier name is required");
      return;
    }

    const payload = {
      invoice_no: invoice.invoice_no,
      delivery_type: deliveryMode === "counter" ? "DIRECT" : 
                     deliveryMode === "courier" ? "COURIER" : "INTERNAL",
      notes: formData.notes || "",
    };

    if (deliveryMode === "counter" || deliveryMode === "company") {
      payload.user_email = formData.userEmail;
    }

    if (deliveryMode === "courier") {
      payload.courier_name = formData.courierName;
      if (formData.trackingNo) {
        payload.tracking_no = formData.trackingNo;
      }
      if (formData.userEmail) {
        payload.user_email = formData.userEmail;
      }
    }

    onConfirm(payload);
  };

  const handleClose = () => {
    setDeliveryMode("");
    setFormData({
      userEmail: "",
      courierName: "",
      trackingNo: "",
      notes: "",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Process Delivery</h2>
            <p className="text-sm text-gray-600 mt-1">
              Invoice #{invoice.invoice_no} for {invoice.customer?.name || "Customer"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Amount: ₹{invoice.total_amount?.toFixed(2)} • Items: {invoice.items?.length || 0}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Delivery Mode</h3>
          
          {/* Delivery Mode Options */}
          <div className="space-y-3 mb-6">
            {/* Counter Pickup - DIRECT */}
            <button
              onClick={() => setDeliveryMode("counter")}
              disabled={submitting}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                deliveryMode === "counter"
                  ? "border-green-500 bg-green-50"
                  : "border-gray-200 hover:border-green-300 hover:bg-green-50"
              } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${deliveryMode === "counter" ? "bg-green-500" : "bg-gray-100"}`}>
                  <Building2 className={`w-6 h-6 ${deliveryMode === "counter" ? "text-white" : "text-gray-600"}`} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Counter Pickup</p>
                  <p className="text-sm text-gray-600">Customer collects medicine directly from counter</p>
                </div>
              </div>
            </button>

            {/* Courier Delivery - COURIER */}
            <button
              onClick={() => setDeliveryMode("courier")}
              disabled={submitting}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                deliveryMode === "courier"
                  ? "border-orange-500 bg-orange-50"
                  : "border-gray-200 hover:border-orange-300 hover:bg-orange-50"
              } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${deliveryMode === "courier" ? "bg-orange-500" : "bg-gray-100"}`}>
                  <Truck className={`w-6 h-6 ${deliveryMode === "courier" ? "text-white" : "text-gray-600"}`} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Courier Delivery</p>
                  <p className="text-sm text-gray-600">Hand over to courier service for delivery</p>
                </div>
              </div>
            </button>

            {/* Company Delivery - INTERNAL */}
            <button
              onClick={() => setDeliveryMode("company")}
              disabled={submitting}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                deliveryMode === "company"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"
              } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${deliveryMode === "company" ? "bg-blue-500" : "bg-gray-100"}`}>
                  <Package className={`w-6 h-6 ${deliveryMode === "company" ? "text-white" : "text-gray-600"}`} />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">Company Delivery</p>
                  <p className="text-sm text-gray-600">Deliver via company's own delivery staff</p>
                </div>
              </div>
            </button>
          </div>

          {/* Dynamic Form Fields */}
          {deliveryMode && (
            <div className="space-y-4 animate-fadeIn">
              {/* User Email - for all modes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline w-4 h-4 mr-1" />
                  User Email {(deliveryMode === "counter" || deliveryMode === "company") && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="email"
                  name="userEmail"
                  value={formData.userEmail}
                  onChange={handleInputChange}
                  placeholder="Enter user email or scan barcode"
                  disabled={submitting}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
                  required={deliveryMode === "counter" || deliveryMode === "company"}
                />
                <p className="text-xs text-gray-500 mt-1">Scan or enter the delivery person's email</p>
              </div>

              {/* Courier-specific fields */}
              {deliveryMode === "courier" && (
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
                      disabled={submitting}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
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
                      disabled={submitting}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
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
                  disabled={submitting}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={submitting}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!deliveryMode || submitting || 
              (deliveryMode === "counter" && !formData.userEmail) ||
              (deliveryMode === "company" && !formData.userEmail) ||
              (deliveryMode === "courier" && !formData.courierName)}
            className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              "Confirm Delivery"
            )}
          </button>
        </div>
      </div>

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
}