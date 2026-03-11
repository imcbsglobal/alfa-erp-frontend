import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getBoxingInvoices } from "../../../services/sales";
import { useAuth } from "../../auth/AuthContext";
import toast from "react-hot-toast";

export default function MyBoxingListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const getPath = useCallback((path) => {
    const isOpsUser = ["PICKER", "PACKER", "BILLER", "DELIVERY", "STORE"].includes(user?.role);
    return isOpsUser ? `/ops${path}` : path;
  }, [user]);

  const loadInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getBoxingInvoices();
      const data = res.data?.data || res.data?.results || res.data || [];
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load boxing invoices", err);
      toast.error("Failed to load boxing invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  const filtered = invoices.filter(inv =>
    !search.trim() ||
    inv.invoice_no?.toLowerCase().includes(search.toLowerCase()) ||
    inv.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
    inv.temp_name?.toLowerCase().includes(search.toLowerCase())
  );

  const getCustomerName = (inv) => inv.customer?.name || inv.temp_name || "—";
  const getAddress = (inv) => {
    const c = inv.customer;
    if (!c) return null;
    return [c.area, c.address1, c.address2, c.address3, c.pincode].filter(Boolean).join(", ");
  };
  const getPhone = (inv) => {
    const c = inv.customer;
    if (!c) return null;
    return [c.phone1, c.phone2].filter(Boolean).join("  |  ");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-800">My Assigned Boxing</h1>
          <p className="text-xs text-gray-500">Invoices ready for address label printing &amp; boxing</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">{filtered.length} invoice{filtered.length !== 1 ? "s" : ""}</span>
          <button onClick={loadInvoices} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border rounded-lg hover:bg-gray-50 disabled:opacity-50">
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
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search invoice or customer..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-6 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin h-8 w-8 border-b-2 border-teal-600 rounded-full"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="w-14 h-14 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8 5-8-5m16 0v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7m16 0l-8-5-8 5" />
            </svg>
            <p className="text-sm font-medium">No boxing jobs available</p>
            <p className="text-xs mt-1">{search ? "Try a different search" : "Completed tray packing will appear here"}</p>
          </div>
        ) : (
          filtered.map(inv => {
            const customerName = getCustomerName(inv);
            const address = getAddress(inv);
            const phone = getPhone(inv);
            const itemCount = inv.items?.length || 0;

            return (
              <div key={inv.invoice_no || inv.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-teal-200 transition-all overflow-hidden">

                {/* Card header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900 font-mono">#{inv.invoice_no}</span>
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 rounded-full">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-semibold text-orange-700">IN PROGRESS</span>
                    </div>
                  </div>
                  {inv.invoice_date && (
                    <span className="text-[10px] text-gray-400">
                      {new Date(inv.invoice_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>

                {/* Delivery details body */}
                <div className="px-4 py-3 flex gap-4">
                  {/* Left — customer / address */}
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Ship To</p>
                      <p className="text-sm font-bold text-gray-900 uppercase leading-tight">{customerName}</p>
                    </div>
                    {address && (
                      <div className="flex items-start gap-1.5">
                        <svg className="w-3.5 h-3.5 text-gray-300 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="text-xs text-gray-600 leading-relaxed">{address}</p>
                      </div>
                    )}
                    {phone && (
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <p className="text-xs font-semibold text-gray-700">{phone}</p>
                      </div>
                    )}
                    {inv.customer?.email && (
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xs text-gray-500">{inv.customer.email}</p>
                      </div>
                    )}
                  </div>

                  {/* Right — order summary */}
                  <div className="flex flex-col items-end justify-between gap-2 flex-shrink-0 min-w-[100px]">
                    <div className="text-right space-y-1">
                      {itemCount > 0 && (
                        <div className="flex items-center gap-1 justify-end">
                          <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <span className="text-xs text-gray-500">{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
                        </div>
                      )}
                      {inv.Total && (
                        <p className="text-xs font-bold text-gray-700">₹{parseFloat(inv.Total).toLocaleString("en-IN")}</p>
                      )}
                    </div>
                    <button
                      onClick={() => navigate(getPath(`/packing/boxing/${inv.invoice_no}`))}
                      className="px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-lg hover:bg-teal-700 flex items-center gap-1.5 whitespace-nowrap">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2z" />
                      </svg>
                      Start Boxing
                    </button>
                  </div>
                </div>

                {/* Items strip */}
                {inv.items?.length > 0 && (
                  <div className="px-4 pb-3">
                    <div className="flex flex-wrap gap-1">
                      {inv.items.slice(0, 5).map((item, i) => (
                        <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full font-medium truncate max-w-[160px]">
                          {item.name || item.item_name}
                        </span>
                      ))}
                      {inv.items.length > 5 && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-[10px] rounded-full">
                          +{inv.items.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
