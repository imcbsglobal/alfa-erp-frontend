import React, { useState } from 'react';
import { X, Truck, Package, User, Phone, Building, Hash } from 'lucide-react';

const DeliveryModal = ({ isOpen, onClose, onConfirm, invoice, submitting }) => {
  const [step, setStep] = useState(1);
  const [deliveryType, setDeliveryType] = useState(null);
  const [subType, setSubType] = useState(null);
  
  // Form states - Updated for patient pickup
  const [pickupPersonUsername, setPickupPersonUsername] = useState('');
  const [pickupPersonName, setPickupPersonName] = useState('');
  const [pickupPersonPhone, setPickupPersonPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setStep(1);
    setDeliveryType(null);
    setSubType(null);
    setPickupPersonUsername('');
    setPickupPersonName('');
    setPickupPersonPhone('');
    setCompanyName('');
    setCompanyId('');
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTypeSelect = (type) => {
    setDeliveryType(type);
    if (type === 'COUNTER_PICKUP') {
      setStep(2);
    } else {
      setStep(3);
    }
  };

  const handleSubTypeSelect = (sub) => {
    setSubType(sub);
    setStep(3);
  };

  const handleBack = () => {
    if (step === 3 && deliveryType === 'COUNTER_PICKUP') {
      setStep(2);
      setSubType(null);
    } else if (step === 2 || step === 3) {
      setStep(1);
      setDeliveryType(null);
      setSubType(null);
    }
  };

  const handleSubmit = () => {
    let payload = {
      invoice_no: invoice.invoice_no,
      notes: notes || ''
    };

    if (deliveryType === 'COUNTER_PICKUP') {
      payload.delivery_type = 'DIRECT';

      if (subType === 'PATIENT') {
        // ✅ FIXED: Send all required fields for patient pickup
        if (!pickupPersonUsername.trim() || !pickupPersonName.trim() || !pickupPersonPhone.trim()) {
          alert('Please fill all required fields');
          return;
        }
        payload.counter_sub_mode = 'patient';
        payload.pickup_person_username = pickupPersonUsername.trim();
        payload.pickup_person_name = pickupPersonName.trim();
        payload.pickup_person_phone = pickupPersonPhone.trim();
      } else if (subType === 'COMPANY') {
        if (!pickupPersonUsername.trim() || !pickupPersonName.trim() || 
            !pickupPersonPhone.trim() || !companyName.trim() || !companyId.trim()) {
          alert('Please fill all company details');
          return;
        }
        payload.counter_sub_mode = 'company';
        payload.pickup_person_username = pickupPersonUsername.trim();
        payload.pickup_person_name = pickupPersonName.trim();
        payload.pickup_person_phone = pickupPersonPhone.trim();
        payload.pickup_company_name = companyName.trim();
        payload.pickup_company_id = companyId.trim();
      }
    } else if (deliveryType === 'COURIER') {
      payload.delivery_type = 'COURIER';
    } else if (deliveryType === 'COMPANY') {
      payload.delivery_type = 'INTERNAL';
    }

    onConfirm(payload);
  };

  const isFormValid = () => {
    if (deliveryType === 'COUNTER_PICKUP') {
      if (subType === 'PATIENT') {
        return pickupPersonUsername.trim() && pickupPersonName.trim() && pickupPersonPhone.trim();
      } else if (subType === 'COMPANY') {
        return pickupPersonUsername.trim() && pickupPersonName.trim() && 
               pickupPersonPhone.trim() && companyName.trim() && companyId.trim();
      }
    }
    return true;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h3 className="font-bold text-gray-900">Start Delivery Process</h3>
            <p className="text-sm text-gray-600">Invoice: {invoice?.invoice_no}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Select Main Delivery Type */}
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Select Delivery Type</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => handleTypeSelect('COUNTER_PICKUP')}
                  className="p-6 border-2 border-gray-300 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-all group"
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center group-hover:bg-teal-200">
                      <User className="w-8 h-8 text-teal-600" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-900">Counter Pickup</h5>
                      <p className="text-xs text-gray-600 mt-1">Direct patient or company pickup</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleTypeSelect('COURIER')}
                  className="p-6 border-2 border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all group"
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200">
                      <Truck className="w-8 h-8 text-orange-600" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-900">Courier Delivery</h5>
                      <p className="text-xs text-gray-600 mt-1">Send via courier service</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleTypeSelect('COMPANY')}
                  className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200">
                      <Package className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-900">Company Delivery</h5>
                      <p className="text-xs text-gray-600 mt-1">Internal delivery staff</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select Counter Pickup Sub-type */}
          {step === 2 && deliveryType === 'COUNTER_PICKUP' && (
            <div className="space-y-4">
              <button
                onClick={handleBack}
                className="text-sm text-teal-600 hover:text-teal-700 mb-2"
              >
                ← Back
              </button>
              
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Select Pickup Type</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleSubTypeSelect('PATIENT')}
                  className="p-6 border-2 border-gray-300 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-all group"
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center group-hover:bg-teal-200">
                      <User className="w-8 h-8 text-teal-600" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-900">Direct Patient</h5>
                      <p className="text-xs text-gray-600 mt-1">Customer picks up directly</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleSubTypeSelect('COMPANY')}
                  className="p-6 border-2 border-gray-300 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-all group"
                >
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center group-hover:bg-teal-200">
                      <Building className="w-8 h-8 text-teal-600" />
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-900">Direct Company</h5>
                      <p className="text-xs text-gray-600 mt-1">Company representative pickup</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Form for Details */}
          {step === 3 && (
            <div className="space-y-4">
              {(deliveryType === 'COUNTER_PICKUP' && subType) && (
                <button
                  onClick={handleBack}
                  className="text-sm text-teal-600 hover:text-teal-700 mb-2"
                >
                  ← Back
                </button>
              )}
              
              {deliveryType === 'COUNTER_PICKUP' && subType === 'PATIENT' && (
                <>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Direct Patient Pickup</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <User className="inline w-4 h-4 mr-1" />
                        Username/ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={pickupPersonUsername}
                        onChange={(e) => setPickupPersonUsername(e.target.value)}
                        placeholder="Enter username or ID"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <User className="inline w-4 h-4 mr-1" />
                        Person Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={pickupPersonName}
                        onChange={(e) => setPickupPersonName(e.target.value)}
                        placeholder="Enter person name"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Phone className="inline w-4 h-4 mr-1" />
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={pickupPersonPhone}
                        onChange={(e) => setPickupPersonPhone(e.target.value)}
                        placeholder="Enter phone number"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {deliveryType === 'COUNTER_PICKUP' && subType === 'COMPANY' && (
                <>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Direct Company Pickup</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <User className="inline w-4 h-4 mr-1" />
                        Username/ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={pickupPersonUsername}
                        onChange={(e) => setPickupPersonUsername(e.target.value)}
                        placeholder="Enter username or ID"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <User className="inline w-4 h-4 mr-1" />
                          Person Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={pickupPersonName}
                          onChange={(e) => setPickupPersonName(e.target.value)}
                          placeholder="Enter person name"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Phone className="inline w-4 h-4 mr-1" />
                          Person Phone <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={pickupPersonPhone}
                          onChange={(e) => setPickupPersonPhone(e.target.value)}
                          placeholder="Enter phone number"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Building className="inline w-4 h-4 mr-1" />
                          Company Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="Enter company name"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Hash className="inline w-4 h-4 mr-1" />
                          Company ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={companyId}
                          onChange={(e) => setCompanyId(e.target.value)}
                          placeholder="Enter company ID"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {deliveryType === 'COURIER' && (
                <>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Courier Delivery</h4>
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-orange-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-orange-900 mb-1">
                          This invoice will be moved to the Courier Consider List
                        </p>
                        <p className="text-xs text-orange-700">
                          • Invoice will be removed from the Dispatch page<br />
                          • You can then assign staff to handle courier details<br />
                          • Staff will enter courier name and tracking number
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {deliveryType === 'COMPANY' && (
                <>
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Company Delivery</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-900 mb-1">
                          This invoice will be moved to the Company Delivery Consider List
                        </p>
                        <p className="text-xs text-blue-700">
                          • Invoice will be removed from the Dispatch page<br />
                          • You can then assign delivery staff<br />
                          • Staff will complete the delivery to customer
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Notes field for all types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 3 && (
          <div className="p-4 border-t border-gray-200 flex gap-3">
            <button
              onClick={handleClose}
              disabled={submitting}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !isFormValid()}
              className="flex-1 py-2 px-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Processing...' : 
                deliveryType === 'COUNTER_PICKUP' ? 'Complete Pickup' : 
                'Add to Consider List'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryModal;