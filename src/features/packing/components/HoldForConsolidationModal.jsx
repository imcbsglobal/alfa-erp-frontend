import { useState } from "react";
import toast from "react-hot-toast";

export default function HoldForConsolidationModal({
  isOpen,
  onClose,
  onConfirm,
  customerName,
  invoiceNo,
  heldBills = [],
  primaryHolder = null,
  primaryHolderEmail = null,
}) {
  const [holdBill, setHoldBill] = useState(heldBills.length > 0); // Auto-hold if there are existing held bills
  const [editableCustomerName, setEditableCustomerName] = useState(customerName || "");

  const handleConfirm = () => {
    if (holdBill && !editableCustomerName.trim()) {
      toast.error("Please enter a customer name to hold the bill");
      return;
    }
    
    // If holding and there's a primary holder, pass their email for assignment
    const assignToEmail = (holdBill && primaryHolderEmail) ? primaryHolderEmail : null;
    onConfirm(holdBill, editableCustomerName.trim(), assignToEmail);
  };

  const handleProceedWithHeld = () => {
    onClose();
    // Trigger navigation to consolidated packing with all held bills
    if (heldBills.length > 0) {
      const allBillIds = [invoiceNo, ...heldBills.map(b => b.invoice_no)];
      window.dispatchEvent(new CustomEvent('proceedWithHeldBills', { 
        detail: { billIds: allBillIds, customerName: editableCustomerName.trim() } 
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4 rounded-t-xl">
          <h2 className="text-xl font-bold text-white">Bill Consolidation Options</h2>
          <p className="text-teal-50 text-sm mt-1">
            Hold this bill to pack with future bills from the same customer
          </p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Customer name field */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Customer Name:
            </label>
            <input
              type="text"
              value={editableCustomerName}
              onChange={(e) => setEditableCustomerName(e.target.value)}
              placeholder="Enter customer name for grouping..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Bills with this exact customer name will be grouped together
            </p>
          </div>

          {/* Hold option */}
          <div className="mb-4 p-4 bg-teal-50 border border-teal-300 rounded-lg">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={holdBill}
                onChange={(e) => setHoldBill(e.target.checked)}
                className="w-5 h-5 mt-0.5 text-teal-600 rounded focus:ring-teal-500"
              />
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Hold this bill for consolidation</p>
                {primaryHolder && heldBills.length > 0 ? (
                  <p className="text-sm text-gray-600 mt-1">
                    When checked, this bill will be <span className="font-semibold text-teal-700">assigned to {primaryHolder}</span> and held together with their {heldBills.length} bill{heldBills.length > 1 ? 's' : ''} for consolidated packing.
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 mt-1">
                    When checked, this bill will wait for other bills from the same customer before packing.
                    When unchecked, proceed to pack this bill individually now.
                  </p>
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t bg-gray-50 px-6 py-4 rounded-b-xl">
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-all shadow-md"
            >
              {holdBill ? "Hold Bill & Continue" : "Proceed to Packing"}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
