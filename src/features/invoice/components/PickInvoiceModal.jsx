import { useState } from "react";

export default function PickInvoiceModal({ isOpen, onClose, onPick, invoiceNumber }) {
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!employeeEmail.trim()) {
      setError("Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(employeeEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await onPick(employeeEmail.trim());
      setEmployeeEmail("");
    } catch (err) {
      setError(err.message || "Failed to claim invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    // Auto-submit on barcode scanner (usually sends Enter key)
    if (e.key === "Enter" && employeeEmail.trim()) {
      handleSubmit(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4 rounded-t-xl">
          <h2 className="text-xl font-bold text-white">Claim Invoice</h2>
          <p className="text-teal-50 text-sm mt-1">
            Invoice: <span className="font-semibold">{invoiceNumber}</span>
          </p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Employee Email <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={employeeEmail}
              onChange={(e) => {
                setEmployeeEmail(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder="employee@company.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              disabled={loading}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-2">
              💡 Scan your barcode or type your email manually
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={loading || !employeeEmail.trim()}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                "Start Picking"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}