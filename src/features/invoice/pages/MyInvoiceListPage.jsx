import { useEffect, useState } from "react";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";
import { getActivePickingTask } from "../../../services/sales";
import toast from "react-hot-toast";
import ConfirmationModal from '../../../components/ConfirmationModal';
import { formatTime, formatDate, getTodayISOString, formatDateTime, formatInvoiceDate, formatMRP, formatQuantity } from '../../../utils/formatters';

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

  const isReInvoiced = activeInvoice?.billing_status === "RE_INVOICED";
  const isReviewInvoice = activeInvoice?.billing_status === "REVIEW" && Boolean(activeInvoice?.return_info);

  useEffect(() => {
    loadTodayCompletedPicking();
    loadActivePicking();
  }, []);

  useEffect(() => {
    const es = new EventSource(`${API_BASE_URL}/sales/sse/invoices/`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data.invoice_no) return;
        if (data.billing_status === "RE_INVOICED" && 
            data.return_info?.returned_by_email === user?.email) {
          loadActivePicking();
        }
        if (data.type === 'invoice_review' || data.type === 'invoice_returned') {
          loadActivePicking();
        }
      } catch (e) {
        console.error("Bad SSE data", e);
      }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [user?.email]);

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
      
      if (!task) {
        const reInvoicedRes = await api.get("/sales/billing/invoices/", {
          params: { 
            billing_status: "RE_INVOICED",
            returned_by_email: user?.email 
          }
        });
        
        const reInvoicedBills = reInvoicedRes.data?.results || [];
        
        if (reInvoicedBills.length > 0) {
          const invoice = reInvoicedBills[0];
          try {
            await api.post("/sales/picking/start/", {
              invoice_no: invoice.invoice_no,
              user_email: user.email
            });
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
      const today = getTodayISOString();
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
      const otherNote = existing.issues.find((i) => i.startsWith("Other:"))?.replace("Other: ", "") || "";
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
    if (!activeInvoice || isReviewInvoice || !savedIssues.length) {
      toast.error(isReviewInvoice ? "Invoice already sent for review" : "No saved issues to send");
      return;
    }
    try {
      setLoading(true);
      const notes = savedIssues.map((i) => `${i.item}: ${i.issues.join(", ")}`).join(" | ");
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
      toast.error(err.response?.data?.message || "Failed to send invoice to review");
    } finally {
      setLoading(false);
    }
  };

  const allItemsPicked = activeInvoice?.items?.every((item) => pickedItems[item.id]) || false;
  const pickedCount = activeInvoice?.items?.filter((item) => pickedItems[item.id]).length || 0;
  const totalItems = activeInvoice?.items?.length || 0;
  const hasIssues = savedIssues.length > 0;

  const handleCompletePicking = async () => {
    if (!activePickingTask || isReviewInvoice || !allItemsPicked || !user?.email) {
      toast.error(isReviewInvoice ? "Invoice is under billing review" : "Please pick all items first");
      return;
    }
    try {
      setLoading(true);
      await api.post("/sales/picking/complete/", {
        invoice_no: activeInvoice.invoice_no,
        user_email: user.email,
        notes: isReInvoiced ? "[RE-PICK] Corrected invoice picked" : "Picked all items",
      });
      await new Promise(resolve => setTimeout(resolve, 800));
      await Promise.all([loadActivePicking(), loadTodayCompletedPicking()]);
      toast.success("Picking completed successfully!");
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error(err.response?.data?.message || "You don't have privilege to perform picking operations", { duration: 4000 });
        return;
      }
      toast.error(err.response?.data?.message || err.response?.data?.errors?.invoice_no?.[0] || "Failed to complete picking");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPicking = () => {
    if (activeInvoice && user?.email) setCancelModal({ open: true });
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
      toast.success("Picking cancelled");
      await loadActivePicking();
      await loadTodayCompletedPicking();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel picking");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (invoiceId) => {
    setExpandedInvoice(expandedInvoice === invoiceId ? null : invoiceId);
  };

  const getPlaceFromAddress = (address) => {
    if (!address) return "-";
    const parts = address.split(',');
    const lastPart = parts[parts.length - 1].trim();
    return lastPart.replace(/\s*POST\s*$/i, '').trim() || "-";
  };

  if (loading) return <div className="p-4">Loading...</div>;

  const canCompletePicking = activeInvoice && !isReviewInvoice && allItemsPicked && !hasIssues;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-2 py-2 sm:py-3">
        <div className="mb-2">
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">My Picked Invoices</h1>
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
            <div className={`rounded-lg shadow overflow-hidden border-2 ${isReviewInvoice ? "bg-gray-100 border-orange-400 opacity-70" : isReInvoiced ? "bg-teal-50 border-teal-500" : "bg-white border-teal-500"}`}>
              <div onClick={() => toggleExpand(activeInvoice.id)} className={`p-2 sm:p-3 border-b cursor-pointer ${isReInvoiced ? 'bg-teal-100' : 'bg-teal-50'} border-teal-200`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-1.5 h-1.5 flex-shrink-0 rounded-full animate-pulse ${isReInvoiced ? 'bg-teal-600' : 'bg-teal-500'}`}></div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs sm:text-sm text-gray-900 truncate">#{activeInvoice.invoice_no}</h3>
                      <p className="text-[10px] sm:text-xs text-gray-600 truncate">{activeInvoice.customer?.name} • {pickedCount}/{totalItems}</p>
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
                          <p className="font-bold text-teal-900 text-xs sm:text-sm mb-1">✓ Invoice Corrected - Re-pick</p>
                          <div className="bg-white rounded p-1.5 border border-teal-200">
                            <p className="text-[9px] sm:text-[10px] text-teal-600 font-semibold mb-0.5">Resolution:</p>
                            <p className="text-[10px] sm:text-xs text-teal-800">{activeInvoice.resolution_notes}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {isReviewInvoice && (
                    <div className="p-2 rounded-lg bg-orange-50 border border-orange-300">
                      <p className="font-semibold text-orange-800 text-xs">Invoice Sent to Billing Review</p>
                      <p className="text-[10px] sm:text-xs text-orange-700 mt-0.5"><b>Reason:</b> {activeInvoice.return_info.return_reason}</p>
                    </div>
                  )}

                  {activeInvoice.items.map((item) => (
                    <div key={item.id} onClick={() => !isReviewInvoice && toggleItemPicked(item.id)} className={`p-2 rounded-lg border cursor-pointer transition-all ${pickedItems[item.id] ? "bg-teal-50 border-teal-300" : "bg-white border-gray-200"}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded flex items-center justify-center flex-shrink-0 ${isReviewInvoice ? "bg-gray-300" : pickedItems[item.id] ? "bg-teal-600" : "bg-white border-2 border-gray-300"}`}>
                          <svg className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${pickedItems[item.id] ? "text-white" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <button disabled={isReviewInvoice} onClick={(e) => { e.stopPropagation(); !isReviewInvoice && openReviewPopup(item); }} className={`p-1.5 rounded-lg transition flex-shrink-0 ${isReviewInvoice ? "text-gray-400" : "text-orange-600 hover:bg-orange-50"}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-col sm:flex-row gap-1.5 pt-1">
                    <button onClick={handleSendInvoiceToReview} disabled={isReviewInvoice || !hasIssues} className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${hasIssues ? "bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                      Send to Review
                    </button>
                    <button onClick={handleCompletePicking} disabled={!canCompletePicking} className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${allItemsPicked && !hasIssues ? "bg-teal-600 hover:bg-teal-700 text-white" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                      {hasIssues ? "Resolve Issues" : allItemsPicked ? (isReInvoiced ? "✓ Complete" : "Complete") : `Pick ${totalItems - pickedCount}`}
                    </button>
                    <button onClick={handleCancelPicking} disabled={isReviewInvoice || loading} className="flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all bg-red-100 text-red-700 hover:bg-red-200 border border-red-300 disabled:opacity-50">
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
              {completedInvoices.map((inv) => (
                <div key={inv.id} onClick={() => toggleExpand(inv.id)} className="p-3 hover:bg-gray-50 cursor-pointer">
                  <div className="flex justify-between items-start mb-1">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs sm:text-sm">#{inv.invoice_no}</p>
                      <p className="text-[10px] sm:text-xs text-gray-600 truncate">{inv.customer_name || "-"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 ml-2">
                      <span className="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-[9px] sm:text-[10px] font-semibold whitespace-nowrap">PICKED</span>
                      <p className="text-[9px] sm:text-[10px] text-gray-600">{formatDate(inv.start_time)}</p>
                    </div>
                  </div>
                  <div className="text-[10px] sm:text-xs text-gray-600">
                    <span>{formatTime(inv.start_time)}</span>
                    <span className="mx-1">→</span>
                    <span>{formatTime(inv.end_time)}</span>
                    <span className="ml-2">({inv.duration != null ? `${Math.floor(inv.duration)}m ${Math.round((inv.duration % 1) * 60)}s` : "-"})</span>
                  </div>
                  {expandedInvoice === inv.id && (
                    <div className="mt-2 pt-2 border-t text-[10px] sm:text-xs">
                      <p className="font-semibold mb-1">Items ({inv.items?.length || 0})</p>
                      {inv.items?.map((item, idx) => (
                        <div key={idx} className="flex justify-between py-0.5">
                          <span className="truncate mr-2">{item.name || item.item_name}</span>
                          <span className="font-medium whitespace-nowrap">{formatQuantity(item.quantity || item.qty, 'pcs')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {reviewPopup.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-3 border-b flex items-center justify-between sticky top-0 bg-white">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="font-bold text-sm text-gray-900">Report Issue</h3>
              </div>
              <button onClick={closeReviewPopup} className="text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-3 space-y-2">
              <div className="bg-gray-50 p-2 rounded-lg">
                <p className="font-semibold text-xs text-gray-900">{reviewPopup.item?.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{reviewPopup.item?.item_code || reviewPopup.item?.sku}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">Select Issues:</p>
                {['batchMatch', 'expiryCheck', 'quantityCorrect', 'packagingGood', 'other'].map((key) => (
                  <label key={key} className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={reviewChecks[key]} onChange={(e) => setReviewChecks({ ...reviewChecks, [key]: e.target.checked })} className="mt-0.5 w-3.5 h-3.5 text-orange-600 rounded" />
                    <span className="text-xs text-gray-700">
                      {key === 'batchMatch' ? 'Batch mismatch' : key === 'expiryCheck' ? 'Expiry issue' : key === 'quantityCorrect' ? 'Quantity incorrect' : key === 'packagingGood' ? 'Damaged packaging' : 'Other'}
                    </span>
                  </label>
                ))}
                {reviewChecks.other && (
                  <textarea value={otherIssueNotes} onChange={(e) => setOtherIssueNotes(e.target.value)} placeholder="Describe..." className="w-full px-2 py-1.5 border rounded-lg text-xs resize-none" rows={2} />
                )}
              </div>
            </div>
            <div className="p-3 border-t flex gap-2 sticky bottom-0 bg-white">
              <button onClick={closeReviewPopup} className="flex-1 py-1.5 px-3 border text-xs text-gray-700 rounded-lg">Cancel</button>
              <button onClick={handleSaveIssue} className="flex-1 py-1.5 px-3 bg-orange-600 text-xs text-white rounded-lg">Save</button>
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