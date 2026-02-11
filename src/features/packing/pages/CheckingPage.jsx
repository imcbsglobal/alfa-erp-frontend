import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";
import { formatQuantity } from "../../../utils/formatters";
import SameAddressConfirmationModal from "../components/SameAddressConfirmationModal";

export default function CheckingPage() {
  const { invoiceNo } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [bill, setBill] = useState(null);
  const [checkedItems, setCheckedItems] = useState({});
  const [showSameAddressModal, setShowSameAddressModal] = useState(false);
  const [completingCheck, setCompletingCheck] = useState(false);

  useEffect(() => {
    loadBillDetails();
  }, [invoiceNo]);

  const loadBillDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/sales/packing/bill/${invoiceNo}/`);
      setBill(res.data?.data);
      
      // Ensure checking is started if not already
      // This handles cases where user navigates directly to this page
      if (!res.data?.data?.checking_by) {
        try {
          await api.post("/sales/packing/start-checking/", {
            invoice_no: invoiceNo,
            user_email: user.email,
          });
        } catch (startErr) {
          // If already started or other error, continue anyway
          console.warn("Could not auto-start checking:", startErr);
        }
      }
      
      // Initialize all items as unchecked
      const initialChecked = {};
      res.data?.data?.items?.forEach(item => {
        initialChecked[item.id] = false;
      });
      setCheckedItems(initialChecked);
    } catch (err) {
      console.error("Failed to load bill details", err);
      toast.error("Failed to load bill details");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const toggleItemCheck = (itemId) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const allItemsChecked = () => {
    return Object.values(checkedItems).every(checked => checked);
  };

  const handleCompleteChecking = async () => {
    if (!allItemsChecked()) {
      toast.error("Please verify all items before proceeding");
      return;
    }

    try {
      setCompletingCheck(true);
      
      // Mark the bill as checking_done
      await api.post("/sales/packing/complete-checking/", {
        invoice_no: invoiceNo,
      });

      toast.success("Checking completed!");
      
      // Show the same address confirmation modal
      setShowSameAddressModal(true);
      
    } catch (err) {
      console.error("Complete checking error:", err);
      console.error("Error response:", err.response?.data);
      const errorMsg = err.response?.data?.message || 
                       err.response?.data?.errors?.invoice_no?.[0] ||
                       err.response?.data?.error ||
                       "Failed to complete checking";
      toast.error(errorMsg);
    } finally {
      setCompletingCheck(false);
    }
  };

  const handleSameAddressResponse = (hasSameAddress) => {
    setShowSameAddressModal(false);
    
    if (hasSameAddress) {
      // User indicated there are other bills with same address
      // For now, we'll still proceed to box assignment
      // In the future, this could show a list of other bills to combine
      toast.info("You can add other bills in the box assignment page");
      navigate(`/packing/box-assignment/${invoiceNo}`);
    } else {
      // No other bills with same address, proceed to box assignment
      navigate(`/packing/box-assignment/${invoiceNo}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading bill details...</p>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Bill not found</p>
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
      <div className="max-w-4xl mx-auto px-2 py-3">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Checking Bill</h1>
              <p className="text-sm text-gray-600">Invoice: #{bill.invoice_no}</p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Back
            </button>
          </div>

          {/* Customer Info */}
          <div className="border-t pt-3 space-y-1 text-sm">
            <p><strong>Customer:</strong> {bill.customer?.name || bill.customer_name}</p>
            <p><strong>Phone:</strong> {bill.customer?.phone1 || bill.customer?.phone || bill.customer_phone || "-"}</p>
            <p><strong>Address:</strong> {bill.customer?.address1 || bill.customer?.address || bill.customer_address || "-"}</p>
            <p><strong>Checking By:</strong> {bill.checking_by_name || user.name}</p>
          </div>
        </div>

        {/* Items List */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Items to Check ({bill.items?.length || 0})
          </h2>
          
          <div className="space-y-2">
            {bill.items?.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleItemCheck(item.id)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  checkedItems[item.id]
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-300 bg-white hover:border-teal-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Checkbox */}
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 ${
                    checkedItems[item.id]
                      ? "border-teal-500 bg-teal-500"
                      : "border-gray-400 bg-white"
                  }`}>
                    {checkedItems[item.id] && (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-base">
                          {item.name || item.item_name}
                        </p>
                        {item.item_code && (
                          <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                            <span className="text-red-600">●</span>
                            <span className="font-medium">{item.item_code}</span>
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-teal-700 text-lg">
                          {formatQuantity(item.quantity || item.qty, 'pcs')}
                        </p>
                      </div>
                    </div>

                    {/* Additional Details Grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2 pt-2 border-t border-gray-200">
                      {item.packing && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Pack:</span>
                          <span className="font-medium text-gray-700">{item.packing}</span>
                        </div>
                      )}
                      
                      {item.shelf_location && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Shelf:</span>
                          <span className="font-medium text-gray-700">{item.shelf_location}</span>
                        </div>
                      )}
                      
                      {item.mrp && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">MRP:</span>
                          <span className="font-medium text-gray-700">₹{item.mrp}</span>
                        </div>
                      )}
                      
                      {item.batch_no && (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">Batch:</span>
                          <span className="font-medium text-gray-700">{item.batch_no}</span>
                        </div>
                      )}
                      
                      {item.expiry_date && (
                        <div className="flex items-center gap-1 col-span-2">
                          <span className="text-gray-500">Expiry:</span>
                          <span className="font-medium text-gray-700">
                            {new Date(item.expiry_date).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Button */}
        <button
          onClick={handleCompleteChecking}
          disabled={!allItemsChecked() || completingCheck}
          className={`w-full py-4 rounded-lg text-lg font-bold transition-all ${
            allItemsChecked() && !completingCheck
              ? "bg-teal-600 text-white hover:bg-teal-700 shadow-lg"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {completingCheck ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            "Next"
          )}
        </button>

        {!allItemsChecked() && (
          <p className="text-center text-sm text-gray-500 mt-2">
            Please verify all items before proceeding
          </p>
        )}
      </div>

      {/* Same Address Confirmation Modal */}
      <SameAddressConfirmationModal
        isOpen={showSameAddressModal}
        onClose={() => setShowSameAddressModal(false)}
        onConfirm={handleSameAddressResponse}
        billNo={bill.invoice_no}
        customerName={bill.customer?.name || bill.customer_name}
        address={bill.customer?.address || bill.customer_address}
      />
    </div>
  );
}
