import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getBoxingInvoices } from "../../../services/sales";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";

export default function BoxingListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState(new Set());

  const getPath = useCallback((path) => {
    const isOpsUser = ["PICKER", "PACKER", "BILLER", "DELIVERY", "STORE"].includes(user?.role);
    return isOpsUser ? `/ops${path}` : path;
  }, [user]);

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getBoxingInvoices();
      setInvoices(res.data?.data || res.data?.results || res.data || []);
    } catch (err) {
      console.error("Failed to load boxing invoices", err);
      toast.error("Failed to load boxing invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const filtered = invoices.filter(inv => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      inv.invoice_no?.toLowerCase().includes(q) ||
      inv.customer_name?.toLowerCase().includes(q) ||
      inv.customer?.name?.toLowerCase().includes(q) ||
      inv.tray_codes?.some(t => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-800">Boxing Queue</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => {
            setSelectMode(!selectMode);
            if (selectMode) setSelectedInvoices(new Set());
          }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              selectMode
                ? "bg-teal-50 text-teal-600 border-teal-200"
                : "text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Select
          </button>
          <button onClick={loadInvoices} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
            <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 9a9 9 0 0115-6.7M20 15a9 9 0 01-15 6.7" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search invoice or customer..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-8 w-8 border-b-2 border-teal-600 rounded-full"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="w-14 h-14 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8 5-8-5m16 0v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7m16 0l-8-5-8 5" />
            </svg>
            <p className="text-sm font-medium">No invoices in boxing queue</p>
            <p className="text-xs mt-1">{search ? "Try a different search" : "Completed tray packing will appear here"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(inv => {
              const isSelected = selectedInvoices.has(inv.invoice_no);
              return (
                <div key={inv.invoice_no || inv.id}
                  className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer relative ${
                    selectMode ? (isSelected ? "border-teal-600 ring-2 ring-teal-100" : "border-gray-200 active:border-teal-300") : "border-gray-200 hover:border-teal-300"
                  }`}
                  onClick={() => {
                    if (selectMode) {
                      const updated = new Set(selectedInvoices);
                      if (updated.has(inv.invoice_no)) {
                        updated.delete(inv.invoice_no);
                      } else {
                        updated.add(inv.invoice_no);
                      }
                      setSelectedInvoices(updated);
                    } else {
                      navigate(getPath(`/packing/boxing/${inv.invoice_no}`));
                    }
                  }}>

                  {/* Checkbox in select mode */}
                  {selectMode && (
                    <div className="absolute top-3 left-3 z-10">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          const updated = new Set(selectedInvoices);
                          if (updated.has(inv.invoice_no)) {
                            updated.delete(inv.invoice_no);
                          } else {
                            updated.add(inv.invoice_no);
                          }
                          setSelectedInvoices(updated);
                        }}
                        onClick={e => e.stopPropagation()}
                        className="w-5 h-5 rounded border-teal-600 text-teal-600 cursor-pointer accent-teal-600"
                      />
                    </div>
                  )}

                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className={`text-sm font-bold font-mono ${selectMode && isSelected ? "text-teal-600" : "text-gray-900"}`}>#{inv.invoice_no}</span>
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 rounded-full">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                      <span className="text-[10px] font-semibold text-orange-700">IN PROGRESS</span>
                    </div>
                  </div>

                  <div className="px-4 py-3 space-y-2">
                    <div>
                      <p className="text-xs font-semibold text-gray-800 truncate">{inv.customer_name || inv.customer?.name}</p>
                      {(inv.customer?.address1 || inv.temp_name) && (
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">
                          {inv.customer?.area || inv.customer?.address1 || inv.temp_name}
                        </p>
                      )}
                    </div>

                    {/* Tray codes */}
                    {inv.tray_codes?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {inv.tray_codes.map(code => (
                          <span key={code} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px] font-mono font-semibold text-gray-600">
                            <svg className="w-2.5 h-2.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                            {code}
                          </span>
                        ))}
                      </div>
                    )}

                    {inv.completed_at && (
                      <span className="text-[10px] text-gray-400">
                        {new Date(inv.completed_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>

                  {!selectMode && (
                    <div className="px-4 pb-3">
                      <button
                        onClick={e => { e.stopPropagation(); navigate(getPath(`/packing/boxing/${inv.invoice_no}`)); }}
                        className="w-full py-1.5 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 flex items-center justify-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" />
                        </svg>
                        Print Labels
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky bottom bar for multi-select */}
      {selectMode && selectedInvoices.size >= 2 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">
            {selectedInvoices.size} bill{selectedInvoices.size !== 1 ? "s" : ""} selected
          </span>
          <button
            onClick={() => {
              const invoiceList = Array.from(selectedInvoices).join(",");
              navigate(getPath(`/packing/boxing/multi?invoices=${invoiceList}`));
            }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700">
            Box Together
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      )}

      {/* Padding when sticky bar is visible */}
      {selectMode && selectedInvoices.size >= 2 && <div className="h-16"></div>}
    </div>
  );
}
