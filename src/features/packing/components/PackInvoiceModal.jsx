// src/features/packing/components/PackInvoiceModal.jsx
import { useState } from "react";

export default function PackInvoiceModal({ isOpen, onClose, onPack, invoiceNumber }) {
  const [email, setEmail] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!email) return alert("Enter employee email");
    onPack(email);
    setEmail("");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-xl font-bold mb-2">Start Packing</h2>
        <p className="text-gray-600 mb-4">
          Invoice: <b>{invoiceNumber}</b>
        </p>

        <input
          type="email"
          placeholder="Enter employee email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border px-3 py-2 rounded-lg mb-4"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg"
          >
            Start Packing
          </button>
        </div>
      </div>
    </div>
  );
}
