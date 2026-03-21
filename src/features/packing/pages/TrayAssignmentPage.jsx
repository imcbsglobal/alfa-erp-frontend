import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  saveTrayDraft,
  getTrayBill,
  returnBillingInvoice,
  completeTrayPacking,
  searchTrays,
} from "../../../services/sales";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";
import { formatQuantity } from "../../../utils/formatters";
import PackInvoiceModal from "../components/PackInvoiceModal";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export default function TrayAssignmentPage() {
  const { invoiceNo } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [bill, setBill] = useState(null);
  const [trays, setTrays] = useState([]);   // each: { id, trayCode, items:[], is_sealed }
  const [completing, setCompleting] = useState(null); // null | 'self' | 'queue'
  const [errors, setErrors] = useState([]);

  // tray search modal
  const [showTraySearch, setShowTraySearch] = useState(false);
  const [traySearchQ, setTraySearchQ] = useState("");
  const [traySearchResults, setTraySearchResults] = useState([]);
  const [searchingTrays, setSearchingTrays] = useState(false);
  const traySearchRef = useRef(null);

  const completedTrays = useMemo(() => {
    return new Set(trays.filter(t => t.is_sealed).map(t => t.id));
  }, [trays]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedTray, setSelectedTray] = useState(null);
  const [assignQuantity, setAssignQuantity] = useState("");
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverTray, setDragOverTray] = useState(null);

  const [reviewPopup, setReviewPopup] = useState({ open: false, item: null });
  const [reviewChecks, setReviewChecks] = useState({});
  const [otherIssueNotes, setOtherIssueNotes] = useState("");
  const [savedIssues, setSavedIssues] = useState([]);

  const [packModalItem, setPackModalItem] = useState(null);

  const isReInvoiced = bill?.billing_status === "RE_INVOICED";
  const isReviewInvoice = bill?.billing_status === "REVIEW" && Boolean(bill?.return_info);
  const hasIssues = savedIssues.length > 0;

  const getPath = (path) => {
    const isOpsUser = ["PICKER", "PACKER", "BILLER", "DELIVERY", "STORE"].includes(user?.role);
    return isOpsUser ? `/ops${path}` : path;
  };

  useEffect(() => { loadBillDetails(); }, [invoiceNo]);

  // SSE for RE_INVOICED notification
  useEffect(() => {
    if (!user) return;
    let es = null, reconnectTimeout = null, reconnectAttempts = 0, isUnmounted = false;
    const MAX_ATTEMPTS = 10, BASE_DELAY = 2000, MAX_DELAY = 30000;
    const connect = () => {
      if (isUnmounted) return;
      try {
        es = new EventSource(`${API_BASE_URL}/sales/sse/invoices/`);
        es.onopen = () => { reconnectAttempts = 0; };
        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (!data.invoice_no) return;
            if (data.billing_status === "RE_INVOICED" &&
              data.return_info?.returned_from_section === "PACKING" &&
              data.return_info?.returned_by_email === user?.email &&
              data.invoice_no === invoiceNo) {
              toast.success(`Bill #${data.invoice_no} has been corrected! Continue packing.`, { duration: 4000 });
              loadBillDetails();
            }
          } catch (e) { console.error("SSE parse error", e); }
        };
        es.onerror = () => {
          es.close(); es = null;
          if (isUnmounted) return;
          if (reconnectAttempts >= MAX_ATTEMPTS) return;
          const delay = Math.min(BASE_DELAY * Math.pow(2, reconnectAttempts), MAX_DELAY);
          reconnectAttempts++;
          reconnectTimeout = setTimeout(connect, delay);
        };
      } catch (err) { console.error("SSE create error", err); }
    };
    connect();
    return () => {
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (es) { es.close(); es = null; }
    };
  }, [user, invoiceNo]);

  const saveDraft = useMemo(() => debounce(async (currentTrays) => {
    if (!currentTrays.length) return;
    try {
      await saveTrayDraft({
        invoice_no: invoiceNo,
        boxes: currentTrays.map(t => ({
          box_id: t.trayCode,
          is_sealed: t.is_sealed,
          items: t.items.map(i => ({ item_id: i.itemId, quantity: i.quantity }))
        }))
      });
    } catch (err) { console.warn("Tray draft save failed", err); }
  }, 1500), [invoiceNo]);

  useEffect(() => { if (!loading) saveDraft(trays); }, [trays]);

  const loadBillDetails = async () => {
    try {
      setLoading(true);
      const res = await getTrayBill(invoiceNo);
      setBill(res.data?.data);
      if (res.data?.data?.boxes?.length > 0) {
        setTrays(res.data.data.boxes.map((box, idx) => ({
          id: box.id || Date.now() + idx,
          trayCode: box.tray_code || box.box_id,
          items: (box.items || []).map(item => ({
            itemId: item.invoice_item_id || item.id,
            itemName: item.item_name,
            itemCode: item.item_code,
            quantity: parseFloat(item.quantity),
          })),
          is_sealed: box.is_sealed,
        })));
      }
    } catch (err) {
      console.error("Failed to load bill details", err);
      toast.error("Failed to load bill details");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  // ── Tray Search ──────────────────────────────────────────
  const doSearchTrays = useMemo(() => debounce(async (q) => {
    if (!q.trim()) { setTraySearchResults([]); return; }
    setSearchingTrays(true);
    try {
      const res = await searchTrays(q, invoiceNo, 100);
      setTraySearchResults(res.data?.data || []);
    } catch { setTraySearchResults([]); }
    finally { setSearchingTrays(false); }
  }, 300), []);

  const handleTraySearchChange = (val) => {
    setTraySearchQ(val);
    doSearchTrays(val);
  };

  const handleSelectTray = (trayResult) => {
    if (trayResult.in_use) {
      toast.error(`Tray ${trayResult.tray_code} is in use by invoice #${trayResult.in_use_invoice}`);
      return;
    }
    const alreadyAdded = trays.some(t => t.trayCode === trayResult.tray_code);
    if (alreadyAdded) { toast.error(`Tray ${trayResult.tray_code} is already added`); return; }
    setTrays(prev => [...prev, {
      id: Date.now(),
      trayCode: trayResult.tray_code,
      items: [],
      is_sealed: false,
    }]);
    setTraySearchQ("");
    setTraySearchResults([]);
    setShowTraySearch(false);
    toast.success(`Tray ${trayResult.tray_code} added`);
  };

  const openTraySearch = () => {
    if (trays.length > 0) {
      toast.error("Only one tray is allowed per invoice");
      return;
    }
    setTraySearchQ("");
    setTraySearchResults([]);
    setShowTraySearch(true);
    setTimeout(() => traySearchRef.current?.focus(), 50);
  };

  // ── Review / Issue Popup ─────────────────────────────────
  const openReviewPopup = (item) => {
    if (isReviewInvoice) return;
    const existing = savedIssues.find(i => i.item === item.name);
    if (existing) {
      setReviewChecks({
        batchMatch: existing.issues.some(i => i.includes("Batch")),
        expiryCheck: existing.issues.some(i => i.includes("Expiry")),
        quantityCorrect: existing.issues.some(i => i.includes("Quantity")),
        packagingGood: existing.issues.some(i => i.includes("Damaged")),
        other: existing.issues.some(i => i.startsWith("Other:")),
      });
      setOtherIssueNotes(existing.issues.find(i => i.startsWith("Other:"))?.replace("Other: ", "") || "");
    } else {
      setReviewChecks({ batchMatch: false, expiryCheck: false, quantityCorrect: false, packagingGood: false, other: false });
      setOtherIssueNotes("");
    }
    setReviewPopup({ open: true, item });
  };
  const closeReviewPopup = () => { setReviewPopup({ open: false, item: null }); setReviewChecks({}); setOtherIssueNotes(""); };
  const handleSaveIssue = () => {
    if (!reviewPopup.item) return;
    const issues = [];
    if (reviewChecks.batchMatch) issues.push("Batch mismatch");
    if (reviewChecks.expiryCheck) issues.push("Expiry issue");
    if (reviewChecks.quantityCorrect) issues.push("Quantity incorrect");
    if (reviewChecks.packagingGood) issues.push("Damaged packaging");
    if (reviewChecks.other && otherIssueNotes.trim()) issues.push(`Other: ${otherIssueNotes.trim()}`);
    if (!issues.length) { toast.error("Select at least one issue"); return; }
    setSavedIssues(prev => {
      const idx = prev.findIndex(i => i.item === reviewPopup.item.name);
      if (idx !== -1) { const copy = [...prev]; copy[idx] = { item: reviewPopup.item.name, issues }; return copy; }
      return [...prev, { item: reviewPopup.item.name, issues }];
    });
    closeReviewPopup();
  };

  const handleSendInvoiceToReview = async () => {
    if (!bill || isReviewInvoice || !savedIssues.length) {
      toast.error(isReviewInvoice ? "Invoice already under review" : "No saved issues to send");
      return;
    }
    try {
      setLoading(true);
      const notes = savedIssues.map(i => `${i.item}: ${i.issues.join(", ")}`).join(" | ");
      await returnBillingInvoice({ invoice_no: bill.invoice_no, return_reason: notes, user_email: user.email });
      toast.success("Invoice sent to billing review");
      setSavedIssues([]);
      await loadBillDetails();
      toast.info("Invoice is under review. You'll be notified when corrected.", { duration: 5000 });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send to review");
    } finally { setLoading(false); }
  };

  // ── Item quantity helpers ────────────────────────────────
  const getTotalAssigned = (itemId) => {
    let total = 0;
    trays.forEach(t => t.items.forEach(a => { if (a.itemId === itemId) total += a.quantity; }));
    return total;
  };
  const getRemaining = (itemId) => {
    const item = bill?.items?.find(i => i.id === itemId);
    if (!item) return 0;
    return (item.quantity || item.qty || 0) - getTotalAssigned(itemId);
  };

  // ── Assign item ──────────────────────────────────────────
  const handleAssignItem = () => {
    if (!selectedItem || !selectedTray || !assignQuantity) { toast.error("Select an item, tray, and quantity"); return; }
    const quantity = parseFloat(assignQuantity);
    if (isNaN(quantity) || quantity <= 0) { toast.error("Invalid quantity"); return; }
    const remaining = getRemaining(selectedItem.id);
    if (quantity > remaining) { toast.error(`Only ${remaining} remaining`); return; }
    setTrays(prev => prev.map(t => {
      if (t.id !== selectedTray.id) return t;
      const idx = t.items.findIndex(i => i.itemId === selectedItem.id);
      if (idx >= 0) {
        const updated = [...t.items];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + quantity };
        return { ...t, items: updated };
      }
      return { ...t, items: [...t.items, { itemId: selectedItem.id, itemName: selectedItem.name || selectedItem.item_name, itemCode: selectedItem.code, quantity }] };
    }));
    toast.success(`Assigned ${quantity} to ${selectedTray.trayCode}`);
    setAssignQuantity("");
    setSelectedItem(null);
  };

  const handleRemoveItemFromTray = (trayId, itemId) => {
    setTrays(prev => prev.map(t => t.id === trayId ? { ...t, items: t.items.filter(i => i.itemId !== itemId) } : t));
    toast.success("Item removed");
  };

  const toggleItemSelection = (itemId) => setSelectedItems(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
  const toggleSelectAll = () => {
    const selectable = bill?.items?.filter(i => getRemaining(i.id) > 0) || [];
    if (selectedItems.length === selectable.length) setSelectedItems([]);
    else setSelectedItems(selectable.map(i => i.id));
  };

  const handleAssignSelectedItems = () => {
    if (!selectedItems.length) { toast.error("Select at least one item"); return; }
    if (!selectedTray) { toast.error("Select a tray"); return; }
    let count = 0;
    setTrays(prev => prev.map(t => {
      if (t.id !== selectedTray.id) return t;
      const newItems = [...t.items];
      selectedItems.forEach(itemId => {
        const item = bill?.items?.find(i => i.id === itemId);
        if (!item) return;
        const remaining = getRemaining(itemId);
        if (remaining <= 0) return;
        const idx = newItems.findIndex(i => i.itemId === itemId);
        if (idx >= 0) newItems[idx] = { ...newItems[idx], quantity: newItems[idx].quantity + remaining };
        else newItems.push({ itemId: item.id, itemName: item.name || item.item_name, itemCode: item.code || item.item_code, quantity: remaining });
        count++;
      });
      return { ...t, items: newItems };
    }));
    toast.success(`Assigned ${count} item(s) to ${selectedTray.trayCode}`);
    setSelectedItems([]);
    setSelectedTray(null);
  };

  const removeTray = (trayId) => {
    const t = trays.find(t => t.id === trayId);
    if (t?.items.length > 0 && !window.confirm("This tray has items. Remove anyway?")) return;
    setTrays(prev => prev.filter(t => t.id !== trayId));
  };

  // ── Drag & Drop ──────────────────────────────────────────
  const handleDragStart = (e, item) => { setDraggedItem(item); e.dataTransfer.effectAllowed = 'move'; e.currentTarget.style.opacity = '0.5'; };
  const handleDragEnd = (e) => { e.currentTarget.style.opacity = '1'; setDraggedItem(null); setDragOverTray(null); };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDragEnter = (e, trayId) => { e.preventDefault(); setDragOverTray(trayId); };
  const handleDragLeave = (e, trayId) => { e.preventDefault(); if (e.currentTarget === e.target) setDragOverTray(null); };
  const handleDrop = (e, tray) => {
    e.preventDefault(); setDragOverTray(null);
    if (!draggedItem) return;
    const remaining = getRemaining(draggedItem.id);
    if (remaining <= 0) { toast.error("All items already assigned"); setDraggedItem(null); return; }
    setTrays(prev => prev.map(t => {
      if (t.id !== tray.id) return t;
      const idx = t.items.findIndex(i => i.itemId === draggedItem.id);
      if (idx >= 0) { const u = [...t.items]; u[idx] = { ...u[idx], quantity: u[idx].quantity + remaining }; return { ...t, items: u }; }
      return { ...t, items: [...t.items, { itemId: draggedItem.id, itemName: draggedItem.name || draggedItem.item_name, itemCode: draggedItem.code || draggedItem.item_code, quantity: remaining }] };
    }));
    toast.success(`Assigned ${remaining} of ${draggedItem.name || draggedItem.item_name} to ${tray.trayCode}`);
    setDraggedItem(null);
  };

  // ── Validation & Complete ────────────────────────────────
  const validateTrays = () => {
    const errs = [];
    if (trays.length === 0) { errs.push("Create at least one tray"); return errs; }
    const empty = trays.filter(t => t.items.length === 0);
    if (empty.length > 0) errs.push(`${empty.length} tray(s) are empty`);
    bill?.items?.forEach(item => {
      const remaining = getRemaining(item.id);
      if (remaining > 0) errs.push(`"${item.name || item.item_name}" has ${remaining} units unassigned`);
      else if (remaining < 0) errs.push(`"${item.name || item.item_name}" is over-assigned by ${Math.abs(remaining)}`);
    });
    return errs;
  };

  const handleCompletePacking = async (mode) => {
    const validationErrors = validateTrays();
    if (validationErrors.length > 0) { setErrors(validationErrors); toast.error("Fix validation errors first"); return; }
    setErrors([]);
    try {
      setCompleting(mode); // 'self' or 'queue'
      await completeTrayPacking({
        invoice_no: invoiceNo,
        self_boxing: mode === 'self',
        boxes: trays.map(t => ({
          box_id: t.trayCode,
          items: t.items.map(i => ({ item_id: i.itemId, item_name: i.itemName, item_code: i.itemCode, quantity: i.quantity }))
        }))
      });
      if (mode === 'self') {
        toast.success("Tray packed! Opening boxing for this invoice...");
        navigate(getPath(`/packing/boxing/${invoiceNo}`));
      } else {
        toast.success("Tray packing done! Invoice moved to Boxing Queue.");
        navigate(getPath("/packing/boxing"));
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to complete tray packing";
      toast.error(msg);
    } finally { setCompleting(null); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-3 text-gray-600 text-sm">Loading bill details...</p>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-sm">Bill not found</p>
          <button onClick={() => navigate(-1)} className="mt-3 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-4 flex-shrink-0">
        <div>
          <h1 className="text-base font-bold text-gray-800 leading-tight">Tray Assignment</h1>
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-700">#{bill.invoice_no}  </span>
            {bill.customer?.name || bill.customer_name}
            {(bill.customer?.address1 || bill.temp_name) && (
              <span className="ml-1 text-gray-400">· {bill.customer?.address1 || bill.temp_name}</span>
            )}
          </p>
        </div>

        {isReInvoiced && bill.return_info && (
          <div className="flex items-center gap-1.5 bg-teal-50 border border-teal-300 rounded px-2 py-1 text-xs text-teal-800 font-medium">
            <svg className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Invoice Corrected — Continue packing
          </div>
        )}
        {isReviewInvoice && bill.return_info && (
          <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-300 rounded px-2 py-1 text-xs text-orange-800 font-medium">
            <svg className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Under Billing Review — {bill.return_info.return_reason}
          </div>
        )}
        {hasIssues && !isReviewInvoice && (
          <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-300 rounded px-2 py-1 text-xs text-orange-800 font-medium">
            <svg className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            {savedIssues.length} Issue{savedIssues.length > 1 ? "s" : ""} Reported
          </div>
        )}
        {errors.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5 bg-red-50 border border-red-300 rounded px-2 py-1 text-xs text-red-700 font-medium">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {errors[0]}{errors.length > 1 ? ` (+${errors.length - 1} more)` : ""}
          </div>
        )}

        <div className="ml-auto flex gap-2">
          {hasIssues && !isReviewInvoice && (
            <button onClick={handleSendInvoiceToReview} disabled={loading}
              className="px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-1">
              Send to Review ({savedIssues.length})
            </button>
          )}
          {/* Self Boxing — same user prints label immediately */}
          <button
            onClick={() => handleCompletePacking('self')}
            disabled={!!completing || (hasIssues && !isReInvoiced) || isReviewInvoice}
            className="px-4 py-1.5 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5">
            {completing === 'self'
              ? <><div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />Processing...</>
              : <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" /></svg>
                {hasIssues && !isReInvoiced ? "Resolve Issues First" : isReviewInvoice ? "Under Review" : "Self Boxing"}
              </>}
          </button>
          {/* Move to Boxing List — another user handles boxing */}
          <button
            onClick={() => handleCompletePacking('queue')}
            disabled={!!completing || (hasIssues && !isReInvoiced) || isReviewInvoice}
            className="px-4 py-1.5 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5">
            {completing === 'queue'
              ? <><div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />Processing...</>
              : <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                {hasIssues && !isReInvoiced ? "Resolve Issues First" : isReviewInvoice ? "Under Review" : "Move to Boxing List"}
              </>}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className={`flex flex-1 gap-2 p-2 overflow-hidden ${isReviewInvoice ? "opacity-50 pointer-events-none" : ""}`}>

        {/* LEFT: Items */}
        <div className="flex flex-col w-[42%] bg-white rounded-lg shadow overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-700">Items</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox"
                  checked={selectedItems.length > 0 && selectedItems.length === (bill.items?.filter(i => getRemaining(i.id) > 0) || []).length}
                  onChange={toggleSelectAll}
                  className="w-3.5 h-3.5 text-teal-600 rounded" />
                <span className="text-xs text-gray-600">
                  {selectedItems.length > 0 ? `${selectedItems.length} selected` : "Select all"}
                </span>
              </label>
            </div>
            <span className="text-xs font-normal text-gray-400">
              ({bill.items?.filter(i => getRemaining(i.id) > 0).length}/{bill.items?.length} remaining)
            </span>
          </div>

          {selectedItems.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 border-b border-teal-200 flex-shrink-0">
              <span className="text-xs font-semibold text-teal-800">{selectedItems.length} item{selectedItems.length > 1 ? "s" : ""}</span>
              <select value={selectedTray?.id || ""} onChange={e => setSelectedTray(trays.find(t => t.id === parseInt(e.target.value)))}
                className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 bg-white">
                <option value="">Select tray</option>
                {trays.filter(t => !completedTrays.has(t.id)).map(t => <option key={t.id} value={t.id}>{t.trayCode}</option>)}
              </select>
              <button onClick={handleAssignSelectedItems} disabled={!selectedTray}
                className="px-2 py-1 bg-teal-600 text-white text-xs font-semibold rounded hover:bg-teal-700 disabled:opacity-50">Assign</button>
              <button onClick={() => { setSelectedItems([]); setSelectedTray(null); }}
                className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded hover:bg-gray-300">Cancel</button>
            </div>
          )}

          {selectedItem && selectedItems.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 border-b border-teal-200 flex-shrink-0">
              <span className="text-xs font-semibold text-teal-800 truncate max-w-[120px]">{selectedItem.name || selectedItem.item_name}</span>
              <span className="text-xs text-gray-500">({formatQuantity(getRemaining(selectedItem.id), "pcs")} left)</span>
              <select value={selectedTray?.id || ""} onChange={e => setSelectedTray(trays.find(t => t.id === parseInt(e.target.value)))}
                className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 bg-white">
                <option value="">TRAY</option>
                {trays.filter(t => !completedTrays.has(t.id)).map(t => <option key={t.id} value={t.id}>{t.trayCode}</option>)}
              </select>
              <input type="number" value={assignQuantity}
                onChange={e => { const v = parseInt(e.target.value, 10); setAssignQuantity(isNaN(v) || v < 1 ? "" : String(v)); }}
                placeholder="Qty" min="1" step="1"
                className="w-16 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-teal-500" />
              <button onClick={handleAssignItem}
                className="px-2 py-1 bg-teal-600 text-white text-xs font-semibold rounded hover:bg-teal-700">Assign</button>
              <button onClick={() => { setSelectedItem(null); setSelectedTray(null); setAssignQuantity(""); }}
                className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded hover:bg-gray-300">Cancel</button>
            </div>
          )}

          <div className="overflow-y-auto flex-1 hide-scrollbar">
            {[...(bill.items || [])].sort((a, b) => {
              const aR = getRemaining(a.id), bR = getRemaining(b.id);
              if (aR === 0 && bR > 0) return 1;
              if (aR > 0 && bR === 0) return -1;
              return 0;
            }).map((item, idx) => {
              const totalRequired = item.quantity || item.qty || 0;
              const totalAssigned = getTotalAssigned(item.id);
              const remaining = totalRequired - totalAssigned;
              const isFullyAssigned = remaining === 0;
              const isOverAssigned = remaining < 0;
              const isFullyPacked = isFullyAssigned && trays.every(t => {
                const has = t.items.some(a => a.itemId === item.id && a.quantity > 0);
                return !has || completedTrays.has(t.id);
              });
              const isSelected = selectedItems.includes(item.id);
              const hasIssue = savedIssues.find(i => i.item === item.name);

              return (
                <div key={item.id}
                  draggable={!isFullyAssigned}
                  onDragStart={e => !isFullyAssigned && handleDragStart(e, item)}
                  onDragEnd={handleDragEnd}
                  onClick={() => !isReviewInvoice && setPackModalItem(item)}
                  className={`flex items-center gap-2 px-3 py-1.5 border-b border-gray-100 cursor-pointer transition-colors select-none
                    ${isSelected ? "bg-teal-50" : isFullyPacked ? "bg-green-50" : isOverAssigned ? "bg-red-50" : idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    hover:bg-teal-50`}>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate leading-tight ${isFullyPacked ? "text-gray-400 line-through" : "text-gray-800"}`}>
                      {item.name || item.item_name}
                    </p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0 gap-0.5 min-w-[64px]">
                    <span className={`text-xs font-bold ${isFullyPacked ? "text-green-600" : isOverAssigned ? "text-red-600" : "text-gray-700"}`}>
                      {formatQuantity(totalAssigned, "pcs")}/{formatQuantity(totalRequired, "pcs")}
                    </span>
                    <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${isOverAssigned ? "bg-red-500" : isFullyPacked ? "bg-green-500" : "bg-teal-500"}`}
                        style={{ width: `${Math.min((totalAssigned / totalRequired) * 100, 100)}%` }} />
                    </div>
                    {!isFullyAssigned && <span className="text-[10px] text-gray-400">{formatQuantity(remaining, "pcs")} left</span>}
                  </div>
                  {!isReviewInvoice && (
                    <button onClick={e => { e.stopPropagation(); openReviewPopup(item); }} title="Report Issue"
                      className={`p-1 rounded flex-shrink-0 transition-colors ${hasIssue ? "text-red-600 bg-red-50" : "text-red-300 hover:text-red-600 hover:bg-red-50"}`}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Trays */}
        <div className="flex flex-col flex-1 bg-white rounded-lg shadow overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 flex-shrink-0">
            <span className="text-sm font-bold text-gray-700">
              Tray
              {trays.length > 0 && <span className="ml-1.5 text-xs font-normal text-gray-400">(1)</span>}
            </span>
            {trays.length === 0 && (
              <button onClick={openTraySearch} disabled={isReviewInvoice}
                className="px-3 py-1 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50">
                + Add Tray
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1 p-2 space-y-2 hide-scrollbar">
            {trays.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <svg className="w-12 h-12 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                <p className="text-sm font-medium">No trays yet</p>
                <p className="text-xs mt-1">Click "+ Add Tray" to scan or type a tray code</p>
              </div>
            ) : (
              [...trays].sort((a, b) => {
                if (a.is_sealed === b.is_sealed) return 0;
                return a.is_sealed ? 1 : -1;
              }).map(tray => {
                const isSealed = completedTrays.has(tray.id);
                return (
                  <div key={tray.id}
                    onDragOver={handleDragOver}
                    onDragEnter={e => handleDragEnter(e, tray.id)}
                    onDragLeave={e => handleDragLeave(e, tray.id)}
                    onDrop={e => handleDrop(e, tray)}
                    className={`rounded-lg border-2 transition-all ${dragOverTray === tray.id ? "border-teal-400 bg-teal-50 border-dashed" : "border-gray-200 bg-white"}`}>

                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                        <span className="text-xs font-bold text-gray-700 font-mono">{tray.trayCode}</span>
                        <span className="text-[10px] text-gray-400">({tray.items.length} item{tray.items.length !== 1 ? "s" : ""})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => removeTray(tray.id)}
                          className="text-[10px] text-red-400 hover:text-red-600 font-medium px-1">Remove</button>
                      </div>
                    </div>

                    {tray.items.length === 0 ? (
                      <div className="flex items-center justify-center py-3 text-xs text-gray-400 italic">
                        Drop items here or assign from left panel
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {tray.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-3 py-1">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800 truncate leading-tight">{item.itemName}</p>
                            </div>
                            <span className="text-xs font-bold text-teal-700 flex-shrink-0">{formatQuantity(item.quantity, "pcs")}</span>
                            <button onClick={() => handleRemoveItemFromTray(tray.id, item.itemId)}
                              className="text-gray-300 hover:text-red-500 flex-shrink-0 transition-colors">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Tray Search Modal */}
      {showTraySearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-96">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                <h3 className="text-sm font-bold text-gray-900">Add Tray</h3>
              </div>
              <button onClick={() => setShowTraySearch(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-4 py-3">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  ref={traySearchRef}
                  type="text"
                  value={traySearchQ}
                  onChange={e => handleTraySearchChange(e.target.value)}
                  placeholder="Scan or type tray code..."
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  autoComplete="off"
                />
              </div>
              <div className="mt-2 min-h-[80px]">
                {searchingTrays ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full"></div>
                  </div>
                ) : traySearchResults.length > 0 ? (
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    {traySearchResults.map(t => (
                      <button key={t.tray_id} onClick={() => handleSelectTray(t)}
                        disabled={t.in_use}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                          t.in_use ? "bg-red-50 opacity-70 cursor-not-allowed" : "hover:bg-teal-50 cursor-pointer"
                        }`}>
                        <svg className={`w-4 h-4 flex-shrink-0 ${t.in_use ? "text-red-400" : "text-teal-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                        <span className={`text-sm font-semibold ${t.in_use ? "text-gray-400" : "text-gray-800"}`}>{t.tray_code}</span>
                        {t.in_use ? (
                          <span className="ml-auto text-[10px] text-red-500 font-semibold">In use · #{t.in_use_invoice}</span>
                        ) : trays.some(tr => tr.trayCode === t.tray_code) ? (
                          <span className="ml-auto text-[10px] text-orange-500 font-medium">Already added</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : traySearchQ.trim() ? (
                  <p className="text-center text-xs text-gray-400 py-6">No active trays found for "{traySearchQ}"</p>
                ) : (
                  <p className="text-center text-xs text-gray-400 py-6">Type to search trays from master</p>
                )}
              </div>
            </div>
            <div className="px-4 pb-3">
              <button onClick={() => setShowTraySearch(false)}
                className="w-full py-2 text-xs font-medium text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Review Issue Popup */}
      {reviewPopup.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-80">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <h3 className="text-sm font-bold text-gray-900">Report Issue</h3>
              </div>
              <button onClick={closeReviewPopup} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-4 py-3 space-y-3">
              <div className="bg-gray-50 rounded px-3 py-1.5">
                <p className="text-xs font-semibold text-gray-800">{reviewPopup.item?.name || reviewPopup.item?.item_name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{reviewPopup.item?.code || reviewPopup.item?.item_code}</p>
              </div>
              <div className="space-y-1.5">
                {["batchMatch", "expiryCheck", "quantityCorrect", "packagingGood", "other"].map(key => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={reviewChecks[key]}
                      onChange={e => setReviewChecks({ ...reviewChecks, [key]: e.target.checked })}
                      className="w-3.5 h-3.5 text-orange-600 rounded" />
                    <span className="text-xs text-gray-700">
                      {key === "batchMatch" ? "Batch mismatch" : key === "expiryCheck" ? "Expiry issue" : key === "quantityCorrect" ? "Quantity incorrect" : key === "packagingGood" ? "Damaged packaging" : "Other"}
                    </span>
                  </label>
                ))}
                {reviewChecks.other && (
                  <textarea value={otherIssueNotes} onChange={e => setOtherIssueNotes(e.target.value)}
                    placeholder="Describe the issue..." rows={2}
                    className="w-full px-2.5 py-1.5 border rounded text-xs resize-none focus:ring-1 focus:ring-orange-400" />
                )}
              </div>
            </div>
            <div className="flex gap-2 px-4 pb-3">
              <button onClick={closeReviewPopup} className="flex-1 py-1.5 text-xs font-medium text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveIssue} className="flex-1 py-1.5 text-xs font-semibold text-white bg-orange-500 rounded-lg hover:bg-orange-600">Save Issue</button>
            </div>
          </div>
        </div>
      )}

      {/* Item detail modal */}
      <PackInvoiceModal
        isOpen={!!packModalItem}
        onClose={() => setPackModalItem(null)}
        invoiceNumber={invoiceNo}
        customerName={bill?.customer?.name || bill?.customer_name}
        items={packModalItem ? [packModalItem] : []}
        boxes={trays.filter(t => !completedTrays.has(t.id)).map(t => ({ ...t, boxId: t.trayCode }))}
        onConfirm={(item, trayId, quantity) => {
          const tray = trays.find(t => t.id === trayId);
          if (!tray) return;
          const qty = parseFloat(quantity);
          if (isNaN(qty) || qty <= 0) { toast.error("Invalid quantity"); return; }
          const remaining = getRemaining(item.id);
          if (qty > remaining) { toast.error(`Only ${remaining} remaining`); return; }
          setTrays(prev => prev.map(t => {
            if (t.id !== trayId) return t;
            const idx = t.items.findIndex(i => i.itemId === item.id);
            if (idx >= 0) {
              const updated = [...t.items];
              updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + qty };
              return { ...t, items: updated };
            }
            return { ...t, items: [...t.items, { itemId: item.id, itemName: item.name || item.item_name, itemCode: item.code || item.item_code, quantity: qty }] };
          }));
          toast.success(`Assigned ${qty} × ${item.name || item.item_name} to ${tray.trayCode}`);
          setPackModalItem(null);
        }}
      />
    </div>
  );
}
