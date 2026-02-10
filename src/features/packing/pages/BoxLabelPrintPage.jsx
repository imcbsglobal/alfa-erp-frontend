import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import toast from "react-hot-toast";
import { formatQuantity } from "../../../utils/formatters";
import Barcode from "react-barcode";

export default function BoxLabelPrintPage() {
  const { invoiceNo } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [packingData, setPackingData] = useState(null);

  useEffect(() => {
    loadPackingData();
  }, [invoiceNo]);

  const loadPackingData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/sales/packing/completed/${invoiceNo}/`);
      setPackingData(res.data?.data);
    } catch (err) {
      console.error("Failed to load packing data", err);
      toast.error("Failed to load packing data");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintAll = () => {
    window.print();
  };

  const handleFinish = () => {
    toast.success("Packing process completed!");
    navigate("/packing/my");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading packing data...</p>
        </div>
      </div>
    );
  }

  if (!packingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Packing data not found</p>
          <button 
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Print Actions - Hidden during print */}
      <div className="print:hidden bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Box Labels</h1>
            <p className="text-sm text-gray-600">
              Invoice #{packingData.invoice_no} • {packingData.boxes?.length || 0} boxes
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handlePrintAll}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print All Labels
            </button>
            <button
              onClick={handleFinish}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
            >
              Finish
            </button>
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {packingData.boxes?.map((box, index) => (
          <BoxLabel
            key={index}
            box={box}
            invoiceNo={packingData.invoice_no}
            customerName={packingData.customer_name}
            customerPhone={packingData.customer_phone}
            deliveryAddress={packingData.delivery_address}
            relatedBills={packingData.related_bills || [packingData.invoice_no]}
          />
        ))}
      </div>
    </div>
  );
}

function BoxLabel({ box, invoiceNo, customerName, customerPhone, deliveryAddress, relatedBills }) {
  return (
    <div className="bg-white border-2 border-gray-800 rounded-lg p-6 print:break-after-page print:rounded-none">
      {/* Header */}
      <div className="border-b-2 border-gray-800 pb-4 mb-4">
        <h2 className="text-2xl font-bold text-gray-900">DELIVERY BOX LABEL</h2>
        <p className="text-sm text-gray-600 mt-1">Pack Date: {new Date().toLocaleDateString()}</p>
      </div>

      {/* Barcode */}
      <div className="flex justify-center my-4 bg-white p-4 rounded">
        <Barcode 
          value={box.box_id} 
          format="CODE128"
          width={2}
          height={60}
          fontSize={14}
          margin={10}
        />
      </div>

      {/* Box Info */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-gray-600 font-semibold">Box ID:</p>
          <p className="text-lg font-bold text-gray-900">{box.box_id}</p>
        </div>
        <div>
          <p className="text-gray-600 font-semibold">Related Bills:</p>
          <p className="font-bold text-gray-900">
            {relatedBills.join(", ")}
          </p>
        </div>
      </div>

      {/* Delivery Address */}
      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4">
        <p className="text-xs font-semibold text-yellow-900 mb-2">DELIVERY ADDRESS</p>
        <p className="font-bold text-gray-900 text-lg mb-1">{customerName}</p>
        {customerPhone && (
          <p className="text-gray-700 mb-2">📞 {customerPhone}</p>
        )}
        <p className="text-gray-800 font-medium">{deliveryAddress || "No address provided"}</p>
      </div>

      {/* Items in Box */}
      <div className="border-t-2 border-gray-300 pt-4">
        <h3 className="font-bold text-gray-900 mb-3 text-lg">
          Items in this Box ({box.items?.length || 0})
        </h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-2 border border-gray-300">#</th>
              <th className="text-left p-2 border border-gray-300">Item Name</th>
              <th className="text-left p-2 border border-gray-300">Code</th>
              <th className="text-right p-2 border border-gray-300">Quantity</th>
            </tr>
          </thead>
          <tbody>
            {box.items?.map((item, idx) => (
              <tr key={idx} className="border-b">
                <td className="p-2 border border-gray-300">{idx + 1}</td>
                <td className="p-2 border border-gray-300 font-medium">{item.item_name}</td>
                <td className="p-2 border border-gray-300">{item.item_code || "-"}</td>
                <td className="p-2 border border-gray-300 text-right font-bold">
                  {formatQuantity(item.quantity, 'pcs')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-300 mt-6 pt-4 text-xs text-gray-600">
        <p className="font-semibold">⚠️ HANDLING INSTRUCTIONS:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Handle with care</li>
          <li>Verify box seal before delivery</li>
          <li>Scan barcode for tracking</li>
          <li>Match delivery address before handover</li>
        </ul>
      </div>
    </div>
  );
}
