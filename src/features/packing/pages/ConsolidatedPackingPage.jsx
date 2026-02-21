import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../services/api";
import toast from "react-hot-toast";
import { formatQuantity } from "../../../utils/formatters";
import { useAuth } from "../../auth/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function ConsolidatedPackingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  // Get bill IDs from location state
  const billIds = location.state?.billIds || [];
  const customerName = location.state?.customerName || "";

  // Helper function to get role-aware paths
  const getPath = (path) => {
    const isOpsUser = ["PICKER", "PACKER", "BILLER", "DELIVERY", "STORE"].includes(user?.role);
    return isOpsUser ? `/ops${path}` : path;
  };

  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [consolidatedItems, setConsolidatedItems] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [nextBoxId, setNextBoxId] = useState(1);
  const [completing, setCompleting] = useState(false);
  const [errors, setErrors] = useState([]);
  const [completedBoxes, setCompletedBoxes] = useState(new Set());
  const [printedBoxes, setPrintedBoxes] = useState(new Set());
  
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
  
  // Check if any bill has review status
  const hasReviewStatus = bills.some(b => b.billing_status === "REVIEW" && b.return_info);
  const hasReInvoicedStatus = bills.some(b => b.billing_status === "RE_INVOICED");
  const hasIssues = savedIssues.length > 0;

  useEffect(() => {
    if (billIds.length === 0) {
      toast.error("No bills provided for consolidated packing");
      navigate(-1);
      return;
    }
    loadBillsDetails();
  }, []);
  
  // SSE live updates for RE_INVOICED bills in consolidated packing
  useEffect(() => {
    if (!user || bills.length === 0) return;
    
    let es = null;
    let reconnectTimeout = null;
    let reconnectAttempts = 0;
    const maxReconnectDelay = 30000;
    const baseDelay = 1000;

    // NOTE: If in the future SSE pushes new invoices into a list, ensure to append (push) to the end, not unshift/prepend.
    // This handler only reloads the bills, so no ordering change is needed here.
    const connect = () => {
      if (es) es.close();

      es = new EventSource(`${API_BASE_URL}/sales/sse/invoices/`);

      es.onmessage = (event) => {
        reconnectAttempts = 0;
        try {
          const data = JSON.parse(event.data);
          if (!data.invoice_no) return;
          
          // Check if this invoice is part of our consolidated bills
          const isOurBill = billIds.includes(data.invoice_no);
          
          // Handle RE_INVOICED bills - corrected and sent back from PACKING section
          if (isOurBill &&
              data.billing_status === "RE_INVOICED" && 
              data.return_info?.returned_from_section === "PACKING" &&
              data.return_info?.returned_by_email === user?.email) {
            console.log('🔄 RE_INVOICED packing bill received for consolidated packing');
            toast.success(`Bill #${data.invoice_no} has been corrected! Continue packing.`, {
              duration: 4000,
              icon: '✓'
            });
            loadBillsDetails();
          }
        } catch (e) {
          console.error("Bad SSE data", e);
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
  }, [user, bills, billIds]);

  const loadBillsDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch details for all bills
      const billPromises = billIds.map(id => 
        api.get(`/sales/packing/bill/${id}/`)
      );
      
      const responses = await Promise.all(billPromises);
      const billsData = responses.map(res => res.data?.data).filter(Boolean);
      
      setBills(billsData);
      
      // Consolidate items from all bills
      const itemsMap = new Map();
      
      billsData.forEach(bill => {
        bill.items?.forEach(item => {
          const key = item.item_code || item.code || item.id;
          
          if (itemsMap.has(key)) {
            const existing = itemsMap.get(key);
            existing.totalQuantity += (item.quantity || item.qty || 0);
            existing.bills.push({
              billNo: bill.invoice_no,
              quantity: item.quantity || item.qty || 0
            });
          } else {
            itemsMap.set(key, {
              id: item.id,
              itemId: key,
              itemCode: item.code || item.item_code || item.itemCode,
              itemName: item.name || item.item_name,
              mrp: item.mrp,
              batchNumber: item.batch_number || item.batchNumber || item.batch,
              expiryDate: item.expiry_date || item.expiryDate,
              package: item.package || item.packaging || item.pkg || item.packing,
              totalQuantity: item.quantity || item.qty || 0,
              bills: [{
                billNo: bill.invoice_no,
                quantity: item.quantity || item.qty || 0
              }]
            });
          }
        });
      });
      
      setConsolidatedItems(Array.from(itemsMap.values()));
      
    } catch (err) {
      console.error("Failed to load bills details", err);
      toast.error("Failed to load bills details");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };
  
  // Review feature functions
  const openReviewPopup = (item) => {
    if (hasReviewStatus) return;
    const existing = savedIssues.find((i) => i.item === item.itemName);

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
      const idx = prev.findIndex((i) => i.item === reviewPopup.item.itemName);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = { item: reviewPopup.item.itemName, issues, bills: reviewPopup.item.bills };
        return copy;
      }
      return [...prev, { item: reviewPopup.item.itemName, issues, bills: reviewPopup.item.bills }];
    });
    closeReviewPopup();
  };

  const handleSendInvoiceToReview = async () => {
    if (hasReviewStatus || !savedIssues.length) {
      toast.error(hasReviewStatus ? "Invoices already sent for review" : "No saved issues to send");
      return;
    }
    
    try {
      setLoading(true);
      const notes = savedIssues.map((i) => `${i.item} (Bills: ${i.bills.map(b => b.billNo).join(', ')}): ${i.issues.join(", ")}`).join(" | ");
      
      // Send all bills for review
      const reviewPromises = bills.map(bill => 
        api.post("/sales/billing/return/", {
          invoice_no: bill.invoice_no,
          return_reason: `[Consolidated Packing] ${notes}`,
          user_email: user.email,
        })
      );
      
      await Promise.all(reviewPromises);
      
      toast.success(`All ${bills.length} invoices sent to billing review`);
      setSavedIssues([]);
      
      // Reload to show updated status
      await loadBillsDetails();
      
      toast.info("These invoices are now under review. You'll be notified when corrected.", {
        duration: 5000,
        icon: '🔍'
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send invoices to review");
    } finally {
      setLoading(false);
    }
  };

  const generateBoxId = () => {
    // Use CUST prefix for consolidated customer-level packing
    const customerPrefix = "CUST001";
    const boxNum = nextBoxId.toString().padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `${customerPrefix}-BOX${boxNum}-${timestamp}`;
  };

  const addNewBox = () => {
    if (boxes.length > 0) {
      const lastBox = boxes[boxes.length - 1];
      if (!completedBoxes.has(lastBox.id)) {
        toast.error("Please complete the current box before adding a new one");
        return;
      }
    }
    
    const newBox = {
      id: Date.now(),
      boxId: generateBoxId(),
      items: [],
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
    
    if (completedBoxes.has(boxId)) {
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
    
    setCompletedBoxes(prev => new Set([...prev, boxId]));
    toast.success("Box completed! You can now print the label.");
  };

  const handlePrintBoxLabel = (boxId) => {
    const box = boxes.find(b => b.id === boxId);
    if (!box) return;
    
    setPrintedBoxes(prev => new Set([...prev, boxId]));
    
    // Get customer details from first bill - PRIORITIZE delivery_address
    const firstBill = bills[0];
    const custName = customerName || firstBill?.customer?.name || firstBill?.customer_name || 'No Customer Name';
    const customerAddress = firstBill?.delivery_address || firstBill?.customer?.address1 || firstBill?.customer?.address || 'No address provided';
    const customerPhone = firstBill?.customer_phone || firstBill?.customer?.phone1 || firstBill?.customer?.phone || '';
    
    // Create hidden iframe for printing
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
              size: A4; 
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0;
              width: 100%;
              height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: white;
            }
            .label-container {
              width: 90%;
              max-width: 800px;
              min-height: 400px;
              border: 4px solid #dc2626;
              border-radius: 12px;
              padding: 40px;
              display: flex;
              flex-direction: column;
              background: white;
            }
            .header {
              display: flex;
              align-items: center;
              gap: 16px;
              margin-bottom: 40px;
            }
            .logo {
              height: 60px;
              width: auto;
            }
            .content-grid {
              display: grid;
              grid-template-columns: 240px 1fr;
              gap: 40px;
              margin-bottom: auto;
              flex: 1;
            }
            .qr-section {
              display: flex;
              flex-direction: column;
              align-items: flex-start;
            }
            .qr-container {
              background: white;
              border: 2px solid #d1d5db;
              padding: 12px;
              border-radius: 4px;
            }
            #qrcode {
              width: 180px;
              height: 180px;
            }
            #qrcode img {
              width: 100% !important;
              height: 100% !important;
            }
            .customer-details {
              display: flex;
              flex-direction: column;
              gap: 8px;
            }
            .customer-name {
              font-weight: bold;
              color: #000;
              font-size: 28px;
              line-height: 1.2;
              text-transform: uppercase;
              margin: 0 0 8px 0;
            }
            .customer-address {
              color: #000;
              font-size: 20px;
              line-height: 1.4;
              margin: 0;
            }
            .customer-phone {
              color: #000;
              font-size: 20px;
              line-height: 1.4;
              margin: 8px 0 0 0;
              font-weight: bold;
            }
            .instructions-banner {
              margin-top: 40px;
            }
            .banner-content {
              background: #dc2626;
              color: white;
              padding: 24px 28px;
              border-radius: 8px;
            }
            .instruction-text {
              font-weight: bold;
              font-size: 18px;
              text-transform: uppercase;
              line-height: 1.3;
              margin: 0 0 8px 0;
            }
            .instruction-text-2 {
              font-weight: bold;
              font-size: 18px;
              text-transform: uppercase;
              line-height: 1.3;
              margin: 0;
            }
            .icons-row {
              display: flex;
              gap: 32px;
              margin-top: 16px;
              align-items: center;
              font-size: 32px;
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
            <!-- Header Section -->
            <div class="header">
              <img src="/alfa3.png" alt="Alfa Agencies" class="logo" />
            </div>
            
            <!-- Content Grid -->
            <div class="content-grid">
              <!-- QR Code Section -->
              <div class="qr-section">
                <div class="qr-container">
                  <div id="qrcode"></div>
                </div>
              </div>
              
              <!-- Customer Details Section -->
              <div class="customer-details">
                <p class="customer-name">${custName}</p>
                <p class="customer-address">${customerAddress}</p>
                ${customerPhone ? `
                  <p class="customer-phone">TEL: ${customerPhone}</p>
                ` : ''}
              </div>
            </div>
            
            <!-- Instructions Banner -->
            <div class="instructions-banner">
              <div class="banner-content">
                <p class="instruction-text">
                  HANDLING INSTRUCTIONS: KEEP REFRIGERATED.
                </p>
                <p class="instruction-text-2">
                  DO NOT SHAKE. FRAGILE. PROTECT FROM LIGHT
                </p>
                
                <div class="icons-row">
                  <span>❄️</span>
                  <span>🍷</span>
                  <span>☂️</span>
                </div>
              </div>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              // Generate QR code with full URL
              const boxUrl = window.location.origin + '/box/${box.boxId}';
              new QRCode(document.getElementById('qrcode'), {
                text: boxUrl,
                width: 180,
                height: 180,
                correctLevel: QRCode.CorrectLevel.H
              });
              
              // Wait for QR code to render, then print
              setTimeout(function() {
                window.print();
                
                // Clean up after printing
                setTimeout(function() {
                  window.parent.document.querySelector('iframe')?.remove();
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
    const item = consolidatedItems.find(i => i.itemId === itemId);
    if (!item) return 0;
    const totalRequired = item.totalQuantity;
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

    const remaining = getRemainingQuantityForItem(selectedItem.itemId);
    if (quantity > remaining) {
      toast.error(`Cannot assign ${quantity}. Only ${remaining} remaining.`);
      return;
    }

    setBoxes(prev => prev.map(box => {
      if (box.id === selectedBox.id) {
        const existingIdx = box.items.findIndex(i => i.itemId === selectedItem.itemId);
        if (existingIdx >= 0) {
          const updatedItems = [...box.items];
          updatedItems[existingIdx].quantity += quantity;
          return { ...box, items: updatedItems };
        } else {
          return {
            ...box,
            items: [...box.items, {
              itemId: selectedItem.itemId,
              itemCode: selectedItem.itemCode,
              itemName: selectedItem.itemName,
              quantity: quantity,
              billBreakdown: selectedItem.bills,
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
    const selectableItems = consolidatedItems.filter(item => {
      const remaining = getRemainingQuantityForItem(item.itemId);
      return remaining > 0;
    });

    if (selectedItems.length === selectableItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(selectableItems.map(item => item.itemId));
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
          const item = consolidatedItems.find(i => i.itemId === itemId);
          if (!item) return;

          const remaining = getRemainingQuantityForItem(itemId);
          if (remaining <= 0) return;

          const existingIdx = newItems.findIndex(i => i.itemId === itemId);
          if (existingIdx >= 0) {
            newItems[existingIdx].quantity += remaining;
          } else {
            newItems.push({
              itemId: item.itemId,
              itemName: item.itemName,
              itemCode: item.itemCode,
              quantity: remaining,
              billBreakdown: item.bills,
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

    const remaining = getRemainingQuantityForItem(draggedItem.itemId);
    
    if (remaining <= 0) {
      toast.error("All items already assigned");
      setDraggedItem(null);
      return;
    }

    const quantityToAssign = remaining;

    setBoxes(prev => prev.map(b => {
      if (b.id === box.id) {
        const existingIdx = b.items.findIndex(i => i.itemId === draggedItem.itemId);
        if (existingIdx >= 0) {
          const updatedItems = [...b.items];
          updatedItems[existingIdx].quantity += quantityToAssign;
          return { ...b, items: updatedItems };
        } else {
          return {
            ...b,
            items: [...b.items, {
              itemId: draggedItem.itemId,
              itemCode: draggedItem.itemCode,
              itemName: draggedItem.itemName,
              quantity: quantityToAssign,
              billBreakdown: draggedItem.bills,
            }]
          };
        }
      }
      return b;
    }));

    toast.success(`Assigned ${quantityToAssign} ${draggedItem.itemName} to ${box.boxId}`);
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

    consolidatedItems.forEach(item => {
      const remaining = getRemainingQuantityForItem(item.itemId);
      if (remaining > 0) {
        validationErrors.push(`Item "${item.itemName}" has ${remaining} units unassigned`);
      } else if (remaining < 0) {
        validationErrors.push(`Item "${item.itemName}" is over-assigned by ${Math.abs(remaining)} units`);
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
          bill_breakdown: item.billBreakdown,
        }))
      }));

      const response = await api.post("/sales/packing/complete-consolidated-packing/", {
        invoice_numbers: billIds,
        customer_name: customerName,
        boxes: boxData,
      });

      toast.success("Consolidated packing completed successfully!");
      
      const consolidatedId = response.data?.data?.consolidated_id || response.data?.consolidated_id || `C-${Date.now()}`;
      
      const firstBill = bills[0];
      const customerPhone = firstBill?.customer_phone || firstBill?.customer?.phone1 || firstBill?.customer?.phone || "";
      const deliveryAddress = firstBill?.delivery_address || firstBill?.customer?.address1 || firstBill?.customer?.address || "";
      
      const consolidatedPackingData = {
        invoice_no: consolidatedId,
        customer_name: customerName,
        customer_phone: customerPhone,
        delivery_address: deliveryAddress,
        related_bills: billIds,
        boxes: boxes.map(box => ({
          box_id: box.boxId,
          items: box.items.map(item => ({
            item_name: item.itemName,
            item_code: item.itemCode,
            quantity: item.quantity,
          }))
        }))
      };
      
      navigate(getPath(`/packing/print-labels/${consolidatedId}`), {
        state: { consolidatedData: consolidatedPackingData }
      });
      
    } catch (err) {
      console.error("Complete packing error:", err);
      console.error("Error response:", err.response?.data);
      
      const errorData = err.response?.data;
      if (errorData?.errors) {
        const errorMessages = Object.entries(errorData.errors)
          .map(([field, messages]) => {
            if (Array.isArray(messages)) {
              return messages.join(', ');
            }
            return messages;
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
          <p className="mt-4 text-gray-600">Loading bills details...</p>
        </div>
      </div>
    );
  }

  if (bills.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">No bills found</p>
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
      <div className="max-w-7xl mx-auto px-2 py-3">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Consolidated Packing – Customer Level</h1>
              <p className="text-sm text-gray-600">
                {customerName && customerName !== "No customer name" 
                  ? "Packing multiple bills for the same customer"
                  : "Packing multiple bills together"}
              </p>
            </div>
          </div>

          {/* Customer Info */}
          <div className="border-t pt-3 space-y-1 text-sm mb-3">
            <p><strong>Customer:</strong> {customerName || "No customer name"}</p>
            <p><strong>Delivery Address:</strong> {bills[0]?.delivery_address || bills[0]?.customer?.address1 || bills[0]?.customer?.address || 'No address provided'}</p>
          </div>

          {/* Bill Numbers */}
          <div className="border-t pt-3">
            <p className="text-sm font-semibold text-gray-700 mb-2">Related Bills ({bills.length}):</p>
            <div className="flex flex-wrap gap-2">
              {bills.map(bill => (
                <span 
                  key={bill.invoice_no} 
                  className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm font-semibold"
                >
                  #{bill.invoice_no}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* RE_INVOICED Status Banner */}
        {hasReInvoicedStatus && (
          <div className="bg-teal-50 border border-teal-300 rounded-lg p-3 mb-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-bold text-teal-900 text-base mb-1">Invoices Corrected & Ready</h3>
              <p className="text-sm text-teal-800">One or more invoices have been corrected. Continue packing!</p>
            </div>
          </div>
        )}

        {/* REVIEW Status Banner */}
        {hasReviewStatus && (
          <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 mb-4 flex items-start gap-3">
            <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-bold text-orange-900 text-base mb-2">Invoices Sent to Billing Review</h3>
              <div className="bg-white rounded-lg p-2 border border-orange-200">
                <p className="text-xs text-orange-700">
                  One or more invoices in this consolidated packing are under review. You'll be notified when the billing team corrects them.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Saved Issues Section */}
        {hasIssues && !hasReviewStatus && (
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
                  <p className="text-orange-600 text-[10px] mt-0.5">
                    Affects: {issue.bills.map(b => b.billNo).join(', ')}
                  </p>
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
          hasReviewStatus ? 'opacity-50 pointer-events-none' : 'opacity-100'
        }`}>
          {/* Consolidated Items List */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-gray-800">
                  Combined Items ({consolidatedItems.length})
                </h2>
              </div>
              <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedItems.length > 0 && selectedItems.length === consolidatedItems.filter(item => getRemainingQuantityForItem(item.itemId) > 0).length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-teal-600 rounded focus:ring-2 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  {selectedItems.length > 0 
                    ? `${selectedItems.length} items selected - Click to deselect all`
                    : "Select All Items"}
                </span>
              </label>
            </div>
            
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {consolidatedItems.map((item) => {
                // Disable interactions when in review
                const isDisabled = hasReviewStatus;
                const totalRequired = item.totalQuantity;
                const totalAssigned = getTotalAssignedForItem(item.itemId);
                const remaining = totalRequired - totalAssigned;
                const isFullyAssigned = remaining === 0;
                const isOverAssigned = remaining < 0;
                const isSelected = selectedItems.includes(item.itemId);

                return (
                  <div
                    key={item.itemId}
                    draggable={!isFullyAssigned && !isDisabled}
                    onDragStart={(e) => !isFullyAssigned && !isDisabled && handleDragStart(e, item)}
                    onDragEnd={handleDragEnd}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isDisabled
                        ? "cursor-not-allowed"
                        : isFullyAssigned
                        ? "cursor-not-allowed"
                        : "cursor-move"
                    } ${
                      isDisabled
                        ? "border-gray-200 bg-gray-50"
                        : isSelected
                        ? "border-teal-500 bg-teal-50"
                        : selectedItem?.itemId === item.itemId
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
                            toggleItemSelection(item.itemId);
                          }}
                          disabled={isDisabled}
                          className="w-4 h-4 text-teal-600 rounded flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      )}
                      <div 
                        className="flex items-center justify-between flex-1 min-w-0"
                        onClick={() => !isFullyAssigned && !isDisabled && setSelectedItem(item)}
                        style={{ cursor: isDisabled ? 'not-allowed' : (!isFullyAssigned ? 'pointer' : 'default') }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 truncate">
                            {item.itemName}
                          </p>
                          {(item.itemCode || item.code || item.item_code) && (
                            <p className="text-xs text-gray-600">Code: {item.itemCode || item.code || item.item_code}</p>
                          )}
                          
                          {/* Item Details */}
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                            {item.mrp && (
                              <span className="flex items-center gap-1">
                                <span className="font-semibold">MRP:</span>
                                <span className="text-green-700 font-bold">₹{parseFloat(item.mrp).toFixed(2)}</span>
                              </span>
                            )}
                            {(item.batchNumber || item.batch_number || item.batch) && (
                              <span className="flex items-center gap-1">
                                <span className="font-semibold">Batch:</span>
                                <span>{item.batchNumber || item.batch_number || item.batch}</span>
                              </span>
                            )}
                            {(item.expiryDate || item.expiry_date) && (
                              <span className="flex items-center gap-1">
                                <span className="font-semibold">Exp:</span>
                                <span className="text-orange-700">{new Date(item.expiryDate || item.expiry_date).toLocaleDateString('en-GB')}</span>
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
                    
                    {/* Bill breakdown */}
                    <div className="mb-2 text-xs text-gray-600">
                      <span className="font-semibold">From bills:</span>{" "}
                      {item.bills.map((b, idx) => (
                        <span key={idx}>
                          #{b.billNo} ({formatQuantity(b.quantity, 'pcs')})
                          {idx < item.bills.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Total Required:</span>
                      <span className="font-bold">{formatQuantity(totalRequired, 'pcs')}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Assigned:</span>
                      <span className={`font-bold ${
                        isFullyAssigned ? "text-green-600" : 
                        isOverAssigned ? "text-red-600" : 
                        "text-amber-600"
                      }`}>
                        {formatQuantity(totalAssigned, 'pcs')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Remaining:</span>
                      <span className={`font-bold ${
                        isFullyAssigned ? "text-green-600" : 
                        isOverAssigned ? "text-red-600" : 
                        "text-amber-600"
                      }`}>
                        {formatQuantity(remaining, 'pcs')}
                      </span>
                    </div>
                    
                    {/* Report Issue Button */}
                    {!hasReviewStatus && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isDisabled) openReviewPopup(item);
                        }}
                        disabled={isDisabled}
                        className={`w-full mt-3 py-2.5 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 border disabled:opacity-50 disabled:cursor-not-allowed ${
                          savedIssues.find(i => i.item === item.itemName)
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
                <h3 className="font-semibold text-teal-900 text-base mb-3">
                  Assign {selectedItems.length} Item{selectedItems.length > 1 ? 's' : ''} to Box
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
                      {selectedItem.itemName}
                    </p>
                    <p className="text-xs text-gray-600">
                      Left: {formatQuantity(getRemainingQuantityForItem(selectedItem.itemId), 'pcs')}
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
                    disabled={hasReviewStatus}
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
                  boxes.map(box => (
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
                              {!completedBoxes.has(box.id) && (
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
                    {!completedBoxes.has(box.id) ? (
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
                )))}
              </div>
            </div>
          </div>
        </div>

        {/* Complete Button - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex gap-3">
              {/* Send to Review Button */}
              {hasIssues && !hasReviewStatus && (
                <button
                  onClick={handleSendInvoiceToReview}
                  disabled={loading}
                  className="flex-1 py-3.5 bg-orange-600 text-white rounded-lg text-lg font-bold hover:bg-orange-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Send All to Review ({savedIssues.length})
                </button>
              )}
              
              {/* Complete Packing Button */}
              <button
                onClick={handleCompletePacking}
                disabled={completing || (hasIssues && !hasReInvoicedStatus) || hasReviewStatus}
                className={`py-3.5 rounded-lg text-lg font-bold transition-all shadow-lg disabled:opacity-50 ${
                  hasIssues ? 'flex-1' : 'w-full'
                } ${
                  (hasIssues && !hasReInvoicedStatus) || hasReviewStatus
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
                title={(hasIssues && !hasReInvoicedStatus) || hasReviewStatus ? "Resolve issues first or send to review" : ""}
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
                    {hasIssues ? "Resolve Issues First" : hasReviewStatus ? "Under Review" : "Mark as PACKED & Ready"}
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
                  <p className="font-semibold text-xs text-gray-900">{reviewPopup.item?.itemName}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{reviewPopup.item?.itemCode}</p>
                  {reviewPopup.item?.bills && (
                    <p className="text-[10px] text-gray-600 mt-1">
                      Affects: {reviewPopup.item.bills.map(b => `#${b.billNo}`).join(', ')}
                    </p>
                  )}
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