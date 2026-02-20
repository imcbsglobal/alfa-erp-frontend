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
  // completedBoxes is now derived from backend is_sealed
  const [printedBoxes, setPrintedBoxes] = useState(new Set());

  // DERIVED: Set of completed (sealed) box IDs
  const completedBoxes = useMemo(() => {
    return new Set(boxes.filter(b => b.is_sealed).map(b => b.id));
  }, [boxes]);
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedBox, setSelectedBox] = useState(null);
  const [assignQuantity, setAssignQuantity] = useState("");
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverBox, setDragOverBox] = useState(null);
  
  // Review feature states
  const [reviewPopup, setReviewPopup] = useState({ open: false, item: null });
  const [reviewChecks, setReviewChecks] = useState({});
  const [otherIssueNotes, setOtherIssueNotes] = useState("");
  const [savedIssues, setSavedIssues] = useState([]);
  
  const isReInvoiced = bill?.billing_status === "RE_INVOICED";
  const isReviewInvoice = bill?.billing_status === "REVIEW" && Boolean(bill?.return_info);
  const hasIssues = savedIssues.length > 0;

  useEffect(() => {
    loadBillDetails();
  }, [invoiceNo]);
  
  // SSE live updates for RE_INVOICED bills
  useEffect(() => {
    if (!user) return;

    let es = null;
    let reconnectTimeout = null;
    let reconnectAttempts = 0;
    let isUnmounted = false;
    const MAX_ATTEMPTS = 10;
    const BASE_DELAY = 2000;
    const MAX_DELAY = 30000;

    const connect = () => {
      if (isUnmounted) return;

      try {
        es = new EventSource(`${API_BASE_URL}/sales/sse/invoices/`);

        es.onopen = () => {
          reconnectAttempts = 0;
        };

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (!data.invoice_no) return;

            if (
              data.billing_status === "RE_INVOICED" &&
              data.return_info?.returned_from_section === "PACKING" &&
              data.return_info?.returned_by_email === user?.email &&
              data.invoice_no === invoiceNo
            ) {
              toast.success(`Bill #${data.invoice_no} has been corrected! Continue packing.`, {
                duration: 4000,
                icon: '✓'
              });
              loadBillDetails();
            }
          } catch (e) {
            console.error("SSE: Bad data", e);
          }
        };

        es.onerror = () => {
          es.close();
          es = null;

          if (isUnmounted) return;
          if (reconnectAttempts >= MAX_ATTEMPTS) {
            console.warn("SSE: Max reconnect attempts reached, stopping.");
            return;
          }

          const delay = Math.min(BASE_DELAY * Math.pow(2, reconnectAttempts), MAX_DELAY);
          reconnectAttempts++;
          reconnectTimeout = setTimeout(connect, delay);
        };

      } catch (err) {
        console.error("SSE: Failed to create EventSource", err);
      }
    };

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (es) {
        es.close();
        es = null;
      }
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
          items: box.items.map(item => ({
            item_id: item.itemId,
            quantity: item.quantity,
          }))
        }))
      });
    } catch (err) {
      console.warn("Draft save failed", err);
    }
  }, 1500), [invoiceNo]);

  useEffect(() => {
    if (!loading) saveDraft(boxes);
  }, [boxes]);

  const loadBillDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/sales/packing/bill/${invoiceNo}/`);
      setBill(res.data?.data);
      // If boxes are returned from backend, use them and set completedBoxes from is_sealed
      if (res.data?.data?.boxes && res.data.data.boxes.length > 0) {
        setBoxes(res.data.data.boxes.map((box, idx) => ({
          id: box.id || Date.now() + idx,
          boxId: box.box_id,           // backend uses snake_case
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
  
  // Review feature functions
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
    if (!bill || isReviewInvoice || !savedIssues.length) {
      toast.error(isReviewInvoice ? "Invoice already sent for review" : "No saved issues to send");
      return;
    }
    try {
      setLoading(true);
      const notes = savedIssues.map((i) => `${i.item}: ${i.issues.join(", ")}`).join(" | ");
      await api.post("/sales/billing/return/", {
        invoice_no: bill.invoice_no,
        return_reason: notes,
        user_email: user.email,
      });
      toast.success("Invoice sent to billing review");
      setSavedIssues([]);
      
      // Reload to show updated status
      await loadBillDetails();
      
      toast.info("This invoice is now under review. You'll be notified when it's corrected.", {
        duration: 5000,
        icon: '🔍'
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send invoice to review");
    } finally {
      setLoading(false);
    }
  };

  const generateBoxId = () => {
    // Extract series prefix (e.g. "C-" from "C-0044", "A-" from "A-123")
    const seriesMatch = invoiceNo.toString().match(/^([A-Za-z]+-)/);
    const series = seriesMatch ? seriesMatch[1] : '';
    
    // Extract numeric part of invoice number
    const numericPart = invoiceNo.toString().replace(/^[A-Za-z]+-/, '');
    const billPrefix = numericPart.slice(-4).padStart(4, '0');
    
    const boxNum = nextBoxId.toString().padStart(3, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `BOX-${series}${billPrefix}-${boxNum}-${timestamp}`;
  };

  const addNewBox = () => {
    if (boxes.length > 0) {
      const lastBox = boxes[boxes.length - 1];
      if (lastBox.is_sealed) {
        // allow
      } else {
        toast.error("Please complete the current box before adding a new one");
        return;
      }
    }
    const newBox = {
      id: Date.now(),
      boxId: generateBoxId(),
      items: [],
      is_sealed: false,
    };
    setBoxes(prev => [...prev, newBox]);
    setNextBoxId(prev => prev + 1);
  };

  const removeBox = (boxId) => {
    if (boxes.length === 1) {
      toast.error("You must have at least one box");
      return;
    }
    const box = boxes.find(b => b.id === boxId);
    if (box.is_sealed) {
      toast.error("Cannot remove a completed box");
      return;
    }
    if (box.items.length > 0) {
      if (!window.confirm("This box contains items. Are you sure you want to remove it? Items will become unassigned.")) {
        return;
      }
    }
    setBoxes(prev => prev.filter(b => b.id !== boxId));
  };

  const handleCompleteBox = (boxId) => {
    const box = boxes.find(b => b.id === boxId);
    if (!box || box.items.length === 0) {
      toast.error("Cannot complete an empty box. Please assign items first.");
      return;
    }
    // Mark as sealed in local state (for immediate UI feedback)
    setBoxes(prev => prev.map(b => b.id === boxId ? { ...b, is_sealed: true } : b));
    toast.success("Box completed! You can now print the label.");
    // Optionally, send to backend if you want to persist immediately
  };

  const handlePrintBoxLabel = (boxId) => {
    const box = boxes.find(b => b.id === boxId);
    if (!box) return;
    
    setPrintedBoxes(prev => new Set([...prev, boxId]));
    
    // --- NEW: box count info ---
    const boxIndex   = boxes.findIndex(b => b.id === boxId) + 1;   // 1-based
    const totalBoxes = boxes.length;
    // --------------------------
    
    const customerName    = bill?.customer?.name     || bill?.customer_name  || '';
    const customerArea    = bill?.customer?.area     || '';
    const customerAddr1   = bill?.customer?.address1 || bill?.delivery_address || '';
    const customerAddr2   = bill?.customer?.address2 || '';
    const customerPhone1  = bill?.customer?.phone1   || bill?.customer_phone || '';
    const customerPhone2  = bill?.customer?.phone2   || '';
    const customerEmail   = bill?.customer?.email    || '';

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
          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
          <style>
            @page { 
              margin: 0;
              size: 15cm 10cm;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
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

            /* ── Company Header ── */
            .company-header {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 6px 10px;
              border-bottom: 1.5px solid #000;
              background: white;
              flex-shrink: 0;
            }
            .company-logo {
              height: 50px;
              width: auto;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: crisp-edges;
            }
            .company-divider {
              width: 1.5px;
              height: 50px;
              background: #000;
              flex-shrink: 0;
            }
            .company-info {
              display: flex;
              flex-direction: column;
              gap: 2px;
            }
            .company-address {
              font-size: 13px;
              color: #000;
              line-height: 1.6;
              font-weight: 500;
            }

            /* ── Main Content ── */
            .main-content {
              display: grid;
              grid-template-columns: 4cm 1fr;
              flex: 1;
              overflow: visible;
            }

            /* Left: QR Code */
            .qr-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 8px 12px;
              background: white;
              align-self: center;
              gap: 3px;
            }

            /* ── NEW: Invoice number label above QR ── */
            .invoice-label {
              font-size: 12px;
              font-weight: bold;
              color: #000;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              white-space: nowrap;
            }

            .qr-container {
              border: 1.5px solid #000;
              padding: 4px;
              background: white;
            }
            #qrcode {
              width: 100px;
              height: 100px;
            }
            #qrcode img,
            #qrcode canvas {
              width: 100px !important;
              height: 100px !important;
            }
            .box-id-label {
              font-size: 10px;
              font-weight: bold;
              color: #000;
              text-align: center;
              word-break: break-all;
              max-width: 3.6cm;
            }

            /* ── NEW: Box count badge ── */
            .box-count-label {
              font-size: 9px;
              font-weight: bold;
              color: #fff;
              background: #000;
              padding: 1px 6px;
              border-radius: 10px;
              text-align: center;
              white-space: nowrap;
            }

            /* Right: Customer Details */
            .customer-section {
              padding: 10px 14px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              gap: 2px;
              background: white;
              overflow: visible;
              word-wrap: break-word;
              overflow-wrap: break-word;
              word-break: break-word;
            }
            .to-label {
              font-size: 8px;
              font-weight: bold;
              text-transform: uppercase;
              color: #000;
              letter-spacing: 1px;
              margin-bottom: 3px;
            }
            .customer-name {
              font-weight: bold;
              font-size: 20px;
              text-transform: uppercase;
              color: #000;
              line-height: 1.2;
              white-space: normal;
              word-wrap: break-word;
            }
            .customer-area {
              font-size: 15px;
              color: #000;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-top: 1px;
              white-space: normal;
              word-wrap: break-word;
            }
            .customer-addr {
              font-size: 15px;
              color: #000;
              line-height: 1.5;
              margin-top: 2px;
              white-space: normal;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            .customer-contact {
              font-size: 12px;
              font-weight: bold;
              color: #000;
              margin-top: 3px;
              line-height: 1.5;
              white-space: normal;
              word-wrap: break-word;
            }
            .customer-email {
              font-size: 12px;
              font-weight: bold;
              color: #000;
              margin-top: 2px;
              white-space: normal;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }

            /* ── Instructions Banner ── */
            .instructions-banner {
              border-top: 1.5px solid #000;
              background: #fff;
              padding: 7px 12px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              flex-shrink: 0;
            }
            .instruction-texts {
              display: flex;
              flex-direction: column;
              gap: 3px;
            }
            .instruction-text {
              font-weight: bold;
              font-size: 10px;
              text-transform: uppercase;
              color: #000;
              line-height: 1.4;
            }
            .icons-row {
              display: flex;
              gap: 10px;
              align-items: center;
              font-size: 20px;
              filter: grayscale(100%) brightness(0);
            }

            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="label-container">

            <!-- Company Header -->
            <div class="company-header">
              <img src="/black.png" alt="Alfa Agencies" class="company-logo" />
              <div class="company-divider"></div>
              <div class="company-info">
                <span class="company-address">18/1143 A7, Ground Floor, Meyon Building, Jail Road, Calicut - 673 004</span>
                <span class="company-address">Ph: (Off) 0495 2300644, 2701899, 2306728</span>
                <span class="company-address">Ph: (Mob) 9387724365, 7909220300, 7909220400</span>
              </div>
            </div>

            <!-- Main Content -->
            <div class="main-content">
              <!-- QR Code + labels -->
              <div class="qr-section">
                <!-- Invoice number ABOVE QR -->
                <p class="invoice-label">Inv No:${invoiceNo}</p>

                <div class="qr-container">
                  <div id="qrcode"></div>
                </div>

                <!-- Box ID below QR -->
                <p class="box-id-label">${box.boxId}</p>

                <!-- Box count badge -->
                <span class="box-count-label">Box ${boxIndex} of ${totalBoxes}</span>
              </div>

              <!-- Customer Details -->
              <div class="customer-section">
                <p class="to-label">Ship To</p>
                ${customerName  ? '<p class="customer-name">'    + customerName  + '</p>' : ''}
                ${customerArea  ? '<p class="customer-area">'    + customerArea  + '</p>' : ''}
                ${customerAddr1 ? '<p class="customer-addr">'    + customerAddr1 + '</p>' : ''}
                ${customerAddr2 ? '<p class="customer-addr">'    + customerAddr2 + '</p>' : ''}
                ${(customerPhone1 || customerPhone2) ?
                  '<p class="customer-contact">' +
                    [customerPhone1, customerPhone2].filter(Boolean).join(' &nbsp;|&nbsp; ') +
                  '</p>'
                  : ''}
                ${customerEmail ? '<p class="customer-email">'   + customerEmail + '</p>' : ''}
              </div>
            </div>

            <!-- Instructions Banner -->
            <div class="instructions-banner">
              <div class="instruction-texts">
                <p class="instruction-text">HANDLE WITH CARE. KEEP REFRIGERATED.</p>
                <p class="instruction-text">DO NOT SHAKE. FRAGILE. PROTECT FROM LIGHT</p>
              </div>
              <div class="icons-row">
                <span>❄️</span>
                <span>🍷</span>
                <span>☂️</span>
              </div>
            </div>

          </div>
          
          <script>
            window.onload = function() {
              var boxUrl = window.location.origin + '/box/${box.boxId}';
              new QRCode(document.getElementById('qrcode'), {
                text: boxUrl,
                width: 100,
                height: 100,
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
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    iframeDoc.close();
    
    toast.success("Label sent to printer!");
  };

  const getTotalAssignedForItem = (itemId) => {
    let total = 0;
    boxes.forEach(box => {
      box.items.forEach(assignment => {
        if (assignment.itemId === itemId) {
          total += assignment.quantity;
        }
      });
    });
    return total;
  };

  const getRemainingQuantityForItem = (itemId) => {
    const item = bill?.items?.find(i => i.id === itemId);
    if (!item) return 0;
    const totalRequired = item.quantity || item.qty || 0;
    const totalAssigned = getTotalAssignedForItem(itemId);
    return totalRequired - totalAssigned;
  };

  const handleAssignItem = () => {
    if (!selectedItem || !selectedBox || !assignQuantity) {
      toast.error("Please select an item, box, and enter quantity");
      return;
    }

    const quantity = parseFloat(assignQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    const remaining = getRemainingQuantityForItem(selectedItem.id);
    if (quantity > remaining) {
      toast.error(`Cannot assign ${quantity}. Only ${remaining} remaining.`);
      return;
    }

    setBoxes(prev => prev.map(box => {
      if (box.id === selectedBox.id) {
        const existingIdx = box.items.findIndex(i => i.itemId === selectedItem.id);
        if (existingIdx >= 0) {
          const updatedItems = [...box.items];
          updatedItems[existingIdx].quantity += quantity;
          return { ...box, items: updatedItems };
        } else {
          return {
            ...box,
            items: [...box.items, {
              itemId: selectedItem.id,
              itemName: selectedItem.name || selectedItem.item_name,
              itemCode: selectedItem.code,
              quantity: quantity,
            }]
          };
        }
      }
      return box;
    }));

    toast.success(`Assigned ${quantity} to ${selectedBox.boxId}`);
    setAssignQuantity("");
    setSelectedItem(null);
  };

  const handleRemoveItemFromBox = (boxId, itemId) => {
    setBoxes(prev => prev.map(box => {
      if (box.id === boxId) {
        return {
          ...box,
          items: box.items.filter(i => i.itemId !== itemId)
        };
      }
      return box;
    }));
    toast.success("Item removed from box");
  };

  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const toggleSelectAll = () => {
    const selectableItems = bill?.items?.filter(item => {
      const remaining = getRemainingQuantityForItem(item.id);
      return remaining > 0;
    }) || [];

    if (selectedItems.length === selectableItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(selectableItems.map(item => item.id));
    }
  };

  const handleAssignSelectedItems = () => {
    if (selectedItems.length === 0) {
      toast.error("Please select at least one item");
      return;
    }

    if (!selectedBox) {
      toast.error("Please select a box");
      return;
    }

    let assignedCount = 0;

    setBoxes(prev => prev.map(box => {
      if (box.id === selectedBox.id) {
        const newItems = [...box.items];
        
        selectedItems.forEach(itemId => {
          const item = bill?.items?.find(i => i.id === itemId);
          if (!item) return;

          const remaining = getRemainingQuantityForItem(itemId);
          if (remaining <= 0) return;

          const existingIdx = newItems.findIndex(i => i.itemId === itemId);
          if (existingIdx >= 0) {
            newItems[existingIdx].quantity += remaining;
          } else {
            newItems.push({
              itemId: item.id,
              itemName: item.name || item.item_name,
              itemCode: item.code || item.item_code,
              quantity: remaining,
            });
          }
          assignedCount++;
        });

        return { ...box, items: newItems };
      }
      return box;
    }));

    toast.success(`Assigned ${assignedCount} item(s) to ${selectedBox.boxId}`);
    setSelectedItems([]);
    setSelectedBox(null);
  };

  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedItem(null);
    setDragOverBox(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e, boxId) => {
    e.preventDefault();
    setDragOverBox(boxId);
  };

  const handleDragLeave = (e, boxId) => {
    e.preventDefault();
    if (e.currentTarget === e.target) {
      setDragOverBox(null);
    }
  };

  const handleDrop = (e, box) => {
    e.preventDefault();
    setDragOverBox(null);

    if (!draggedItem) return;
    
    if (completedBoxes.has(box.id)) {
      toast.error("Cannot modify a completed box");
      setDraggedItem(null);
      return;
    }

    const remaining = getRemainingQuantityForItem(draggedItem.id);
    
    if (remaining <= 0) {
      toast.error("All items already assigned");
      setDraggedItem(null);
      return;
    }

    const quantityToAssign = remaining;

    setBoxes(prev => prev.map(b => {
      if (b.id === box.id) {
        const existingIdx = b.items.findIndex(i => i.itemId === draggedItem.id);
        if (existingIdx >= 0) {
          const updatedItems = [...b.items];
          updatedItems[existingIdx].quantity += quantityToAssign;
          return { ...b, items: updatedItems };
        } else {
          return {
            ...b,
            items: [...b.items, {
              itemId: draggedItem.id,
              itemName: draggedItem.name || draggedItem.item_name,
              itemCode: draggedItem.code || draggedItem.item_code,
              quantity: quantityToAssign,
            }]
          };
        }
      }
      return b;
    }));

    toast.success(`Assigned ${quantityToAssign} ${draggedItem.name || draggedItem.item_name} to ${box.boxId}`);
    setDraggedItem(null);
  };

  const validateBoxes = () => {
    const validationErrors = [];

    if (boxes.length === 0) {
      validationErrors.push("You must create at least one box");
      return validationErrors;
    }

    const incompletBoxes = boxes.filter(box => !completedBoxes.has(box.id));
    if (incompletBoxes.length > 0) {
      validationErrors.push(`${incompletBoxes.length} box(es) not completed. Complete all boxes before finishing.`);
    }

    const emptyBoxes = boxes.filter(box => box.items.length === 0);
    if (emptyBoxes.length > 0) {
      validationErrors.push(`${emptyBoxes.length} box(es) are empty. Please remove empty boxes or assign items to them.`);
    }

    bill?.items?.forEach(item => {
      const remaining = getRemainingQuantityForItem(item.id);
      if (remaining > 0) {
        validationErrors.push(`Item "${item.name || item.item_name}" has ${remaining} units unassigned`);
      } else if (remaining < 0) {
        validationErrors.push(`Item "${item.name || item.item_name}" is over-assigned by ${Math.abs(remaining)} units`);
      }
    });

    return validationErrors;
  };

  const handleCompletePacking = async () => {
    const validationErrors = validateBoxes();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      toast.error("Please fix validation errors before completing");
      return;
    }

    setErrors([]);

    try {
      setCompleting(true);

      const boxData = boxes.map(box => ({
        box_id: box.boxId,
        items: box.items.map(item => ({
          item_id: item.itemId,
          item_name: item.itemName,
          item_code: item.itemCode,
          quantity: item.quantity,
        }))
      }));

      await api.post("/sales/packing/complete-packing/", {
        invoice_no: invoiceNo,
        boxes: boxData,
      });

      toast.success("Packing completed successfully!");
      navigate("/packing/my");
      
    } catch (err) {
      console.error("Complete packing error:", err);
      console.error("Error response:", err.response?.data);
      
      const errorData = err.response?.data;
      if (errorData?.errors) {
        console.error("Validation errors:", JSON.stringify(errorData.errors, null, 2));
        
        const errorMessages = Object.entries(errorData.errors)
          .map(([field, messages]) => {
            if (Array.isArray(messages)) {
              return `${field}: ${messages.join(', ')}`;
            }
            return `${field}: ${messages}`;
          })
          .join(' | ');
        toast.error(`Validation failed: ${errorMessages}`);
      } else if (errorData?.message) {
        const message = errorData.message;
        if (message.includes('duplicate key')) {
          toast.error("Box ID already exists. Please refresh the page and try again.");
        } else {
          toast.error(message);
        }
      } else {
        toast.error("Failed to complete packing");
      }
    } finally {
      setCompleting(false);
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
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto px-3 py-3">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-800">Box Assignment</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span><strong>Invoice:</strong> #{bill.invoice_no}</span>
                <span className="text-gray-400">•</span>
                <span><strong>Customer:</strong> {bill.customer?.name || bill.customer_name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* RE_INVOICED Status Banner */}
        {isReInvoiced && bill.return_info && (
          <div className="bg-teal-50 border border-teal-300 rounded-lg p-3 mb-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-bold text-teal-900 text-base mb-1">Invoice Corrected & Ready</h3>
              <p className="text-sm text-teal-800">This invoice has been corrected. Continue packing!</p>
            </div>
          </div>
        )}

        {/* REVIEW Status Banner */}
        {isReviewInvoice && bill.return_info && (
          <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 mb-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-bold text-orange-900 text-base mb-2">Invoice Sent to Billing Review</h3>
              <div className="bg-white rounded-lg p-2 border border-orange-200">
                <p className="text-sm text-orange-800 mb-1">
                  <strong>Reason:</strong> {bill.return_info.return_reason}
                </p>
                <p className="text-xs text-orange-700">
                  You'll be notified when the billing team corrects this invoice.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Saved Issues Section */}
        {hasIssues && !isReviewInvoice && (
          <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="font-semibold text-orange-900 text-base">
                Issues Reported ({savedIssues.length})
              </h3>
            </div>
            <div className="space-y-2">
              {savedIssues.map((issue, idx) => (
                <div key={idx} className="bg-white border border-orange-200 rounded p-2">
                  <p className="font-medium text-orange-900 text-sm">{issue.item}</p>
                  <p className="text-orange-700 text-xs">{issue.issues.join(", ")}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-3 mb-4">
            <p className="font-semibold text-red-800 text-base mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Validation Errors
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-red-700 ml-4">
              {errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Main Content Grid */}
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 transition-opacity duration-300 ${
          isReviewInvoice ? 'opacity-50 pointer-events-none' : 'opacity-100'
        }`}>
          {/* Items List */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">
                Items ({bill.items?.length || 0})
              </h2>
              <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded border border-gray-200 cursor-pointer hover:bg-gray-100 text-sm">
                <input
                  type="checkbox"
                  checked={selectedItems.length > 0 && selectedItems.length === bill.items?.filter(item => getRemainingQuantityForItem(item.id) > 0).length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-teal-600 rounded"
                />
                <span className="font-medium text-gray-700">
                  {selectedItems.length > 0 
                    ? `${selectedItems.length} selected`
                    : "Select All"}
                </span>
              </label>
            </div>
            
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
              {[...(bill.items || [])].sort((a, b) => {
                const aRemaining = getRemainingQuantityForItem(a.id);
                const bRemaining = getRemainingQuantityForItem(b.id);
                if (aRemaining === 0 && bRemaining > 0) return 1;
                if (aRemaining > 0 && bRemaining === 0) return -1;
                return 0;
              }).map((item) => {
                // Disable interactions when in review
                const isDisabled = isReviewInvoice;
                const totalRequired = item.quantity || item.qty || 0;
                const totalAssigned = getTotalAssignedForItem(item.id);
                const remaining = totalRequired - totalAssigned;
                const isFullyAssigned = remaining === 0;
                const isOverAssigned = remaining < 0;

                const isSelected = selectedItems.includes(item.id);

                return (
                  <div
                    key={item.id}
                    draggable={!isFullyAssigned}
                    onDragStart={(e) => !isFullyAssigned && handleDragStart(e, item)}
                    onDragEnd={handleDragEnd}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isFullyAssigned ? "cursor-not-allowed" : "cursor-move"
                    } ${
                      isSelected
                        ? "border-teal-500 bg-teal-50"
                        : selectedItem?.id === item.id
                        ? "border-teal-500 bg-teal-50"
                        : isFullyAssigned
                        ? "border-green-500 bg-green-50"
                        : isOverAssigned
                        ? "border-red-500 bg-red-50"
                        : "border-gray-300 bg-white hover:border-teal-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {!isFullyAssigned && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleItemSelection(item.id);
                          }}
                          className="w-4 h-4 text-teal-600 rounded flex-shrink-0"
                        />
                      )}
                      <div 
                        className="flex items-center justify-between flex-1 min-w-0"
                        onClick={() => !isFullyAssigned && !isDisabled && setSelectedItem(item)}
                        style={{ cursor: isDisabled ? 'not-allowed' : (!isFullyAssigned ? 'pointer' : 'default') }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold text-gray-800 truncate">
                            {item.name || item.item_name}
                          </p>
                          
                          {/* Item Details */}
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                            {(item.code || item.item_code || item.itemCode) && (
                              <span className="flex items-center gap-1">
                                <span className="font-semibold">Code:</span>
                                <span>{item.code || item.item_code || item.itemCode}</span>
                              </span>
                            )}
                            {item.mrp && (
                              <span className="flex items-center gap-1">
                                <span className="font-semibold">MRP:</span>
                                <span className="text-green-700 font-bold">₹{parseFloat(item.mrp).toFixed(2)}</span>
                              </span>
                            )}
                            {(item.batch_number || item.batchNumber || item.batch) && (
                              <span className="flex items-center gap-1">
                                <span className="font-semibold">Batch:</span>
                                <span>{item.batch_number || item.batchNumber || item.batch}</span>
                              </span>
                            )}
                            {item.expiry_date && (
                              <span className="flex items-center gap-1">
                                <span className="font-semibold">Exp:</span>
                                <span className="text-orange-700">{new Date(item.expiry_date).toLocaleDateString('en-GB')}</span>
                              </span>
                            )}
                            {(item.package || item.packaging || item.pkg || item.packing) && (
                              <span className="flex items-center gap-1">
                                <span className="font-semibold">Pkg:</span>
                                <span>{item.package || item.packaging || item.pkg || item.packing}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        {isFullyAssigned && (
                          <svg className="w-6 h-6 text-green-600 flex-shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm border-t pt-2 border-gray-200">
                      <span className="text-gray-600">Qty: <span className="font-bold text-gray-800">{formatQuantity(totalRequired, 'pcs')}</span></span>
                      {(totalAssigned > 0 || isOverAssigned) && (
                        <span className={`text-sm font-semibold ${
                          isFullyAssigned ? "text-green-600" : isOverAssigned ? "text-red-600" : "text-amber-600"
                        }`}>
                          Assigned: {formatQuantity(totalAssigned, 'pcs')}
                        </span>
                      )}
                    </div>
                    
                    {/* Report Issue Button */}
                    {!isReviewInvoice && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isDisabled) openReviewPopup(item);
                        }}
                        disabled={isDisabled}
                        className={`w-full mt-3 py-2.5 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 border disabled:opacity-50 disabled:cursor-not-allowed ${
                          savedIssues.find(i => i.item === item.name)
                            ? "bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100"
                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Report Issue
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Boxes Management */}
          <div className="space-y-4">
            {/* Bulk Assignment Control */}
            {selectedItems.length > 0 ? (
              <div className="bg-teal-50 border-2 border-teal-500 rounded-lg p-4">
                <h3 className="font-semibold text-teal-900 mb-3">
                  Assign {selectedItems.length} Selected Item{selectedItems.length > 1 ? 's' : ''} to Box
                </h3>
                <div className="space-y-3">
                  <select
                    value={selectedBox?.id || ""}
                    onChange={(e) => {
                      const box = boxes.find(b => b.id === parseInt(e.target.value));
                      setSelectedBox(box);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">-- Select a box --</option>
                    {boxes.filter(box => !completedBoxes.has(box.id)).map(box => (
                      <option key={box.id} value={box.id}>
                        {box.boxId} ({box.items.length} items)
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <button
                      onClick={handleAssignSelectedItems}
                      disabled={!selectedBox}
                      className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Assign to Box
                    </button>
                    <button
                      onClick={() => {
                        setSelectedItems([]);
                        setSelectedBox(null);
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : selectedItem ? (

              <div className="bg-teal-50 border-2 border-teal-500 rounded-lg p-4">
                <h3 className="font-semibold text-teal-900 text-base mb-3">Assign Item</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {selectedItem.name || selectedItem.item_name}
                    </p>
                    <p className="text-xs text-gray-600">
                      Left: {formatQuantity(getRemainingQuantityForItem(selectedItem.id), 'pcs')}
                    </p>
                  </div>

                  <select
                    value={selectedBox?.id || ""}
                    onChange={(e) => {
                      const box = boxes.find(b => b.id === parseInt(e.target.value));
                      setSelectedBox(box);
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select box</option>
                    {boxes.filter(box => !completedBoxes.has(box.id)).map(box => (
                      <option key={box.id} value={box.id}>
                        {box.boxId} ({box.items.length})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    value={assignQuantity}
                    onChange={(e) => setAssignQuantity(e.target.value)}
                    placeholder="Quantity"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={handleAssignItem}
                      className="flex-1 px-4 py-2 text-sm bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700"
                    >
                      Assign
                    </button>
                    <button
                      onClick={() => {
                        setSelectedItem(null);
                        setSelectedBox(null);
                        setAssignQuantity("");
                      }}
                      className="px-4 py-2 text-sm bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Boxes List */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800">
                  Boxes ({boxes.length})
                </h2>
                {boxes.length === 0 || (boxes.length > 0 && completedBoxes.has(boxes[boxes.length - 1].id)) ? (
                  <button
                    onClick={addNewBox}
                    disabled={isReviewInvoice}
                    className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    + Add Box
                  </button>
                ) : (
                  <span className="text-sm text-gray-500 italic">
                    Complete box first
                  </span>
                )}
              </div>

              <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto">
                {boxes.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-lg font-medium mb-2">No boxes yet</p>
                    <p className="text-sm mb-4">Click "+ Add Box" above to create your first box</p>
                  </div>
                ) : (
                  [...boxes].sort((a, b) => {
                    if (a.is_sealed === b.is_sealed) return 0;
                    return a.is_sealed ? 1 : -1;
                  }).map(box => (
                  <div 
                    key={box.id} 
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, box.id)}
                    onDragLeave={(e) => handleDragLeave(e, box.id)}
                    onDrop={(e) => handleDrop(e, box)}
                    className={`border-2 rounded-lg p-3 transition-all ${
                      completedBoxes.has(box.id)
                        ? "border-green-500 bg-green-50"
                        : dragOverBox === box.id 
                        ? "border-teal-500 bg-teal-50 border-dashed" 
                        : "border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-gray-800">{box.boxId}</h3>
                        {completedBoxes.has(box.id) && (
                          <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full font-semibold">
                            ✓
                          </span>
                        )}
                      </div>
                      {!completedBoxes.has(box.id) && (
                        <button
                          onClick={() => removeBox(box.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-semibold"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {box.items.length === 0 ? (
                      <div className="text-center py-4">
                        <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-sm text-gray-500 italic">
                          {completedBoxes.has(box.id) ? "Empty" : "Drop here"}
                        </p>
                      </div>
                    ) : (
                      <>
                      <div className="space-y-1.5">
                        {box.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 truncate">{item.itemName}</p>
                              {item.itemCode && (
                                <p className="text-xs text-gray-600">Code: {item.itemCode}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <span className="font-bold text-teal-700">
                                {formatQuantity(item.quantity, 'pcs')}
                              </span>
                              {!box.is_sealed && (
                                <button
                                  onClick={() => handleRemoveItemFromBox(box.id, item.itemId)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      </>
                    )}
                    
                    {/* Box Actions */}
                    {!box.is_sealed ? (
                      <button
                        onClick={() => handleCompleteBox(box.id)}
                        disabled={box.items.length === 0}
                        className="w-full mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                      >
                        Complete Box
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePrintBoxLabel(box.id)}
                        className="w-full mt-3 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        {printedBoxes.has(box.id) ? "Reprint" : "Print Label"}
                      </button>
                    )}
                  </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Complete Button - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex gap-3">
              {/* Send to Review Button */}
              {hasIssues && !isReviewInvoice && (
                <button
                  onClick={handleSendInvoiceToReview}
                  disabled={loading}
                  className="flex-1 py-3.5 bg-orange-600 text-white rounded-lg text-lg font-bold hover:bg-orange-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Send to Review ({savedIssues.length})
                </button>
              )}
              
              {/* Complete Packing Button */}
              <button
                onClick={handleCompletePacking}
                disabled={completing || (hasIssues && !isReInvoiced) || isReviewInvoice}
                className={`py-3.5 rounded-lg text-lg font-bold transition-all shadow-lg disabled:opacity-50 ${
                  hasIssues ? 'flex-1' : 'w-full'
                } ${
                  hasIssues && !isReInvoiced
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
                title={hasIssues && !isReInvoiced ? "Resolve issues first or send to review" : ""}
              >
                {completing ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Marking as PACKED...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {hasIssues ? "Resolve Issues First" : isReviewInvoice ? "Under Review" : "Mark as PACKED & Ready"}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Review Modal */}
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
                  <p className="font-semibold text-xs text-gray-900">{reviewPopup.item?.name || reviewPopup.item?.item_name}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{reviewPopup.item?.code || reviewPopup.item?.item_code || reviewPopup.item?.sku}</p>
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
      </div>
    </div>
  );
}