import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";
import { formatTime, formatDate, formatQuantity } from '../../../utils/formatters';
import HoldForConsolidationModal from '../components/HoldForConsolidationModal';

export default function MyPackingListPage() {
  const [loading, setLoading] = useState(false);
  const [myCheckingBills, setMyCheckingBills] = useState([]);
  const [heldBills, setHeldBills] = useState([]);
  const [assignedBills, setAssignedBills] = useState([]); // Bills held by me but assigned to someone else
  const [completedToday, setCompletedToday] = useState([]);
  const [expandedBill, setExpandedBill] = useState(null);
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [selectedHeldBills, setSelectedHeldBills] = useState({});
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [currentBillForHold, setCurrentBillForHold] = useState(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // Helper function to get role-aware paths
  const getPath = (path) => {
    const isOpsUser = ["PICKER", "PACKER", "BILLER", "DELIVERY", "STORE"].includes(user?.role);
    return isOpsUser ? `/ops${path}` : path;
  };

  useEffect(() => {
    // Only load data if user is authenticated
    if (user) {
      loadMyCheckingBills();
      loadHeldBills();
      loadCompletedToday();
    }
  }, [user]);

  useEffect(() => {
    // Only set up SSE if user is authenticated
    if (!user) return;

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

          console.log('📦 Packing SSE event received:', {
            invoice_no: data.invoice_no,
            type: data.type,
            billing_status: data.billing_status,
            returned_from_section: data.return_info?.returned_from_section,
            returned_by_email: data.return_info?.returned_by_email,
            user_email: user?.email
          });

          // Handle RE_INVOICED bills that were returned from PACKING section
          if (data.billing_status === "RE_INVOICED" && 
              data.return_info?.returned_from_section === "PACKING" &&
              data.return_info?.returned_by_email === user?.email) {
            console.log('🔄 RE_INVOICED packing bill received for current user:', data.invoice_no);
            toast.success(`Bill #${data.invoice_no} has been corrected and is ready for packing!`, {
              duration: 4000,
              icon: '✓'
            });
            loadMyCheckingBills();
            loadHeldBills();
          }
          
          // Handle review events
          if (data.type === 'invoice_review' || data.type === 'invoice_returned') {
            console.log('🔍 Review event received:', data.type);
            loadMyCheckingBills();
            loadHeldBills();
          }

          // Listen for bill status changes
          if (data.type === "invoice_updated") {
            console.log("📦 Packing page received invoice update:", data.invoice_no);
            loadMyCheckingBills();
            loadHeldBills();
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
  }, [user]);

  const loadMyCheckingBills = async () => {
    try {
      if (!user) {
        setMyCheckingBills([]);
        return;
      }

      setLoading(true);
      
      // First check for active packing session
      const res = await api.get("/sales/packing/active/");
      const activeData = res.data?.data;

      if (activeData && activeData.invoice) {
        const invoice = activeData.invoice;
        console.log('📦 Active packing session found:', invoice.invoice_no, 'Status:', invoice.billing_status);

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
        // No active session, check for RE_INVOICED bills that need to be resumed
        console.log('📦 No active session, checking for RE_INVOICED bills...');
        
        const reInvoicedRes = await api.get("/sales/billing/invoices/", {
          params: { 
            billing_status: "RE_INVOICED",
            returned_by_email: user?.email,
            returned_from_section: "PACKING"
          }
        });
        
        const reInvoicedBills = reInvoicedRes.data?.results || [];
        console.log(`📦 Found ${reInvoicedBills.length} RE_INVOICED bills to resume`);
        
        if (reInvoicedBills.length > 0) {
          // Auto-resume packing for the first corrected bill
          const bill = reInvoicedBills[0];
          console.log('📦 Auto-resuming packing for:', bill.invoice_no);
          
          try {
            // Start packing session for the corrected bill
            await api.post("/sales/packing/start/", {
              invoice_no: bill.invoice_no,
              user_email: user.email
            });
            
            console.log('✅ Packing session started successfully');
            
            // Reload active data to get the full bill details
            const newRes = await api.get("/sales/packing/active/");
            const newActiveData = newRes.data?.data;
            
            if (newActiveData && newActiveData.invoice) {
              const invoice = newActiveData.invoice;
              console.log('📦 Loaded corrected bill:', invoice.invoice_no);
              
              setMyCheckingBills([
                {
                  ...invoice,
                  checking_by: user.email,
                  checking_by_name: user.name,
                  checking_status: "CHECKING",
                },
              ]);
              
              toast.success(`Resuming corrected bill #${invoice.invoice_no}`, {
                duration: 3000,
                icon: '✓'
              });
            } else {
              setMyCheckingBills([]);
            }
          } catch (startErr) {
            console.error("❌ Error auto-resuming corrected packing:", startErr);
            console.error("Error details:", startErr.response?.data);
            
            // If auto-start failed, still show the bill but user needs to manually start
            toast.error("Could not auto-resume packing. Please start manually.");
            setMyCheckingBills([]);
          }
        } else {
          console.log('📦 No bills to resume');
          setMyCheckingBills([]);
        }
      }
    } catch (err) {
      console.error("❌ Failed to load active packing task", err);
      console.error("Error response:", err.response?.data);
      
      if (err.response?.status === 401) {
        toast.error("Session expired. Please log in again.");
      } else {
        toast.error("Failed to load packing tasks");
      }
      setMyCheckingBills([]);
    } finally {
      setLoading(false);
    }
  };

  const loadHeldBills = async () => {
    try {
      if (!user) {
        setHeldBills([]);
        setAssignedBills([]);
        return;
      }

      const res = await api.get("/sales/packing/my-checking/");
      const bills = res.data?.data || [];
      
      // Filter only held bills - check in packer_info
      const allHeld = bills.filter(bill => bill.packer_info?.held_for_consolidation === true);
      
      // Separate into my held bills (where I'm the primary holder) vs assigned bills (where I held them but they're assigned to someone else)
      const myHeld = allHeld.filter(bill => 
        bill.packer_info?.held_by_email === user.email
      );
      
      const assigned = allHeld.filter(bill => 
        bill.checking_by === user.email && 
        bill.packer_info?.held_by_email !== user.email
      );
      
      setHeldBills(myHeld);
      setAssignedBills(assigned);
      
    } catch (err) {
      console.error("Failed to load held bills", err);
      if (err.response?.status === 401) {
        toast.error("Session expired. Please log in again.");
      }
      setHeldBills([]);
      setAssignedBills([]);
    }
  };

  const loadCompletedToday = async () => {
    try {
      if (!user) {
        setCompletedToday([]);
        return;
      }

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
      if (err.response?.status === 401) {
        toast.error("Session expired. Please log in again.");
      }
      setCompletedToday([]);
    }
  };

  const handleStartChecking = async (bill) => {
    if (!user) {
      toast.error("Please log in to continue");
      return;
    }

    try {
      setLoading(true);
      
      await api.post("/sales/packing/start-checking/", {
        invoice_no: bill.invoice_no,
        user_email: user.email,
      });

      toast.success(`Started packing bill #${bill.invoice_no}`);
      
      // Navigate directly to box assignment (skip checking)
      navigate(getPath(`/packing/box-assignment/${bill.invoice_no}`));
      
    } catch (err) {
      console.error("Start packing error:", err);
      if (err.response?.status === 401) {
        toast.error("Session expired. Please log in again.");
      } else {
        toast.error(err.response?.data?.message || "Failed to start packing");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinueChecking = (bill) => {
    // Skip checking and go directly to box assignment
    navigate(getPath(`/packing/box-assignment/${bill.invoice_no}`));
  };

  const handleHoldBill = (bill) => {
    setCurrentBillForHold(bill);
    setShowHoldModal(true);
  };

  const handleConfirmHold = async (holdBill, customerName, assignToEmail) => {
    if (!holdBill || !currentBillForHold) {
      setShowHoldModal(false);
      return;
    }

    try {
      await api.post("/sales/packing/hold-for-consolidation/", {
        invoice_no: currentBillForHold.invoice_no,
        customer_name: customerName,
        assign_to_email: assignToEmail || null,
      });

      toast.success(`Bill #${currentBillForHold.invoice_no} held for consolidation`);
      setShowHoldModal(false);
      setCurrentBillForHold(null);
      
      // Reload the lists
      loadMyCheckingBills();
      loadHeldBills();
    } catch (err) {
      console.error("Error holding bill:", err);
      toast.error(err.response?.data?.message || "Failed to hold bill");
    }
  };

  const handleCancelBill = async (bill) => {
    try {
      await api.post("/sales/packing/release/", {
        invoice_no: bill.invoice_no,
      });

      toast.success(`Bill #${bill.invoice_no} released`);
      
      // Reload the lists
      loadMyCheckingBills();
      loadHeldBills();
    } catch (err) {
      console.error("Error releasing bill:", err);
      toast.error(err.response?.data?.message || "Failed to release bill");
    }
  };

  const toggleExpand = (billId) => {
    setExpandedBill(expandedBill === billId ? null : billId);
  };

  const toggleCustomerExpand = (customerName) => {
    setExpandedCustomer(expandedCustomer === customerName ? null : customerName);
  };

  const toggleBillSelection = (customerName, billNo) => {
    setSelectedHeldBills(prev => {
      const customerBills = prev[customerName] || [];
      const isSelected = customerBills.includes(billNo);
      
      if (isSelected) {
        return {
          ...prev,
          [customerName]: customerBills.filter(b => b !== billNo)
        };
      } else {
        return {
          ...prev,
          [customerName]: [...customerBills, billNo]
        };
      }
    });
  };

  const selectAllForCustomer = (customerName, billNumbers) => {
    setSelectedHeldBills(prev => ({
      ...prev,
      [customerName]: billNumbers
    }));
  };

  const proceedWithSelectedBills = (customerName) => {
    const selectedBills = selectedHeldBills[customerName] || [];
    
    if (selectedBills.length === 0) {
      toast.error("Please select at least one bill");
      return;
    }
    
    if (selectedBills.length === 1) {
      toast.info("Proceeding with single bill packing");
      navigate(getPath(`/packing/box-assignment/${selectedBills[0]}`));
      return;
    }
    
    toast.success(`Proceeding with ${selectedBills.length} bills for consolidated packing`);
    
    // Multiple bills selected, proceed to consolidated packing
    navigate(getPath("/packing/consolidated-packing"), {
      state: {
        billIds: selectedBills,
        customerName: customerName
      }
    });
  };

  const renderBillCard = (bill, section = "picked") => {
    const isExpanded = expandedBill === bill.id;
    const isChecking = section === "checking";
    const isCompleted = section === "completed";
    const isReInvoiced = bill?.billing_status === "RE_INVOICED";
    const isReviewInvoice = bill?.billing_status === "REVIEW" && Boolean(bill?.return_info);

    return (
      <div 
        key={bill.id} 
        className={`rounded-lg shadow border-2 overflow-hidden ${
          isChecking ? (isReInvoiced ? "border-teal-500 bg-teal-50" : "border-teal-500 bg-teal-50") : 
          isCompleted ? "border-teal-500 bg-white" :
          "border-gray-300 bg-white"
        }`}
      >
        <div 
          onClick={() => toggleExpand(bill.id)} 
          className={`p-2 sm:p-3 border-b cursor-pointer ${
            isChecking ? 'bg-teal-50' : 
            isCompleted ? 'bg-teal-50' :
            'bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {isChecking && (
                <div className={`w-1.5 h-1.5 flex-shrink-0 rounded-full animate-pulse ${
                  isReInvoiced ? "bg-teal-600" : "bg-teal-600"
                }`}></div>
              )}
              {isReInvoiced && isChecking && (
                <span className="ml-1 px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-[10px] sm:text-xs font-bold border border-teal-300 animate-pulse">
                  ✓ CORRECTED
                </span>
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
                {isReviewInvoice && (
                  <p className="text-[9px] text-orange-700 font-semibold">
                    🔍 Under Review
                  </p>
                )}
              </div>
            </div>
            
            {!isExpanded && !isCompleted && isChecking && (
              <div className="flex gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleHoldBill(bill)}
                  disabled={loading || isReviewInvoice}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                  title="Hold for Consolidation"
                >
                  Hold
                </button>
                <button
                  onClick={() => handleContinueChecking(bill)}
                  disabled={loading || isReviewInvoice}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                  title="Continue to Boxing"
                >
                  Continue
                </button>
                <button
                  onClick={() => handleCancelBill(bill)}
                  disabled={loading || isReviewInvoice}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all bg-gray-500 text-white hover:bg-gray-600 disabled:opacity-50"
                  title="Cancel and Release"
                >
                  Cancel
                </button>
              </div>
            )}
            
            {!isExpanded && !isCompleted && !isChecking && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartChecking(bill);
                }}
                disabled={loading || isReviewInvoice}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${
                  isReviewInvoice
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-teal-600 text-white hover:bg-teal-700"
                } disabled:opacity-50`}
              >
                {isReviewInvoice ? "Review" : "Start Packing"}
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
            
            {/* Show correction info for re-invoiced bills */}
            {isReInvoiced && bill.resolution_notes && (
              <div className="p-2 rounded-lg bg-gradient-to-r from-teal-50 to-teal-100 border border-teal-400">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-teal-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-bold text-teal-900 text-xs sm:text-sm mb-1">✓ Invoice Corrected - Resume Packing</p>
                    <div className="bg-white rounded p-1.5 border border-teal-200">
                      <p className="text-[9px] sm:text-[10px] text-teal-600 font-semibold mb-0.5">Resolution:</p>
                      <p className="text-[10px] sm:text-xs text-teal-800">{bill.resolution_notes}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Show review info for bills under review */}
            {isReviewInvoice && bill.return_info && (
              <div className="p-2 rounded-lg bg-orange-50 border border-orange-300">
                <p className="font-semibold text-orange-800 text-xs">Invoice Sent to Billing Review</p>
                <p className="text-[10px] sm:text-xs text-orange-700 mt-0.5">
                  <b>Reason:</b> {bill.return_info.return_reason}
                </p>
              </div>
            )}

            <div className="text-xs space-y-1">
              <p><strong>Customer:</strong> {bill.customer?.name || bill.customer_name}</p>
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

            {isExpanded && !isCompleted && isChecking && (
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleHoldBill(bill)}
                  disabled={loading || isReviewInvoice}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  Hold for Consolidation
                </button>
                <button
                  onClick={() => handleContinueChecking(bill)}
                  disabled={loading || isReviewInvoice}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {isReInvoiced ? "Continue Corrected Packing" : "Continue to Boxing"}
                </button>
                <button
                  onClick={() => handleCancelBill(bill)}
                  disabled={loading || isReviewInvoice}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all bg-gray-500 text-white hover:bg-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            )}
            
            {isExpanded && !isCompleted && !isChecking && (
              <button
                onClick={() => handleStartChecking(bill)}
                disabled={loading || isReviewInvoice}
                className={`w-full mt-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isReviewInvoice
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-teal-600 text-white hover:bg-teal-700"
                } disabled:opacity-50`}
              >
                {isReviewInvoice ? "Under Review" : "Start Packing"}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Show loading state if user is not yet loaded
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 py-2 sm:py-3">
        <div className="mb-2">
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">My Packing Workspace</h1>
        </div>

        {/* Currently Packing */}
        {myCheckingBills.length > 0 ? (
          <div className="mb-3 bg-white rounded-lg shadow overflow-hidden">
            <div className="px-3 py-2 bg-white border-b flex items-center gap-1.5">
              <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-sm sm:text-base font-semibold text-gray-700">Currently Packing</h2>
            </div>
            <div className="p-2 sm:p-3 space-y-2">
              {myCheckingBills.map(bill => renderBillCard(bill, "checking"))}
            </div>
          </div>
        ) : (
          <div className="mb-3 bg-white rounded-lg shadow overflow-hidden">
            <div className="px-3 py-2 bg-white border-b flex items-center gap-1.5">
              <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-sm sm:text-base font-semibold text-gray-700">Currently Packing</h2>
            </div>
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No active packing bills</p>
            </div>
          </div>
        )}

        {/* Held Bills Section */}
        {heldBills.length > 0 && (() => {
          // Group bills by customer name
          const groupedByCustomer = heldBills.reduce((acc, bill) => {
            const customerName = bill.packer_info?.consolidation_customer_name || bill.customer?.name || bill.customer_name || "Unknown Customer";
            if (!acc[customerName]) {
              acc[customerName] = [];
            }
            acc[customerName].push(bill);
            return acc;
          }, {});

          return (
            <div className="mb-3 bg-white rounded-lg shadow overflow-hidden">
              <div className="px-3 py-2 bg-white border-b flex items-center gap-1.5">
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <h2 className="text-sm sm:text-base font-semibold text-teal-900">
                  Held Bills for Consolidation ({heldBills.length})
                </h2>
              </div>

              <div className="p-2 sm:p-3 space-y-2">
                {Object.entries(groupedByCustomer).map(([customerName, bills]) => {
                  const isExpanded = expandedCustomer === customerName;
                  const selectedBills = selectedHeldBills[customerName] || [];
                  const allSelected = selectedBills.length === bills.length && bills.length > 0;
                  
                  return (
                    <div key={customerName} className="border-2 border-teal-500 rounded-lg overflow-hidden bg-teal-50">
                      {/* Customer Header */}
                      <div 
                        onClick={() => toggleCustomerExpand(customerName)}
                        className="p-3 bg-teal-50 cursor-pointer hover:bg-teal-50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <div className="min-w-0">
                                <h3 className="font-bold text-sm text-teal-900 truncate">{customerName}</h3>
                                <p className="text-xs text-teal-700">
                                  {bills.length} bill{bills.length > 1 ? 's' : ''} • {selectedBills.length} selected
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {!isExpanded && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const allBillIds = bills.map(b => b.invoice_no);
                                  selectAllForCustomer(customerName, allBillIds);
                                  // Use setTimeout to ensure state updates before navigation
                                  setTimeout(() => {
                                    if (allBillIds.length === 1) {
                                      navigate(getPath(`/packing/box-assignment/${allBillIds[0]}`));
                                    } else {
                                      toast.success(`Proceeding with ${allBillIds.length} bills for consolidated packing`);
                                      navigate(getPath("/packing/consolidated-packing"), {
                                        state: {
                                          billIds: allBillIds,
                                          customerName: customerName
                                        }
                                      });
                                    }
                                  }, 0);
                                }}
                                className="px-3 py-1.5 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 transition-all flex-shrink-0"
                              >
                                Pack All ({bills.length})
                              </button>
                            )}
                            
                            <svg 
                              className={`w-4 h-4 transition-transform flex-shrink-0 text-teal-600 ${
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
                      </div>

                      {/* Bills List */}
                      {isExpanded && (
                        <div className="p-3 space-y-2 bg-white">
                          {/* Select All Checkbox */}
                          <div className="flex items-center gap-2 p-2 bg-teal-50 rounded border border-teal-200">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  selectAllForCustomer(customerName, bills.map(b => b.invoice_no));
                                } else {
                                  setSelectedHeldBills(prev => ({ ...prev, [customerName]: [] }));
                                }
                              }}
                              className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                            />
                            <label className="text-xs font-semibold text-teal-900 cursor-pointer">
                              Select All Bills
                            </label>
                          </div>

                          {/* Individual Bills */}
                          {bills.map(bill => (
                            <div 
                              key={bill.invoice_no}
                              className={`p-3 rounded-lg border-2 transition-all ${
                                selectedBills.includes(bill.invoice_no)
                                  ? 'border-teal-500 bg-teal-50'
                                  : 'border-gray-200 bg-white hover:border-teal-300'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={selectedBills.includes(bill.invoice_no)}
                                  onChange={() => toggleBillSelection(customerName, bill.invoice_no)}
                                  className="w-5 h-5 mt-0.5 text-teal-600 rounded focus:ring-teal-500 flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <h4 className="font-bold text-sm text-gray-900">Invoice #{bill.invoice_no}</h4>
                                      <p className="text-xs text-gray-600">
                                        Date: {new Date(bill.invoice_date).toLocaleDateString('en-GB')}
                                      </p>
                                      <p className="text-xs text-gray-600">
                                        Items: {bill.items?.length || 0}
                                      </p>
                                      {bill.packer_info?.held_by_name && (
                                        <p className="text-xs text-teal-700 font-semibold mt-1">
                                        Held by: {bill.packer_info.held_by_name}
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-bold text-teal-700">
                                        ₹{parseFloat(bill.Total || 0).toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2">
                            <button
                              onClick={() => {
                                const allBillIds = bills.map(b => b.invoice_no);
                                if (allBillIds.length === 1) {
                                  navigate(getPath(`/packing/box-assignment/${allBillIds[0]}`));
                                } else {
                                  toast.success(`Proceeding with ${allBillIds.length} bills for consolidated packing`);
                                  navigate(getPath("/packing/consolidated-packing"), {
                                    state: {
                                      billIds: allBillIds,
                                      customerName: customerName
                                    }
                                  });
                                }
                              }}
                              className="flex-1 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-all"
                            >
                              Pack All {bills.length} Bills
                            </button>
                            
                            {selectedBills.length > 0 && (
                              <button
                                onClick={() => proceedWithSelectedBills(customerName)}
                                className="flex-1 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-all"
                              >
                                Pack Selected ({selectedBills.length})
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Assigned Bills (Held by me but assigned to someone else) */}
        {assignedBills.length > 0 && (
          <div className="mb-3 bg-white rounded-lg shadow overflow-hidden">
            <div className="px-3 py-2 bg-white border-b flex items-center gap-1.5">
              <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h2 className="text-sm sm:text-base font-semibold text-teal-900">
                Assigned to Others ({assignedBills.length})
              </h2>
            </div>

            <div className="p-2 sm:p-3">
              <div className="space-y-2">
                {assignedBills.map(bill => (
                  <div 
                    key={bill.invoice_no}
                    className="p-3 rounded-lg border-2 border-teal-600 bg-teal-50 opacity-75"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-sm text-gray-900">Invoice #{bill.invoice_no}</h4>
                        <p className="text-xs text-gray-600">
                          Customer: {bill.customer?.name || bill.customer_name || "N/A"}
                        </p>
                        <p className="text-xs text-gray-600">
                          Date: {new Date(bill.invoice_date).toLocaleDateString('en-GB')}
                        </p>
                        <p className="text-xs text-gray-600">
                          Items: {bill.items?.length || 0}
                        </p>
                        <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-teal-200 rounded text-xs font-semibold text-teal-900 w-fit">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          Assigned to: {bill.packer_info?.held_by_name || "Another user"}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-teal-700">
                          ₹{parseFloat(bill.Total || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Completed Today */}
        <div className="mb-3 bg-white rounded-lg shadow overflow-hidden">
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

      {/* Hold for Consolidation Modal */}
      <HoldForConsolidationModal
        isOpen={showHoldModal}
        onClose={() => {
          setShowHoldModal(false);
          setCurrentBillForHold(null);
        }}
        onConfirm={handleConfirmHold}
        customerName={currentBillForHold?.customer?.name || currentBillForHold?.customer_name || ""}
        invoiceNo={currentBillForHold?.invoice_no}
        heldBills={[]}
        primaryHolder={null}
        primaryHolderEmail={null}
      />
    </div>
  );
}