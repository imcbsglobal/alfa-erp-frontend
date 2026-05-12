import { useEffect, useState } from "react";
import { createFollowUp, getEscalationRecipients } from "../../../services/followup";
import toast from "react-hot-toast";
import { X, Eye } from "lucide-react";
import VisitLogModal from "./VisitLogModal";

const OUTCOME_OPTIONS = [
  { value: "PROMISED",    label: "Payment Promised" },
  { value: "PARTIAL",     label: "Partial Payment"  },
  { value: "NO_RESPONSE", label: "No Response"      },
  { value: "DISPUTE",     label: "Dispute Raised"   },
  { value: "ESCALATED",   label: "Escalated"        },
];

const CHANNEL_OPTIONS = [
  { value: "PHONE",    label: "Phone Call"   },
  { value: "WHATSAPP", label: "WhatsApp"     },
  { value: "EMAIL",    label: "Email"        },
  { value: "VISIT",    label: "Field Visit"  },
];

const fmt = (val) => parseFloat(val || 0).toLocaleString("en-IN");

export default function LogFollowUpModal({ isOpen, client, onClose, onSaved }) {
  const [form, setForm] = useState({
    channel:            "PHONE",
    outcome:            "PROMISED",
    escalated_to:       "",
    contact_person:     "",
    notes:              "",
    promised_amount:    "",
    next_followup_date: "",
  });
  const [loading, setLoading]               = useState(false);
  const [error,   setError]                 = useState("");
  const [recipientOptions, setRecipientOptions] = useState([]);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [showVisitLog, setShowVisitLog]     = useState(false);

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setError("");
  };

  useEffect(() => {
    if (!isOpen || !client) return;
    const loadRecipients = async () => {
      setRecipientLoading(true);
      try {
        const res = await getEscalationRecipients();
        setRecipientOptions(res.data.results || []);
      } catch (_) {
        setRecipientOptions([]);
      } finally {
        setRecipientLoading(false);
      }
    };
    loadRecipients();
  }, [isOpen, client]);

  const handleSubmit = async () => {
    setError("");

    if (!form.channel) { setError("Please select a follow-up type"); return; }
    if (!form.outcome) { setError("Please select an outcome"); return; }
    if (form.outcome === "ESCALATED" && !form.escalated_to.trim()) {
      setError("Please select who to escalate to");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        client_code:        client.code,
        client_name:        client.name,
        agent:              client.agent  || "",
        area:               client.area   || "",
        outstanding_amount: client.outstanding || 0,
        channel:            form.channel,
        outcome:            form.outcome,
        escalated_to:       form.outcome === "ESCALATED" ? form.escalated_to.trim() : "",
        notes:              form.notes || "",
      };

      if (form.promised_amount) {
        payload.promised_amount = parseFloat(form.promised_amount);
      }
      if (form.next_followup_date && form.next_followup_date.trim() !== "") {
        payload.next_followup_date = form.next_followup_date.trim();
      }

      await createFollowUp(payload);

      toast.success("Follow-up logged!");
      setForm({
        channel:            "PHONE",
        outcome:            "PROMISED",
        escalated_to:       "",
        contact_person:     "",
        notes:              "",
        promised_amount:    "",
        next_followup_date: "",
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(
        err.response?.data
          ? JSON.stringify(err.response.data)
          : err.message || "Failed to save follow-up"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !client) return null;

  const outstanding  = parseFloat(client.outstanding || 0);
  const isVisitMode  = form.channel === "VISIT";   // ← single source of truth

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-base">{client?.name}</p>
            <p className="text-teal-100 text-xs">
              {client?.code} · {client?.area} · Agent: {client?.agent || "—"}
            </p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Outstanding banner */}
        <div className="bg-red-50 border-b border-red-100 px-6 py-2 flex items-center justify-between">
          <span className="text-xs text-red-600 font-semibold uppercase tracking-wide">Outstanding</span>
          <span className="text-red-700 font-bold text-sm tabular-nums">₹{fmt(outstanding)}</span>
        </div>

        {/* ── Body (no <form> wrapper — we call handleSubmit manually) ── */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">

          {/* Channel + Outcome row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Follow-Up Type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.channel}
                onChange={(e) => set("channel", e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                {CHANNEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Outcome <span className="text-red-500">*</span>
              </label>
              <select
                value={form.outcome}
                onChange={(e) => set("outcome", e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                {OUTCOME_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Escalated To */}
          {form.outcome === "ESCALATED" && (
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Escalated To <span className="text-red-500">*</span>
              </label>
              <select
                value={form.escalated_to}
                onChange={(e) => set("escalated_to", e.target.value)}
                disabled={loading || recipientLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="">{recipientLoading ? "Loading users..." : "Select user"}</option>
                {recipientOptions.map((user) => (
                  <option key={user.id} value={user.name}>
                    {user.name}{user.role ? ` (${user.role})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Contact Person */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Contact Person</label>
            <input
              type="text"
              value={form.contact_person}
              onChange={(e) => set("contact_person", e.target.value)}
              placeholder="Name of person contacted"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Details about the follow-up call / visit…"
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>

          {/* Promise amount + Next follow-up row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Promise Amount (₹)
              </label>
              <input
                type="number"
                min="0"
                value={form.promised_amount}
                onChange={(e) => set("promised_amount", e.target.value)}
                placeholder="0"
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">
                Next Follow-Up
              </label>
              <input
                type="date"
                value={form.next_followup_date}
                onChange={(e) => set("next_followup_date", e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs sm:text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="px-6 pb-5 pt-2 flex-shrink-0">
          <div className="flex items-center gap-2">

            {/* Visit Log — bottom left, only when Field Visit selected */}
            {isVisitMode && (
              <button
                type="button"
                onClick={() => setShowVisitLog(true)}
                disabled={loading}
                className="px-5 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Eye size={15} />
                Visit Log
              </button>
            )}

            <div className="flex-1" />

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-5 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving…
                </>
              ) : (
                "Save Follow-Up"
              )}
            </button>
          </div>
        </div>

      </div>

      {/* Visit Log sub-modal */}
      <VisitLogModal
        isOpen={showVisitLog}
        client={client}
        onClose={() => setShowVisitLog(false)}
        onSaved={() => {
          toast.success("Visit log saved!");
        }}
      />
    </div>
  );
}