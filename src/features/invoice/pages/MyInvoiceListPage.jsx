import { useEffect, useState } from "react";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";
import { getActivePickingTask } from "../../../services/sales";
import toast from "react-hot-toast";
import ConfirmationModal from '../../../components/ConfirmationModal';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function MyInvoiceListPage() {
  const [loading, setLoading] = useState(false);
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [pickedItems, setPickedItems] = useState({});
  const [completedInvoices, setCompletedInvoices] = useState([]);
  const [reviewPopup, setReviewPopup] = useState({ open: false, item: null });
  const [reviewChecks, setReviewChecks] = useState({});
  const [otherIssueNotes, setOtherIssueNotes] = useState("");
  const [savedIssues, setSavedIssues] = useState([]);
  const [activePickingTask, setActivePickingTask] = useState(null);
  const activeInvoice = activePickingTask?.invoice || null;
  const [cancelModal, setCancelModal] = useState({ open: false });

  const { user } = useAuth();

  // Check if invoice is RE_INVOICED (corrected and resent from billing)
  const isReInvoiced =
    activeInvoice?.billing_status === "RE_INVOICED";
    

  // Check if invoice is still under review (locked state) - should NOT happen anymore
  const isReviewInvoice =
    activeInvoice?.billing_status === "REVIEW" &&
    Boolean(activeInvoice?.return_info);

  useEffect(() => {
    loadTodayCompletedPicking();
    loadActivePicking();
  }, []);

  // SSE live updates - listen for re-invoiced bills
  useEffect(() => {
    const es = new EventSource(`${API_BASE_URL}/sales/sse/invoices/`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (!data.invoice_no) return;

        // If invoice is RE_INVOICED and was returned by current user, reload active picking
        if (data.billing_status === "RE_INVOICED" && 
            data.return_info?.returned_by_email === user?.email) {
          console.log("Re-invoiced bill received for current user:", data.invoice_no);
          loadActivePicking();
        }

        // Also reload for other relevant events
        if (data.type === 'invoice_review' || data.type === 'invoice_returned') {
          loadActivePicking();
        }
      } catch (e) {
        console.error("Bad SSE data", e);
      }
    };

    es.onerror = () => {
      // SSE connection closed - normal behavior during server restarts or timeouts
      es.close();
    };

    return () => es.close();
  }, [user?.email]);

  // Reset state when new invoice becomes active
  useEffect(() => {
    if (activeInvoice?.invoice_no) {
      setPickedItems({});
      setSavedIssues([]);
      setExpandedInvoice(activeInvoice.id);
    }
  }, [activeInvoice?.invoice_no]);

  const loadActivePicking = async () => {
    try {
      setLoading(true);
      const res = await getActivePickingTask();
      const task = res.data?.data || null;
      
      // If no active task, check for RE_INVOICED bills for current user
      if (!task) {
        const reInvoicedRes = await api.get("/sales/billing/invoices/", {
          params: { 
            billing_status: "RE_INVOICED",
            returned_by_email: user?.email 
          }
        });
        
        const reInvoicedBills = reInvoicedRes.data?.results || [];
        
        if (reInvoicedBills.length > 0) {
          // Auto-start picking for the first re-invoiced bill
          const invoice = reInvoicedBills[0];
          console.log("Auto-starting picking for re-invoiced bill:", invoice.invoice_no);
          
          try {
            await api.post("/sales/picking/start/", {
              invoice_no: invoice.invoice_no,
              user_email: user.email
            });
            
            // Reload to get the newly started task
            const newRes = await getActivePickingTask();
            setActivePickingTask(newRes.data?.data || null);
          } catch (startErr) {
            console.error("Error auto-starting re-invoiced bill:", startErr);
            setActivePickingTask(null);
          }
        } else {
          setActivePickingTask(null);
        }
      } else {
        setActivePickingTask(task);
      }
    } catch (err) {
      console.error("Error loading active picking:", err);
      setActivePickingTask(null);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayCompletedPicking = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await api.get("/sales/picking/history/", {
        params: { status: "PICKED", start_date: today, end_date: today },
      });
      setCompletedInvoices(res.data?.results || []);
    } catch (err) {
      console.error("Failed to load picking history", err);
    }
  };

  const toggleItemPicked = (itemId) => {
    if (isReviewInvoice) return;
    setPickedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const openReviewPopup = (item) => {
    if (isReviewInvoice) return;
    const existing = savedIssues.find((i) => i.item === item.name);

    if (existing) {
      const checks = {
        batchMatch: existing.issues.some((i) => i.includes("Batch")),
        expiryCheck: existing.issues.some((i) => i.includes("Expiry")),
        quantityCorrect: existing.issues.some((i) => i.includes("Quantity")),
        packagingGood: existing.issues.some((i) => i.includes("Damaged")),
        other: existing.issues.some((i) => i.startsWith("Other:")),
      };

      const otherNote =
        existing.issues.find((i) => i.startsWith("Other:"))?.replace("Other: ", "") ||
        "";

      setReviewChecks(checks);
      setOtherIssueNotes(otherNote);
    } else {
      setReviewChecks({
        batchMatch: false,
        expiryCheck: false,
        quantityCorrect: false,
        packagingGood: false,
        other: false,
      });
      setOtherIssueNotes("");
    }

    setReviewPopup({ open: true, item });
  };

  const closeReviewPopup = () => {
    setReviewPopup({ open: false, item: null });
    setReviewChecks({});
    setOtherIssueNotes("");
  };

  const handleSaveIssue = () => {
    if (!reviewPopup.item) return;

    const issues = [];
    if (reviewChecks.batchMatch) issues.push("Batch mismatch");
    if (reviewChecks.expiryCheck) issues.push("Expiry issue");
    if (reviewChecks.quantityCorrect) issues.push("Quantity incorrect");
    if (reviewChecks.packagingGood) issues.push("Damaged packaging");
    if (reviewChecks.other && otherIssueNotes.trim()) {
      issues.push(`Other: ${otherIssueNotes.trim()}`);
    }

    if (!issues.length) {
      toast.error("Select at least one issue");
      return;
    }

    setSavedIssues((prev) => {
      const idx = prev.findIndex((i) => i.item === reviewPopup.item.name);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = { item: reviewPopup.item.name, issues };
        return copy;
      }
      return [...prev, { item: reviewPopup.item.name, issues }];
    });

    closeReviewPopup();
  };

  const handleSendInvoiceToReview = async () => {
    if (!activeInvoice) {
      toast.error("No active invoice to complete.");
      return;
    }

    if (isReviewInvoice) {
      toast.error("Invoice already sent for review.");
      return;
    }

    if (!savedIssues.length) {
      toast.error("No saved issues to send.");
      return;
    }

    try {
      setLoading(true);

      const notes = savedIssues
        .map((i) => `${i.item}: ${i.issues.join(", ")}`)
        .join(" | ");

      await api.post("/sales/billing/return/", {
        invoice_no: activePickingTask.invoice.invoice_no,
        return_reason: notes,
        user_email: user.email,
      });

      toast.success("Invoice sent to billing review");

      setSavedIssues([]);
      await loadActivePicking();
      await loadTodayCompletedPicking();
    } catch (err) {
      console.error("Return error:", err.response?.status, err.response?.data);
      toast.error(err.response?.data?.message || "Failed to send invoice to review");
    } finally {
      setLoading(false);
    }
  };

  const allItemsPicked =
    activeInvoice?.items?.every((item) => pickedItems[item.id]) || false;
  const pickedCount =
    activeInvoice?.items?.filter((item) => pickedItems[item.id]).length || 0;
  const totalItems = activeInvoice?.items?.length || 0;

  const hasIssues = savedIssues.length > 0;

  const handleCompletePicking = async () => {
    if (!activePickingTask) {
      toast.error("No active picking task.");
      return;
    }

    if (isReviewInvoice) {
      toast.error("Invoice is under billing review and cannot be completed");
      return;
    }
    
    if (!allItemsPicked) {
      toast.error("Please pick all items first");
      return;
    }
    
    if (!user?.email) {
      toast.error("User email not found. Please log in again.");
      return;
    }
    
    try {
      setLoading(true);
      
      const invoiceNo = activeInvoice.invoice_no;
      
      const payload = {
        invoice_no: invoiceNo,
        user_email: user.email,
        notes: isReInvoiced ? "[RE-PICK] Corrected invoice picked" : "Picked all items",
      };
      
      console.log('Completing picking with payload:', payload);
      
      await api.post("/sales/picking/complete/", payload);
      
      // Wait for backend to process
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Reload data
      await Promise.all([
        loadActivePicking(),
        loadTodayCompletedPicking()
      ]);
      
      toast.success("Picking completed successfully!");
      
    } catch (err) {
      console.error("Complete picking error:", err);
      
      // Check for privilege error (403)
      if (err.response?.status === 403) {
        const privilegeMessage = err.response?.data?.message 
          || "You don't have privilege to perform picking operations";
        toast.error(privilegeMessage, { duration: 4000 });
        return;
      }
      
      const errorMsg = err.response?.data?.message || 
                      err.response?.data?.errors?.invoice_no?.[0] ||
                      "Failed to complete picking";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPicking = async () => {
    if (!activeInvoice || !user?.email) {
      toast.error("Cannot cancel at this time");
      return;
    }

    setCancelModal({ open: true });
  };

  const confirmCancelPicking = async () => {
    try {
      setLoading(true);
      
      await api.post("/sales/cancel-session/", {
        invoice_no: activeInvoice.invoice_no,
        user_email: user.email,
        session_type: "PICKING",
        cancel_reason: "User cancelled picking"
      });

      toast.success("Picking cancelled. Invoice is now available for anyone to pick.");
      
      await loadActivePicking();
      await loadTodayCompletedPicking();
      
    } catch (err) {
      console.error("Cancel error:", err);
      toast.error(err.response?.data?.message || "Failed to cancel picking");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const toggleExpand = (invoiceId) => {
    setExpandedInvoice(expandedInvoice === invoiceId ? null : invoiceId);
  };

  // Extract place from address (last part after comma)
  const getPlaceFromAddress = (address) => {
    if (!address) return "-";
    const parts = address.split(',');
    const lastPart = parts[parts.length - 1].trim();
    // Remove "POST" suffix if exists and return
    return lastPart.replace(/\s*POST\s*$/i, '').trim() || "-";
  };

  if (loading) return <div className="p-6">Loading...</div>;

  const canCompletePicking =
    activeInvoice &&
    !isReviewInvoice &&
    allItemsPicked &&
    !hasIssues;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-800">My Picked Invoices</h1>
        </div>

        {activeInvoice && (
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-700">Active Bill</h2>
              {isReInvoiced && (
                <span className="ml-2 px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-bold border border-teal-300 animate-pulse">
                  ✓ CORRECTED & RE-SENT
                </span>
              )}
            </div>
            <div
              className={`rounded-lg shadow overflow-hidden border-2
                ${isReviewInvoice
                  ? "bg-gray-100 border-orange-400 opacity-70"
                  : isReInvoiced
                    ? "bg-teal-50 border-teal-500 animate-border-pulse"
                    : "bg-white border-teal-500"}
              `}
            >
              <div onClick={() => setExpandedInvoice(expandedInvoice === activeInvoice.id ? null : activeInvoice.id)} className={`p-4 border-b cursor-pointer ${isReInvoiced ? 'bg-teal-100 border-teal-200' : 'bg-teal-50 border-teal-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${isReInvoiced ? 'bg-teal-600' : 'bg-teal-500'}`}></div>
                    <div>
                      <h3 className="font-bold text-gray-900">Invoice #{activeInvoice.invoice_no}</h3>
                      <p className="text-xs text-gray-600">
                        {activeInvoice.customer?.name} • {pickedCount}/{totalItems} picked
                      </p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setExpandedInvoice(expandedInvoice === activeInvoice.id ? null : activeInvoice.id); }} className="text-gray-500 hover:text-gray-700">
                    <svg className={`w-5 h-5 transition-transform ${expandedInvoice === activeInvoice.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {expandedInvoice === activeInvoice.id && (
                <div className="p-4 space-y-3">
                  {/* Re-invoiced Banner */}
                  {isReInvoiced && activeInvoice.resolution_notes && (
                    <div className="p-4 mb-3 rounded-lg bg-gradient-to-r from-teal-50 to-teal-100 border-2 border-teal-400 shadow-md">
                      <div className="flex items-start gap-3">
                        <svg className="w-6 h-6 text-teal-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                          <p className="font-bold text-teal-900 text-lg mb-2">
                            ✓ Invoice Corrected - Please Re-pick
                          </p>
                          <div className="bg-white rounded-md p-3 border border-teal-200">
                            <p className="text-xs text-teal-600 font-semibold mb-1">Resolution Details:</p>
                            <p className="text-sm text-teal-800">
                              {activeInvoice.resolution_notes}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Review Banner (locked state - should not happen) */}
                  {isReviewInvoice && (
                    <div className="p-3 mb-3 rounded-lg bg-orange-50 border border-orange-300">
                      <p className="font-semibold text-orange-800">
                        Invoice Sent to Billing Review
                      </p>
                      <p className="text-sm text-orange-700 mt-1">
                        <b>Reason:</b> {activeInvoice.return_info.return_reason}
                      </p>
                      <p className="text-xs text-orange-600 mt-1">
                        Returned at{" "}
                        {new Date(activeInvoice.return_info.returned_at).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {activeInvoice.items.map((item) => (
                    <div key={item.id} onClick={() => {
                        if (isReviewInvoice) return;
                        toggleItemPicked(item.id);
                      }} className={`p-3 rounded-lg border cursor-pointer transition-all ${pickedItems[item.id] ? "bg-teal-50 border-teal-300" : "bg-white border-gray-200"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div onClick={() => {
                            if (isReviewInvoice) return;
                            toggleItemPicked(item.id);
                          }} className="cursor-pointer">
                          <div
                            className={`w-8 h-8 rounded flex items-center justify-center ${
                              isReviewInvoice
                                ? "bg-gray-300 cursor-not-allowed"
                                : pickedItems[item.id]
                                  ? "bg-teal-600"
                                  : "bg-white border-2 border-gray-300"
                            }`}
                          >
                            <svg className={`w-4 h-4 ${pickedItems[item.id] ? "text-white" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div><p className="font-semibold text-sm text-gray-900">{item.name}</p></div>
                            <div className="text-right ml-2">
                              <span className="font-bold text-gray-900">{item.quantity}</span>
                              <span className="text-xs text-gray-500 ml-1">pcs</span>
                            </div>
                          </div>
                          <div className="mt-1 text-[11px] text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
                            <span>📍 <b>{item.shelf_location || "—"}</b></span>
                            <span>Pack: <b>{item.packing || "—"}</b></span>
                            <span>Qty: <b>{item.quantity}</b></span>
                            <span>MRP: <b>{item.mrp || "—"}</b></span>
                            <span>Batch: <b>{item.batch_no || "—"}</b></span>
                            <span>Exp: <b>{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString("en-GB") : "—"}</b></span>
                          </div>
                        </div>
                        <button
                          disabled={isReviewInvoice}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isReviewInvoice) return;
                            openReviewPopup(item);
                          }}
                          className={`p-2 rounded-lg transition ${
                            isReviewInvoice
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-orange-600 hover:bg-orange-50"
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-3 pt-2">
                    <button onClick={handleSendInvoiceToReview} disabled={isReviewInvoice || !hasIssues} className={`flex-1 py-3 font-semibold rounded-lg transition-all ${hasIssues ? "bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                      Send Invoice to Review
                    </button>
                    {/* ✅ ADD THIS CANCEL BUTTON */}
                    <button
                      onClick={handleCancelPicking}
                      disabled={isReviewInvoice || loading}
                      className="flex-1 py-3 font-semibold rounded-lg transition-all bg-red-100 text-red-700 hover:bg-red-200 border border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel Picking
                    </button>
                    <button onClick={handleCompletePicking} disabled={!canCompletePicking} className={`flex-1 py-3 font-semibold rounded-lg transition-all ${allItemsPicked && !hasIssues ? (isReInvoiced ? "bg-teal-600 hover:bg-teal-700" : "bg-teal-600 hover:bg-teal-700") + " text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                      {hasIssues ? "Resolve Issues First" : allItemsPicked ? (isReInvoiced ? "✓ Complete Re-pick" : "Complete Picking") : `Pick ${totalItems - pickedCount} More`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center gap-2">
            <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-700">Completed Invoices Today</h2>
          </div>

          {completedInvoices.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">No completed invoices yet</p>
            </div>
          ) : (
            <>
              {/* ===== DESKTOP TABLE ===== */}
              <div className="hidden md:block">
                <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                  <div className="grid grid-cols-7 gap-4 px-6 py-3 text-sm font-semibold">
                    <div className="col-span-1">Invoice</div>
                    <div className="col-span-1">Customer & Place</div>
                    <div className="col-span-1">Date</div>
                    <div className="col-span-1">Start</div>
                    <div className="col-span-1">End</div>
                    <div className="col-span-1">Duration</div>
                    <div className="col-span-1">Status</div>
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  {completedInvoices.map((inv) => (
                    <div key={inv.id}>
                      {/* MAIN ROW */}
                      <div
                        onClick={() => toggleExpand(inv.id)}
                        className="grid grid-cols-7 gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="col-span-1 font-semibold">#{inv.invoice_no}</div>
                        <div className="col-span-1">
                          <p className="font-medium text-gray-900">{inv.customer_name || "-"}</p>
                          <p className="text-xs text-gray-500">{getPlaceFromAddress(inv.customer_address)}</p>
                        </div>
                        <div className="col-span-1">{formatDate(inv.start_time)}</div>
                        <div className="col-span-1">{formatTime(inv.start_time)}</div>
                        <div className="col-span-1">{formatTime(inv.end_time)}</div>
                        <div className="col-span-1">
                          {inv.duration != null
                            ? `${Math.floor(inv.duration)} min ${Math.round(
                                (inv.duration % 1) * 60
                              )} sec`
                            : "-"}
                        </div>
                        <div className="col-span-1">
                          <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-md text-xs font-semibold">
                            PICKED
                          </span>
                        </div>
                      </div>

                      {/* EXPANDED DESKTOP VIEW */}
                      {expandedInvoice === inv.id && (
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">

                          <div>
                            <p className="font-semibold text-gray-700 mb-2">
                              Items ({inv.items?.length || 0})
                            </p>
                            <div className="bg-white border rounded">
                              {inv.items?.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between px-4 py-2 border-b last:border-b-0"
                                >
                                  <span>{item.name || item.item_name}</span>
                                  <span>{item.quantity || item.qty} pcs</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ===== MOBILE CARD VIEW (CLICK TO EXPAND) ===== */}
              <div className="block md:hidden space-y-4 p-4">
                {completedInvoices.map((inv) => (
                  <div key={inv.id} className="border rounded-lg bg-white shadow-sm">
                    {/* Header */}
                    <div
                      onClick={() => toggleExpand(inv.id)}
                      className="p-4 flex justify-between items-start cursor-pointer"
                    >
                      <div>
                        <p className="font-bold">#{inv.invoice_no}</p>
                        <p className="text-sm text-gray-600">{inv.customer_name || "-"}</p>
                        <p className="text-xs text-gray-500">{getPlaceFromAddress(inv.customer_address)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs font-semibold">
                          PICKED
                        </span>
                        <p className="text-xs text-gray-600">{formatDate(inv.start_time)}</p>
                      </div>
                    </div>

                    {/* Basic Info */}
                    <div className="px-4 pb-3 text-sm text-gray-700 space-y-1">
                      <p><b>Start:</b> {formatTime(inv.start_time)} <b className="ml-3">End:</b> {formatTime(inv.end_time)}</p>
                      <p>
                        <b>Duration:</b>{" "}
                        {inv.duration != null
                          ? `${Math.floor(inv.duration)} min ${Math.round((inv.duration % 1) * 60)} sec`
                          : "-"}
                      </p>
                    </div>

                    {/* Expanded Details */}
                    {expandedInvoice === inv.id && (
                      <div className="border-t bg-gray-50 p-4 text-sm">

                        <p className="font-semibold mt-3 mb-1">
                          Items ({inv.items?.length || 0})
                        </p>
                        <div className="space-y-1">
                          {inv.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between border-b pb-1">
                              <span>{item.name || item.item_name}</span>
                              <span>{item.quantity || item.qty} pcs</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {reviewPopup.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="font-bold text-gray-900">Report Item Issue</h3>
              </div>
              <button onClick={closeReviewPopup} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-semibold text-gray-900">{reviewPopup.item?.name}</p>
                <p className="text-xs text-gray-500 mt-1">{reviewPopup.item?.item_code || reviewPopup.item?.sku}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                  {reviewPopup.item?.batch_no && <span>Batch: {reviewPopup.item.batch_no}</span>}
                  {reviewPopup.item?.expiry_date && <span>Exp: {new Date(reviewPopup.item.expiry_date).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Select Issues:</p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={reviewChecks.batchMatch} onChange={(e) => setReviewChecks({ ...reviewChecks, batchMatch: e.target.checked })} className="mt-1 w-4 h-4 text-orange-600 rounded" />
                  <span className="text-sm text-gray-700">Batch number does not match</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={reviewChecks.expiryCheck} onChange={(e) => setReviewChecks({ ...reviewChecks, expiryCheck: e.target.checked })} className="mt-1 w-4 h-4 text-orange-600 rounded" />
                  <span className="text-sm text-gray-700">Expiry date is near or expired</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={reviewChecks.quantityCorrect} onChange={(e) => setReviewChecks({ ...reviewChecks, quantityCorrect: e.target.checked })} className="mt-1 w-4 h-4 text-orange-600 rounded" />
                  <span className="text-sm text-gray-700">Quantity is incorrect</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={reviewChecks.packagingGood} onChange={(e) => setReviewChecks({ ...reviewChecks, packagingGood: e.target.checked })} className="mt-1 w-4 h-4 text-orange-600 rounded" />
                  <span className="text-sm text-gray-700">Packaging is damaged</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={reviewChecks.other} onChange={(e) => setReviewChecks({ ...reviewChecks, other: e.target.checked })} className="mt-1 w-4 h-4 text-orange-600 rounded" />
                  <span className="text-sm text-gray-700">Other</span>
                </label>
                {reviewChecks.other && (
                  <div className="ml-7">
                    <textarea value={otherIssueNotes} onChange={(e) => setOtherIssueNotes(e.target.value)} placeholder="Describe the issue..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none" rows={3} />
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button onClick={closeReviewPopup} className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Cancel</button>
              <button onClick={handleSaveIssue} className="flex-1 py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium">Save</button>
            </div>
          </div>
        </div>
      )}
      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={cancelModal.open}
        onClose={() => setCancelModal({ open: false })}
        onConfirm={confirmCancelPicking}
        title="Cancel Picking"
        message={`Are you sure you want to cancel picking for ${activeInvoice?.invoice_no}?\n\nThe invoice will be returned to the picking list and can be picked by you or any other user.`}
        confirmText="Yes, Cancel Picking"
        cancelText="No, Keep Picking"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
      />
    </div>
  );
}