import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../../../services/api";
import toast from "react-hot-toast";
import { formatQuantity } from "../../../utils/formatters";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../../auth/AuthContext";

export default function BoxLabelPrintPage() {
  const { invoiceNo } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [packingData, setPackingData] = useState(null);

  // Helper function to get role-aware paths
  const getPath = (path) => {
    const isOpsUser = ["PICKER", "PACKER", "BILLER", "DELIVERY", "STORE"].includes(user?.role);
    return isOpsUser ? `/ops${path}` : path;
  };

  useEffect(() => {
    loadPackingData();
    
    // Add print styles
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        @page {
          margin: 0;
          size: 100mm 150mm;
        }

        html, body {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: 100% !important;
        }

        /* Hide everything by default */
        body * {
          visibility: hidden;
        }

        /* Show only print content */
        .print-container, .print-container * {
          visibility: visible;
        }

        .print-container {
          position: fixed !important;
          left: 0 !important;
          top: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background: white;
          font-family: Arial, sans-serif !important;
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden;
        }

        .print-label {
          page-break-after: always;
          page-break-inside: avoid;
          width: 100mm;
          height: 150mm;
          min-height: unset;
          max-height: unset;
          max-width: unset;
          padding: 0;
          margin: 0 auto !important;
          background: white;
          box-sizing: border-box;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .print-label:last-child {
          page-break-after: auto;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [invoiceNo]);

  const loadPackingData = async () => {
    try {
      setLoading(true);
      
      // Check if consolidated data was passed via navigation state
      if (location.state?.consolidatedData) {
        setPackingData(location.state.consolidatedData);
        setLoading(false);
        return;
      }
      
      // Check if this is a consolidated packing ID (starts with "C-")
      const isConsolidated = invoiceNo.startsWith("C-");
      
      let res;
      if (isConsolidated) {
        res = await api.get(`/sales/packing/consolidated/${invoiceNo}/`);
      } else {
        res = await api.get(`/sales/packing/completed/${invoiceNo}/`);
      }
      
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

  const handlePrintSingle = (boxIndex) => {
    const allBoxes = document.querySelectorAll('.print-label');
    allBoxes.forEach((box, idx) => {
      if (idx !== boxIndex) {
        box.style.display = 'none';
      }
    });
    
    window.print();
    
    allBoxes.forEach(box => {
      box.style.display = '';
    });
  };

  const handleFinish = () => {
    toast.success("Packing process completed!");
    navigate(getPath("/packing/my"));
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
    <>
      {/* Print Container - Only visible during print */}
      <div className="print-container hidden print:block">
        {packingData.boxes?.map((box, index) => (
          <div key={index} className="print-label">
            <PrintOnlyLabel
              box={box}
              invoiceNo={packingData.invoice_no}
              customerName={packingData.customer_name}
              customerPhone={packingData.customer_phone}
              deliveryAddress={packingData.delivery_address}
              relatedBills={packingData.related_bills || [packingData.invoice_no]}
            />
          </div>
        ))}
      </div>
      
      {/* Regular UI - Hidden during print */}
      <div className="min-h-screen bg-gray-50 print:hidden">
        <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-green-900 font-bold text-lg">✓ Packing Completed Successfully!</h3>
                <p className="text-green-800 text-sm">
                  Invoice #{packingData.invoice_no} has been marked as <span className="font-semibold">PACKED</span>. 
                  All {packingData.boxes?.length || 0} box(es) are ready for delivery.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
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
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {packingData.boxes?.map((box, index) => (
          <BoxLabel
            key={index}
            box={box}
            boxIndex={index}
            invoiceNo={packingData.invoice_no}
            customerName={packingData.customer_name}
            customerPhone={packingData.customer_phone}
            deliveryAddress={packingData.delivery_address}
            relatedBills={packingData.related_bills || [packingData.invoice_no]}
            onPrint={() => handlePrintSingle(index)}
          />
        ))}
        </div>
      </div>
    </>
  );
}

// Exportable Label Component for use in other pages
export function MedicareCourierLabel({ box, customerName, customerPhone, deliveryAddress }) {
  return (
    <div className="w-full h-full bg-white flex items-center justify-center" style={{ fontFamily: 'Arial, sans-serif' }}>
      <div style={{
        border: '4px solid #dc2626',
        borderRadius: '12px',
        padding: '40px',
        width: '90%',
        maxWidth: '800px',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* Header Section - Alfa Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
          <img 
            src="/alfa3.png" 
            alt="Alfa Agencies" 
            style={{ height: '60px', width: 'auto' }}
          />
        </div>

        {/* Content Section - 2 Columns Layout */}
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: '240px 1fr',
          gap: '40px',
          marginBottom: 'auto',
          flex: '1'
        }}>
          
          {/* Left Column - QR Code */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ 
              background: 'white',
              border: '2px solid #d1d5db',
              padding: '12px',
              borderRadius: '4px'
            }}>
              <QRCodeSVG 
                value={box.box_id}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>
          </div>

          {/* Right Column - Customer Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ 
              fontWeight: 'bold',
              color: '#000',
              fontSize: '28px',
              lineHeight: '1.2',
              textTransform: 'uppercase',
              margin: '0 0 8px 0'
            }}>
              {customerName}
            </p>
            <p style={{ 
              color: '#000',
              fontSize: '20px',
              lineHeight: '1.4',
              margin: '0'
            }}>
              {deliveryAddress || "Address not provided"}
            </p>
            {customerPhone && (
              <p style={{ 
                color: '#000',
                fontSize: '20px',
                lineHeight: '1.4',
                margin: '8px 0 0 0'
              }}>
                <span style={{ fontWeight: 'bold' }}>TEL: {customerPhone}</span>
              </p>
            )}
          </div>
        </div>

        {/* Bottom Section - Red Banner with Handling Instructions */}
        <div style={{ marginTop: '40px' }}>
          <div style={{ 
            background: '#dc2626',
            color: 'white',
            padding: '24px 28px',
            borderRadius: '8px'
          }}>
            <p style={{ 
              fontWeight: 'bold',
              fontSize: '18px',
              textTransform: 'uppercase',
              lineHeight: '1.3',
              margin: '0 0 8px 0'
            }}>
              HANDLING INSTRUCTIONS: KEEP REFRIGERATED.
            </p>
            <p style={{ 
              fontWeight: 'bold',
              fontSize: '18px',
              textTransform: 'uppercase',
              lineHeight: '1.3',
              margin: '0'
            }}>
              DO NOT SHAKE. FRAGILE. PROTECT FROM LIGHT
            </p>
            
            {/* Icons */}
            <div style={{ 
              display: 'flex',
              gap: '32px',
              marginTop: '16px',
              alignItems: 'center',
              fontSize: '32px'
            }}>
              <span>❄️</span>
              <span>🍷</span>
              <span>☂️</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrintOnlyLabel({ box, customerName, customerPhone, deliveryAddress }) {
  return <MedicareCourierLabel box={box} customerName={customerName} customerPhone={customerPhone} deliveryAddress={deliveryAddress} />;
}

function BoxLabel({ box, boxIndex, invoiceNo, customerName, customerPhone, deliveryAddress, relatedBills, onPrint }) {
  return (
    <div className="bg-white border-2 border-gray-800 rounded-lg p-6">
      <div>
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-4 mb-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-teal-600 text-white rounded-full font-bold text-sm">
                Box {boxIndex + 1}
              </span>
              <h2 className="text-2xl font-bold text-gray-900">DELIVERY BOX LABEL</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">Pack Date: {new Date().toLocaleDateString()}</p>
          </div>
          <button
            onClick={onPrint}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print This Label
          </button>
        </div>

        {/* QR Code */}
        <div className="flex justify-center my-4 bg-white p-4 rounded">
          <div className="border-2 border-gray-300 p-3 rounded">
            <QRCodeSVG 
              value={box.box_id}
              size={150}
              level="H"
              includeMargin={true}
            />
          </div>
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
        <div className="bg-teal-50 border-2 border-teal-400 rounded-lg p-4 mb-4">
          <p className="text-xs font-semibold text-teal-900 mb-2">DELIVERY ADDRESS</p>
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
            <li>Scan QR code for tracking</li>
            <li>Match delivery address before handover</li>
          </ul>
        </div>
      </div>
    </div>
  );
}