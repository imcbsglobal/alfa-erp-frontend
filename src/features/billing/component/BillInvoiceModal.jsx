import { useState, useEffect } from "react";
import api from "../../../services/api";

export default function BillInvoiceModal({ isOpen, onClose, onBill, invoiceNumber }) {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadEmployees();
    }
  }, [isOpen]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      // Get employees with BILLER role
      const res = await api.get("/users/employees/?role=BILLER");
      setEmployees(res.data.results || res.data || []);
    } catch (err) {
      console.error("Failed to load employees:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!selectedEmployee) {
      alert("Please select an employee");
      return;
    }
    onBill(selectedEmployee);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[9999]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4 rounded-t-2xl">
            <h2 className="text-xl font-bold text-white">Assign Billing Task</h2>
            <p className="text-sm text-teal-50 mt-1">
              Invoice: {invoiceNumber}
            </p>
          </div>

          {/* Body */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <svg
                  className="animate-spin h-8 w-8 text-teal-500 mx-auto mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <p className="text-gray-600">Loading employees...</p>
              </div>
            ) : (
              <>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Biller
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 transition-all"
                >
                  <option value="">-- Select Biller --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.email}>
                      {emp.name} ({emp.employee_id})
                    </option>
                  ))}
                </select>

                {employees.length === 0 && !loading && (
                  <p className="text-sm text-red-600 mt-2">
                    No billers available
                  </p>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedEmployee || loading}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                selectedEmployee && !loading
                  ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:from-teal-600 hover:to-cyan-700 shadow-lg"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Assign Billing
            </button>
          </div>
        </div>
      </div>
    </>
  );
}