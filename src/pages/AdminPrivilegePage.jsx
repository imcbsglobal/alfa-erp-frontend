import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertCircle, Search, CheckCircle, X, Clock, User, RefreshCw, Settings, FileSearch, Calendar, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../features/auth/AuthContext';

const AdminPrivilegePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [incompleteBills, setIncompleteBills] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [showBulkReasonModal, setShowBulkReasonModal] = useState(false);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedBills, setSelectedBills] = useState([]);
  const [completingAll, setCompletingAll] = useState(false);
  const [completionReason, setCompletionReason] = useState('');
  const [manualPickingEnabled, setManualPickingEnabled] = useState(false);
  const [togglingFeature, setTogglingFeature] = useState(false);
  const [bulkPickingEnabled, setBulkPickingEnabled] = useState(false);
  
  // Missing Invoice Finder States
  const [showMissingInvoiceSection, setShowMissingInvoiceSection] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [seriesPrefix, setSeriesPrefix] = useState('');
  const [invoiceData, setInvoiceData] = useState([]);
  const [missingInvoices, setMissingInvoices] = useState([]);
  const [loadingMissing, setLoadingMissing] = useState(false);

  useEffect(() => {
    loadIncompleteBills();
    loadFeatureSettings();
  }, []);

  const loadFeatureSettings = async () => {
    try {
      const response = await api.get('/common/developer-settings/');
      console.log('📋 Full API response:', response.data);
      
      // Backend returns: { success: true, data: { enable_manual_picking_completion: true/false, ... } }
      const enabled = response.data?.data?.enable_manual_picking_completion ?? false;
      const bulkEnabled = response.data?.data?.enable_bulk_picking ?? false;
      console.log('📋 Parsed enabled values:', { enabled, bulkEnabled });
      
      setManualPickingEnabled(enabled);
      setBulkPickingEnabled(bulkEnabled);
    } catch (error) {
      console.error('Failed to load feature settings:', error);
    }
  };

  const handleToggleManualPicking = async (enabled) => {
    setTogglingFeature(true);
    try {
      await api.put('/common/developer-settings/', {
        enable_manual_picking_completion: enabled
      });
      
      setManualPickingEnabled(enabled);
      localStorage.setItem('enableManualPickingCompletion', enabled ? 'true' : 'false');
      
      toast.success(
        enabled 
          ? 'Manual picking completion enabled' 
          : 'Manual picking completion disabled',
        {
          icon: enabled ? '✅' : '🔒',
          duration: 3000
        }
      );
    } catch (error) {
      console.error('Failed to toggle manual picking:', error);
      toast.error('Failed to update setting');
    } finally {
      setTogglingFeature(false);
    }
  };

  const handleToggleBulkPicking = async (enabled) => {
    setTogglingFeature(true);
    try {
      await api.put('/common/developer-settings/', {
        enable_bulk_picking: enabled
      });
      
      setBulkPickingEnabled(enabled);
      localStorage.setItem('enableBulkPicking', enabled ? 'true' : 'false');
      
      toast.success(
        enabled 
          ? 'Bulk picking enabled' 
          : 'Bulk picking disabled',
        {
          icon: enabled ? '✅' : '🔒',
          duration: 3000
        }
      );
    } catch (error) {
      console.error('Failed to toggle bulk picking:', error);
      toast.error('Failed to update setting');
    } finally {
      setTogglingFeature(false);
    }
  };

  const loadIncompleteBills = async () => {
    setLoading(true);
    try {
      console.log('Admin Privilege - Fetching incomplete bills');
      
      // Fetch bills from all workflow stages:
      // 1. Picking in progress (PREPARING)
      const pickingResponse = await api.get('/sales/picking/history/', {
        params: {
          status: 'PREPARING',
          page_size: 100
        }
      });
      
      // 2. Packing history to find incomplete packing (IN_PROGRESS or REVIEW)
      const packingResponse = await api.get('/sales/packing/history/', {
        params: {
          status: 'IN_PROGRESS',
          page_size: 100
        }
      });

      // 3. Delivery history to find incomplete delivery (IN_TRANSIT)
      const deliveryResponse = await api.get('/sales/delivery/history/', {
        params: {
          status: 'IN_TRANSIT',
          page_size: 100
        }
      });

      const pickingBills = pickingResponse.data.results || [];
      const packingBills = packingResponse.data.results || [];
      const deliveryBills = deliveryResponse.data.results || [];
      
      // Filter out bills that are already in DELIVERED/CANCELLED status OR have completed their stage
      const validPickingBills = pickingBills.filter(b => {
        // Must not be delivered or cancelled
        if (b.invoice_status && ['DELIVERED', 'CANCELLED'].includes(b.invoice_status)) {
          return false;
        }
        // Must still be in PREPARING status for picking
        if (b.picking_status && b.picking_status !== 'PREPARING') {
          return false;
        }
        return true;
      });
      
      const validPackingBills = packingBills.filter(b => {
        // Must not be delivered or cancelled
        if (b.invoice_status && ['DELIVERED', 'CANCELLED'].includes(b.invoice_status)) {
          return false;
        }
        // Must still be in IN_PROGRESS or REVIEW status for packing
        if (b.packing_status && !['IN_PROGRESS', 'REVIEW'].includes(b.packing_status)) {
          return false;
        }
        return true;
      });

      const validDeliveryBills = deliveryBills.filter(b => {
        // Must not be delivered or cancelled
        if (b.invoice_status && ['DELIVERED', 'CANCELLED'].includes(b.invoice_status)) {
          return false;
        }
        // Must still be in IN_TRANSIT status for delivery
        if (b.delivery_status && b.delivery_status !== 'IN_TRANSIT') {
          return false;
        }
        return true;
      });
      
      // Add stage indicator to each bill
      const allBills = [
        ...validPickingBills.map(b => ({ ...b, stuck_stage: 'picking' })),
        ...validPackingBills.map(b => ({ ...b, stuck_stage: 'packing' })),
        ...validDeliveryBills.map(b => ({ ...b, stuck_stage: 'delivery' }))
      ];
      
      console.log('Admin Privilege - Picking incomplete:', validPickingBills.length);
      console.log('Admin Privilege - Packing incomplete:', validPackingBills.length);
      console.log('Admin Privilege - Delivery incomplete:', validDeliveryBills.length);
      console.log('Admin Privilege - Total incomplete bills:', allBills.length);
      
      if (pickingBills.length !== validPickingBills.length || packingBills.length !== validPackingBills.length || deliveryBills.length !== validDeliveryBills.length) {
        const filtered = (pickingBills.length - validPickingBills.length) + (packingBills.length - validPackingBills.length) + (deliveryBills.length - validDeliveryBills.length);
        console.warn(`Filtered out ${filtered} bills with inconsistent status (session incomplete but invoice already completed)`);
      }
      
      setIncompleteBills(allBills);
      
      if (allBills.length === 0) {
        console.log('Admin Privilege - No incomplete bills found.');
      }
    } catch (error) {
      console.error('Admin Privilege - API Error:', error);
      console.error('Admin Privilege - Error response:', error.response?.data);
      toast.error('Failed to load incomplete bills');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteClick = (bill) => {
    setSelectedBill(bill);
    setCompletionReason('');
    setShowReasonModal(true);
  };

  const completeFullWorkflow = async (bill, reason = '') => {
    const invoice_no = bill.invoice_no;
    const adminNote = reason || `Admin full completion by ${user?.name || user?.email}`;

    console.log('Starting admin workflow completion for:', invoice_no);
    console.log('Reason:', reason);

    try {
      // Use the new admin endpoint that bypasses validation
      const response = await api.post('/sales/admin/complete-workflow/', {
        invoice_no,
        reason: adminNote,
        admin_email: user?.email
      });

      console.log('Admin workflow completion successful:', response.data);
      
      if (response.data.errors && response.data.errors.length > 0) {
        console.warn('Workflow completed with some errors:', response.data.errors);
        toast.warning(`Completed with warnings: ${response.data.errors.join(', ')}`);
      }
      
      return response.data;
    } catch (error) {
      console.error('Admin workflow completion error:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMsg = error.response?.data?.message || 'Failed to complete workflow';
      throw new Error(errorMsg);
    }
  };

  const handleConfirmComplete = async () => {
    if (!selectedBill) return;

    setCompleting(true);
    try {
      await completeFullWorkflow(selectedBill, completionReason);

      toast.success(`Full workflow completed for ${selectedBill.invoice_no}`);
      setShowCompleteModal(false);
      setSelectedBill(null);
      setCompletionReason('');
      await loadIncompleteBills();
    } catch (error) {
      console.error('Failed to complete workflow:', error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to complete workflow';
      toast.error(errorMsg);
    } finally {
      setCompleting(false);
    }
  };

  const handleReasonSubmit = async () => {
    if (!completionReason.trim()) {
      toast.error('Please provide a reason for completion');
      return;
    }
    
    if (!selectedBill) return;

    setCompleting(true);
    try {
      await completeFullWorkflow(selectedBill, completionReason);

      toast.success(`Full workflow completed for ${selectedBill.invoice_no}`);
      setShowReasonModal(false);
      setSelectedBill(null);
      setCompletionReason('');
      await loadIncompleteBills();
    } catch (error) {
      console.error('Failed to complete workflow:', error);
      const errorMsg = error.message || error.response?.data?.message || 'Failed to complete workflow';
      toast.error(errorMsg);
    } finally {
      setCompleting(false);
    }
  };

  const handleCompleteAll = () => {
    if (selectedBills.length === 0) {
      toast.error('No bills selected');
      return;
    }
    setCompletionReason('');
    setShowBulkReasonModal(true);
  };

  const handleBulkReasonSubmit = async () => {
    if (!completionReason.trim()) {
      toast.error('Please provide a reason for bulk completion');
      return;
    }
    
    setCompletingAll(true);
    setShowBulkReasonModal(false);
    let successCount = 0;
    let failCount = 0;

    for (const billId of selectedBills) {
      const bill = incompleteBills.find(b => b.id === billId);
      if (!bill) continue;

      try {
        await completeFullWorkflow(bill, completionReason);
        successCount++;
      } catch (error) {
        console.error(`Failed to complete ${bill.invoice_no}:`, error);
        failCount++;
      }
    }

    toast.success(`Completed ${successCount} bills successfully${failCount > 0 ? `, ${failCount} failed` : ''}`);
    setSelectedBills([]);
    setBulkMode(false);
    setCompletingAll(false);
    setCompletionReason('');
    await loadIncompleteBills();
  };

  const handleConfirmBulkComplete = async () => {
    setCompletingAll(true);
    setShowBulkConfirmModal(false);
    let successCount = 0;
    let failCount = 0;

    for (const billId of selectedBills) {
      const bill = incompleteBills.find(b => b.id === billId);
      if (!bill) continue;

      try {
        await completeFullWorkflow(bill, completionReason);
        successCount++;
      } catch (error) {
        console.error(`Failed to complete ${bill.invoice_no}:`, error);
        failCount++;
      }
    }

    toast.success(`Completed ${successCount} bills successfully${failCount > 0 ? `, ${failCount} failed` : ''}`);
    setSelectedBills([]);
    setBulkMode(false);
    setCompletingAll(false);
    setCompletionReason('');
    await loadIncompleteBills();
  };

  const toggleBillSelection = (billId) => {
    setSelectedBills(prev => 
      prev.includes(billId) 
        ? prev.filter(id => id !== billId)
        : [...prev, billId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedBills.length === filteredBills.length) {
      setSelectedBills([]);
    } else {
      setSelectedBills(filteredBills.map(b => b.id));
    }
  };

  const filteredBills = incompleteBills.filter((bill) => {
    const search = searchTerm.toLowerCase();
    return (
      bill.invoice_no?.toLowerCase().includes(search) ||
      bill.picker_name?.toLowerCase().includes(search) ||
      bill.picker_email?.toLowerCase().includes(search) ||
      bill.packer_name?.toLowerCase().includes(search) ||
      bill.packer_email?.toLowerCase().includes(search) ||
      bill.delivery_person_name?.toLowerCase().includes(search) ||
      bill.delivery_person_email?.toLowerCase().includes(search)
    );
  });

  const formatDuration = (startTime) => {
    if (!startTime) return 'N/A';
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now - start;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const handleFindMissingInvoices = async () => {
    if (!invoiceDate) {
      toast.error('Please select a date');
      return;
    }

    if (!seriesPrefix.trim()) {
      toast.error('Please enter an invoice series prefix (e.g., C-, A-, B-)');
      return;
    }

    setLoadingMissing(true);
    try {
      const response = await api.get('/sales/missing-invoices/', {
        params: {
          from_date: invoiceDate,
          to_date: invoiceDate,
          series: seriesPrefix.trim()
        }
      });

      if (response.data.success) {
        setInvoiceData(response.data.data.invoices);
        setMissingInvoices(response.data.data.missing_invoices);
        
        if (response.data.data.missing_invoices.length === 0) {
          toast.success('No missing invoices found in this series!', { icon: '✅' });
        } else {
          toast.success(`Found ${response.data.data.missing_invoices.length} missing invoice(s)`, { icon: '🔍' });
        }
      } else {
        toast.error(response.data.message || 'Failed to find missing invoices');
      }
    } catch (error) {
      console.error('Error finding missing invoices:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to find missing invoices';
      toast.error(`Error: ${errorMsg}`);
    } finally {
      setLoadingMissing(false);
    }
  };



  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Admin Privilege</h1>
            </div>
          </div>
        </div>

        {/* Feature Toggles Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-wrap gap-4">
            <div className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-teal-600" />
              <h2 className="text-xl font-bold">Feature Toggles</h2>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {/* Manual Picking Completion Toggle */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-teal-300 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Manual Picking Completion</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Allow users to manually complete picking tasks directly from the picking interface.
                    </p>
                    <p className="text-xs text-gray-500">
                      When enabled, the <strong>Complete Picking</strong> button will be visible in the picking module,
                      allowing users to mark items as picked and proceed to packing.
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={manualPickingEnabled}
                        onChange={(e) => handleToggleManualPicking(e.target.checked)}
                        disabled={togglingFeature}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        {manualPickingEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Bulk Picking Toggle */}
              <div className="border border-gray-200 rounded-lg p-4 hover:border-teal-300 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">Bulk Picking</h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Allow users to pick multiple invoices at once through a bulk picking workflow.
                    </p>
                    <p className="text-xs text-gray-500">
                      When enabled, a <strong>Bulk Pick</strong> button will appear in the picking interface,
                      allowing users to scan their email once and then scan multiple invoice numbers to start
                      picking all of them simultaneously.
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bulkPickingEnabled}
                        onChange={(e) => handleToggleBulkPicking(e.target.checked)}
                        disabled={togglingFeature}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        {bulkPickingEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Missing Invoice Finder Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-teal-600" />
              <h2 className="text-xl font-bold">Find Missing Invoices</h2>
            </div>
            <button
              onClick={() => setShowMissingInvoiceSection(!showMissingInvoiceSection)}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition flex items-center gap-2"
            >
              <FileSearch className="w-4 h-4" />
              {showMissingInvoiceSection ? 'Hide' : 'Open Finder'}
            </button>
          </div>

          {showMissingInvoiceSection && (
            <div className="p-6">
              {/* Filter Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Invoice Date */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Invoice Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* Series Prefix */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Invoice Series
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={seriesPrefix}
                      onChange={(e) => setSeriesPrefix(e.target.value)}
                      placeholder="e.g., C-, A-, B-"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Enter series like: C-, A-, B-</p>
                </div>

                {/* Action Button */}
                <div className="flex flex-col gap-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Action
                  </label>
                  <button
                    onClick={handleFindMissingInvoices}
                    disabled={loadingMissing}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition flex items-center justify-center gap-2 h-[42px]"
                  >
                    {loadingMissing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Searching...
                      </>
                    ) : (
                      <>
                        <FileSearch className="w-4 h-4" />
                        Find Missing
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Results Section */}
              {(invoiceData.length > 0 || missingInvoices.length > 0) && (
                <div className="space-y-6">
                  {/* Missing Invoices Alert */}
                  {missingInvoices.length > 0 && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                      <div className="flex items-start">
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="flex-1">
                          <h3 className="text-red-800 font-semibold">Missing Invoices Found</h3>
                          <p className="text-red-700 text-sm mt-1">
                            Found {missingInvoices.length} missing invoice(s) in series "{seriesPrefix}"
                          </p>
                          <div className="mt-3 space-y-2">
                            {missingInvoices.map((missing) => (
                              <div
                                key={missing.invoice_no}
                                className="bg-white border border-red-200 rounded-lg p-3 flex items-center justify-between"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900">{missing.invoice_no}</p>
                                    <p className="text-sm text-gray-600">Number: {missing.number}</p>
                                  </div>
                                </div>
                                <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                                  MISSING
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Existing Invoices List */}
                  {invoiceData.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        Existing Invoices in Series ({invoiceData.length})
                      </h3>
                      <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Invoice No
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Customer
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Amount
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {invoiceData.map((invoice) => (
                              <tr key={invoice.invoice_no} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                  {invoice.invoice_no}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {new Date(invoice.invoice_date).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  {invoice.customer_name}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                  ₹{invoice.total_amount.toFixed(2)}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                    invoice.status === 'DELIVERED' 
                                      ? 'bg-green-100 text-green-700' 
                                      : invoice.status === 'CANCELLED'
                                      ? 'bg-red-100 text-red-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {invoice.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Incomplete Bills List */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-wrap gap-4">
            
            {/* Left: Title */}
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-600" />
            Incomplete Workflow Tasks
            </h2>

            {/* Right: Search Bar and Controls */}
            <div className="flex items-center gap-3 flex-1 justify-end">
              {/* Search Bar */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by invoice, user name, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadIncompleteBills}
                disabled={loading}
                className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {/* Bulk Toggle */}
              {incompleteBills.length > 1 && (
            <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-sm text-gray-600 font-medium">
                Bulk Completion
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                <input
                    type="checkbox"
                    checked={bulkMode}
                    onChange={(e) => {
                    setBulkMode(e.target.checked);
                    if (!e.target.checked) setSelectedBills([]);
                    }}
                    className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:bg-teal-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
            </div>
              )}
            </div>
        </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent"></div>
              <p className="text-gray-600 mt-4">Loading incomplete bills...</p>
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-semibold">No incomplete bills found</p>
              <p className="text-gray-500 text-sm mt-2">All workflow tasks are completed!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredBills.map((bill) => (
                <div key={bill.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {bulkMode && (
                        <input
                          type="checkbox"
                          checked={selectedBills.includes(bill.id)}
                          onChange={() => toggleBillSelection(bill.id)}
                          className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                        />
                      )}
                      
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-orange-600" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{bill.invoice_no}</h3>
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded">
                            IN PROGRESS
                          </span>
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${
                            bill.stuck_stage === 'picking' 
                              ? 'bg-blue-100 text-blue-700' 
                              : bill.stuck_stage === 'packing'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {bill.stuck_stage === 'picking' 
                              ? 'STUCK IN PICKING' 
                              : bill.stuck_stage === 'packing'
                              ? 'STUCK IN PACKING'
                              : 'STUCK IN DELIVERY'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{bill.picker_name || bill.packer_name || bill.delivery_person_name || 'Unknown'}</span>
                          </div>
                          <span>•</span>
                          <span>{bill.picker_email || bill.packer_email || bill.delivery_person_email}</span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>Started {formatDuration(bill.start_time)}</span>
                          </div>
                        </div>

                        {bill.notes && (
                          <p className="text-xs text-gray-500 mt-1">Notes: {bill.notes}</p>
                        )}
                      </div>
                    </div>

                    {!bulkMode && (
                      <button
                        onClick={() => handleCompleteClick(bill)}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2 transition"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Bulk Complete Button */}
          {bulkMode && selectedBills.length > 0 && (
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-semibold">{selectedBills.length}</span> bill{selectedBills.length > 1 ? 's' : ''} selected
              </div>
              <button
                onClick={handleCompleteAll}
                disabled={completingAll}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center gap-2"
              >
                {completingAll ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Processing {selectedBills.length} bill{selectedBills.length > 1 ? 's' : ''}...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Complete Selected ({selectedBills.length})
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Reason Modal */}
      {showBulkReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-6 rounded-t-xl">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-7 h-7" />
                <div>
                  <h3 className="text-xl font-bold">Bulk Completion Reason</h3>
                  <p className="text-white/90 text-sm mt-1">{selectedBills.length} bills selected</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Why are you completing these {selectedBills.length} bills? <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  This reason will be recorded for all selected bills for audit purposes.
                </p>
                <textarea
                  value={completionReason}
                  onChange={(e) => setCompletionReason(e.target.value)}
                  placeholder="Examples:\n• Technical issue preventing user completion\n• Urgent customer delivery request\n• System error recovery\n• User unavailable/emergency"
                  rows={5}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm resize-none"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowBulkReasonModal(false);
                    setCompletionReason('');
                  }}
                  disabled={completingAll}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkReasonSubmit}
                  disabled={completingAll}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 transition"
                >
                  {completingAll ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Complete All ({selectedBills.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Confirmation Modal */}
      {showBulkConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-4 rounded-t-xl">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6" />
                <h3 className="text-lg font-bold">Confirm Bulk Completion</h3>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-4">
                <p className="text-teal-800 font-semibold text-lg mb-2">Complete {selectedBills.length} Bills</p>
                <p className="text-teal-700 text-sm">
                  Each bill will go through the full workflow:
                </p>
                <div className="mt-2 space-y-1 text-sm text-teal-700">
                  <p>✓ Complete Picking (if needed)</p>
                  <p>✓ Complete Packing (if needed)</p>
                  <p>✓ Complete Delivery</p>
                </div>
                <div className="mt-3 pt-3 border-t border-teal-200">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Selected Invoices:</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {selectedBills.map(billId => {
                      const bill = incompleteBills.find(b => b.id === billId);
                      return bill ? (
                        <div key={billId} className="text-xs text-gray-600 flex items-center gap-2">
                          <span className="font-medium">{bill.invoice_no}</span>
                          <span className="text-gray-400">•</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            bill.stuck_stage === 'picking' 
                              ? 'bg-blue-100 text-blue-700' 
                              : bill.stuck_stage === 'packing'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {bill.stuck_stage === 'picking' 
                              ? 'Picking' 
                              : bill.stuck_stage === 'packing'
                              ? 'Packing'
                              : 'Delivery'}
                          </span>
                        </div>
                      ) : null;
                    })}
                  </div>
                  <p className="text-sm mt-3"><strong>Reason:</strong> {completionReason}</p>
                </div>
              </div>

              <p className="text-gray-700 mb-4 text-sm">
                This will mark all {selectedBills.length} invoices as <strong>DELIVERED</strong>. Continue?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowBulkConfirmModal(false);
                    setCompletionReason('');
                  }}
                  disabled={completingAll}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmBulkComplete}
                  disabled={completingAll}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 transition"
                >
                  {completingAll ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Complete All ({selectedBills.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reason Modal */}
      {showReasonModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-6 rounded-t-xl">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-7 h-7" />
                <div>
                  <h3 className="text-xl font-bold">Admin Completion Reason</h3>
                  <p className="text-white/90 text-sm mt-1">Invoice: {selectedBill.invoice_no}</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Why are you completing this bill? <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  This reason will be recorded in the system for audit purposes.
                </p>
                <textarea
                  value={completionReason}
                  onChange={(e) => setCompletionReason(e.target.value)}
                  placeholder="Examples:\n• Technical issue preventing user completion\n• Urgent customer delivery request\n• System error recovery\n• User unavailable/emergency"
                  rows={5}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm resize-none"
                  autoFocus
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowReasonModal(false);
                    setSelectedBill(null);
                    setCompletionReason('');
                  }}
                  disabled={completing}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReasonSubmit}
                  disabled={completing}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 transition"
                >
                  {completing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Complete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showCompleteModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-4 rounded-t-xl">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-6 h-6" />
                <h3 className="text-lg font-bold">Confirm Admin Completion</h3>
              </div>
            </div>

            <div className="p-6">
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-4">
                <p className="text-teal-800 font-semibold">Complete Full Workflow</p>
                <p className="text-teal-700 text-sm mt-1">
                  This will complete the entire workflow:
                </p>
                <div className="mt-2 space-y-1 text-sm text-teal-700">
                  <p>✓ Complete Picking {bill.stuck_stage === 'picking' ? '(Current Stage)' : ''}</p>
                  <p>✓ Complete Packing {bill.stuck_stage === 'packing' ? '(Current Stage)' : ''}</p>
                  <p>✓ Complete Delivery {bill.stuck_stage === 'delivery' ? '(Current Stage)' : ''}</p>
                </div>
                <div className="mt-3 pt-3 border-t border-teal-200 space-y-1">
                  <p className="text-sm"><strong>Invoice:</strong> {selectedBill.invoice_no}</p>
                  <p className="text-sm"><strong>User:</strong> {selectedBill.picker_name || selectedBill.packer_name || selectedBill.delivery_person_name}</p>
                  <p className="text-sm"><strong>Reason:</strong> {completionReason}</p>
                </div>
              </div>

              <p className="text-gray-700 mb-4 text-sm">
                This action will mark the invoice as <strong>DELIVERED</strong>. Continue?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCompleteModal(false);
                    setSelectedBill(null);
                    setCompletionReason('');
                  }}
                  disabled={completing}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmComplete}
                  disabled={completing}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg hover:from-teal-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 transition"
                >
                  {completing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Complete Workflow
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPrivilegePage;
