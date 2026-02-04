import { useState } from "react";
import { X, Mail, FileText, Package, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../../services/api";

export default function BulkPickModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1: Email scan, 2: Invoice scanning
  const [userEmail, setUserEmail] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [invoiceNumbers, setInvoiceNumbers] = useState([]);
  const [currentInvoiceInput, setCurrentInvoiceInput] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  const handleClose = () => {
    // Reset all state
    setStep(1);
    setUserEmail("");
    setVerifiedEmail("");
    setInvoiceNumbers([]);
    setCurrentInvoiceInput("");
    onClose();
  };

  const handleEmailScan = () => {
    const email = userEmail.trim();
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Store email and proceed to invoice scanning
    // User validation will happen on backend when starting bulk picking
    setVerifiedEmail(email);
    setStep(2);
    toast.success(`Email accepted: ${email}`);
  };

  const handleInvoiceScan = () => {
    const invoiceNo = currentInvoiceInput.trim();
    if (!invoiceNo) {
      toast.error("Please enter an invoice number");
      return;
    }

    if (invoiceNumbers.includes(invoiceNo)) {
      toast.error("This invoice has already been added");
      setCurrentInvoiceInput("");
      return;
    }

    setInvoiceNumbers([...invoiceNumbers, invoiceNo]);
    setCurrentInvoiceInput("");
    toast.success(`Invoice ${invoiceNo} added to list`);
  };

  const handleRemoveInvoice = (invoiceNo) => {
    setInvoiceNumbers(invoiceNumbers.filter(inv => inv !== invoiceNo));
    toast.info(`Invoice ${invoiceNo} removed`);
  };

  const handleStartAll = async () => {
    if (invoiceNumbers.length === 0) {
      toast.error("Please add at least one invoice");
      return;
    }

    setIsStarting(true);
    try {
      const response = await api.post("/sales/picking/bulk-start/", {
        user_email: verifiedEmail,
        invoice_numbers: invoiceNumbers
      });

      if (response.data.success) {
        const started = response.data.started || [];
        const failed = response.data.failed || [];
        
        if (response.data.total_started > 0) {
          toast.success(
            `Successfully started picking for ${response.data.total_started} invoice(s). Complete them from Ongoing Work.`,
            { duration: 5000 }
          );
        }
        
        if (response.data.total_failed > 0) {
          // Show detailed failures
          failed.forEach(inv => {
            toast.error(`${inv.invoice_no}: ${inv.error}`, { duration: 4000 });
          });
        }

        // Call onSuccess to reload the invoice list
        if (onSuccess) {
          onSuccess();
        }

        // Close modal after short delay
        setTimeout(() => {
          handleClose();
        }, 1000);
      }
    } catch (error) {
      console.error("Error starting bulk picking:", error);
      const errorMsg = error.response?.data?.message || "Failed to start bulk picking";
      toast.error(errorMsg, { duration: 4000 });
    } finally {
      setIsStarting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-4 sm:px-6 py-3 sm:py-4 rounded-t-xl">
          <h2 className="text-lg sm:text-xl font-bold text-white">
            {step === 1 ? "Bulk Picking" : "Scan Invoices"}
          </h2>
          {step === 1 && (
            <p className="text-teal-50 text-xs sm:text-sm mt-1">
              Start picking multiple invoices at once
            </p>
          )}
          {step === 2 && (
            <p className="text-teal-50 text-xs sm:text-sm mt-1">
              Email: <span className="font-semibold">{verifiedEmail}</span>
            </p>
          )}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {/* Step 1: Email Scan */}
          {step === 1 && (
            <div>
              <div className="mb-4">
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                  Employee Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleEmailScan()}
                  placeholder="employee@company.com"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 Scan your barcode or type your email manually
                </p>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEmailScan}
                  className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!userEmail.trim()}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Invoice Scanning */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">
                  Invoice Number
                </label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={currentInvoiceInput}
                      onChange={(e) => setCurrentInvoiceInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleInvoiceScan()}
                      placeholder="Scan or enter invoice number"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={handleInvoiceScan}
                    className="px-6 py-3 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Scanned Invoices List */}
              {invoiceNumbers.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Scanned Invoices ({invoiceNumbers.length})
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                    <div className="space-y-2">
                      {invoiceNumbers.map((invoiceNo, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center bg-white px-4 py-2 rounded-lg shadow-sm"
                        >
                          <span className="font-mono text-gray-800">{invoiceNo}</span>
                          <button
                            onClick={() => handleRemoveInvoice(invoiceNo)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleStartAll}
                  disabled={invoiceNumbers.length === 0 || isStarting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isStarting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    `Start All (${invoiceNumbers.length})`
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
