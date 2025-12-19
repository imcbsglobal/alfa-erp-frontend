import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";
import PackInvoiceModal from "../components/PackInvoiceModal";


const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export default function PackingInvoiceListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
const [showPackModal, setShowPackModal] = useState(false);
const [selectedInvoice, setSelectedInvoice] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 🔹 Load only PICKED invoices
  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        "/sales/invoices/?status=PICKED&page_size=100"
      );
      setInvoices(res.data.results || []);
    } catch {
      toast.error("Failed to load packing invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // 🔥 SSE – only PICKED invoices
  useEffect(() => {
    const es = new EventSource(`${API_BASE_URL}/sales/sse/invoices/`);

    es.onmessage = (event) => {
      try {
        const invoice = JSON.parse(event.data);
        if (invoice.status !== "PICKED") return;

        setInvoices((prev) => {
          const exists = prev.find((i) => i.id === invoice.id);
          if (exists) {
            return prev.map((i) =>
              i.id === invoice.id ? invoice : i
            );
          }
          return [invoice, ...prev];
        });
      } catch (e) {
        console.error("Invalid SSE:", e);
      }
    };

    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  // 📦 Start packing
//   const handlePackClick = async (invoice) => {
//     try {
//       await api.post("/sales/packing/start/", {
//         invoice_no: invoice.invoice_no,
//         user_email: user.email,
//         notes: "Packing started",
//       });

//       toast.success(`Packing started for ${invoice.invoice_no}`);
//       loadInvoices();
//     } catch (err) {
//       toast.error(
//         err.response?.data?.message || "Failed to start packing"
//       );
//     }
//   };

const handlePackClick = (invoice) => {
  setSelectedInvoice(invoice);
  setShowPackModal(true);
};

  const handleView = (id) => {
    navigate(`/ops/packing/invoices/view/${id}`);
  };

  const handlePackInvoice = async (employeeEmail) => {
  try {
    await api.post("/sales/packing/start/", {
      invoice_no: selectedInvoice.invoice_no,
      user_email: employeeEmail,
      notes: "Packing started",
    });

    toast.success(`Packing started for ${selectedInvoice.invoice_no}`);
    setShowPackModal(false);
    setSelectedInvoice(null);
    loadInvoices();
  } catch (err) {
    toast.error(err.response?.data?.message || "Failed to start packing");
  }
};

  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = invoices.slice(indexOfFirst, indexOfLast);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Packing Management
            </h1>
            <p className="text-gray-600">
              Pack picked invoices
            </p>
          </div>

          <button
            onClick={loadInvoices}
            className="px-5 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-semibold shadow-lg"
          >
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="text-center py-20 text-gray-600">
              Loading invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              No picked invoices for packing
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-500 to-indigo-600">
                <tr>
                  <th className="px-6 py-4 text-left text-white">Invoice</th>
                  <th className="px-6 py-4 text-left text-white">Date</th>
                  <th className="px-6 py-4 text-left text-white">Customer</th>
                  <th className="px-6 py-4 text-left text-white">Sales</th>
                  <th className="px-6 py-4 text-center text-white">Amount</th>
                  <th className="px-6 py-4 text-left text-white">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {currentItems.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold">
                      {inv.invoice_no}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {inv.invoice_date}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium">{inv.customer?.name}</p>
                      <p className="text-xs text-gray-500">
                        {inv.customer?.area}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {inv.salesman?.name}
                    </td>
                    <td className="px-6 py-4 text-right font-bold">
                      ₹{inv.total_amount}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePackClick(inv)}
                          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-semibold shadow"
                        >
                          Pack
                        </button>
                        <button
                          onClick={() => handleView(inv.id)}
                          className="px-4 py-2 bg-gray-200 rounded-lg font-semibold"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <PackInvoiceModal
  isOpen={showPackModal}
  onClose={() => setShowPackModal(false)}
  onPack={handlePackInvoice}
  invoiceNumber={selectedInvoice?.invoice_no}
/>

    </div>
  );
}
