import React, { useState, useEffect } from 'react';
import { X, Truck, Package, User, Phone, Building, Hash, Mail } from 'lucide-react';

const DeliveryModal = ({ isOpen, onClose, onConfirm, invoice, submitting }) => {
  const [step, setStep] = useState(1);
  const [deliveryType, setDeliveryType] = useState(null);
  const [subType, setSubType] = useState(null);
  
  // Form states
  const [pickupPersonUsername, setPickupPersonUsername] = useState('');
  const [pickupPersonName, setPickupPersonName] = useState('');
  const [pickupPersonPhone, setPickupPersonPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [notes, setNotes] = useState('');
  
  // For Courier Delivery
  const [couriers, setCouriers] = useState([]);
  const [selectedCourier, setSelectedCourier] = useState('');
  const [selectedCourierName, setSelectedCourierName] = useState('');
  const [courierSearch, setCourierSearch] = useState('');
  const [loadingCouriers, setLoadingCouriers] = useState(false);
  const [showCourierDropdown, setShowCourierDropdown] = useState(false);
  
  // For Company Delivery
  const [staffEmail, setStaffEmail] = useState('');
  const [staffName, setStaffName] = useState('');

  // Load couriers when modal opens
  useEffect(() => {
    if (isOpen && deliveryType === 'COURIER') {
      loadCouriers();
    }
  }, [isOpen, deliveryType]);

  const loadCouriers = async () => {
    setLoadingCouriers(true);
    try {
      const { getCouriers } = await import('../../../services/sales');
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
      setCouriers([]);
    } finally {
      setLoadingCouriers(false);
    }
  };

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
    setSelectedCourier('');
    setSelectedCourierName('');
    setCourierSearch('');
    setStaffEmail('');
    setStaffName('');
    setShowCourierDropdown(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleTypeSelect = (type) => {
    setDeliveryType(type);
    if (type === 'COUNTER_PICKUP') {
      setStep(2);
    } else if (type === 'COURIER') {
      setStep(4);
    } else if (type === 'COMPANY_DELIVERY') {
      setStep(5);
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
    } else if (step === 2 || step === 4 || step === 5) {
      setStep(1);
      setDeliveryType(null);
      setSubType(null);
      setSelectedCourier('');
      setSelectedCourierName('');
      setStaffEmail('');
      setStaffName('');
      setShowCourierDropdown(false);
    }
  };

  const handleCourierSelect = (courier) => {
    setSelectedCourier(courier.courier_id);
    setSelectedCourierName(courier.courier_name);
    setCourierSearch(courier.courier_name);
    setShowCourierDropdown(false);
  };

  const handleSubmit = () => {
    let payload = {
      invoice_no: invoice.invoice_no,
      notes: notes || ''
    };

    if (deliveryType === 'COUNTER_PICKUP') {
      payload.delivery_type = 'DIRECT';

      if (!/^\d{10}$/.test(pickupPersonPhone)) {
        alert("Enter valid 10 digit phone number");
        return;
      }

      if (subType === 'PATIENT') {
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
      if (!selectedCourier) {
        alert('Please select a courier');
        return;
      }
      payload.delivery_type = 'COURIER';
      payload.courier_id = selectedCourier;
    } else if (deliveryType === 'COMPANY_DELIVERY') {
      if (!staffEmail.trim() || !staffName.trim()) {
        alert('Please enter staff email and name');
        return;
      }
      payload.delivery_type = 'INTERNAL';
      payload.user_email = staffEmail.trim();
      if (staffName.trim()) {
        payload.user_name = staffName.trim();
      }
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
    } else if (deliveryType === 'COURIER') {
      return selectedCourier !== '';
    } else if (deliveryType === 'COMPANY_DELIVERY') {
      return staffEmail.trim() !== '';
    }
    return true;
  };

  const filteredCouriers = couriers.filter(courier => 
    courier.courier_name.toLowerCase().includes(courierSearch.toLowerCase()) ||
    courier.courier_code.toLowerCase().includes(courierSearch.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
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

        <div className="p-6">
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
                  onClick={() => handleTypeSelect('COMPANY_DELIVERY')}
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

          {step === 3 && deliveryType === 'COUNTER_PICKUP' && (
            <div className="space-y-4">
              <button
                onClick={handleBack}
                className="text-sm text-teal-600 hover:text-teal-700 mb-2"
              >
                ← Back
              </button>
              
              {subType === 'PATIENT' && (
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
                </>
              )}

              {subType === 'COMPANY' && (
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
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleBack}
                  disabled={submitting}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !isFormValid()}
                  className="flex-1 py-2 px-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Processing...' : 'Complete Delivery'}
                </button>
              </div>
            </div>
          )}

          {step === 4 && deliveryType === 'COURIER' && (
            <div className="space-y-4">
              <button
                onClick={handleBack}
                className="text-sm text-teal-600 hover:text-teal-700 mb-2"
              >
                ← Back
              </button>
              
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Assign Courier</h4>
              
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{invoice?.invoice_no}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{invoice?.customer?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">₹{invoice?.total_amount?.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">{invoice?.items?.length || 0} items</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Truck className="inline w-4 h-4 mr-1" />
                  Select Courier <span className="text-red-500">*</span>
                </label>
                
                <div className="relative">
                  <input
                    type="text"
                    value={courierSearch}
                    onChange={(e) => {
                      setCourierSearch(e.target.value);
                      setShowCourierDropdown(true);
                    }}
                    onFocus={() => setShowCourierDropdown(true)}
                    placeholder="Search courier..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />

                  {showCourierDropdown && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowCourierDropdown(false)}
                      />
                      
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {loadingCouriers ? (
                          <div className="text-center py-4 text-gray-500">Loading couriers...</div>
                        ) : filteredCouriers.length === 0 ? (
                          <div className="text-center py-4 text-gray-500">No couriers found</div>
                        ) : (
                          <>
                            {filteredCouriers.map((courier) => (
                              <button
                                key={courier.courier_id}
                                onClick={() => handleCourierSelect(courier)}
                                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition border-b border-gray-200 last:border-b-0 ${
                                  selectedCourier === courier.courier_id ? 'bg-teal-50' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-gray-900">{courier.courier_name}</p>
                                    <p className="text-xs text-gray-500">{courier.courier_code}</p>
                                  </div>
                                  {selectedCourier === courier.courier_id && (
                                    <div className="w-5 h-5 bg-teal-600 rounded-full flex items-center justify-center">
                                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {selectedCourier && (
                  <div className="mt-2 p-2 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-teal-700">Selected: {selectedCourierName}</span>
                    <button
                      onClick={() => {
                        setSelectedCourier('');
                        setSelectedCourierName('');
                        setCourierSearch('');
                      }}
                      className="text-teal-600 hover:text-teal-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleBack}
                  disabled={submitting}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !isFormValid()}
                  className="flex-1 py-2 px-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Assigning...' : 'Assign Courier'}
                </button>
              </div>
            </div>
          )}

          {step === 5 && deliveryType === 'COMPANY_DELIVERY' && (
            <div className="space-y-4">
              <button
                onClick={handleBack}
                className="text-sm text-teal-600 hover:text-teal-700 mb-2"
              >
                ← Back
              </button>
              
              <h4 className="text-lg font-semibold text-gray-800 mb-4">Assign Delivery Staff</h4>
              
              <div className="bg-teal-50 p-4 rounded-lg border border-teal-200 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{invoice?.invoice_no}</p>
                    <p className="text-sm text-gray-600 mt-1">{invoice?.customer?.name}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">{invoice?.items?.length || 0} items</p>
                      <p className="font-semibold text-gray-900">₹{invoice?.total_amount?.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="inline w-4 h-4 mr-1" />
                  Staff Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  placeholder="Enter staff email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The invoice will be assigned to this staff member for delivery
                </p>
              </div>

              {/* ADD THIS RIGHT BELOW */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline w-4 h-4 mr-1" />
                  Staff Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="Enter staff name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleBack}
                  disabled={submitting}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !isFormValid()}
                  className="flex-1 py-2 px-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {submitting ? 'Assigning...' : 'Assign to Staff'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryModal;