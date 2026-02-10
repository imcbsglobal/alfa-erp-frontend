import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";
import { formatTime, formatDate, formatQuantity } from '../../../utils/formatters';

export default function MyPackingListPage() {
  const [loading, setLoading] = useState(false);
  const [myCheckingBills, setMyCheckingBills] = useState([]);
  const [completedToday, setCompletedToday] = useState([]);
  const [expandedBill, setExpandedBill] = useState(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("MyPackingListPage loading with user:", user);
    loadMyCheckingBills();
    loadCompletedToday();
  }, []);

  useEffect(() => {
    let es = null;
    let reconnectTimeout = null;
    let reconnectAttempts = 0;
    const maxReconnectDelay = 30000;
    const baseDelay = 1000;

    const connect = () => {
      if (es) es.close();

      es = new EventSource(
        `${import.meta.env.VITE_API_BASE_URL}/sales/sse/invoices/`
      );

      es.onmessage = (event) => {
        reconnectAttempts = 0;
        try {
          const data = JSON.parse(event.data);

          if (!data.invoice_no) return;

          // Listen for bill status changes
          if (data.type === "invoice_updated") {
            console.log("📦 Packing page received invoice update:", data.invoice_no);
            loadMyCheckingBills();
            loadCompletedToday();
          }
        } catch (err) {
          console.error("Packing SSE parse error", err);
        }
      };

      es.onerror = () => {
        es.close();
        reconnectAttempts++;
        const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts), maxReconnectDelay);
        reconnectTimeout = setTimeout(() => connect(), delay);
      };
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (es) es.close();
    };
  }, []);

  const loadMyCheckingBills = async () => {
    try {
      if (!user) {
        console.log("No user in auth context yet, skipping active packing load");
        setMyCheckingBills([]);
        return;
      }

      console.log("Loading my active packing task for:", user.email);
      const res = await api.get("/sales/packing/active/");
      console.log("My active packing response:", res.data);

      const activeData = res.data?.data;

      if (activeData && activeData.invoice) {
        const invoice = activeData.invoice;

        // Normalize to the shape expected by renderBillCard (invoice fields + checking_by info)
        setMyCheckingBills([
          {
            ...invoice,
            checking_by: user.email,
            checking_by_name: user.name,
            checking_status: "CHECKING",
          },
        ]);
      } else {
        setMyCheckingBills([]);
      }
    } catch (err) {
      console.error("Failed to load active packing task", err);
      setMyCheckingBills([]);
    }
  };

  const loadCompletedToday = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get("/sales/packing/history/", {
        params: { 
          status: "PACKED", 
          start_date: today, 
          end_date: today 
        },
      });
      setCompletedToday(res.data?.results || []);
    } catch (err) {
      console.error("Failed to load completed packing", err);
    }
  };

  const handleStartChecking = async (bill) => {
    try {
      setLoading(true);
      
      await api.post("/sales/packing/start-checking/", {
        invoice_no: bill.invoice_no,
        user_email: user.email,
      });

      toast.success(`Started checking bill #${bill.invoice_no}`);
      
      // Navigate to checking page
      navigate(`/packing/checking/${bill.invoice_no}`);
      
    } catch (err) {
      console.error("Start checking error:", err);
      toast.error(err.response?.data?.message || "Failed to start checking");
    } finally {
      setLoading(false);
    }
  };

  const handleContinueChecking = (bill) => {
    navigate(`/packing/checking/${bill.invoice_no}`);
  };

  const toggleExpand = (billId) => {
    setExpandedBill(expandedBill === billId ? null : billId);
  };

  const renderBillCard = (bill, section = "picked") => {
    const isExpanded = expandedBill === bill.id;
    const isChecking = section === "checking";
    const isCompleted = section === "completed";

    return (
      <div 
        key={bill.id} 
        className={`rounded-lg shadow border-2 overflow-hidden ${
          isChecking ? "border-teal-500 bg-teal-50" : 
          isCompleted ? "border-teal-500 bg-white" :
          "border-gray-300 bg-white"
        }`}
      >
        <div 
          onClick={() => toggleExpand(bill.id)} 
          className={`p-2 sm:p-3 border-b cursor-pointer ${
            isChecking ? 'bg-teal-100' : 
            isCompleted ? 'bg-teal-50' :
            'bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {isChecking && (
                <div className="w-1.5 h-1.5 flex-shrink-0 rounded-full animate-pulse bg-teal-600"></div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                  #{bill.invoice_no}
                </h3>
                <p className="text-[10px] sm:text-xs text-gray-600 truncate">
                  {bill.customer?.name || bill.customer_name} • {bill.items?.length || 0} items
                </p>
                {bill.checking_by && (
                  <p className="text-[9px] text-teal-700 font-semibold">
                    Packing by: {bill.checking_by_name}
                  </p>
                )}
              </div>
            </div>
            
            {!isExpanded && !isCompleted && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isChecking) {
                    handleContinueChecking(bill);
                  } else {
                    handleStartChecking(bill);
                  }
                }}
                disabled={loading}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${
                  isChecking 
                    ? "bg-teal-600 text-white hover:bg-teal-700"
                    : "bg-teal-600 text-white hover:bg-teal-700"
                } disabled:opacity-50`}
              >
                {isChecking ? "Continue" : "Start Packing"}
              </button>
            )}
            
            <svg 
              className={`w-4 h-4 transition-transform flex-shrink-0 ${
                isExpanded ? "rotate-180" : ""
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {isExpanded && (
          <div className="p-2 sm:p-3 space-y-2">
            <div className="text-xs space-y-1">
              <p><strong>Customer:</strong> {bill.customer?.name || bill.customer_name}</p>
              <p><strong>Phone:</strong> {bill.customer?.phone || bill.customer_phone || "-"}</p>
              <p><strong>Address:</strong> {bill.customer?.address || bill.customer_address || "-"}</p>
              {isCompleted && (
                <>
                  <p><strong>Completed:</strong> {formatDate(bill.end_time)} {formatTime(bill.end_time)}</p>
                  <p><strong>Duration:</strong> {
                    bill.duration != null
                      ? `${Math.floor(bill.duration)} min ${Math.round((bill.duration % 1) * 60)} sec`
                      : "-"
                  }</p>
                </>
              )}
            </div>

            {bill.items?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold mb-2">Items ({bill.items.length})</p>
                <div className="space-y-1">
                  {bill.items.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="flex justify-between text-xs p-2 bg-white rounded border"
                    >
                      <span className="truncate flex-1">{item.name || item.item_name}</span>
                      <span className="font-semibold ml-2">{formatQuantity(item.quantity || item.qty, 'pcs')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isExpanded && !isCompleted && (
              <button
                onClick={() => {
                  if (isChecking) {
                    handleContinueChecking(bill);
                  } else {
                    handleStartChecking(bill);
                  }
                }}
                disabled={loading}
                className={`w-full mt-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isChecking 
                    ? "bg-amber-600 text-white hover:bg-amber-700"
                    : "bg-teal-600 text-white hover:bg-teal-700"
                } disabled:opacity-50`}
              >
                {isChecking ? "Continue Checking" : "Start Checking"}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 py-2 sm:py-3">
        <div className="mb-2">
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">My Packing Workspace</h1>
        </div>

        {/* My Checking Bills */}
        {myCheckingBills.length > 0 ? (
          <div className="mb-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-sm sm:text-base font-semibold text-gray-700">Currently Packing</h2>
            </div>
            <div className="space-y-2">
              {myCheckingBills.map(bill => renderBillCard(bill, "checking"))}
            </div>
          </div>
        ) : (
          <div className="mb-3 bg-teal-50 rounded-lg shadow p-4 sm:p-6 text-center border border-teal-200">
            <svg className="w-12 h-12 mx-auto text-teal-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-teal-700 font-semibold text-sm mb-1">No Active Packing Bills</p>
            <p className="text-teal-600 text-xs">
              Claim a bill from Packing Management to start packing
            </p>
          </div>
        )}

        {/* Completed Today */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-3 py-2 bg-white border-b flex items-center gap-1.5">
            <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-sm sm:text-base font-semibold text-gray-700">Completed Today</h2>
          </div>

          {completedToday.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No completed packing yet</p>
            </div>
          ) : (
            <div className="p-2 sm:p-3 space-y-2">
              {completedToday.map(bill => renderBillCard(bill, "completed"))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
