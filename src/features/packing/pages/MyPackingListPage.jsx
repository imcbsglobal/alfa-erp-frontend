import { useEffect, useState } from "react";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";

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
      console.error("Packing SSE connection error");
      es.close();
    };

    return () => es.close();
  }, []);

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
      const today = new Date().toISOString().split("T")[0];
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

  if (loading && !activeInvoice && completedInvoices.length === 0) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-800">My Packed Invoices</h1>
        </div>

        {/* Active Bill Section - Compact */}
        {activeInvoice && (
          <div className="mb-6">
            {/* Section Header */}
            <div className="mb-3 flex items-center gap-2">
              <svg
                className="w-6 h-6 text-teal-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <h2 className="text-lg font-semibold text-gray-700">Active Bill</h2>
              <span className="text-sm text-gray-500">Currently in progress</span>
            </div>
            <div
              className={`rounded-lg shadow overflow-hidden border-2 transition
                ${isLockedForReview
                  ? "bg-gray-100 border-orange-400 opacity-70"
                  : isReInvoiced
                    ? "bg-teal-50 border-teal-500"
                    : "bg-white border-teal-500"}
              `}
            >
              {/* Compact Header */}
              <div
                onClick={() =>
                  setExpandedInvoice(
                    expandedInvoice === activeInvoice.id ? null : activeInvoice.id
                  )
                }
                className="p-4 bg-teal-50 border-b border-teal-200 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
                    <div>
                      <h3 className="font-bold text-gray-900">
                        Invoice #{activeInvoice.invoice_no}
                      </h3>
                      <p className="text-xs text-gray-600">
                        {activeInvoice.customer?.name} • {packedCount}/{totalItems} packed
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedInvoice(
                        expandedInvoice === activeInvoice.id ? null : activeInvoice.id
                      );
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg
                      className={`w-5 h-5 transition-transform ${
                        expandedInvoice === activeInvoice.id ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedInvoice === activeInvoice.id && (
                <div className="p-4 space-y-3">
                  {isLockedForReview && (
                    <div className="p-3 rounded-lg bg-orange-50 border border-orange-300">
                      <p className="font-semibold text-orange-800">
                        Invoice sent to Billing Review
                      </p>
                      <p className="text-sm text-orange-700 mt-1">
                        This invoice is locked and cannot be modified.
                      </p>
                    </div>
                  )}

                  {activeInvoice.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (isLockedForReview) return;
                        toggleItemPacked(item.id);
                      }}  
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        packedItems[item.id]
                          ? "bg-teal-50 border-teal-300"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        {/* Checkbox */}
                        <div
                          onClick={() => {
                            if (isLockedForReview) return;
                            toggleItemPacked(item.id);
                          }}
                          className="cursor-pointer"
                        >
                          <div
                            className={`w-8 h-8 rounded flex items-center justify-center ${
                              packedItems[item.id]
                                ? "bg-teal-600"
                                : "bg-white border-2 border-gray-300"
                            }`}
                          >
                            <svg
                              className={`w-4 h-4 ${
                                packedItems[item.id] ? "text-white" : "text-gray-400"
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        </div>

                        {/* Item Details */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-sm text-gray-900">
                                {item.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {item.shelf_location && `📍 ${item.shelf_location}`}
                              </p>
                            </div>
                            <div className="text-right ml-2">
                              <span className="font-bold text-gray-900">
                                {item.quantity}
                              </span>
                              <span className="text-xs text-gray-500 ml-1">pcs</span>
                            </div>
                          </div>
                          
                          {/* Compact Details */}
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                            {item.batch_no && <span>Batch: {item.batch_no}</span>}
                            {item.expiry_date && (
                              <span>
                                Exp: {new Date(item.expiry_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            )}
                            {item.mrp && <span>MRP: ₹{item.mrp}</span>}
                          </div>
                        </div>

                        {/* Report Issue Button */}
                        <button
                          onClick={(e) => {e.stopPropagation();openReviewPopup(item);}}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                          title="Report Issue"
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
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSendInvoiceToReview}
                      disabled={isLockedForReview || loading || !hasIssues}
                      className={`flex-1 py-3 font-semibold rounded-lg transition-all ${
                        isLockedForReview
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : hasIssues
                            ? "bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {isLockedForReview ? "Under Review" : "Send Invoice to Review"}
                    </button>
                    <button
                      onClick={handleCompletePacking}
                      disabled={isLockedForReview || !allItemsPacked || hasIssues}
                      className={`flex-1 py-3 font-semibold rounded-lg transition-all ${
                        allItemsPacked && !hasIssues
                          ? "bg-teal-600 hover:bg-teal-700 text-white"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {hasIssues
                        ? "Resolve Issues First"
                        : allItemsPacked
                          ? "Complete Packing"
                          : `Pack ${totalItems - packedCount} More`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completed Bills Section - Responsive + Expandable */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center gap-2">
              <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-700">
                Completed Invoices Today
              </h2>
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
                                  <span>{item.quantity || item.qty} pcs</span>
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
                              <span>{item.quantity || item.qty} pcs</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
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
                      {new Date(reviewPopup.item.expiry_date).toLocaleDateString()}
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
    </div>
  );
}