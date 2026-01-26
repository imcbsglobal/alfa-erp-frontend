import { useEffect, useState } from "react";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";
import ConfirmationModal from '../../../components/ConfirmationModal';
import { formatTime, formatDate, getTodayISOString, formatInvoiceDate, formatMRP, formatQuantity } from '../../../utils/formatters';

export default function MyPackingListPage() {
  const [loading, setLoading] = useState(false);
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [packedItems, setPackedItems] = useState({});
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [completedInvoices, setCompletedInvoices] = useState([]);
  const [reviewPopup, setReviewPopup] = useState({ open: false, item: null });
  const [reviewChecks, setReviewChecks] = useState({});
  const [otherIssueNotes, setOtherIssueNotes] = useState("");
  const [savedIssues, setSavedIssues] = useState([]);
  const [cancelModal, setCancelModal] = useState({ open: false });
  
  const { user } = useAuth();

  const isReInvoiced =
    activeInvoice?.billing_status === "RE_INVOICED";

  const isLockedForReview =
    activeInvoice?.billing_status === "REVIEW";  

  const isAlreadyInReview =
    activeInvoice?.billing_status === "REVIEW";

  useEffect(() => {
    loadActivePacking();
    loadTodayCompletedPacking();
  }, []);


  useEffect(() => {
    const es = new EventSource(
      `${import.meta.env.VITE_API_BASE_URL}/sales/sse/invoices/`
    );

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (!data.invoice_no) return;

        // ✅ Listen ONLY for re-invoiced PATCH
        if (
          data.type === "invoice_updated" &&
          data.billing_status === "RE_INVOICED"
        ) {
          console.log(
            "📦 Packing page received re-invoiced invoice:",
            data.invoice_no
          );
          loadActivePacking();
        }
      } catch (err) {
        console.error("Packing SSE parse error", err);
      }
    };

    es.onerror = () => {
      // SSE connection closed - normal behavior during server restarts or timeouts
      es.close();
    };

    return () => es.close();
  }, []); // Empty dependency - SSE monitors global invoice updates

  useEffect(() => {
    if (isReInvoiced && activeInvoice?.invoice_no) {
      setPackedItems({});
      setSavedIssues([]);
      setExpandedInvoice(activeInvoice.id);
    }
  }, [isReInvoiced, activeInvoice?.invoice_no]);

  const loadActivePacking = async () => {
    try {
      setLoading(true);

      // 1️⃣ Check active packing task
      const res = await api.get("/sales/packing/active/");
      const task = res.data?.data || null;

      if (task) {
        setActiveInvoice({
          ...task.invoice,
          created_at: task.start_time,
          session_id: task.session_id,
        });
        return;
      }

      // 2️⃣ If no active task, check for RE-INVOICED bills
      const reinvoicedRes = await api.get("/sales/billing/invoices/", {
        params: { billing_status: "RE_INVOICED" },
      });

      const reinvoiced = reinvoicedRes.data?.results || [];

      if (reinvoiced.length > 0) {
        const invoice = reinvoiced[0];

        // ✅ START PACKING SESSION (REQUIRED)
        const startRes = await api.post("/sales/packing/start/", {
          invoice_no: invoice.invoice_no,
          user_email: user.email,
        });

        const task = startRes.data?.data;

        setActiveInvoice({
          ...task.invoice,
          created_at: task.start_time,
          session_id: task.session_id,
        });

        return;
      } else {
        setActiveInvoice(null);
      }
    } catch (err) {
      console.error("Failed to load active packing task", err);
      setActiveInvoice(null);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayCompletedPacking = async () => {
    try {
      const today = getTodayISOString();
      const res = await api.get("/sales/packing/history/", {
        params: { 
          status: "PACKED", 
          start_date: today, 
          end_date: today 
        },
      });
      setCompletedInvoices(res.data?.results || []);
    } catch (err) {
      console.error("Failed to load packing history", err);
    }
  };

  const toggleItemPacked = (itemId) => {
    if (isLockedForReview) return;
    setPackedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const openReviewPopup = (item) => {
    if (isLockedForReview) return;

  const existing = savedIssues.find((i) => i.item === item.name);

    if (existing) {
      const checks = {
        batchMatch: existing.issues.some(i => i.includes("Batch")),
        expiryCheck: existing.issues.some(i => i.includes("Expiry")),
        quantityCorrect: existing.issues.some(i => i.includes("Quantity")),
        packagingGood: existing.issues.some(i => i.includes("Damaged")),
        other: existing.issues.some(i => i.startsWith("Other:")),
      };

      const otherNote =
        existing.issues.find(i => i.startsWith("Other:"))?.replace("Other: ", "") || "";

      setReviewChecks(checks);
      setOtherIssueNotes(otherNote);
    } else {
      setReviewChecks({
        batchMatch: false,
        expiryCheck: false,
        quantityCorrect: false,
        packagingGood: false,
        other: false
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
      const idx = prev.findIndex(i => i.item === reviewPopup.item.name);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = { item: reviewPopup.item.name, issues };
        return copy;
      }
      return [...prev, { item: reviewPopup.item.name, issues }];
    });


    toast.success("Issue saved");
    closeReviewPopup();
  };

  const handleSendInvoiceToReview = async () => {
    if (!activeInvoice) return;

    // 🚫 HARD STOP — do NOT call backend again
    if (activeInvoice.billing_status === "REVIEW") {
      toast.error("Invoice is already under billing review");
      return;
    }

    if (!savedIssues.length) {
      toast.error("No saved issues to send");
      return;
    }

    try {
      setLoading(true);

      const notes = savedIssues
        .map((i) => `${i.item}: ${i.issues.join(", ")}`)
        .join(" | ");

      await api.post("/sales/billing/return/", {
        invoice_no: activeInvoice.invoice_no,
        return_reason: notes,
        user_email: user.email,
      });

      toast.success("Invoice sent to billing review");

      // 🔥 CRITICAL: lock invoice immediately in UI
      setActiveInvoice((prev) =>
        prev
          ? {
              ...prev,
              billing_status: "REVIEW",
            }
          : prev
      );

      setSavedIssues([]);

      await loadTodayCompletedPacking();
      } catch (err) {
      console.error("Return error:", err.response?.status, err.response?.data);

      const error = err.response?.data;

      // ✅ Backend says already sent → sync UI
      if (error?.errors?.invoice_no?.includes("already been sent")) {
        toast.error("Invoice is already under billing review");

        // 🔒 Force UI lock
        setActiveInvoice(prev =>
          prev ? { ...prev, billing_status: "REVIEW" } : prev
        );
        return;
      }

      toast.error(error?.message || "Failed to send invoice to review");
    } finally {
      setLoading(false);
    }
  };

  const allItemsPacked =
    activeInvoice?.items?.every((item) => packedItems[item.id]) || false;
  const packedCount =
    activeInvoice?.items?.filter((item) => packedItems[item.id]).length || 0;
  const totalItems = activeInvoice?.items?.length || 0;

  const hasIssues = savedIssues.length > 0;

  const handleCompletePacking = async () => {
    if (isLockedForReview) {
      toast.error("Invoice is under billing review and cannot be completed");
      return;
    }

    if (!allItemsPacked || !activeInvoice) {
      toast.error("Please pack all items first");
      return;
    }
    
    if (!user?.email) {
      toast.error("User email not found. Please log in again.");
      return;
    }

    try {
      setLoading(true);
      await api.post("/sales/packing/complete/", {
        invoice_no: activeInvoice.invoice_no,
        user_email: user.email,
        notes: isReInvoiced
        ? "[RE-PACK] Corrected invoice packed"
        : "Packed all items",
      });

      setPackedItems({});
      
      await loadActivePacking();
      await loadTodayCompletedPacking();
      
      toast.success("Packing completed successfully!");
    } catch (err) {
      console.error("Complete packing error:", err);
      const errorMessage = err.response?.data?.message 
        || err.response?.data?.error 
        || "Failed to complete packing";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPacking = async () => {
    if (!activeInvoice || !user?.email) {
      toast.error("Cannot cancel at this time");
      return;
    }

    if (isLockedForReview) {
      toast.error("Cannot cancel an invoice under review");
      return;
    }

    setCancelModal({ open: true });
  };

  const confirmCancelPacking = async () => {
    try {
      setLoading(true);
      
      await api.post("/sales/cancel-session/", {
        invoice_no: activeInvoice.invoice_no,
        user_email: user.email,
        session_type: "PACKING",
        cancel_reason: "User cancelled packing"
      });

      toast.success("Packing cancelled. Invoice is now available for anyone to pack.");
      
      await loadActivePacking();
      await loadTodayCompletedPacking();
      
    } catch (err) {
      console.error("Cancel error:", err);
      toast.error(err.response?.data?.message || "Failed to cancel packing");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (invoiceId) => {
    setExpandedInvoice(expandedInvoice === invoiceId ? null : invoiceId);
  };

  if (loading && !activeInvoice && completedInvoices.length === 0) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 py-2 sm:py-3">
        <div className="mb-2">
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">My Packed Invoices</h1>
        </div>

        {activeInvoice && (
          <div className="mb-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h2 className="text-sm sm:text-base font-semibold text-gray-700">Active Bill</h2>
              {isReInvoiced && (
                <span className="ml-1 px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-[10px] sm:text-xs font-bold border border-teal-300 animate-pulse">
                  ✓ CORRECTED
                </span>
              )}
            </div>
            <div className={`rounded-lg shadow overflow-hidden border-2 ${isLockedForReview ? "bg-gray-100 border-orange-400 opacity-70" : isReInvoiced ? "bg-teal-50 border-teal-500" : "bg-white border-teal-500"}`}>
              <div onClick={() => toggleExpand(activeInvoice.id)} className={`p-2 sm:p-3 border-b cursor-pointer ${isReInvoiced ? 'bg-teal-100' : 'bg-teal-50'} border-teal-200`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-1.5 h-1.5 flex-shrink-0 rounded-full animate-pulse ${isReInvoiced ? 'bg-teal-600' : 'bg-teal-500'}`}></div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs sm:text-sm text-gray-900 truncate">#{activeInvoice.invoice_no}</h3>
                      <p className="text-[10px] sm:text-xs text-gray-600 truncate">{activeInvoice.customer?.name} • {packedCount}/{totalItems}</p>
                    </div>
                  </div>
                  <svg className={`w-4 h-4 transition-transform ${expandedInvoice === activeInvoice.id ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {expandedInvoice === activeInvoice.id && (
                <div className="p-2 sm:p-3 space-y-2">
                  {isReInvoiced && activeInvoice.resolution_notes && (
                    <div className="p-2 rounded-lg bg-gradient-to-r from-teal-50 to-teal-100 border border-teal-400">
                      <div className="flex items-start gap-2">
                        <svg className="w-4 h-4 text-teal-700 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                          <p className="font-bold text-teal-900 text-xs sm:text-sm mb-1">✓ Invoice Corrected - Re-pack</p>
                          <div className="bg-white rounded p-1.5 border border-teal-200">
                            <p className="text-[9px] sm:text-[10px] text-teal-600 font-semibold mb-0.5">Resolution:</p>
                            <p className="text-[10px] sm:text-xs text-teal-800">{activeInvoice.resolution_notes}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {isLockedForReview && (
                    <div className="p-2 rounded-lg bg-orange-50 border border-orange-300">
                      <p className="font-semibold text-orange-800 text-xs">Invoice Sent to Billing Review</p>
                      <p className="text-[10px] sm:text-xs text-orange-700 mt-0.5">This invoice is locked and cannot be modified.</p>
                    </div>
                  )}

                  {activeInvoice.items.map((item) => (
                    <div key={item.id} onClick={() => !isLockedForReview && toggleItemPacked(item.id)} className={`p-2 rounded-lg border cursor-pointer transition-all ${packedItems[item.id] ? "bg-teal-50 border-teal-300" : "bg-white border-gray-200"}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded flex items-center justify-center flex-shrink-0 ${isLockedForReview ? "bg-gray-300" : packedItems[item.id] ? "bg-teal-600" : "bg-white border-2 border-gray-300"}`}>
                          <svg className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${packedItems[item.id] ? "text-white" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className="font-semibold text-xs sm:text-sm text-gray-900 truncate">{item.name}</p>
                            <div className="text-right flex-shrink-0">
                              <span className="font-bold text-xs sm:text-sm text-gray-900">{formatQuantity(item.quantity, 'pcs', false)}</span>
                              <span className="text-[9px] sm:text-[10px] text-gray-500 ml-0.5">pcs</span>
                            </div>
                          </div>
                          <div className="mt-0.5 text-[9px] sm:text-[10px] text-gray-600 flex flex-wrap gap-x-2 gap-y-0.5">
                            <span>📍 <b>{item.shelf_location || "—"}</b></span>
                            <span>Pack: <b>{item.packing || "—"}</b></span>
                            <span>MRP: <b>{formatMRP(item.mrp)}</b></span>
                            <span>Batch: <b>{item.batch_no || "—"}</b></span>
                          </div>
                        </div>
                        <button disabled={isLockedForReview} onClick={(e) => { e.stopPropagation(); !isLockedForReview && openReviewPopup(item); }} className={`p-1.5 rounded-lg transition flex-shrink-0 ${isLockedForReview ? "text-gray-400" : "text-orange-600 hover:bg-orange-50"}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-col sm:flex-row gap-1.5 pt-1">
                    <button onClick={handleSendInvoiceToReview} disabled={isLockedForReview || !hasIssues} className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${hasIssues ? "bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                      Send to Review
                    </button>
                    <button onClick={handleCompletePacking} disabled={isLockedForReview || !allItemsPacked || hasIssues} className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${allItemsPacked && !hasIssues ? "bg-teal-600 hover:bg-teal-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                      {hasIssues ? "Resolve Issues" : allItemsPacked ? (isReInvoiced ? "✓ Complete" : "Complete") : `Pack ${totalItems - packedCount}`}
                    </button>
                    <button onClick={handleCancelPacking} disabled={isLockedForReview || loading} className="flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all bg-red-100 text-red-700 hover:bg-red-200 border border-red-300 disabled:opacity-50">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-3 py-2 bg-white border-b flex items-center gap-1.5">
            <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-sm sm:text-base font-semibold text-gray-700">Completed Today</h2>
          </div>

          {completedInvoices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No completed invoices yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              <>
                {/* ===== DESKTOP TABLE ===== */}
                <div className="hidden lg:block">
                  <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 text-sm font-semibold">
                      <div className="col-span-2">Invoice</div>
                      <div className="col-span-2">Date</div>
                      <div className="col-span-2">Start</div>
                      <div className="col-span-2">End</div>
                      <div className="col-span-2">Duration</div>
                      <div className="col-span-2">Status</div>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-200">
                    {completedInvoices.map((inv) => (
                      <div key={inv.id}>
                        {/* Main Row */}
                        <div
                          onClick={() => toggleExpand(inv.id)}
                          className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer"
                        >
                          <div className="col-span-2 font-semibold">#{inv.invoice_no}</div>
                          <div className="col-span-2">{formatDate(inv.start_time)}</div>
                          <div className="col-span-2">{formatTime(inv.start_time)}</div>
                          <div className="col-span-2">{formatTime(inv.end_time)}</div>
                          <div className="col-span-2">
                            {inv.duration != null
                              ? `${Math.floor(inv.duration)} min ${Math.round((inv.duration % 1) * 60)} sec`
                              : "-"}
                          </div>
                          <div className="col-span-2">
                            <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded text-xs font-semibold">
                              PACKED
                            </span>
                          </div>
                        </div>

                        {/* Expanded Desktop */}
                        {expandedInvoice === inv.id && (
                          <div className="px-6 py-4 bg-gray-50 border-t">
                            <p className="font-semibold">Customer</p>
                            <p>{inv.customer_name || "-"}</p>
                            <p>{inv.customer_phone || "-"}</p>
                            <p>{inv.customer_address || "-"}</p>

                            <p className="font-semibold mt-3">
                              Items ({inv.items?.length || 0})
                            </p>
                            <div className="bg-white border rounded">
                              {inv.items?.map((item, idx) => (
                                <div key={idx} className="flex justify-between px-4 py-2 border-b last:border-b-0">
                                  <span>{item.name || item.item_name}</span>
                                  <span>{formatQuantity(item.quantity || item.qty, 'pcs')}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* ===== MOBILE CARD VIEW ===== */}
                <div className="block md:hidden p-4 space-y-4">
                  {completedInvoices.map((inv) => (
                    <div key={inv.id} className="border rounded-lg bg-white shadow-sm">
                      {/* Header */}
                      <div
                        onClick={() => toggleExpand(inv.id)}
                        className="p-4 flex justify-between items-center cursor-pointer"
                      >
                        <p className="font-bold">#{inv.invoice_no}</p>
                        <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs font-semibold">
                          PACKED
                        </span>
                      </div>

                      {/* Basic Info */}
                      <div className="px-4 pb-3 text-sm space-y-1">
                        <p><b>Date:</b> {formatDate(inv.start_time)}</p>
                        <p><b>Start:</b> {formatTime(inv.start_time)}</p>
                        <p><b>End:</b> {formatTime(inv.end_time)}</p>
                        <p>
                          <b>Duration:</b>{" "}
                          {inv.duration != null
                            ? `${Math.floor(inv.duration)} min ${Math.round((inv.duration % 1) * 60)} sec`
                            : "-"}
                        </p>
                      </div>

                      {/* Expanded Mobile */}
                      {expandedInvoice === inv.id && (
                        <div className="border-t bg-gray-50 p-4 text-sm">
                          <p className="font-semibold">Customer</p>
                          <p>{inv.customer_name || "-"}</p>
                          <p>{inv.customer_phone || "-"}</p>
                          <p>{inv.customer_address || "-"}</p>

                          <p className="font-semibold mt-3">
                            Items ({inv.items?.length || 0})
                          </p>
                          {inv.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between border-b py-1">
                              <span>{item.name || item.item_name}</span>
                              <span>{formatQuantity(item.quantity || item.qty, 'pcs')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            </div>
          )}
        </div>
      </div>

      {/* Issue Report Popup */}
      {reviewPopup.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h3 className="font-bold text-gray-900">Report Item Issue</h3>
              </div>
              <button
                onClick={closeReviewPopup}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {/* Item Details */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-semibold text-gray-900">{reviewPopup.item?.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {reviewPopup.item?.item_code || reviewPopup.item?.sku}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                  {reviewPopup.item?.batch_no && (
                    <span>Batch: {reviewPopup.item.batch_no}</span>
                  )}
                  {reviewPopup.item?.expiry_date && (
                    <span>
                      Exp:{" "}
                      {formatDate(reviewPopup.item.expiry_date)}
                    </span>
                  )}
                </div>
              </div>

              {/* Issue Checklist */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Select Issues:</p>
                
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reviewChecks.batchMatch}
                    onChange={(e) =>
                      setReviewChecks({ ...reviewChecks, batchMatch: e.target.checked })
                    }
                    className="mt-1 w-4 h-4 text-orange-600 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    Batch number does not match
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reviewChecks.expiryCheck}
                    onChange={(e) =>
                      setReviewChecks({ ...reviewChecks, expiryCheck: e.target.checked })
                    }
                    className="mt-1 w-4 h-4 text-orange-600 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    Expiry date is near or expired
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reviewChecks.quantityCorrect}
                    onChange={(e) =>
                      setReviewChecks({
                        ...reviewChecks,
                        quantityCorrect: e.target.checked,
                      })
                    }
                    className="mt-1 w-4 h-4 text-orange-600 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    Quantity is incorrect
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reviewChecks.packagingGood}
                    onChange={(e) =>
                      setReviewChecks({
                        ...reviewChecks,
                        packagingGood: e.target.checked,
                      })
                    }
                    className="mt-1 w-4 h-4 text-orange-600 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    Packaging is damaged
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reviewChecks.other}
                    onChange={(e) =>
                      setReviewChecks({
                        ...reviewChecks,
                        other: e.target.checked,
                      })
                    }
                    className="mt-1 w-4 h-4 text-orange-600 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    Other
                  </span>
                </label>

                {/* Notes field - shows when Other is checked */}
                {reviewChecks.other && (
                  <div className="ml-7">
                    <textarea
                      value={otherIssueNotes}
                      onChange={(e) => setOtherIssueNotes(e.target.value)}
                      placeholder="Describe the issue..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={closeReviewPopup}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveIssue}
                className="flex-1 py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={cancelModal.open}
        onClose={() => setCancelModal({ open: false })}
        onConfirm={confirmCancelPacking}
        title="Cancel Packing"
        message={`Are you sure you want to cancel packing for ${activeInvoice?.invoice_no}?\n\nThe invoice will be returned to the packing list and can be packed by you or any other user.`}
        confirmText="Yes, Cancel Packing"
        cancelText="No, Keep Packing"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
      />
    </div>
  );
}