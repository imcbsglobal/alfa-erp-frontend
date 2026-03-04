import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";
import { formatQuantity } from "../../../utils/formatters";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const transliterateToMalayalam = async (text) => {
  try {
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ml&dt=t&q=${encodeURIComponent(text)}`
    );
    const data = await res.json();
    if (data?.[0]) {
      return data[0].map(segment => segment?.[0] || "").join("").trim();
    }
    return "";
  } catch {
    return "";
  }
};

export default function BoxAssignmentPage() {
  const { invoiceNo } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [bill, setBill] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [nextBoxId, setNextBoxId] = useState(1);
  const [completing, setCompleting] = useState(false);
  const [errors, setErrors] = useState([]);
  const [printedBoxes, setPrintedBoxes] = useState(new Set());

  const completedBoxes = useMemo(() => {
    return new Set(boxes.filter(b => b.is_sealed).map(b => b.id));
  }, [boxes]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedBox, setSelectedBox] = useState(null);
  const [assignQuantity, setAssignQuantity] = useState("");
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverBox, setDragOverBox] = useState(null);

  const [reviewPopup, setReviewPopup] = useState({ open: false, item: null });
  const [reviewChecks, setReviewChecks] = useState({});
  const [otherIssueNotes, setOtherIssueNotes] = useState("");
  const [savedIssues, setSavedIssues] = useState([]);

  const isReInvoiced = bill?.billing_status === "RE_INVOICED";
  const isReviewInvoice = bill?.billing_status === "REVIEW" && Boolean(bill?.return_info);
  const hasIssues = savedIssues.length > 0;

  // Helper function to get role-aware paths
  const getPath = (path) => {
    const isOpsUser = ["PICKER", "PACKER", "BILLER", "DELIVERY", "STORE"].includes(user?.role);
    return isOpsUser ? `/ops${path}` : path;
  };

  useEffect(() => { loadBillDetails(); }, [invoiceNo]);

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
            if (data.billing_status === "RE_INVOICED" && data.return_info?.returned_from_section === "PACKING" && data.return_info?.returned_by_email === user?.email && data.invoice_no === invoiceNo) {
              toast.success(`Bill #${data.invoice_no} has been corrected! Continue packing.`, { duration: 4000, icon: '\u2713' });
              loadBillDetails();
            }
          } catch (e) { console.error("SSE: Bad data", e); }
        };
        es.onerror = () => {
          es.close(); es = null;
          if (isUnmounted) return;
          if (reconnectAttempts >= MAX_ATTEMPTS) { console.warn("SSE: Max reconnect attempts reached, stopping."); return; }
          const delay = Math.min(BASE_DELAY * Math.pow(2, reconnectAttempts), MAX_DELAY);
          reconnectAttempts++;
          reconnectTimeout = setTimeout(connect, delay);
        };
      } catch (err) { console.error("SSE: Failed to create EventSource", err); }
    };
    connect();
    return () => {
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (es) { es.close(); es = null; }
    };
  }, [user, invoiceNo]);

  const saveDraft = useMemo(() => debounce(async (currentBoxes) => {
    if (!currentBoxes.length) return;
    try {
      await api.post("/sales/packing/save-draft/", {
        invoice_no: invoiceNo,
        boxes: currentBoxes.map(box => ({
          box_id: box.boxId,
          is_sealed: box.is_sealed,
          items: box.items.map(item => ({ item_id: item.itemId, quantity: item.quantity }))
        }))
      });
    } catch (err) { console.warn("Draft save failed", err); }
  }, 1500), [invoiceNo]);

  useEffect(() => { if (!loading) saveDraft(boxes); }, [boxes]);

  const loadBillDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/sales/packing/bill/${invoiceNo}/`);
      setBill(res.data?.data);
      if (res.data?.data?.boxes && res.data.data.boxes.length > 0) {
        setBoxes(res.data.data.boxes.map((box, idx) => ({
          id: box.id || Date.now() + idx,
          boxId: box.box_id,
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

  const openReviewPopup = (item) => {
    if (isReviewInvoice) return;
    const existing = savedIssues.find((i) => i.item === item.name);
    if (existing) {
      setReviewChecks({
        batchMatch: existing.issues.some((i) => i.includes("Batch")),
        expiryCheck: existing.issues.some((i) => i.includes("Expiry")),
        quantityCorrect: existing.issues.some((i) => i.includes("Quantity")),
        packagingGood: existing.issues.some((i) => i.includes("Damaged")),
        other: existing.issues.some((i) => i.startsWith("Other:")),
      });
      setOtherIssueNotes(existing.issues.find((i) => i.startsWith("Other:"))?.replace("Other: ", "") || "");
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
    setSavedIssues((prev) => {
      const idx = prev.findIndex((i) => i.item === reviewPopup.item.name);
      if (idx !== -1) { const copy = [...prev]; copy[idx] = { item: reviewPopup.item.name, issues }; return copy; }
      return [...prev, { item: reviewPopup.item.name, issues }];
    });
    closeReviewPopup();
  };

  const handleSendInvoiceToReview = async () => {
    if (!bill || isReviewInvoice || !savedIssues.length) { toast.error(isReviewInvoice ? "Invoice already sent for review" : "No saved issues to send"); return; }
    try {
      setLoading(true);
      const notes = savedIssues.map((i) => `${i.item}: ${i.issues.join(", ")}`).join(" | ");
      await api.post("/sales/billing/return/", { invoice_no: bill.invoice_no, return_reason: notes, user_email: user.email });
      toast.success("Invoice sent to billing review");
      setSavedIssues([]);
      await loadBillDetails();
      toast.info("This invoice is now under review. You'll be notified when it's corrected.", { duration: 5000, icon: 'ℹ' });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send invoice to review");
    } finally { setLoading(false); }
  };

  const generateBoxId = () => {
    const seriesMatch = invoiceNo.toString().match(/^([A-Za-z]+-)/);
    const series = seriesMatch ? seriesMatch[1] : '';
    const numericPart = invoiceNo.toString().replace(/^[A-Za-z]+-/, '');
    const billPrefix = numericPart.slice(-4).padStart(4, '0');
    const boxNum = nextBoxId.toString().padStart(3, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `BOX-${series}${billPrefix}-${boxNum}-${timestamp}`;
  };

  const addNewBox = () => {
    if (boxes.length > 0 && !boxes[boxes.length - 1].is_sealed) { toast.error("Please complete the current box before adding a new one"); return; }
    setBoxes(prev => [...prev, { id: Date.now(), boxId: generateBoxId(), items: [], is_sealed: false }]);
    setNextBoxId(prev => prev + 1);
  };

  const removeBox = (boxId) => {
    if (boxes.length === 1) { toast.error("You must have at least one box"); return; }
    const box = boxes.find(b => b.id === boxId);
    if (box.is_sealed) { toast.error("Cannot remove a completed box"); return; }
    if (box.items.length > 0 && !window.confirm("This box contains items. Are you sure you want to remove it? Items will become unassigned.")) return;
    setBoxes(prev => prev.filter(b => b.id !== boxId));
  };

  const handleCompleteBox = (boxId) => {
    const box = boxes.find(b => b.id === boxId);
    if (!box || box.items.length === 0) { toast.error("Cannot complete an empty box. Please assign items first."); return; }
    setBoxes(prev => prev.map(b => b.id === boxId ? { ...b, is_sealed: true } : b));
    toast.success("Box completed!");
  };

  const handleCompleteAndPrint = async (boxId) => {
    const box = boxes.find(b => b.id === boxId);
    if (!box || box.items.length === 0) { toast.error("Cannot complete an empty box. Please assign items first."); return; }
    setBoxes(prev => prev.map(b => b.id === boxId ? { ...b, is_sealed: true } : b));
    await handlePrintBoxLabel(boxId);
  };

  // UPDATED: label layout matches reference image
  // Layout: [Customer info (top) + QR bottom-right] | [Icons column far right]
  // Footer: Alfa Agencies logo + address
  const handlePrintBoxLabel = async (boxId) => {
    const box = boxes.find(b => b.id === boxId);
    if (!box) return;

    setPrintedBoxes(prev => new Set([...prev, boxId]));

    const customerAddr1   = bill?.customer?.address1 || bill?.delivery_address || '';
    const hasAddress      = !!(customerAddr1 || bill?.customer?.address2);
    const customerName    = hasAddress
      ? (bill?.customer?.name || bill?.customer_name || '')
      : (bill?.temp_name || bill?.customer?.name || bill?.customer_name || '');
    const customerArea    = bill?.customer?.area     || '';
    const customerAddr2   = bill?.customer?.address2 || '';
    const customerPincode = bill?.customer?.pincode  || '';
    const customerPhone1  = bill?.customer?.phone1   || bill?.customer_phone || '';
    const customerPhone2  = bill?.customer?.phone2   || '';
    const customerEmail   = bill?.customer?.email    || '';

    let customerNameML = '';
    if (customerName) {
      try { customerNameML = await transliterateToMalayalam(customerName); } catch { customerNameML = ''; }
    }

    const boxUrl = `${window.location.origin}/box/${box.boxId}`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Box Label - ${box.boxId}</title>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Malayalam:wght@400;600&display=swap" rel="stylesheet">
          <style>
            @page { margin: 0; size: 15cm 10cm; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              width: 15cm;
              height: 10cm;
              font-family: Arial, sans-serif;
              background: white;
              color: black;
              overflow: hidden;
            }

            .label-container {
              width: 15cm;
              height: 10cm;
              border: 2px solid #000;
              border-radius: 5px;
              display: flex;
              flex-direction: column;
              overflow: hidden;
              background: white;
            }

            /* Main content  */
            .main-content {
              display: flex;
              flex: 1;
              overflow: hidden;
            }

            /* Customer info fills top; QR anchored bottom-right of this section */
            .customer-qr-section {
              flex: 1;
              display: flex;
              flex-direction: column;
              border-right: 1.5px solid #000;
              overflow: hidden;
            }

            .customer-info {
              flex: 1;
              padding: 10px 14px 4px 14px;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              gap: 1px;
            }
            .to-label {
              font-size: 8px;
              font-weight: bold;
              text-transform: uppercase;
              color: #000000;
              letter-spacing: 1px;
              margin-bottom: 4px;
            }
            .customer-name {
              font-weight: bold;
              font-size: 20px;
              text-transform: uppercase;
              color: #000000;
              line-height: 1.2;
              word-wrap: break-word;
            }
            .customer-name-ml {
              font-family: 'Noto Sans Malayalam', Arial, sans-serif;
              font-size: 18px;
              font-weight: bold;
              color: #000000;
              line-height: 1.4;
              margin-top: 2px;
              word-wrap: break-word;
            }
            .customer-area {
              font-size: 13px;
              color: #000000;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              margin-top: 4px;
              word-wrap: break-word;
            }
            .customer-addr {
              font-size: 13px;
              color: #000000;
              line-height: 1.5;
              word-wrap: break-word;
            }
            .customer-contact {
              font-size: 13px;
              font-weight: bold;
              color: #000000;
              margin-top: 4px;
              word-wrap: break-word;
            }
            .customer-email {
              font-size: 12px;
              font-weight: bold;
              color: #000000;
              margin-top: 1px;
              word-wrap: break-word;
            }

            /* QR: bottom-right of customer section */
            .qr-bottom-row {
              display: flex;
              justify-content: flex-end;
              padding: 0 10px 8px 10px;
              flex-shrink: 0;
            }
            .qr-block {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 3px;
            }
            .inv-no-label {
              font-size: 12px;
              font-weight: bold;
              color: #000000;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              
            }
            .qr-container {
              border: 1.5px solid #000000;
              padding: 3px;
              background: white;
            }
            #qrcode { width: 95px; height: 95px; }
            #qrcode img, #qrcode canvas {
              width: 95px !important;
              height: 95px !important;
            }
            .box-id-label {
              font-size: 8px;
              font-weight: bold;
              color: #000000;
              text-align: center;
              word-break: break-all;
              max-width: 105px;
            }

            /* Icons: far right narrow column */
            .icons-column {
              width: 1.5cm;
              flex-shrink: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-evenly;
              padding: 8px 3px;
              background: white;
            }
            .icon-item {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 4px;
              width: 100%;
            }
            .icon-label {
              font-size: 7px;
              font-weight: bold;
              text-transform: uppercase;
              color: #000000;
              letter-spacing: 0.2px;
              text-align: center;
              white-space: nowrap;
            }
            .this-way-up-box {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 2px;
              width: 100%;
            }
            .this-way-up-arrows { display: flex; gap: 4px; }
            .arrow-svg { width: 12px; height: 16px; }

            .icon-emoji {
              font-size: 22px;
              filter: grayscale(100%) brightness(0);
              line-height: 1;
            }

            /* Footer */
            .company-footer {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 6px 10px;
              border-top: 1.5px solid #000;
              background: white;
              flex-shrink: 0;
            }
            .company-logo {
              height: 50px;
              width: auto;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: crisp-edges;
            }
            .company-info { display: flex; flex-direction: column; gap: 2px; }
            .company-address { font-size: 12px; color: #000; font-weight: 500; }

            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="label-container">

            <div class="main-content">

              <!-- Customer info + QR bottom-right -->
              <div class="customer-qr-section">
                <div class="customer-info">
                  <p class="to-label">Ship To</p>
                  ${customerName   ? `<p class="customer-name">${customerName}</p>` : ''}
                  ${customerNameML ? `<p class="customer-name-ml">${customerNameML}</p>` : ''}
                  ${(customerArea || customerAddr1) ? `<p class="customer-area">${[customerArea, customerAddr1].filter(Boolean).join(', ')}</p>` : ''}
                  ${(customerAddr2 || customerPincode) ? `<p class="customer-addr">${[customerAddr2, customerPincode].filter(Boolean).join(', ')}</p>` : ''}
                  ${(customerPhone1 || customerPhone2) ? `<p class="customer-contact">${[customerPhone1, customerPhone2].filter(Boolean).join(' &nbsp;|&nbsp; ')}</p>` : ''}
                  ${customerEmail  ? `<p class="customer-email">${customerEmail}</p>` : ''}
                </div>
                <div class="qr-bottom-row">
                  <div class="qr-block">
                    <p class="inv-no-label">INV: ${invoiceNo}</p>
                    <div class="qr-container">
                      <div id="qrcode"></div>
                    </div>
                    <p class="box-id-label">${box.boxId}</p>
                  </div>
                </div>
              </div>

              <!-- Icons far right -->
              <div class="icons-column">
                <div class="this-way-up-box">
                  <div class="this-way-up-arrows">
                    <svg class="arrow-svg" viewBox="0 0 8 11" fill="black"><polygon points="4,0 8,5 5.5,5 5.5,11 2.5,11 2.5,5 0,5"/></svg>
                    <svg class="arrow-svg" viewBox="0 0 8 11" fill="black"><polygon points="4,0 8,5 5.5,5 5.5,11 2.5,11 2.5,5 0,5"/></svg>
                  </div>
                  <span class="icon-label">This Way Up</span>
                </div>
                <div class="icon-item">
                  <span class="icon-emoji">❄️</span>
                  <span class="icon-label">Keep Cold</span>
                </div>
                <div class="icon-item">
                  <span class="icon-emoji">🍷</span>
                  <span class="icon-label">Fragile</span>
                </div>
                <div class="icon-item">
                  <span class="icon-emoji">☂️</span>
                  <span class="icon-label">Keep Dry</span>
                </div>
              </div>

            </div>

            <!-- Footer -->
            <div class="company-footer">
              <img src="/black.png" alt="Alfa Agencies" class="company-logo" />
              <div class="company-info">
                <span class="company-address">18/1143 A7, Ground Floor, Meyon Building, Jail Road, Calicut - 673 004</span>
                <span class="company-address">Ph: (Off) 0495 2300644, 2701899, 2306728</span>
                <span class="company-address">Ph: (Mob) 9387724365, 7909220300, 7909220400</span>
              </div>
            </div>

          </div>

          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
          <script>
            window.onload = function() {
              new QRCode(document.getElementById('qrcode'), {
                text: '${boxUrl}',
                width: 95,
                height: 95,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
              });
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  var iframes = window.parent.document.querySelectorAll('iframe');
                  iframes.forEach(function(f) { f.remove(); });
                }, 1000);
              }, 700);
            };
          <\/script>
        </body>
      </html>
    `);
    iframeDoc.close();
    toast.success("Label sent to printer!");
  };

  const getTotalAssignedForItem = (itemId) => {
    let total = 0;
    boxes.forEach(box => { box.items.forEach(a => { if (a.itemId === itemId) total += a.quantity; }); });
    return total;
  };

  const getRemainingQuantityForItem = (itemId) => {
    const item = bill?.items?.find(i => i.id === itemId);
    if (!item) return 0;
    return (item.quantity || item.qty || 0) - getTotalAssignedForItem(itemId);
  };

  const handleAssignItem = () => {
    if (!selectedItem || !selectedBox || !assignQuantity) { toast.error("Please select an item, box, and enter quantity"); return; }
    const quantity = parseFloat(assignQuantity);
    if (isNaN(quantity) || quantity <= 0) { toast.error("Please enter a valid quantity"); return; }
    const remaining = getRemainingQuantityForItem(selectedItem.id);
    if (quantity > remaining) { toast.error(`Cannot assign ${quantity}. Only ${remaining} remaining.`); return; }
    setBoxes(prev => prev.map(box => {
      if (box.id !== selectedBox.id) return box;
      const existingIdx = box.items.findIndex(i => i.itemId === selectedItem.id);
      if (existingIdx >= 0) {
        const updatedItems = [...box.items];
        updatedItems[existingIdx].quantity += quantity;
        return { ...box, items: updatedItems };
      }
      return { ...box, items: [...box.items, { itemId: selectedItem.id, itemName: selectedItem.name || selectedItem.item_name, itemCode: selectedItem.code, quantity }] };
    }));
    toast.success(`Assigned ${quantity} to ${selectedBox.boxId}`);
    setAssignQuantity("");
    setSelectedItem(null);
  };

  const handleRemoveItemFromBox = (boxId, itemId) => {
    setBoxes(prev => prev.map(box => box.id === boxId ? { ...box, items: box.items.filter(i => i.itemId !== itemId) } : box));
    toast.success("Item removed from box");
  };

  const toggleItemSelection = (itemId) => setSelectedItems(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);

  const toggleSelectAll = () => {
    const selectableItems = bill?.items?.filter(item => getRemainingQuantityForItem(item.id) > 0) || [];
    if (selectedItems.length === selectableItems.length) setSelectedItems([]);
    else setSelectedItems(selectableItems.map(item => item.id));
  };

  const handleAssignSelectedItems = () => {
    if (selectedItems.length === 0) { toast.error("Please select at least one item"); return; }
    if (!selectedBox) { toast.error("Please select a box"); return; }
    let assignedCount = 0;
    setBoxes(prev => prev.map(box => {
      if (box.id !== selectedBox.id) return box;
      const newItems = [...box.items];
      selectedItems.forEach(itemId => {
        const item = bill?.items?.find(i => i.id === itemId);
        if (!item) return;
        const remaining = getRemainingQuantityForItem(itemId);
        if (remaining <= 0) return;
        const existingIdx = newItems.findIndex(i => i.itemId === itemId);
        if (existingIdx >= 0) newItems[existingIdx].quantity += remaining;
        else newItems.push({ itemId: item.id, itemName: item.name || item.item_name, itemCode: item.code || item.item_code, quantity: remaining });
        assignedCount++;
      });
      return { ...box, items: newItems };
    }));
    toast.success(`Assigned ${assignedCount} item(s) to ${selectedBox.boxId}`);
    setSelectedItems([]);
    setSelectedBox(null);
  };

  const handleDragStart = (e, item) => { setDraggedItem(item); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/html', e.currentTarget); e.currentTarget.style.opacity = '0.5'; };
  const handleDragEnd = (e) => { e.currentTarget.style.opacity = '1'; setDraggedItem(null); setDragOverBox(null); };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDragEnter = (e, boxId) => { e.preventDefault(); setDragOverBox(boxId); };
  const handleDragLeave = (e, boxId) => { e.preventDefault(); if (e.currentTarget === e.target) setDragOverBox(null); };

  const handleDrop = (e, box) => {
    e.preventDefault(); setDragOverBox(null);
    if (!draggedItem) return;
    if (completedBoxes.has(box.id)) { toast.error("Cannot modify a completed box"); setDraggedItem(null); return; }
    const remaining = getRemainingQuantityForItem(draggedItem.id);
    if (remaining <= 0) { toast.error("All items already assigned"); setDraggedItem(null); return; }
    setBoxes(prev => prev.map(b => {
      if (b.id !== box.id) return b;
      const existingIdx = b.items.findIndex(i => i.itemId === draggedItem.id);
      if (existingIdx >= 0) { const u = [...b.items]; u[existingIdx].quantity += remaining; return { ...b, items: u }; }
      return { ...b, items: [...b.items, { itemId: draggedItem.id, itemName: draggedItem.name || draggedItem.item_name, itemCode: draggedItem.code || draggedItem.item_code, quantity: remaining }] };
    }));
    toast.success(`Assigned ${remaining} ${draggedItem.name || draggedItem.item_name} to ${box.boxId}`);
    setDraggedItem(null);
  };

  const validateBoxes = () => {
    const validationErrors = [];
    if (boxes.length === 0) { validationErrors.push("You must create at least one box"); return validationErrors; }
    const incompletBoxes = boxes.filter(box => !completedBoxes.has(box.id));
    if (incompletBoxes.length > 0) validationErrors.push(`${incompletBoxes.length} box(es) not completed. Complete all boxes before finishing.`);
    const emptyBoxes = boxes.filter(box => box.items.length === 0);
    if (emptyBoxes.length > 0) validationErrors.push(`${emptyBoxes.length} box(es) are empty. Please remove empty boxes or assign items to them.`);
    bill?.items?.forEach(item => {
      const remaining = getRemainingQuantityForItem(item.id);
      if (remaining > 0) validationErrors.push(`Item "${item.name || item.item_name}" has ${remaining} units unassigned`);
      else if (remaining < 0) validationErrors.push(`Item "${item.name || item.item_name}" is over-assigned by ${Math.abs(remaining)} units`);
    });
    return validationErrors;
  };

  const handleCompletePacking = async () => {
    const validationErrors = validateBoxes();
    if (validationErrors.length > 0) { setErrors(validationErrors); toast.error("Please fix validation errors before completing"); return; }
    setErrors([]);
    try {
      setCompleting(true);
      await api.post("/sales/packing/complete-packing/", {
        invoice_no: invoiceNo,
        boxes: boxes.map(box => ({ box_id: box.boxId, items: box.items.map(item => ({ item_id: item.itemId, item_name: item.itemName, item_code: item.itemCode, quantity: item.quantity })) }))
      });
      toast.success("Packing completed successfully!");
      navigate(getPath("/packing/invoices"));
    } catch (err) {
      console.error("Complete packing error:", err);
      const errorData = err.response?.data;
      if (errorData?.errors) {
        toast.error(`Validation failed: ${Object.entries(errorData.errors).map(([f, m]) => `${f}: ${Array.isArray(m) ? m.join(', ') : m}`).join(' | ')}`);
      } else if (errorData?.message) {
        toast.error(errorData.message.includes('duplicate key') ? "Box ID already exists. Please refresh the page and try again." : errorData.message);
      } else {
        toast.error("Failed to complete packing");
      }
    } finally { setCompleting(false); }
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
      <div className="bg-white border-b px-4 py-2 flex items-center gap-4 flex-shrink-0">
        <div>
          <h1 className="text-base font-bold text-gray-800 leading-tight">Box Assignment</h1>
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-700">#{bill.invoice_no}  </span>
            {bill.customer?.name || bill.customer_name}
          </p>
        </div>

        {/* Banners inline */}
        {isReInvoiced && bill.return_info && (
          <div className="flex items-center gap-1.5 bg-teal-50 border border-teal-300 rounded px-2 py-1 text-xs text-teal-800 font-medium">
            <svg className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Invoice Corrected Continue packing
          </div>
        )}
        {isReviewInvoice && bill.return_info && (
          <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-300 rounded px-2 py-1 text-xs text-orange-800 font-medium">
            <svg className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Under Billing Review - {bill.return_info.return_reason}
          </div>
        )}
        {hasIssues && !isReviewInvoice && (
          <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-300 rounded px-2 py-1 text-xs text-orange-800 font-medium">
            <svg className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            {savedIssues.length} Issue{savedIssues.length > 1 ? 's' : ''} Reported
          </div>
        )}

        {/* Validation errors pill */}
        {errors.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5 bg-red-50 border border-red-300 rounded px-2 py-1 text-xs text-red-700 font-medium">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {errors[0]}{errors.length > 1 ? ` (+${errors.length - 1} more)` : ''}
          </div>
        )}

        {/* Complete packing button - always visible */}
        <div className="ml-auto flex gap-2">
          {hasIssues && !isReviewInvoice && (
            <button onClick={handleSendInvoiceToReview} disabled={loading}
              className="px-3 py-1.5 bg-orange-500 text-white text-xs font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Send to Review ({savedIssues.length})
            </button>
          )}
          <button onClick={handleCompletePacking} disabled={completing || (hasIssues && !isReInvoiced) || isReviewInvoice}
            className="px-4 py-1.5 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5">
            {completing
              ? <><div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />Completing...</>
              : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {hasIssues && !isReInvoiced ? 'Resolve Issues First' : isReviewInvoice ? 'Under Review' : 'Mark as PACKED'}</>}
          </button>
        </div>
      </div>

      {/* Main 2-col body */}
      <div className={`flex flex-1 gap-2 p-2 overflow-hidden ${isReviewInvoice ? 'opacity-50 pointer-events-none' : ''}`}>

        {/*LEFT: Items */}
        <div className="flex flex-col w-[42%] bg-white rounded-lg shadow overflow-hidden">
          {/* Items header */}
          <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-700">Items</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox"
                  checked={selectedItems.length > 0 && selectedItems.length === bill.items?.filter(i => getRemainingQuantityForItem(i.id) > 0).length}
                  onChange={toggleSelectAll}
                  className="w-3.5 h-3.5 text-teal-600 rounded" />
                <span className="text-xs text-gray-600">
                  {selectedItems.length > 0 ? `${selectedItems.length} selected` : 'Select all'}
                </span>
              </label>
            </div>
            <span className="text-xs font-normal text-gray-400">
              ({bill.items?.filter(i => getRemainingQuantityForItem(i.id) > 0).length}/{bill.items?.length} remaining)
            </span>
          </div>

          {/* Assign bar for selected items */}
          {selectedItems.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 border-b border-teal-200 flex-shrink-0">
              <span className="text-xs font-semibold text-teal-800">{selectedItems.length} item{selectedItems.length > 1 ? 's' : ''}</span>
              <select value={selectedBox?.id || ""} onChange={e => setSelectedBox(boxes.find(b => b.id === parseInt(e.target.value)))}
                className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 bg-white">
                <option value="">Select box</option>
                {boxes.filter(b => !completedBoxes.has(b.id)).map(b => <option key={b.id} value={b.id}>{b.boxId}</option>)}
              </select>
              <button onClick={handleAssignSelectedItems} disabled={!selectedBox}
                className="px-2 py-1 bg-teal-600 text-white text-xs font-semibold rounded hover:bg-teal-700 disabled:opacity-50">Assign</button>
              <button onClick={() => { setSelectedItems([]); setSelectedBox(null); }}
                className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded hover:bg-gray-300">Cancel</button>
            </div>
          )}

          {/* Single-item assign bar */}
          {selectedItem && selectedItems.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 border-b border-teal-200 flex-shrink-0">
              <span className="text-xs font-semibold text-teal-800 truncate max-w-[120px]">{selectedItem.name || selectedItem.item_name}</span>
              <span className="text-xs text-gray-500">({formatQuantity(getRemainingQuantityForItem(selectedItem.id), 'pcs')} left)</span>
              <select value={selectedBox?.id || ""} onChange={e => setSelectedBox(boxes.find(b => b.id === parseInt(e.target.value)))}
                className="flex-1 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 bg-white">
                <option value="">BOX</option>
                {boxes.filter(b => !completedBoxes.has(b.id)).map(b => <option key={b.id} value={b.id}>{b.boxId}</option>)}
              </select>
              <input type="number" value={assignQuantity} onChange={e => { const v = parseInt(e.target.value, 10); setAssignQuantity(isNaN(v) || v < 1 ? '' : String(v)); }}
                placeholder="Qty" min="1" step="1"
                className="w-16 text-xs px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-teal-500" />
              <button onClick={handleAssignItem}
                className="px-2 py-1 bg-teal-600 text-white text-xs font-semibold rounded hover:bg-teal-700">Assign</button>
              <button onClick={() => { setSelectedItem(null); setSelectedBox(null); setAssignQuantity(""); }}
                className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded hover:bg-gray-300">Cancel</button>
            </div>
          )}

          {/* Items list compact rows */}
          <div className="overflow-y-auto flex-1 hide-scrollbar">
            {[...(bill.items || [])].sort((a, b) => {
              const aR = getRemainingQuantityForItem(a.id), bR = getRemainingQuantityForItem(b.id);
              if (aR === 0 && bR > 0) return 1;
              if (aR > 0 && bR === 0) return -1;
              return 0;
            }).map((item, idx) => {
              const totalRequired = item.quantity || item.qty || 0;
              const totalAssigned = getTotalAssignedForItem(item.id);
              const remaining = totalRequired - totalAssigned;
              const isFullyAssigned = remaining === 0;
              const isOverAssigned = remaining < 0;
              // Green only after ALL boxes containing this item are sealed
              const isFullyPacked = isFullyAssigned && boxes.every(box => {
                const hasItem = box.items.some(a => a.itemId === item.id && a.quantity > 0);
                return !hasItem || completedBoxes.has(box.id);
              });
              const isSelected = selectedItems.includes(item.id);
              const hasIssue = savedIssues.find(i => i.item === item.name);

              return (
                <div key={item.id}
                  draggable={!isFullyAssigned}
                  onDragStart={e => !isFullyAssigned && handleDragStart(e, item)}
                  onDragEnd={handleDragEnd}
                  onClick={() => !isFullyAssigned && !isReviewInvoice && setSelectedItem(prev => prev?.id === item.id ? null : item)}
                  className={`flex items-center gap-2 px-3 py-1.5 border-b border-gray-100 cursor-pointer transition-colors select-none
                    ${isSelected ? 'bg-teal-50' : selectedItem?.id === item.id ? 'bg-teal-50' : isFullyPacked ? 'bg-green-50' : isOverAssigned ? 'bg-red-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    ${!isFullyAssigned ? 'hover:bg-teal-50' : ''}`}>

                  {/* Checkbox */}
                  {!isFullyAssigned
                    ? <input type="checkbox" checked={isSelected}
                        onChange={e => { e.stopPropagation(); toggleItemSelection(item.id); }}
                        className="w-3.5 h-3.5 text-teal-600 rounded flex-shrink-0" onClick={e => e.stopPropagation()} />
                    : isFullyPacked
                      ? <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      : <svg className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5" /></svg>}

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate leading-tight ${isFullyPacked ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {item.name || item.item_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {item.mrp && <span className="text-[10px] text-green-600 font-semibold">MRP: {parseFloat(item.mrp).toFixed(2)}</span>}
                      {item.expiry_date && <span className="text-[10px] text-orange-500">Exp: {new Date(item.expiry_date).toLocaleDateString('en-GB')}</span>}
                      {(item.package || item.packaging || item.pkg || item.packing) && <span className="text-[10px] text-gray-500">Pkg: {item.package || item.packaging || item.pkg || item.packing}</span>}
                      {(item.batch_no || item.batch || item.batch_number) && <span className="text-[10px] text-blue-600 font-semibold">Batch: {item.batch_no || item.batch || item.batch_number}</span>}
                    </div>
                  </div>

                  {/* Qty + progress */}
                  <div className="flex flex-col items-end flex-shrink-0 gap-0.5 min-w-[64px]">
                    <span className={`text-xs font-bold ${isFullyPacked ? 'text-green-600' : isOverAssigned ? 'text-red-600' : 'text-gray-700'}`}>
                      {formatQuantity(totalAssigned, 'pcs')}/{formatQuantity(totalRequired, 'pcs')}
                    </span>
                    <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${isOverAssigned ? 'bg-red-500' : isFullyPacked ? 'bg-green-500' : 'bg-teal-500'}`}
                        style={{ width: `${Math.min((totalAssigned / totalRequired) * 100, 100)}%` }} />
                    </div>
                    {!isFullyAssigned && <span className="text-[10px] text-gray-400">{formatQuantity(remaining, 'pcs')} left</span>}
                  </div>

                  {/* Report issue mini-btn */}
                  {!isReviewInvoice && (
                    <button onClick={e => { e.stopPropagation(); openReviewPopup(item); }}
                      title="Report Issue"
                      className={`p-1 rounded flex-shrink-0 transition-colors ${hasIssue ? 'text-red-600 bg-red-50' : 'text-red-300 hover:text-red-600 hover:bg-red-50'}`}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/*RIGHT: Boxes*/}
        <div className="flex flex-col flex-1 bg-white rounded-lg shadow overflow-hidden">
          {/* Boxes header */}
          <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 flex-shrink-0">
            <span className="text-sm font-bold text-gray-700">
              Boxes
              <span className="ml-1.5 text-xs font-normal text-gray-400">
                ({completedBoxes.size}/{boxes.length} done)
              </span>
            </span>
            {(boxes.length === 0 || (boxes.length > 0 && completedBoxes.has(boxes[boxes.length - 1]?.id))) ? (
              <button onClick={addNewBox} disabled={isReviewInvoice}
                className="px-3 py-1 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50">
                + Add Box
              </button>
            ) : (
              <span className="text-xs text-gray-400 italic">Complete current box first</span>
            )}
          </div>

          {/* Boxes list */}
          <div className="overflow-y-auto flex-1 p-2 space-y-2 hide-scrollbar">
            {boxes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <svg className="w-12 h-12 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                <p className="text-sm font-medium">No boxes yet</p>
                <p className="text-xs mt-1">Click "+ Add Box" to begin</p>
              </div>
            ) : (
              [...boxes].sort((a, b) => {
                if (a.is_sealed === b.is_sealed) return 0;
                return a.is_sealed ? 1 : -1;
              }).map(box => {
                const isDone = completedBoxes.has(box.id);
                return (
                  <div key={box.id}
                    onDragOver={handleDragOver}
                    onDragEnter={e => handleDragEnter(e, box.id)}
                    onDragLeave={e => handleDragLeave(e, box.id)}
                    onDrop={e => handleDrop(e, box)}
                    className={`rounded-lg border-2 transition-all ${isDone ? 'border-green-400 bg-green-50' : dragOverBox === box.id ? 'border-teal-400 bg-teal-50 border-dashed' : 'border-gray-200 bg-white'}`}>

                    {/* Box header row */}
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-700 font-mono">{box.boxId}</span>
                        <span className="text-[10px] text-gray-400">({box.items.length} item{box.items.length !== 1 ? 's' : ''})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {!isDone && (
                          <button onClick={() => removeBox(box.id)} className="text-[10px] text-red-400 hover:text-red-600 font-medium px-1">Remove</button>
                        )}
                        {!isDone ? (
                          <button onClick={() => handleCompleteAndPrint(box.id)} disabled={box.items.length === 0}
                            className="px-2 py-0.5 bg-blue-600 text-white text-[11px] font-semibold rounded hover:bg-blue-700 disabled:opacity-40 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            Complete & Print
                          </button>
                        ) : (
                          <button onClick={() => handlePrintBoxLabel(box.id)}
                            className="px-2 py-0.5 bg-purple-600 text-white text-[11px] font-semibold rounded hover:bg-purple-700 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            Reprint
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Items in box */}
                    {box.items.length === 0 ? (
                      <div className="flex items-center justify-center py-3 text-xs text-gray-400 italic">
                        {isDone ? 'Empty box' : 'Drop items here or assign from left panel'}
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {box.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 px-3 py-1">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-800 truncate leading-tight">{item.itemName}</p>
                            </div>
                            <span className="text-xs font-bold text-teal-700 flex-shrink-0">{formatQuantity(item.quantity, 'pcs')}</span>
                            {!isDone && (
                              <button onClick={() => handleRemoveItemFromBox(box.id, item.itemId)}
                                className="text-gray-300 hover:text-red-500 flex-shrink-0 transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            )}
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

      {/* Review issue popup */}
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
                {['batchMatch', 'expiryCheck', 'quantityCorrect', 'packagingGood', 'other'].map(key => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={reviewChecks[key]}
                      onChange={e => setReviewChecks({ ...reviewChecks, [key]: e.target.checked })}
                      className="w-3.5 h-3.5 text-orange-600 rounded" />
                    <span className="text-xs text-gray-700">
                      {key === 'batchMatch' ? 'Batch mismatch' : key === 'expiryCheck' ? 'Expiry issue' : key === 'quantityCorrect' ? 'Quantity incorrect' : key === 'packagingGood' ? 'Damaged packaging' : 'Other'}
                    </span>
                  </label>
                ))}
                {reviewChecks.other && (
                  <textarea value={otherIssueNotes} onChange={e => setOtherIssueNotes(e.target.value)}
                    placeholder="Describe the issue..."
                    className="w-full px-2.5 py-1.5 border rounded text-xs resize-none focus:ring-1 focus:ring-orange-400"
                    rows={2} />
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
    </div>
  );

}
