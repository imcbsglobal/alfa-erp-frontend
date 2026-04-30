import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getInvoicesByStatus, updateInvoiceStatus } from "../../../services/sales";
import toast from "react-hot-toast";
import {
  Zap,
  X,
  Search,
  CheckCircle2,
  Package,
  Truck,
  FileText,
  Phone,
  MapPin,
  User,
  Calendar,
  IndianRupee,
  RefreshCw,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { formatDateDDMMYYYY, formatTime, formatAmount } from "../../../utils/formatters";

// ─── Workflow steps definition ───────────────────────────────────────────────
const STEPS = [
  { key: "INVOICED", label: "INVOICED",  icon: FileText  },
  { key: "PICKED",   label: "PICKED",  icon: Search    },
  { key: "PACKED",   label: "PACKED",  icon: Package   },
  { key: "DELIVERY", label: "DELIVERY", icon: Truck     },
];

const EXPRESS_BILLING_STATUSES = ["INVOICED", "PICKED", "PACKED"];

function stepIndex(status) {
  if (status === "INVOICED") return 0;
  if (status === "PICKED")   return 1;
  if (status === "PACKED")   return 2;
  if (status === "DELIVERY") return 3;
  return 0;
}

// ─── Stepper component ───────────────────────────────────────────────────────
function WorkflowStepper({ status }) {
  const current = stepIndex(status);
  return (
    <div className="flex items-center w-full my-5">
      {STEPS.map((step, i) => {
        const done   = i < current;
        const active = i === current;
        const Icon   = step.icon;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  done || active
                    ? "bg-teal-500 border-teal-500 text-white"
                    : "bg-gray-100 border-gray-200 text-gray-400"
                }`}
              >
                {done ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <Icon size={16} />
                )}
              </div>
              <span
                className={`text-[11px] font-medium whitespace-nowrap ${
                  done || active ? "text-teal-600" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 mb-4 transition-all duration-500 ${
                  i < current ? "bg-teal-500" : "bg-gray-200"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    INVOICED: "bg-yellow-100 text-yellow-700 border-yellow-300",
    PICKED:   "bg-blue-100 text-blue-700 border-blue-300",
    PACKED:   "bg-green-100 text-green-700 border-green-300",
    DELIVERY: "bg-purple-100 text-purple-700 border-purple-300",
  };
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
        map[status] || "bg-gray-100 text-gray-600 border-gray-300"
      }`}
    >
      {status}
    </span>
  );
}

// ─── Invoice detail modal ────────────────────────────────────────────────────
function InvoiceModal({ invoice, onClose, onStatusUpdate }) {  const navigate = useNavigate();  const [status, setStatus]       = useState(invoice.status || "INVOICED");
  const [processing, setProc]     = useState(false);
  const [showSuccess, setSuccess] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const customerName = invoice.customer?.name || "—";
  const customerArea = invoice.customer?.area || invoice.customer?.address1 || invoice.temp_name || "—";
  const customerPhone = invoice.customer?.phone || invoice.customer?.mobile || "—";

  const initials = customerName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleMarkPicked = async () => {
    setProc(true);
    try {
      await updateInvoiceStatus(invoice.id, { 
        status: "PICKED",
        source: "EXPRESS_BILLING",
        picker_name: "Express Billing"
      });
      setStatus("PICKED");
      onStatusUpdate(invoice.id, "PICKED");
      toast.success(`✅ ${invoice.invoice_no} marked as PICKED`);
    } catch (err) {
      toast.error(`Failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setProc(false);
    }
  };

  const handleMarkPacked = async () => {
    setProc(true);
    try {
      await updateInvoiceStatus(invoice.id, { 
        status: "PACKED",
        source: "EXPRESS_BILLING",
        picker_name: "Express Billing"
      });
      setStatus("PACKED");
      setSuccess(true);
      onStatusUpdate(invoice.id, "PACKED");
      toast.success(`📦 ${invoice.invoice_no} marked as PACKED — Ready for Delivery!`);
    } catch (err) {
      toast.error(`Failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setProc(false);
    }
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[90vh] max-h-[90vh] overflow-y-auto shadow-2xl"
        style={{ animation: "modalIn 0.2s ease-out" }}
      >
        {/* Modal header */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-600 rounded-t-2xl px-5 py-4 flex justify-between items-start">
          <div>
            <h2 className="text-white text-lg font-bold">{invoice.invoice_no}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4">

          {/* Customer info */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-semibold text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">{customerName}</p>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                {customerPhone !== "—" && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Phone size={11} /> {customerPhone}
                  </span>
                )}
                {customerArea !== "—" && (
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin size={11} /> {customerArea}
                  </span>
                )}
              </div>
            </div>
            <StatusBadge status={status} />
          </div>

          {/* Stepper */}
          <WorkflowStepper status={status} />

          {/* Billing details */}
          <div className="border border-gray-100 rounded-xl mb-4 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-gray-100">
              <FileText size={14} className="text-teal-600" />
              <span className="text-sm font-semibold text-gray-700">Billing details</span>
            </div>
            <div className="grid grid-cols-2">
              <div className="px-4 py-3 border-b border-r border-gray-100">
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                  <User size={10} /> Billed by
                </p>
                <p className="text-sm font-semibold text-gray-800 capitalize">
                  {invoice.salesman?.name || invoice.billed_by || invoice.salesman_name || "—"}
                </p>
              </div>
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Billing status</p>
                <StatusBadge status={status} />
              </div>
              <div className="px-4 py-3 border-r border-gray-100">
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                  <Calendar size={10} /> Created at
                </p>
                <p className="text-sm font-semibold text-gray-800">
                  {formatDateDDMMYYYY(invoice.invoice_date)}
                  <span className="text-xs text-gray-400 ml-1">
                    {formatTime(invoice.created_at)}
                  </span>
                </p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                  <IndianRupee size={10} /> Invoice total
                </p>
                <p className="text-sm font-bold text-teal-600">
                  {formatAmount(invoice.Total)}
                </p>
              </div>
            </div>
          </div>

          {/* Items list (if available) */}
          {invoice.items && invoice.items.length > 0 && (
            <div className="border border-gray-100 rounded-xl mb-4 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-2 border-b border-gray-100">
                <Package size={14} className="text-teal-600" />
                <span className="text-sm font-semibold text-gray-700">
                  Items ({invoice.items.length})
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-4 py-2 text-left text-gray-500 font-medium">Item</th>
                      <th className="px-3 py-2 text-center text-gray-500 font-medium">Qty</th>
                      <th className="px-3 py-2 text-right text-gray-500 font-medium">MRP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {invoice.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 text-gray-800 font-medium">
                          {item.product?.name || item.name || "—"}
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-600">
                          {item.quantity || item.qty}
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-600">
                          {formatAmount(item.mrp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-teal-50">
                      <td colSpan={2} className="px-4 py-2.5 text-xs font-semibold text-teal-700">
                        Total
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm font-bold text-teal-700">
                        {formatAmount(invoice.Total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {status === "PACKED" ? "Done" : "Cancel"}
            </button>

            {status === "INVOICED" && (
              <button
                onClick={handleMarkPicked}
                disabled={processing}
                className={`flex-[2] h-11 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  processing
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-200"
                }`}
              >
                {processing ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Package size={15} />
                    Mark as picked
                    <ChevronRight size={14} className="opacity-60" />
                  </>
                )}
              </button>
            )}

            {status === "PICKED" && (
              <button
                onClick={handleMarkPacked}
                disabled={processing}
                className={`flex-[2] h-11 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  processing
                    ? "bg-green-300 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600 shadow-lg shadow-green-200"
                }`}
              >
                {processing ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Package size={15} />
                    Mark as packed
                    <ChevronRight size={14} className="opacity-60" />
                  </>
                )}
              </button>
            )}

            {status === "PACKED" && (
              <button
                onClick={() => navigate("/delivery/dispatch")}
                className="flex-[2] h-11 rounded-xl bg-green-50 border border-green-200 hover:bg-green-100 flex items-center justify-center gap-2 text-green-700 text-sm font-semibold transition-colors"
              >
                <Truck size={15} />
                Ready for delivery
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function ExpressBillingListPage() {
  const searchRef = useRef(null);

  const [allInvoices, setAllInvoices]     = useState([]);
  const [loading, setLoading]             = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const [selectedInvoice, setSelected]    = useState(null);
  const [notFound, setNotFound]           = useState(false);
  const [searching, setSearching]         = useState(false);

  useEffect(() => {
    searchRef.current?.focus();
    // Pre-load invoices in background for instant search
    loadAllInvoices();
  }, []);

  const loadAllInvoices = async () => {
    try {
      const res = await getInvoicesByStatus({
        page: 1,
        page_size: 500,
        status: EXPRESS_BILLING_STATUSES,
      });
      setAllInvoices(res.data.results || []);
    } catch (err) {
      console.error("Failed to pre-load invoices:", err);
    }
  };

  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query) return;

    setNotFound(false);
    setSearching(true);

    try {
      // First try local cache
      const local = allInvoices.find(
        (inv) =>
          inv.invoice_no.toLowerCase() === query.toLowerCase() ||
          inv.invoice_no.toLowerCase().includes(query.toLowerCase())
      );

      if (local) {
        setSelected(local);
        setSearching(false);
        return;
      }

      // Fallback: fetch from API
      const res = await getInvoicesByStatus({
        page: 1,
        page_size: 10,
        status: EXPRESS_BILLING_STATUSES,
        search: query,
      });

      const results = res.data.results || [];
      if (results.length > 0) {
        setSelected(results[0]);
        // Merge into local cache
        setAllInvoices((prev) => {
          const ids = new Set(prev.map((i) => i.id));
          return [...prev, ...results.filter((r) => !ids.has(r.id))];
        });
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error("Search failed:", err);
      toast.error("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  }, [searchQuery, allInvoices]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleStatusUpdate = (invoiceId, newStatus) => {
    setAllInvoices((prev) =>
      prev.map((inv) => (inv.id === invoiceId ? { ...inv, status: newStatus } : inv))
    );
    if (newStatus === "PACKED") {
      // Remove from INVOICED pool after a short delay (to let user see success)
      setTimeout(() => {
        setAllInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
      }, 3000);
    }
  };

  const handleCloseModal = () => {
    setSelected(null);
    setSearchQuery("");
    searchRef.current?.focus();
  };

  // Recent (last 5 from loaded invoices)
  const recentInvoices = allInvoices.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-start pt-16 px-4">

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Zap size={28} className="text-teal-500" />
        <h1 className="text-2xl font-bold text-gray-800">Express billing</h1>
      </div>
      <p className="text-sm text-gray-400 mb-8">Scan or search an invoice to process it</p>

      {/* Search card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

        {/* Search input */}
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Invoice number
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setNotFound(false); }}
              onKeyDown={handleKeyDown}
              placeholder="e.g. C-00242"
              className="w-full pl-9 pr-9 py-2.5 border-2 border-gray-200 focus:border-teal-500 rounded-xl text-sm text-gray-800 outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setNotFound(false); searchRef.current?.focus(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className={`px-5 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-2 transition-all ${
              searching || !searchQuery.trim()
                ? "bg-teal-300 cursor-not-allowed"
                : "bg-teal-500 hover:bg-teal-600 shadow-md shadow-teal-100"
            }`}
          >
            {searching ? <RefreshCw size={15} className="animate-spin" /> : <Search size={15} />}
            {searching ? "..." : "Search"}
          </button>
        </div>

        {/* Not found error */}
        {notFound && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            <AlertCircle size={13} />
            No bill found for "{searchQuery}". Check the number and try again.
          </div>
        )}

        {/* Recent invoices */}
        {recentInvoices.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Recent invoices
            </p>
            <div className="flex flex-col gap-1">
              {recentInvoices.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => setSelected(inv)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-teal-50 border border-transparent hover:border-teal-100 transition-all group text-left"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center">
                      <FileText size={13} className="text-teal-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {inv.invoice_no}
                      </p>
                      <p className="text-xs text-gray-400">
                        {inv.customer?.name || "—" }
                      </p>
                      <p className="text-xs text-gray-400">
                        {inv.customer?.area || inv.customer?.address1 || inv.temp_name || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600">
                      {formatAmount(inv.Total)}
                    </span>
                    <ChevronRight
                      size={14}
                      className="text-gray-300 group-hover:text-teal-500 transition-colors"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty state while loading */}
        {loading && recentInvoices.length === 0 && (
          <div className="mt-6 text-center text-gray-400 text-sm py-4">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-teal-400" />
            Loading invoices...
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={handleCloseModal}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
}