// src/features/invoice/components/PickInvoiceModal.jsx

import React, { useState } from "react";

export default function PickInvoiceModal({ isOpen, onClose, onPick }) {
  const [employeeEmail, setEmployeeEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!employeeEmail) {
      alert("Please enter or scan your email.");
      return;
    }
    onPick(employeeEmail);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white p-6 rounded-lg w-96">
        <h2 className="text-xl font-semibold mb-4">Scan / Enter your Email</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={employeeEmail}
            onChange={(e) => setEmployeeEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full p-2 border rounded mb-4"
          />
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 text-white rounded"
            >
              Confirm Pick
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
