import { useEffect, useState } from "react";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";
import { getActivePickingTask } from "../../../services/sales";

export default function MyInvoiceListPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [pickedItems, setPickedItems] = useState({});
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [completedInvoices, setCompletedInvoices] = useState([]);
  const [reviewPopup, setReviewPopup] = useState({ open: false, item: null });
  const [reviewChecks, setReviewChecks] = useState({});
  const [otherIssueNotes, setOtherIssueNotes] = useState("");
  const [savedIssues, setSavedIssues] = useState([]);
  const isReviewInvoice = activeInvoice?.status === "REVIEW";

  const { user } = useAuth();

  useEffect(() => {
    loadActivePicking();
    loadTodayCompletedPicking();
  }, []);

  const loadActivePicking = async () => {
    try {
      setLoading(true);
      const res = await getActivePickingTask();
      if (res.data?.data) {
        const task = res.data.data;
        setActiveInvoice({ ...task.invoice, created_at: task.start_time });
        if (task.invoice.status === "REVIEW") {
          setPickedItems({});
        }
      } else {
        setActiveInvoice(null);
      }
    } catch (err) {
      console.error("Failed to load active picking task", err);
      setActiveInvoice(null);
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
    setPickedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const openReviewPopup = (item) => {
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
      alert("Select at least one issue");
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


    closeReviewPopup();
  };

  const handleSendInvoiceToReview = async () => {
    if (!activeInvoice) return;

    if (!savedIssues.length) {
      alert("No saved issues to send.");
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

      alert("Invoice sent to billing review");

      setSavedIssues([]);
      await loadActivePicking();
      await loadTodayCompletedPicking();
    } catch (err) {
      console.error("Return error:", err.response?.status, err.response?.data);
      alert(err.response?.data?.message || "Failed to send invoice to review");
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
    if (!allItemsPicked || !activeInvoice) return;
    if (!user?.email) {
      alert("User email not found");
      return;
    }
    try {
      setLoading(true);
      await api.post("/sales/picking/complete/", {
        invoice_no: activeInvoice.invoice_no,
        user_email: user.email,
        notes: "Picked all items",
      });
      await loadActivePicking();
      await loadTodayCompletedPicking();
      setPickedItems({});
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to complete picking");
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

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-800">My Picked Invoices</h1>
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
              className={`rounded-lg border-2 shadow overflow-hidden transition
                ${
                  isReviewInvoice
                    ? "bg-gray-100 border-gray-400 opacity-70 cursor-not-allowed"
                    : "bg-white border-teal-500"
                }
              `}
            >
              {/* Compact Header */}
              <div
                onClick={() => {
                  if (!isReviewInvoice) {
                    setExpandedInvoice(
                      expandedInvoice === activeInvoice.id ? null : activeInvoice.id
                    );
                  }
                }}
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
                        {activeInvoice.customer?.name} • {pickedCount}/{totalItems} picked
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();   // ⛔ stop bubbling to parent
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
                  {isReviewInvoice && activeInvoice.return_info && (
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
                    <div
                      key={item.id}
                      onClick={() => {
                        if (!isReviewInvoice) toggleItemPicked(item.id);
                      }}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        pickedItems[item.id]
                          ? "bg-teal-50 border-teal-300"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        {/* Checkbox */}
                        <div
                          onClick={() => {
                            if (!isReviewInvoice) toggleItemPicked(item.id);
                          }}
                          className="cursor-pointer"
                        >
                          <div
                            className={`w-8 h-8 rounded flex items-center justify-center ${
                              pickedItems[item.id]
                                ? "bg-teal-600"
                                : "bg-white border-2 border-gray-300"
                            }`}
                          >
                            <svg
                              className={`w-4 h-4 ${
                                pickedItems[item.id] ? "text-white" : "text-gray-400"
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
                            </div>
                            <div className="text-right ml-2">
                              <span className="font-bold text-gray-900">
                                {item.quantity}
                              </span>
                              <span className="text-xs text-gray-500 ml-1">pcs</span>
                            </div>
                          </div>
                          
                          {/* Ultra-compact meta row */}
                          <div className="mt-1 text-[11px] text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
                            <span>
                              📍 <b>{item.shelf_location || "—"}</b>
                            </span>
                            <span>
                              Pack: <b>{item.packing || "—"}</b>
                            </span>
                            <span>
                              Qty: <b>{item.quantity}</b>
                            </span>
                            <span>
                              MRP: <b>₹{item.mrp || "—"}</b>
                            </span>
                            <span>
                              Batch: <b>{item.batch_no || "—"}</b>
                            </span>
                            <span>
                              Exp:{" "}
                              <b>
                                {item.expiry_date
                                  ? new Date(item.expiry_date).toLocaleDateString("en-GB")
                                  : "—"}
                              </b>
                            </span>
                          </div>
                        </div>

                        {/* Report Issue Button */}
                        <button
                          disabled={isReviewInvoice}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isReviewInvoice) openReviewPopup(item);
                          }}
                          className={`p-2 rounded-lg transition
                            ${
                              isReviewInvoice
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-orange-600 hover:bg-orange-50"
                            }
                          `}
                          title={isReviewInvoice ? "Invoice under review" : "Report Issue"}
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
                      disabled={!hasIssues || isReviewInvoice}
                      className={`flex-1 py-3 font-semibold rounded-lg transition-all ${
                        hasIssues
                          ? "bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      Send Invoice to Review
                    </button>
                    <button
                      onClick={handleCompletePicking}
                      disabled={!allItemsPicked || hasIssues || isReviewInvoice}
                      className={`flex-1 py-3 font-semibold rounded-lg transition-all ${
                        allItemsPicked && !hasIssues
                          ? "bg-teal-600 hover:bg-teal-700 text-white"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {isReviewInvoice
                        ? "Invoice Under Review"
                        : hasIssues
                          ? "Resolve Issues First"
                          : allItemsPicked
                            ? "Complete Picking"
                            : `Pick ${totalItems - pickedCount} More`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completed Bills Section with Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Section Header */}
          <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-teal-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-gray-700">
              Completed Invoices Today
            </h2>
          </div>

          {completedInvoices.length === 0 ? (
            <div className="text-center py-16">
              <svg
                className="w-16 h-16 mx-auto text-gray-300 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-gray-500 text-lg">No completed invoices yet</p>
              <p className="text-gray-400 text-sm mt-1">
                Completed invoices will appear here
              </p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 text-sm font-semibold">
                  <div className="col-span-2">Invoice Number</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-2">Start Time</div>
                  <div className="col-span-2">End Time</div>
                  <div className="col-span-2">Duration</div>
                  <div className="col-span-2">Status</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200">
                {completedInvoices.map((inv) => (
                  <div key={inv.id}>
                    {/* Main Row */}
                    <div
                      className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => toggleExpand(inv.id)}
                    >
                      <div className="col-span-2 font-semibold text-gray-900">
                        #{inv.invoice_no}
                      </div>
                      <div className="col-span-2 text-gray-600">
                        {formatDate(inv.start_time)}
                      </div>
                      <div className="col-span-2 text-gray-600">
                        {formatTime(inv.start_time)}
                      </div>
                      <div className="col-span-2 text-gray-600">
                        {formatTime(inv.end_time)}
                      </div>
                      <div className="col-span-2 text-gray-600">
                        {inv.duration != null
                          ? (() => {
                              const mins = Math.floor(inv.duration);
                              const secs = Math.round((inv.duration - mins) * 60);
                              return `${mins} min ${secs} sec`;
                            })()
                          : "-"}
                      </div>
                      <div className="col-span-2 flex items-center justify-center gap-2">
                        <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-md text-xs font-semibold uppercase tracking-wide">
                          PICKED
                        </span>
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${
                            expandedInvoice === inv.id ? "rotate-180" : ""
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
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedInvoice === inv.id && (
                      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                        {/* Customer Details */}
                        <div className="mb-4">
                          <h3 className="text-sm font-semibold text-gray-700 mb-2">
                            Customer Details
                          </h3>
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Name</p>
                                <p className="font-medium text-gray-900">
                                  {inv.customer_name || "-"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Phone</p>
                                <p className="font-medium text-gray-900">
                                  {inv.customer_phone || "-"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Address</p>
                                <p className="font-medium text-gray-900">
                                  {inv.customer_address || "-"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Items Picked */}
                        <div>
                          <h3 className="text-sm font-semibold text-gray-700 mb-2">
                            Items Picked ({inv.items?.length || 0})
                          </h3>
                          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            {inv.items && inv.items.length > 0 ? (
                              <div className="divide-y divide-gray-200">
                                {inv.items.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-gray-50"
                                  >
                                    <div className="col-span-6">
                                      <p className="font-medium text-gray-900">
                                        {item.name || item.item_name}
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        SKU: {item.sku || item.item_code || "N/A"}
                                      </p>
                                    </div>
                                    <div className="col-span-6 text-right">
                                      <p className="font-bold text-gray-900">
                                        {item.quantity || item.qty}{" "}
                                        <span className="text-sm font-normal text-gray-500">
                                          pcs
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                                No items data available
                              </div>
                            )}
                          </div>
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