import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";

export default function PackingInvoiceViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const loadInvoice = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/sales/invoices/${id}/`);
      const inv = res.data;

      if (!["PICKED", "PACKING", "PACKED"].includes(inv.status)) {
        throw new Error("Invoice not available for packing");
      }

      setInvoice(inv);
    } catch (err) {
      setError(err.message || "Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Complete packing
  const handleCompletePacking = async () => {
    if (!invoice) return;

    setCompleting(true);
    try {
      await api.post("/sales/packing/complete/", {
        invoice_no: invoice.invoice_no,
        user_email: user.email,
        notes: "Packing completed",
      });

      toast.success(`Packing completed for ${invoice.invoice_no}`);
      navigate("/ops/packing/invoices", { replace: true });
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to complete packing"
      );
    } finally {
      setCompleting(false);
      setShowConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading invoice...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-red-600 mb-4">
            {error || "Invoice not found"}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-200 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Packing Invoice
            </h1>
            <p className="text-gray-600">
              Invoice #{invoice.invoice_no}
            </p>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-200 rounded-lg font-semibold"
          >
            Back
          </button>
        </div>

        {/* Invoice Info */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <p><strong>Date:</strong> {invoice.invoice_date}</p>
            <p><strong>Status:</strong> {invoice.status}</p>
            <p><strong>Customer:</strong> {invoice.customer?.name}</p>
            <p><strong>Sales:</strong> {invoice.salesman?.name}</p>
            <p><strong>Amount:</strong> ₹{invoice.total_amount}</p>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl shadow overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-purple-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-center">MRP</th>
                <th className="px-4 py-3 text-center">Batch</th>
                <th className="px-4 py-3 text-center">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoice.items?.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.item_code}</td>
                  <td className="px-4 py-3 text-center">{item.quantity}</td>
                  <td className="px-4 py-3 text-center">₹{item.mrp}</td>
                  <td className="px-4 py-3 text-center">{item.batch_no}</td>
                  <td className="px-4 py-3 text-center">{item.expiry_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action */}
        {["PICKED", "PACKING"].includes(invoice.status) && (
          <div className="flex justify-end">
            <button
              onClick={() => setShowConfirm(true)}
              disabled={completing}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-bold shadow-lg disabled:opacity-50"
            >
              {completing ? "Completing..." : "Complete Packing"}
            </button>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">
              Confirm Packing Completion
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to mark this invoice as packed?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCompletePacking}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold"
              >
                Yes, Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
