import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  Calendar,
  MapPin,
  User,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  ChevronDown,
  ChevronUp,
  Phone,
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { getMyAssignedVisits } from "../../../services/followup";

function formatCurrency(val) {
  const n = parseFloat(val || 0);
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

// ── Collapsed Calendar Strip ───────────────────────────────
function CalendarStrip({ visits, selectedDate, onDateSelect }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDate) {
      const [y, m] = selectedDate.split("-").map(Number);
      return new Date(y, m - 1);
    }
    return new Date();
  });

  const visitDates = new Set();
  visits.forEach((visit) => {
    if (!visit.bill_details) return;
    visit.bill_details.forEach((bill) => {
      if (bill.payment_date) visitDates.add(bill.payment_date.split("T")[0]);
      if (bill.next_collection_date) visitDates.add(bill.next_collection_date.split("T")[0]);
    });
  });

  const today = new Date().toISOString().split("T")[0];
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthLabel = currentMonth.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const toDateStr = (d) =>
    d ? `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}` : null;

  const selectedLabel = selectedDate
    ? new Date(...selectedDate.split("-").map((v, i) => i === 1 ? Number(v) - 1 : Number(v))).toLocaleDateString("en-IN", {
        weekday: "short", day: "numeric", month: "short",
      })
    : "Select date";

  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      border: "1px solid #e5e7eb",
      overflow: "hidden",
      marginBottom: 10,
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      {/* Collapsed header */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "#f0fdfa", display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Calendar size={15} color="#0d9488" />
          </div>
          <div style={{ textAlign: "left" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#111827", margin: 0 }}>{selectedLabel}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {selectedDate !== today && (
            <button
              onClick={(e) => { e.stopPropagation(); onDateSelect(today); }}
              style={{
                fontSize: 10, fontWeight: 600, color: "#0d9488",
                background: "#f0fdfa", border: "1px solid #99f6e4",
                borderRadius: 6, padding: "2px 7px", cursor: "pointer",
              }}
            >
              Today
            </button>
          )}
          {isExpanded
            ? <ChevronUp size={14} color="#6b7280" />
            : <ChevronDown size={14} color="#6b7280" />
          }
        </div>
      </button>

      {/* Expanded calendar */}
      {isExpanded && (
        <div style={{ borderTop: "1px solid #f3f4f6" }}>
          {/* Month nav */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "7px 12px", background: "#f0fdfa",
          }}>
            <button
              onClick={() => setCurrentMonth(new Date(year, month - 1))}
              style={{ width: 26, height: 26, borderRadius: 7, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <ChevronLeft size={13} color="#0d9488" />
            </button>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>{monthLabel}</span>
            <button
              onClick={() => setCurrentMonth(new Date(year, month + 1))}
              style={{ width: 26, height: 26, borderRadius: 7, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <ChevronRight size={13} color="#0d9488" />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", padding: "4px 6px 1px" }}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: "#9ca3af", padding: "3px 0" }}>{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", padding: "1px 6px 8px", gap: 1 }}>
            {days.map((day, idx) => {
              const dateStr = toDateStr(day);
              const hasVisit = dateStr && visitDates.has(dateStr);
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === today;

              return (
                <button
                  key={idx}
                  disabled={!day}
                  onClick={() => { if (day) { onDateSelect(dateStr); setIsExpanded(false); } }}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 8,
                    border: isToday && !isSelected ? "1.5px solid #d1d5db" : "none",
                    background: isSelected ? "#0d9488"
                      : hasVisit ? "#f0fdfa"
                      : "none",
                    color: isSelected ? "#fff"
                      : hasVisit ? "#0d9488"
                      : day ? "#374151" : "transparent",
                    fontSize: 11,
                    fontWeight: isSelected || hasVisit ? 700 : 400,
                    cursor: day ? "pointer" : "default",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    padding: 1,
                  }}
                >
                  <span>{day}</span>
                  {hasVisit && (
                    <span style={{
                      width: 3, height: 3, borderRadius: "50%",
                      background: isSelected ? "rgba(255,255,255,0.7)" : "#0d9488",
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Bill Details Modal ─────────────────────────────────────
function BillDetailsModal({ bills, clientName, onClose, onSave, visitId = null, isVisited = false, onMarkVisited = null }) {
  const [collections, setCollections] = useState(() =>
    Object.fromEntries(
      bills.map((b) => {
        const alreadyCollected = parseFloat(b.collected_amount || 0);
        const billAmt = parseFloat(b.amount || 0);
        const remaining = alreadyCollected > 0 ? billAmt - alreadyCollected : billAmt;
        return [b.id, {
          collected: "",
          remaining: alreadyCollected > 0 ? String(remaining.toFixed(2)) : "",
          remaining_date: b.next_collection_date ? b.next_collection_date.split("T")[0] : "",
          remarks: b.remarks || "",
        }];
      })
    )
  );
  const [saving, setSaving] = useState(false);
  const [extraEntries, setExtraEntries] = useState([]);

  if (!bills) return null;

  const total = bills.reduce((s, b) => {
    const billAmt = parseFloat(b.amount || 0);
    const alreadyCollected = parseFloat(b.collected_amount || 0);
    return s + (billAmt - alreadyCollected);
  }, 0);
  const originalTotal = bills.reduce((s, b) => s + parseFloat(b.amount || 0), 0);

  const setField = (billId, field, value) =>
    setCollections((prev) => ({ ...prev, [billId]: { ...prev[billId], [field]: value } }));

  const hasAnyCollection = Object.values(collections).some((c) => c.collected && parseFloat(c.collected) > 0);
  const extraTotal = extraEntries.reduce((sum, entry) => sum + parseFloat(entry.amount || 0), 0);
  const hasExtraEntries = extraEntries.some((entry) => parseFloat(entry.amount || 0) > 0);

  const isRescheduled = (bill) => !!bill.next_collection_date;

  const isBillFieldLocked = (bill, field) => {
    if (!isVisited) return false;
    if (isRescheduled(bill)) return field !== "remaining_date" && field !== "remarks";
    return true;
  };

  const addExtraEntry = () =>
    setExtraEntries((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, amount: "", remarks: "" }]);

  const updateExtraEntry = (entryId, field, value) =>
    setExtraEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, [field]: value } : e)));

  const removeExtraEntry = (entryId) =>
    setExtraEntries((prev) => prev.filter((e) => e.id !== entryId));

  const handleSave = async () => {
    for (const bill of bills) {
      const originalAmt = parseFloat(bill.amount || 0);
      const alreadyCollected = parseFloat(bill.collected_amount || 0);
      const remainingToCollect = originalAmt - alreadyCollected;
      const col = parseFloat(collections[bill.id]?.collected || 0);
      const isPartial = col > 0 && remainingToCollect - col > 0;
      if (isPartial && !collections[bill.id]?.remaining_date) {
        toast.error(`Next Collection Date required for partial (Invoice: ${bill.invoice_no})`);
        return;
      }
    }
    setSaving(true);
    try {
      const { saveCollectionDetails } = await import("../../../services/followup");
      await saveCollectionDetails({
        collections,
        extra_entries: extraEntries.filter((e) => parseFloat(e.amount || 0) > 0),
      });
      toast.success("Collection details saved!");
      if (onSave) await onSave();
      if (!isVisited && onMarkVisited) await onMarkVisited();
      else onClose();
    } catch (error) {
      const errorMsg = error?.response?.data?.error || error?.message || "Failed to save";
      toast.error(`Error: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }}>
      <div style={{
        width: "100%", maxWidth: 520,
        borderRadius: "16px 16px 0 0",
        background: "#fff",
        maxHeight: "88vh",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
          <div style={{ width: 32, height: 3, borderRadius: 2, background: "#d1d5db" }} />
        </div>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 14px 10px", borderBottom: "1px solid #f3f4f6",
        }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>{clientName}</p>
            <p style={{ fontSize: 10, color: "#9ca3af", margin: "1px 0 0" }}>
              {bills.length} bill{bills.length !== 1 ? "s" : ""} · {formatCurrency(total)} to collect
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "#f3f4f6", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <X size={13} color="#6b7280" />
          </button>
        </div>

        {/* Bills */}
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
          {bills.map((bill, billIdx) => {
            const isEven = billIdx % 2 === 0;
            const palette = {
              bg: isEven ? "#ffffff" : "#f0fdfa",
              border: isEven ? "#e5e7eb" : "#99f6e4",
              accent: "#0d9488",
            };
            const originalAmt = parseFloat(bill.amount || 0);
            const alreadyCollected = parseFloat(bill.collected_amount || 0);
            const remainingToCollect = originalAmt - alreadyCollected;
            const col = parseFloat(collections[bill.id]?.collected || 0);
            const remStr = collections[bill.id]?.remaining;
            const rem = remStr !== "" && remStr !== undefined
              ? parseFloat(remStr)
              : col > 0 ? remainingToCollect - col : remainingToCollect;
            const isFullyPaid = col >= remainingToCollect && col > 0;
            const billRescheduled = isRescheduled(bill);

            return (
              <div key={bill.id} style={{
                borderRadius: 10,
                border: `1.5px solid ${palette.border}`,
                background: palette.bg,
              }}>
                {/* Bill header */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px 7px",
                  background: palette.bg,
                  borderBottom: `1px solid ${palette.border}`,
                  borderRadius: "8px 8px 0 0",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FileText size={13} color={palette.accent} />
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#111827", margin: 0, fontFamily: "monospace" }}>
                        {bill.invoice_no}
                      </p>
                      <p style={{ fontSize: 9, color: "#9ca3af", margin: 0 }}>
                        {bill.invoice_date
                          ? new Date(bill.invoice_date).toLocaleDateString("en-IN")
                          : "—"}
                        {bill.payment_date && ` · Due ${new Date(bill.payment_date).toLocaleDateString("en-IN")}`}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: palette.accent, margin: 0 }}>
                      {formatCurrency(remainingToCollect)}
                    </p>
                    {alreadyCollected > 0 && (
                      <p style={{ fontSize: 9, color: "#9ca3af", margin: 0 }}>
                        Prev: {formatCurrency(alreadyCollected)}
                      </p>
                    )}
                    {billRescheduled && (
                      <span style={{
                        display: "inline-block", marginTop: 1,
                        background: "#fff7ed", color: "#ea580c",
                        fontSize: 8, fontWeight: 700,
                        padding: "1px 5px", borderRadius: 5,
                        border: "1px solid #fed7aa",
                      }}>Rescheduled</span>
                    )}
                  </div>
                </div>

                {/* Inputs */}
                <div style={{ padding: "8px 12px 10px", display: "flex", flexDirection: "column", gap: 7 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                    <div>
                      <label style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 3 }}>
                        Collected (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={originalAmt}
                        placeholder="0"
                        value={collections[bill.id]?.collected ?? ""}
                        onChange={(e) => {
                          let val = parseFloat(e.target.value || 0);
                          if (val > originalAmt) val = originalAmt;
                          setField(bill.id, "collected", val.toString());
                          const rem = Math.max(0, originalAmt - val);
                          setField(bill.id, "remaining", rem.toFixed(2));
                        }}
                        disabled={isBillFieldLocked(bill, "collected")}
                        style={{
                          width: "100%", boxSizing: "border-box",
                          padding: "6px 8px",
                          border: `1.5px solid ${palette.border}`,
                          borderRadius: 8,
                          fontSize: 12, fontWeight: 600,
                          background: isBillFieldLocked(bill, "collected") ? "#f9fafb" : "#fff",
                          color: "#111827",
                          outline: "none",
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 3 }}>
                        Remaining (₹)
                      </label>
                      <div style={{
                        padding: "6px 8px",
                        borderRadius: 8,
                        border: `1.5px solid ${isFullyPaid ? "#bbf7d0" : col > 0 ? "#fed7aa" : palette.border}`,
                        background: isFullyPaid ? "#f0fdf4" : col > 0 ? "#fff7ed" : "#f9fafb",
                        fontSize: 12, fontWeight: 700,
                        color: isFullyPaid ? "#16a34a" : col > 0 ? "#ea580c" : "#6b7280",
                        textAlign: "center",
                      }}>
                        {formatCurrency(rem)}
                      </div>
                    </div>
                  </div>

                  {((col > 0 && !isFullyPaid) || (billRescheduled && isVisited)) && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                      <div>
                        <label style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 3 }}>
                          Next Date {!isVisited && <span style={{ color: "#ef4444" }}>*</span>}
                        </label>
                        <input
                          type="date"
                          value={collections[bill.id]?.remaining_date ?? ""}
                          onChange={(e) => setField(bill.id, "remaining_date", e.target.value)}
                          disabled={isBillFieldLocked(bill, "remaining_date")}
                          style={{
                            width: "100%", boxSizing: "border-box",
                            padding: "6px 8px",
                            border: `1.5px solid ${palette.border}`,
                            borderRadius: 8,
                            fontSize: 11,
                            background: isBillFieldLocked(bill, "remaining_date") ? "#f9fafb" : "#fff",
                            color: "#111827",
                            outline: "none",
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 3 }}>
                          Remarks
                        </label>
                        <input
                          type="text"
                          placeholder="notes…"
                          value={collections[bill.id]?.remarks ?? ""}
                          onChange={(e) => setField(bill.id, "remarks", e.target.value)}
                          disabled={isBillFieldLocked(bill, "remarks")}
                          style={{
                            width: "100%", boxSizing: "border-box",
                            padding: "6px 8px",
                            border: `1.5px solid ${palette.border}`,
                            borderRadius: 8,
                            fontSize: 11,
                            background: isBillFieldLocked(bill, "remarks") ? "#f9fafb" : "#fff",
                            color: "#111827",
                            outline: "none",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {isFullyPaid && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 5,
                      background: "#f0fdf4", border: "1px solid #bbf7d0",
                      borderRadius: 7, padding: "4px 8px",
                    }}>
                      <CheckCircle2 size={12} color="#16a34a" />
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#16a34a" }}>Fully collected</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Extra entries */}
          {extraEntries.map((entry, index) => (
            <div key={entry.id} style={{
              borderRadius: 10,
              border: "1.5px dashed #fed7aa",
              background: "#fff7ed",
              overflow: "hidden",
            }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "7px 12px",
                background: "#ffedd5",
                borderBottom: "1px solid #fed7aa",
              }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#ea580c", margin: 0 }}>
                    Extra Amount #{index + 1}
                  </p>
                  <p style={{ fontSize: 9, color: "#fb923c", margin: 0 }}>Unassigned collection</p>
                </div>
                {!isVisited && (
                  <button
                    onClick={() => removeExtraEntry(entry.id)}
                    style={{ fontSize: 10, fontWeight: 600, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div style={{ padding: "8px 12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  <div>
                    <label style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 3 }}>
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={entry.amount}
                      onChange={(e) => updateExtraEntry(entry.id, "amount", e.target.value)}
                      disabled={isVisited}
                      style={{
                        width: "100%", boxSizing: "border-box",
                        padding: "6px 8px",
                        border: "1.5px solid #fed7aa",
                        borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: isVisited ? "#f9fafb" : "#fff",
                        color: "#111827", outline: "none",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 3 }}>
                      Remarks
                    </label>
                    <input
                      type="text"
                      placeholder="note…"
                      value={entry.remarks}
                      onChange={(e) => updateExtraEntry(entry.id, "remarks", e.target.value)}
                      disabled={isVisited}
                      style={{
                        width: "100%", boxSizing: "border-box",
                        padding: "6px 8px",
                        border: "1.5px solid #fed7aa",
                        borderRadius: 8, fontSize: 11,
                        background: isVisited ? "#f9fafb" : "#fff",
                        color: "#111827", outline: "none",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: "10px 14px",
          borderTop: "1px solid #f3f4f6",
          background: "#fafafa",
          display: "flex", flexDirection: "column", gap: 7,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#ea580c", margin: 0 }}>
                To Collect: {formatCurrency(total)}
              </p>
              {extraTotal > 0 && (
                <p style={{ fontSize: 10, color: "#0d9488", fontWeight: 600, margin: 0 }}>
                  Extra: {formatCurrency(extraTotal)}
                </p>
              )}
              {originalTotal !== total && (
                <p style={{ fontSize: 9, color: "#9ca3af", margin: 0 }}>
                  Original: {formatCurrency(originalTotal)}
                </p>
              )}
            </div>
            {!isVisited && (
              <button
                onClick={addExtraEntry}
                style={{
                  fontSize: 10, fontWeight: 700,
                  color: "#ea580c", background: "#fff7ed",
                  border: "1px solid #fed7aa",
                  borderRadius: 7, padding: "5px 10px", cursor: "pointer",
                }}
              >
                + Extra Entry
              </button>
            )}
          </div>
          {!isVisited && onMarkVisited && (hasAnyCollection || hasExtraEntries) && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: "100%", padding: "11px",
                background: saving ? "#9ca3af" : "#0d9488",
                border: "none", borderRadius: 10,
                color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving…" : "Save & Mark Visited"}
            </button>
          )}
          {isVisited && bills.some((b) => !!b.next_collection_date) && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: "100%", padding: "11px",
                background: saving ? "#9ca3af" : "#ea580c",
                border: "none", borderRadius: 10,
                color: "#fff", fontSize: 13, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving…" : "Update Schedule"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Compact Visit Card ─────────────────────────────────────
function VisitCard({ visit, onViewBills, isVisited = false }) {
  const hasRescheduledBills = visit.bill_details?.some((b) => !!b.next_collection_date);
  const canOpenBills = !isVisited || hasRescheduledBills;
  const phones = [visit.customer_details?.phone1, visit.customer_details?.phone2].filter(Boolean);
  const area = visit.customer_details?.area;

  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      border: isVisited ? "1.5px solid #bbf7d0" : "1.5px solid #e5e7eb",
      overflow: "hidden",
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    }}>
      {/* Top accent bar */}
      <div style={{
        height: 2,
        background: isVisited
          ? "linear-gradient(90deg,#22c55e,#4ade80)"
          : "linear-gradient(90deg,#0d9488,#06b6d4)",
      }} />

      <div style={{ padding: "8px 10px" }}>
        {/* Row 1: name + badges */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 4 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              fontSize: 12, fontWeight: 700, color: "#111827",
              margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {visit.client_name}
            </h3>
            <p style={{ fontSize: 9, color: "#9ca3af", margin: 0, fontFamily: "monospace" }}>
              {visit.client_code}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
            {isVisited && (
              <span style={{
                background: "#f0fdf4", color: "#16a34a",
                fontSize: 9, fontWeight: 700,
                padding: "1px 6px", borderRadius: 5,
                border: "1px solid #bbf7d0",
              }}>✓ Done</span>
            )}
            <span style={{
              background: isVisited ? "#f0fdf4" : "#f0fdfa",
              color: isVisited ? "#16a34a" : "#0d9488",
              fontSize: 9, fontWeight: 700,
              padding: "1px 6px", borderRadius: 5,
              border: isVisited ? "1px solid #bbf7d0" : "1px solid #99f6e4",
            }}>
              {visit.bill_count} bill{visit.bill_count !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Row 2: area + phone inline */}
        {(area || phones.length > 0) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, flexWrap: "wrap" }}>
            {area && (
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <MapPin size={10} color="#0d9488" />
                <span style={{ fontSize: 10, color: "#6b7280" }}>{area}</span>
              </div>
            )}
            {phones.slice(0, 1).map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <Phone size={10} color="#6b7280" />
                <span style={{ fontSize: 10, color: "#6b7280", fontFamily: "monospace" }}>{p}</span>
              </div>
            ))}
          </div>
        )}

        {/* Row 3: amounts + action */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            flex: 1,
            background: "#f0fdfa", borderRadius: 7, padding: "4px 8px",
            textAlign: "center",
          }}>
            <p style={{ fontSize: 8, color: "#6b7280", fontWeight: 600, margin: 0, textTransform: "uppercase" }}>Total</p>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#0d9488", margin: 0 }}>
              {formatCurrency(visit.total_amount)}
            </p>
          </div>
          {visit.promised_amount && (
            <div style={{
              flex: 1,
              background: "#fff7ed", borderRadius: 7, padding: "4px 8px",
              textAlign: "center",
            }}>
              <p style={{ fontSize: 8, color: "#6b7280", fontWeight: 600, margin: 0, textTransform: "uppercase" }}>Promised</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#ea580c", margin: 0 }}>
                {formatCurrency(visit.promised_amount)}
              </p>
            </div>
          )}
          <button
            onClick={() => onViewBills(visit)}
            disabled={!canOpenBills}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "7px 11px",
              background: !canOpenBills ? "#f3f4f6"
                : isVisited ? "#fff7ed"
                : "#0d9488",
              border: "none", borderRadius: 8,
              color: !canOpenBills ? "#9ca3af"
                : isVisited ? "#ea580c"
                : "#fff",
              fontSize: 11, fontWeight: 700,
              cursor: canOpenBills ? "pointer" : "not-allowed",
              flexShrink: 0,
            }}
          >
            <Eye size={12} />
            {isVisited
              ? hasRescheduledBills ? "Resched." : "Visited"
              : "Bills"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function MyAssignedVisitsPage() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBills, setSelectedBills] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => { loadVisits(); }, []);

  const loadVisits = async () => {
    setLoading(true);
    try {
      const response = await getMyAssignedVisits();
      const results = response.data.results || [];
      setVisits(results);
      if (results.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const todayHasVisits = results.some((v) =>
          v.bill_details?.some((b) => {
            const pMatch = b.payment_date && b.payment_date.split("T")[0] === today;
            const cMatch = b.next_collection_date && b.next_collection_date.split("T")[0] === today;
            return pMatch || cMatch;
          })
        );
        if (!todayHasVisits) {
          const allDates = results
            .flatMap((v) => v.bill_details || [])
            .flatMap((b) => [b.payment_date, b.next_collection_date])
            .filter(Boolean).map((d) => d.split("T")[0]).sort();
          if (allDates.length > 0) setSelectedDate(allDates[0]);
        }
      }
    } catch {
      toast.error("Failed to load assigned visits");
    } finally {
      setLoading(false);
    }
  };

  const visitsForDate = visits.filter((v) =>
    v.bill_details?.some((b) => {
      const pMatch = b.payment_date && b.payment_date.split("T")[0] === selectedDate;
      const cMatch = b.next_collection_date && b.next_collection_date.split("T")[0] === selectedDate;
      return pMatch || cMatch;
    })
  );

  const formattedDate = (() => {
    if (!selectedDate) return "";
    const [y, m, d] = selectedDate.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long",
    });
  })();

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {selectedBills && (
        <BillDetailsModal
          bills={selectedBills.bills}
          clientName={selectedBills.clientName}
          onClose={() => setSelectedBills(null)}
          onSave={loadVisits}
          visitId={selectedBills.visitId}
          isVisited={selectedBills.isVisited}
          onMarkVisited={selectedBills.onMarkVisited}
        />
      )}

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "12px 12px" }}>
        {/* Page header */}
        <div style={{ marginBottom: 10 }}>
          <h1 style={{ fontSize: 17, fontWeight: 800, color: "#111827", margin: 0 }}>My Assigned Visits</h1>
          <p style={{ fontSize: 10, color: "#9ca3af", margin: "2px 0 0" }}>Tap calendar to change date</p>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 10 }}>
            <div style={{
              width: 28, height: 28,
              border: "2.5px solid #0d9488",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
            <p style={{ fontSize: 12, color: "#9ca3af" }}>Loading visits…</p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : visits.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "#f3f4f6", margin: "0 auto 10px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <MapPin size={22} color="#d1d5db" />
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", margin: 0 }}>No visits assigned</p>
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>
              Visits assigned to you will appear here.
            </p>
          </div>
        ) : (
          <>
            <CalendarStrip
              visits={visits}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />

            {/* Date label + count */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: 0 }}>{formattedDate}</p>
                <p style={{ fontSize: 10, color: "#9ca3af", margin: "1px 0 0" }}>
                  {visitsForDate.length > 0
                    ? `${visitsForDate.length} visit${visitsForDate.length !== 1 ? "s" : ""} scheduled`
                    : "No visits on this date"}
                </p>
              </div>
              {visitsForDate.length > 0 && (
                <span style={{
                  background: "#0d9488", color: "#fff",
                  fontSize: 11, fontWeight: 700,
                  width: 22, height: 22, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {visitsForDate.length}
                </span>
              )}
            </div>

            {visitsForDate.length === 0 ? (
              <div style={{
                background: "#fff", borderRadius: 12,
                border: "1px solid #e5e7eb",
                padding: "32px 20px", textAlign: "center",
              }}>
                <Calendar size={24} color="#d1d5db" style={{ margin: "0 auto 6px" }} />
                <p style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", margin: 0 }}>No visits on this date</p>
                <p style={{ fontSize: 10, color: "#d1d5db", marginTop: 3 }}>Select a highlighted date</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {visitsForDate.map((visit) => {
                  const isOriginalDate = visit.bill_details?.some(
                    (b) => b.payment_date && b.payment_date.split("T")[0] === selectedDate
                  );
                  const isVisited = !!(visit.status === "VISITED" || visit.visited_at) && isOriginalDate;
                  const billsForDate = isOriginalDate
                    ? visit.bill_details
                    : (visit.bill_details || []).filter(
                        (b) => b.next_collection_date && b.next_collection_date.split("T")[0] === selectedDate
                      );
                  const visitForDate = { ...visit, bill_details: billsForDate, bill_count: billsForDate?.length ?? 0 };

                  return (
                    <VisitCard
                      key={`${visit.id}-${selectedDate}`}
                      visit={visitForDate}
                      isVisited={isVisited}
                      onViewBills={(v) => {
                        const markVisitedFn = !isVisited && isOriginalDate
                          ? async () => {
                              try {
                                const api = (await import("../../../services/api")).default;
                                await api.post(`/followup/visit-log/${v.id}/mark-completed/`);
                                toast.success("Visit marked as completed!");
                                await loadVisits();
                                setSelectedBills(null);
                              } catch (error) {
                                toast.error("Failed to mark visit as completed");
                              }
                            }
                          : null;
                        setSelectedBills({
                          bills: billsForDate,
                          clientName: v.client_name,
                          visitId: v.id,
                          isVisited,
                          onMarkVisited: markVisitedFn,
                        });
                      }}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}