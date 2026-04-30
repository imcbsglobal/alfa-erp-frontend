import { useState } from "react";
import toast from "react-hot-toast";

const PAYMENT_MODES = [
  { value: "CASH",   label: "Cash"          },
  { value: "NEFT",   label: "NEFT / RTGS"   },
  { value: "UPI",    label: "UPI"           },
  { value: "CHEQUE", label: "Cheque"        },
  { value: "OTHER",  label: "Other"         },
];

const fmt = (val) => parseFloat(val || 0).toLocaleString("en-IN");

export default function RecordPaymentModal({ isOpen, client, onClose, onSaved }) {
  const [form, setForm] = useState({
    amount:       "",
    payment_mode: "CASH",
    reference_no: "",
    payment_date: new Date().toISOString().split("T")[0],
    notes:        "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setError("");
  };

  const outstanding = parseFloat(client?.outstanding || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const amount = parseFloat(form.amount);
    if (!form.amount || isNaN(amount) || amount <= 0) {
      setError("Please enter a valid payment amount");
      return;
    }
    if (amount > outstanding) {
      setError(`Amount cannot exceed outstanding balance of ₹${fmt(outstanding)}`);
      return;
    }
    if (!form.payment_date) {
      setError("Please select a payment date");
      return;
    }

    setLoading(true);
    try {
      // Replace with your actual recordPayment(client.code, form) call
      await new Promise((r) => setTimeout(r, 600));
      toast.success(`Payment of ₹${fmt(amount)} recorded!`);
      setForm({ amount: "", payment_mode: "CASH", reference_no: "", payment_date: new Date().toISOString().split("T")[0], notes: "" });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-4 sm:px-6 py-3 sm:py-4 rounded-t-xl">
          <h2 className="text-lg sm:text-xl font-bold text-white">Record Payment</h2>
          <p className="text-teal-50 text-xs sm:text-sm mt-1">
            {client.name} · <span className="font-semibold font-mono">{client.code}</span>
            {client.area && <> · {client.area}</>}
            {client.agent && <> · Agent: {client.agent}</>}
          </p>
        </div>

        {/* Outstanding banner */}
        <div className="bg-red-50 border-b border-red-100 px-4 sm:px-6 py-2 flex items-center justify-between">
          <span className="text-xs text-red-600 font-semibold uppercase tracking-wide">Outstanding Balance</span>
          <span className="text-red-700 font-bold text-sm tabular-nums">₹{fmt(outstanding)}</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">

          {/* Amount */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
              Payment Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={outstanding}
              step="0.01"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              placeholder={`Max ₹${fmt(outstanding)}`}
              disabled={loading}
              autoFocus
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
            />
            {form.amount && parseFloat(form.amount) > 0 && parseFloat(form.amount) <= outstanding && (
              <p className="text-xs text-teal-600 mt-1.5 font-medium">
                Balance after payment: ₹{fmt(outstanding - parseFloat(form.amount))}
              </p>
            )}
          </div>

          {/* Mode + Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <select
                value={form.payment_mode}
                onChange={(e) => set("payment_mode", e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all bg-white"
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.payment_date}
                onChange={(e) => set("payment_date", e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              />
            </div>
          </div>

          {/* Reference No */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
              Reference / Transaction No
            </label>
            <input
              type="text"
              value={form.reference_no}
              onChange={(e) => set("reference_no", e.target.value)}
              placeholder="UTR / Cheque No / UPI Ref…"
              disabled={loading}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5">
              Notes
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any additional remarks…"
              disabled={loading}
              className="w-full px-3 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs sm:text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.amount || parseFloat(form.amount) <= 0}
              className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving…
                </>
              ) : (
                "Record Payment"
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}