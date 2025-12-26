import { useState } from "react";
import { X, Building2, Truck, Package, User, Users, AlertCircle } from "lucide-react";

export default function DeliveryModal({
  isOpen,
  onClose,
  onConfirm,
  invoice,
  submitting = false,
}) {
  const [deliveryMode, setDeliveryMode] = useState("");
  const [counterSubMode, setCounterSubMode] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState({
    // For counter pickup
    userName: "",
    personName: "",
    phoneNumber: "",
    companyName: "",
    companyId: "",
    notes: "",
  });

  if (!isOpen || !invoice) return null;

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleDeliveryModeChange = (mode) => {
    setDeliveryMode(mode);
    if (mode !== "counter") {
      setCounterSubMode("");
    }
    setShowConfirmation(false);
    // Reset form data when changing modes
    setFormData({
      userName: "",
      personName: "",
      phoneNumber: "",
      companyName: "",
      companyId: "",
      notes: formData.notes,
    });
  };

  const handleConfirm = () => {
    if (!deliveryMode) {
      alert("Please select a delivery mode");
      return;
    }

    // For courier or company delivery, show confirmation first
    if ((deliveryMode === "courier" || deliveryMode === "company") && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    // Validation for counter pickup
    if (deliveryMode === "counter") {
      if (!counterSubMode) {
        alert("Please select either Direct Patient or Direct Company");
        return;
      }

      if (!formData.userName || !formData.personName || !formData.phoneNumber) {
        alert("Username, person name, and phone number are required");
        return;
      }

      if (counterSubMode === "company" && (!formData.companyName || !formData.companyId)) {
        alert("Company name and ID are required for Direct Company pickup");
        return;
      }
    }

    const payload = {
      invoice_no: invoice.invoice_no,
      delivery_type: deliveryMode === "counter" ? "DIRECT" : 
                     deliveryMode === "courier" ? "COURIER" : "INTERNAL",
      notes: formData.notes || "",
    };

    // Add counter-specific data
    if (deliveryMode === "counter") {
      payload.counter_sub_mode = counterSubMode;
      payload.pickup_person_username = formData.userName;
      payload.pickup_person_name = formData.personName;
      payload.pickup_person_phone = formData.phoneNumber;
      
      if (counterSubMode === "company") {
        payload.pickup_company_name = formData.companyName;
        payload.pickup_company_id = formData.companyId;
      }
    }

    onConfirm(payload);
  };

  const handleClose = () => {
    setDeliveryMode("");
    setCounterSubMode("");
    setShowConfirmation(false);
    setFormData({
      userName: "",
      personName: "",
      phoneNumber: "",
      companyName: "",
      companyId: "",
      notes: "",
    });
    onClose();
  };

  const getDeliveryModeLabel = () => {
    if (deliveryMode === "courier") return "Courier Delivery";
    if (deliveryMode === "company") return "Company Delivery";
    return "";
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
          {!showConfirmation ? (
            <>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Delivery Mode</h3>
              
              {/* Delivery Mode Options */}
              <div className="space-y-3 mb-6">
                {/* Counter Pickup - DIRECT */}
                <button
                  onClick={() => handleDeliveryModeChange("counter")}
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
                      <p className="text-sm text-gray-600">Customer or representative collects at counter</p>
                    </div>
                  </div>
                </button>

                {/* Counter Pickup Sub-Options */}
                {deliveryMode === "counter" && (
                  <div className="ml-12 space-y-2 animate-fadeIn">
                    <button
                      onClick={() => setCounterSubMode("patient")}
                      disabled={submitting}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        counterSubMode === "patient"
                          ? "border-green-600 bg-green-100"
                          : "border-gray-300 hover:border-green-400"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-800">Direct Patient</p>
                          <p className="text-xs text-gray-600">Patient or family member picks up</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setCounterSubMode("company")}
                      disabled={submitting}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        counterSubMode === "company"
                          ? "border-green-600 bg-green-100"
                          : "border-gray-300 hover:border-green-400"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-800">Direct Company</p>
                          <p className="text-xs text-gray-600">Company representative picks up</p>
                        </div>
                      </div>
                    </button>
                  </div>
                )}

                {/* Courier Delivery - COURIER */}
                <button
                  onClick={() => handleDeliveryModeChange("courier")}
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
                  onClick={() => handleDeliveryModeChange("company")}
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

              {/* Counter Pickup Forms */}
              {deliveryMode === "counter" && counterSubMode && (
                <div className="space-y-4 animate-fadeIn">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="inline w-4 h-4 mr-1" />
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="userName"
                      value={formData.userName}
                      onChange={handleInputChange}
                      placeholder="Enter username or scan barcode"
                      disabled={submitting}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Person Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="personName"
                      value={formData.personName}
                      onChange={handleInputChange}
                      placeholder={counterSubMode === "patient" ? "Enter patient/family member name" : "Enter representative name"}
                      disabled={submitting}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="Enter phone number"
                      disabled={submitting}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                      required
                    />
                  </div>

                  {counterSubMode === "company" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Building2 className="inline w-4 h-4 mr-1" />
                          Company Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="companyName"
                          value={formData.companyName}
                          onChange={handleInputChange}
                          placeholder="Enter company name"
                          disabled={submitting}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Company ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="companyId"
                          value={formData.companyId}
                          onChange={handleInputChange}
                          placeholder="Enter company ID"
                          disabled={submitting}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                          required
                        />
                      </div>
                    </>
                  )}

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
            </>
          ) : (
            /* Confirmation Screen for Courier/Company Delivery */
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-800">Move to Consider List?</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    This invoice will be moved to the <strong>{getDeliveryModeLabel()}</strong> consider list. 
                    Staff can then be assigned from there.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">Invoice Details</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-600">Invoice:</span> <span className="font-medium">#{invoice.invoice_no}</span></p>
                  <p><span className="text-gray-600">Customer:</span> <span className="font-medium">{invoice.customer?.name}</span></p>
                  <p><span className="text-gray-600">Amount:</span> <span className="font-medium">₹{invoice.total_amount?.toFixed(2)}</span></p>
                  <p><span className="text-gray-600">Items:</span> <span className="font-medium">{invoice.items?.length || 0}</span></p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Add any notes for this delivery..."
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
          {showConfirmation && (
            <button
              onClick={() => setShowConfirmation(false)}
              disabled={submitting}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
          )}
          <button
            onClick={handleClose}
            disabled={submitting}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={
              submitting || 
              (!showConfirmation && deliveryMode === "counter" && (!counterSubMode || !formData.userName || !formData.personName || !formData.phoneNumber)) ||
              (!showConfirmation && deliveryMode === "counter" && counterSubMode === "company" && (!formData.companyName || !formData.companyId))
            }
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
            ) : showConfirmation ? (
              "Confirm & Move to List"
            ) : deliveryMode === "counter" ? (
              "Complete Pickup"
            ) : (
              "Next"
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