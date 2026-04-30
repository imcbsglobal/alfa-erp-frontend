import { useState, useEffect } from "react";
import { X, Phone, MessageCircle, Mail, MapPin } from "lucide-react";
import { getFollowUpLogs } from "../../../services/followup";

// ── Avatar helpers ────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: "bg-red-100",    text: "text-red-700"    },
  { bg: "bg-orange-100", text: "text-orange-700" },
  { bg: "bg-amber-100",  text: "text-amber-700"  },
  { bg: "bg-lime-100",   text: "text-lime-700"   },
  { bg: "bg-teal-100",   text: "text-teal-700"   },
  { bg: "bg-cyan-100",   text: "text-cyan-700"   },
  { bg: "bg-blue-100",   text: "text-blue-700"   },
  { bg: "bg-indigo-100", text: "text-indigo-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-purple-100", text: "text-purple-700" },
];

function getAvatarColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name = "") {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const OUTCOME_LABELS = {
  PROMISED:    "Promised",
  PARTIAL:     "Partial",
  NO_RESPONSE: "No Response",
  DISPUTE:     "Dispute",
  ESCALATED:   "Escalated",
  PAID:        "Paid",
};

const OUTCOME_COLORS = {
  PROMISED:    "bg-blue-100 text-blue-700",
  PARTIAL:     "bg-yellow-100 text-yellow-700",
  NO_RESPONSE: "bg-gray-100 text-gray-600",
  DISPUTE:     "bg-red-100 text-red-700",
  ESCALATED:   "bg-orange-100 text-orange-700",
  PAID:        "bg-green-100 text-green-700",
};

const RISK_BADGE = {
  High: "bg-red-100 text-red-700",
  Med:  "bg-yellow-100 text-yellow-700",
  Low:  "bg-green-100 text-green-700",
  None: "bg-gray-100 text-gray-500",
};

function RiskCell({ risk }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${RISK_BADGE[risk] || RISK_BADGE.None}`}>
      ● {risk || "None"}
    </span>
  );
}

function DueBadge({ days, outstanding }) {
  if (!outstanding || parseFloat(outstanding) === 0)
    return <span className="px-2 py-0.5 rounded-full text-xs bg-teal-50 text-teal-600 border border-teal-100 font-medium">Cleared</span>;
  if (days >= 60) return <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-bold">{days}d</span>;
  if (days >= 30) return <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700 font-bold">{days}d</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700 font-bold">{days}d</span>;
}

const CHANNEL_META = {
  PHONE:    { Icon: Phone,         label: "Phone Call",  dot: "bg-teal-500"  },
  WHATSAPP: { Icon: MessageCircle, label: "WhatsApp",    dot: "bg-green-500" },
  EMAIL:    { Icon: Mail,          label: "Email",       dot: "bg-blue-500"  },
  VISIT:    { Icon: MapPin,        label: "Field Visit", dot: "bg-amber-500" },
};

const fmt = (val) => parseFloat(val || 0).toLocaleString("en-IN");

function formatLoggedAt(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InvoiceRow({ inv, isEven }) {
  const balance = parseFloat(inv.balance ?? inv.outstanding ?? 0);
  const isPaid  = balance === 0;
  return (
    <tr className={`border-b border-gray-100 ${isEven ? "bg-white" : "bg-gray-50/60"}`}>
      <td className="px-4 py-2.5 font-mono text-xs text-teal-600 font-semibold whitespace-nowrap">
        {inv.invoice_no || inv.no}
      </td>
      <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
        {inv.date
          ? new Date(inv.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
          : inv.display_date || "—"}
      </td>
      <td className="px-3 py-2.5 text-right text-xs text-gray-700 tabular-nums whitespace-nowrap">
        ₹{fmt(inv.total || inv.billed_amount || 0)}
      </td>
      <td className="px-3 py-2.5 text-right text-xs text-teal-600 font-semibold tabular-nums whitespace-nowrap">
        ₹{fmt(inv.paid || inv.paid_amount || 0)}
      </td>
      <td className={`px-3 py-2.5 text-right text-xs tabular-nums font-semibold whitespace-nowrap ${isPaid ? "text-gray-400" : "text-red-500"}`}>
        ₹{fmt(balance)}
      </td>
      <td className="px-4 py-2.5 text-right whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
          isPaid
            ? "bg-teal-50 text-teal-700 border-teal-100"
            : "bg-red-50 text-red-600 border-red-100"
        }`}>
          {isPaid ? "Paid" : "Due"}
        </span>
      </td>
    </tr>
  );
}

function LogEntry({ log, isLast }) {
  const ch      = CHANNEL_META[log.channel] || CHANNEL_META.PHONE;
  const { Icon } = ch;
  const outcome = OUTCOME_COLORS[log.outcome];
  const label   = OUTCOME_LABELS[log.outcome] || log.outcome;

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center flex-shrink-0 pt-1">
        <div className={`w-2.5 h-2.5 rounded-full ${ch.dot} flex-shrink-0 ring-2 ring-white`} />
        {!isLast && <div className="w-px flex-1 bg-gray-100 mt-1" />}
      </div>
      <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
            <Icon size={13} className="text-gray-400" />
            {ch.label}
          </span>
          <div className="text-right">
            {log.outcome && (
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${outcome || "bg-gray-100 text-gray-500"}`}>
                {label}
              </span>
            )}
            <p className="mt-1 text-[10px] font-mono text-gray-400">Logged {formatLoggedAt(log.created_at)}</p>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
          {/* Outcome - always show */}
          <div>
            <p className="text-gray-400 font-mono">Outcome</p>
            <p className="text-gray-700 font-semibold">{label || log.outcome || "—"}</p>
          </div>
          {/* Promised Amount — show whenever present */}
          {log.promised_amount != null && log.promised_amount !== "" && parseFloat(log.promised_amount) > 0 && (
            <div>
              <p className="text-gray-400 font-mono">Promised Amount</p>
              <p className="text-teal-600 font-semibold">₹{fmt(log.promised_amount)}</p>
            </div>
          )}
          {log.contact_person && (
            <div>
              <p className="text-gray-400 font-mono">Contact Person</p>
              <p className="text-gray-700 font-semibold">{log.contact_person}</p>
            </div>
          )}
            {(log.next_followup_date || log.outcome === "ESCALATED") && (
              <div>
                <p className="text-gray-400 font-mono">Next Follow-Up</p>
                {log.next_followup_date ? (
                  <p className="text-gray-700 font-semibold">
                    {new Date(log.next_followup_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                ) : (
                  <p className="text-gray-700 font-semibold">—</p>
                )}
                {log.outcome === "ESCALATED" && (
                  <p className="text-orange-600 font-semibold">
                    Escalated{log.escalated_to ? ` to ${log.escalated_to}` : ""}
                  </p>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
// IMPORTANT: This component does NOT manage LogFollowUpModal or RecordPaymentModal
// internally. It delegates those actions to the parent via onLogFollowUp / onRecordPayment
// callbacks. The parent controls those modals and hides this panel when they open.
export default function ClientDetailPanel({
  client,
  areaName,
  onClose,
  onLogFollowUp,    // called when "Log Follow-Up" is clicked — parent opens the modal & hides this panel
  onRefresh,
}) {
  const [invoices,    setInvoices]    = useState([]);
  const [logs,        setLogs]        = useState([]);
  const [loadingInv,  setLoadingInv]  = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    if (!client?.code) return;

    setLoadingInv(true);
    // Replace with: getClientInvoices(client.code).then(data => { setInvoices(data); setLoadingInv(false); })
    setTimeout(() => { setInvoices(client.invoices || []); setLoadingInv(false); }, 400);

    setLoadingLogs(true);
    getFollowUpLogs({ client_code: client.code })
      .then((res) => {
        const data = res.data.results || res.data || [];
        setLogs(data);
      })
      .catch(() => {
        setLogs([]);
      })
      .finally(() => {
        setLoadingLogs(false);
      });
  }, [client?.code]);

  if (!client) return null;

  const outstanding = parseFloat(client.outstanding_balance || client.outstanding || 0);
  const isCleared   = outstanding === 0;
  const totalBilled = parseFloat(client.total_billed || client.debit  || 0);
  const totalPaid   = parseFloat(client.total_paid   || client.credit || 0);
  const av          = getAvatarColor(client.name);
  const displayArea = areaName ? areaName(client.area) : client.area;

  const invTotalBalance = invoices.reduce((s, inv) => s + parseFloat(inv.balance ?? inv.outstanding ?? 0), 0);
  const invTotalBilled  = invoices.reduce((s, inv) => s + parseFloat(inv.total || inv.billed_amount || 0), 0);
  const invTotalPaid    = invoices.reduce((s, inv) => s + parseFloat(inv.paid  || inv.paid_amount   || 0), 0);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

        {/* ── Teal gradient header ──────────────────────────── */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-4 sm:px-6 py-3 sm:py-4 rounded-t-xl flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${av.bg} ${av.text}`}>
                {getInitials(client.name)}
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-white truncate">{client.name}</h2>
                <p className="text-teal-100 text-xs mt-0.5 font-mono truncate">
                  {client.code}
                  {displayArea  && <> · {displayArea}</>}
                  {client.agent && <> · Agent: {client.agent}</>}
                  {client.phone && <> · {client.phone}</>}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-white/70 hover:text-white transition-colors mt-0.5"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Stats banner ── */}
        {!isCleared ? (
          <div className="bg-red-50 border-b border-red-100 px-4 sm:px-6 py-2.5 flex-shrink-0 flex items-center justify-between flex-wrap gap-y-2">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-red-400 mb-0.5">Outstanding</p>
                <p className="text-red-700 font-bold text-sm tabular-nums">₹{fmt(outstanding)}</p>
              </div>
              <div className="h-6 w-px bg-red-200" />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Billed</p>
                <p className="text-gray-700 font-semibold text-sm tabular-nums">₹{fmt(totalBilled)}</p>
              </div>
              <div className="h-6 w-px bg-red-200" />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Paid</p>
                <p className="text-teal-600 font-semibold text-sm tabular-nums">₹{fmt(totalPaid)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-teal-50 border-b border-teal-100 px-4 sm:px-6 py-2.5 flex-shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Billed</p>
                <p className="text-gray-700 font-semibold text-sm tabular-nums">₹{fmt(totalBilled)}</p>
              </div>
              <div className="h-6 w-px bg-teal-200" />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-0.5">Paid</p>
                <p className="text-teal-600 font-semibold text-sm tabular-nums">₹{fmt(totalPaid)}</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 border border-teal-200">
              ✓ Fully Cleared
            </span>
          </div>
        )}

        {/* ── Scrollable body ───────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Invoice breakdown */}
          <div className="px-4 sm:px-6 pt-4 pb-3">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-mono mb-2.5">
              Invoice breakdown
            </p>
            {loadingInv ? (
              <div className="py-8 text-center text-gray-400 text-sm">Loading invoices…</div>
            ) : invoices.length === 0 ? (
              <div className="py-5 text-center text-gray-400 text-sm bg-gray-50 rounded-lg border border-gray-100">
                No invoice data
              </div>
            ) : (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {[
                        { key: "invoice_no", label: "Invoice No", right: false },
                        { key: "date",       label: "Date",       right: false },
                        { key: "total",      label: "Total",      right: true  },
                        { key: "paid",       label: "Paid",       right: true  },
                        { key: "balance",    label: "Balance",    right: true  },
                        { key: "status",     label: "Status",     right: true  },
                      ].map(h => (
                        <th
                          key={h.key}
                          className={`px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest ${h.right ? "text-right" : "text-left"} ${h.key === "invoice_no" ? "pl-4" : ""} ${h.key === "status" ? "pr-4" : ""}`}
                        >
                          {h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv, idx) => (
                      <InvoiceRow key={inv.invoice_no || inv.no || idx} inv={inv} isEven={idx % 2 === 0} />
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-100">
                    <tr>
                      <td colSpan={2} className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wide">Total</td>
                      <td className="px-3 py-2 text-right text-sm font-bold text-gray-800 tabular-nums">₹{fmt(invTotalBilled || totalBilled)}</td>
                      <td className="px-3 py-2 text-right text-sm font-bold text-teal-600 tabular-nums">₹{fmt(invTotalPaid || totalPaid)}</td>
                      <td colSpan={2} className="px-4 py-2 text-right text-sm font-bold text-red-500 tabular-nums">₹{fmt(invTotalBalance || outstanding)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <div className="mx-4 sm:mx-6 border-t border-gray-100" />

          {/* Follow-up history */}
          <div className="px-4 sm:px-6 pt-3 pb-4">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-mono mb-3">
              Follow-up history
            </p>
            {loadingLogs ? (
              <div className="py-6 text-center text-gray-400 text-sm">Loading history…</div>
            ) : logs.length === 0 ? (
              <div className="py-5 text-center text-gray-400 text-sm bg-gray-50 rounded-lg border border-gray-100">
                No follow-ups logged yet
              </div>
            ) : (
              <div className="space-y-2 max-h-[38vh] overflow-y-auto pr-2">
                {logs.map((log, idx) => (
                  <LogEntry key={log.id || idx} log={log} isLast={idx === logs.length - 1} />
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── Pinned footer buttons — delegate to parent, NO internal modal state ── */}
        <div className="flex-shrink-0 border-t border-gray-100 px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onLogFollowUp}   // ← tells parent to close this panel and open LogModal
            className="w-full sm:flex-1 px-4 py-2.5 sm:py-3 text-sm sm:text-base border border-teal-200 bg-teal-50 text-teal-700 rounded-lg font-semibold hover:bg-teal-100 transition-all"
          >
            + Log Follow-Up
          </button>
        </div>

      </div>
    </div>
  );
}