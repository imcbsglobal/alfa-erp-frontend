import { useState, useEffect } from "react";
import { X, Plus, Trash2, FileText, User, IndianRupee } from "lucide-react";
import toast from "react-hot-toast";
import { createVisitLog, getFollowUpUsers } from "../../../services/followup"; // adjust path as needed

const fmt = (val) => parseFloat(val || 0).toLocaleString("en-IN");

const EMPTY_ROW = () => ({
  _id:          crypto.randomUUID(),
  invoice_no:   "",
  invoice_date: "",
  remarks:      "",
  amount:       "",
  payment_date: "",
});

export default function VisitLogModal({ isOpen, client, onClose, onSaved }) {
  const [rows, setRows]               = useState([EMPTY_ROW()]);
  const [promisedAmount, setPromised] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");

  // Fetch users with followup menu access on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getFollowUpUsers();
        console.log("Followup users response:", response.data);
        setUsers(response.data.results || response.data);
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  if (!isOpen || !client) return null;

  // ── Row helpers ────────────────────────────────────────────
  const updateRow = (id, field, value) => {
    setError("");
    setRows((prev) =>
      prev.map((r) => (r._id === id ? { ...r, [field]: value } : r))
    );
  };

  const addRow = () => setRows((prev) => [...prev, EMPTY_ROW()]);

  const removeRow = (id) => {
    if (rows.length === 1) return; // keep at least one row
    setRows((prev) => prev.filter((r) => r._id !== id));
  };

  // ── Totals ──────────────────────────────────────────────────
  const totalAmount = rows.reduce(
    (sum, r) => sum + parseFloat(r.amount || 0),
    0
  );

  // ── Submit ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError("");

    // Validate: every row must have invoice_no and amount
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.invoice_no.trim()) {
        setError(`Row ${i + 1}: Invoice No. is required.`);
        return;
      }
      if (!r.amount || parseFloat(r.amount) <= 0) {
        setError(`Row ${i + 1}: Amount must be greater than 0.`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        client_code:        client.code,
        client_name:        client.name,
        agent:              client.agent || '',
        area:               client.area || '',
        outstanding_amount: client.outstanding || 0,
        promised_amount: promisedAmount ? parseFloat(promisedAmount) : null,
        assigned_to_id: assignedToId || null,
        bill_details: rows.map(({ invoice_no, invoice_date, remarks, amount, payment_date }) => ({
          invoice_no,
          invoice_date:  invoice_date  || null,
          remarks:       remarks       || "",
          amount:        parseFloat(amount),
          payment_date:  payment_date  || null,
        })),
      };

      await createVisitLog(payload);
      toast.success("Visit log saved!");
      setRows([EMPTY_ROW()]);
      setPromised("");
      setAssignedToId("");
      onSaved?.();
      onClose();
    } catch (err) {
      setError(
        err.response?.data
          ? JSON.stringify(err.response.data)
          : err.message || "Failed to save visit log"
      );
    } finally {
      setLoading(false);
    }
  };

  const outstanding = parseFloat(client.outstanding || 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* ── Header ───────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2">
              <FileText size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-base leading-tight">
                Visit Log — Bill Split-up
              </p>
              <p className="text-teal-100 text-xs">
                {client.name} · {client.code}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Client info strip ────────────────────────────── */}
        <div className="bg-teal-50 border-b border-teal-100 px-6 py-3 flex flex-wrap gap-6 flex-shrink-0">
          <div className="flex items-center gap-2">
            <User size={14} className="text-teal-500" />
            <span className="text-xs text-gray-500 font-medium">Client</span>
            <span className="text-xs font-bold text-gray-800">{client.name}</span>
          </div>
          {client.agent && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Agent</span>
              <span className="text-xs font-bold text-gray-800">{client.agent}</span>
            </div>
          )}
          {client.area && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Area</span>
              <span className="text-xs font-bold text-gray-800">{client.area}</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <IndianRupee size={14} className="text-red-500" />
            <span className="text-xs text-red-600 font-semibold uppercase tracking-wide">
              Outstanding
            </span>
            <span className="text-xs font-bold text-red-700 tabular-nums">
              ₹{fmt(outstanding)}
            </span>
          </div>
        </div>

        {/* ── Promised amount row ──────────────────────────── */}
        <div className="px-6 pt-4 pb-2 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-4">
            <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">
              Promised Amount by Client (₹)
            </label>
            <input
              type="number"
              min="0"
              value={promisedAmount}
              onChange={(e) => setPromised(e.target.value)}
              placeholder="Enter promised amount"
              disabled={loading}
              className="w-52 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-xs text-gray-400 italic">
              Amount the client has promised to pay
            </p>
          </div>
        </div>

        {/* ── Assign to user ──────────────────────────────── */}
        <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-4">
            <label className="text-xs font-semibold text-gray-600 whitespace-nowrap">
              Assign Visit To
            </label>
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              disabled={loading}
              className="w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">— Select User (Optional) —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 italic">
              Assign this visit to a team member
            </p>
          </div>
        </div>

        {/* ── Bill table ───────────────────────────────────── */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Bill Details
              <span className="ml-2 text-xs font-normal text-gray-400">
                (all fields are manual entry)
              </span>
            </h3>
            <button
              type="button"
              onClick={addRow}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded-lg font-semibold hover:bg-teal-100 transition-all"
            >
              <Plus size={13} />
              Add Row
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 w-8">#</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 min-w-[130px]">
                    Invoice No. <span className="text-red-500">*</span>
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 min-w-[130px]">
                    Invoice Date
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 min-w-[180px]">
                    Remarks
                  </th>
                  <th className="px-3 py-2.5 text-right font-semibold text-gray-600 min-w-[120px]">
                    Amount (₹) <span className="text-red-500">*</span>
                  </th>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 min-w-[140px]">
                    Payment Collection Date
                  </th>
                  <th className="px-2 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, idx) => (
                  <tr key={row._id} className="hover:bg-teal-50/30 transition-colors group">
                    {/* Row # */}
                    <td className="px-3 py-2 text-gray-400 font-medium">{idx + 1}</td>

                    {/* Invoice No */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={row.invoice_no}
                        onChange={(e) => updateRow(row._id, "invoice_no", e.target.value)}
                        placeholder="INV-001"
                        disabled={loading}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white"
                      />
                    </td>

                    {/* Invoice Date */}
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        value={row.invoice_date}
                        onChange={(e) => updateRow(row._id, "invoice_date", e.target.value)}
                        disabled={loading}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white"
                      />
                    </td>

                    {/* Remarks */}
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={row.remarks}
                        onChange={(e) => updateRow(row._id, "remarks", e.target.value)}
                        placeholder="e.g. Monthly supply"
                        disabled={loading}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white"
                      />
                    </td>

                    {/* Amount */}
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min="0"
                        value={row.amount}
                        onChange={(e) => updateRow(row._id, "amount", e.target.value)}
                        placeholder="0"
                        disabled={loading}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs text-right focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white"
                      />
                    </td>

                    {/* Payment Date */}
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        value={row.payment_date}
                        onChange={(e) => updateRow(row._id, "payment_date", e.target.value)}
                        disabled={loading}
                        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent bg-white"
                      />
                    </td>

                    {/* Delete */}
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => removeRow(row._id)}
                        disabled={loading || rows.length === 1}
                        className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100"
                        title="Remove row"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Totals footer */}
              <tfoot>
                <tr className="bg-teal-50 border-t-2 border-teal-200">
                  <td colSpan={4} className="px-3 py-2.5 text-right text-xs font-bold text-teal-700">
                    Total ({rows.length} {rows.length === 1 ? "entry" : "entries"})
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs font-bold text-teal-800 tabular-nums">
                    ₹{fmt(totalAmount)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="mt-2 text-xs text-gray-400 flex items-center gap-1">
            <span className="text-red-400">*</span> Required fields. Hover a row to reveal the delete button.
          </p>
        </div>

        {/* ── Error ───────────────────────────────────────── */}
        {error && (
          <div className="mx-6 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 flex-shrink-0">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────── */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex flex-col sm:flex-row gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:flex-1 px-4 py-2.5 text-sm bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full sm:flex-1 px-4 py-2.5 text-sm bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              <>
                <FileText size={15} />
                Save Visit Log
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}