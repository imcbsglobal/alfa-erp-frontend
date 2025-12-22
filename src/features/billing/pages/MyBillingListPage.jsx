import { useEffect, useState, Fragment } from "react";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";

export default function MyBillingListPage() {
  const { user } = useAuth();
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [completedInvoices, setCompletedInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [billedItems, setBilledItems] = useState({});

  useEffect(() => {
    loadActiveBilling();
    loadTodayCompletedBilling();
  }, []);

  const loadActiveBilling = async () => {
    try {
      setLoading(true);
      const res = await api.get("/sales/billing/active/");
      if (res.data?.data) {
        const task = res.data.data;
        setActiveInvoice({ ...task.invoice, created_at: task.start_time });
      } else {
        setActiveInvoice(null);
      }
    } catch (err) {
      console.error("Failed to load active billing task", err);
      setActiveInvoice(null);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayCompletedBilling = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await api.get("/sales/billing/history/", {
        params: { status: "BILLED", start_date: today, end_date: today },
      });
      setCompletedInvoices(res.data?.results || []);
    } catch (err) {
      console.error("Failed to load billing history", err);
    }
  };

  const toggleItemBilled = (itemId) => {
    setBilledItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const allItemsBilled =
    activeInvoice?.items?.every((item) => billedItems[item.id]) || false;
  const billedCount =
    activeInvoice?.items?.filter((item) => billedItems[item.id]).length || 0;
  const totalItems = activeInvoice?.items?.length || 0;

  const handleCompleteBilling = async () => {
    if (!allItemsBilled || !activeInvoice) return;
    if (!user?.email) {
      alert("User email not found");
      return;
    }
    try {
      setLoading(true);
      await api.post("/sales/billing/complete/", {
        invoice_no: activeInvoice.invoice_no,
        user_email: user.email,
        notes: "Billed all items",
      });
      await loadActiveBilling();
      await loadTodayCompletedBilling();
      setBilledItems({});
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to complete billing");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Billed Invoices
          </h1>
        </div>

        {/* Active Invoice Section */}
        {activeInvoice && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-teal-50 p-2 rounded-lg">
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Active Invoice</h2>
                <p className="text-sm text-gray-500">Currently in progress</p>
              </div>
            </div>

            <div
              className="bg-white rounded-2xl border-2 border-teal-500 shadow-lg overflow-hidden cursor-pointer transition-all hover:shadow-xl"
              onClick={() =>
                setExpandedInvoice(
                  expandedInvoice === activeInvoice.id ? null : activeInvoice.id
                )
              }
            >
              {/* Compact Header */}
              <div className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                  {/* Left: Invoice Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="bg-teal-50 p-3 rounded-xl">
                      <svg
                        className="w-7 h-7 text-teal-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-1">
                        <h3 className="text-xl font-bold text-gray-900">
                          Invoice #{activeInvoice.invoice_no}
                        </h3>
                        <span className="inline-flex px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse"></span>
                          In Progress
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          {activeInvoice.customer?.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          {new Date(activeInvoice.created_at).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Circular Progress & Expand Icon */}
                  <div className="flex items-center gap-4 self-end sm:self-center">
                    {/* Circular Progress */}
                    <div className="relative w-16 h-16">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="#e5e7eb"
                          strokeWidth="6"
                          fill="none"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="url(#gradient)"
                          strokeWidth="6"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 28}`}
                          strokeDashoffset={`${2 *
                            Math.PI *
                            28 *
                            (1 - billedCount / totalItems)}`}
                          strokeLinecap="round"
                          className="transition-all duration-500"
                        />
                        <defs>
                          <linearGradient
                            id="gradient"
                            x1="0%"
                            y1="0%"
                            x2="100%"
                            y2="100%"
                          >
                            <stop offset="0%" stopColor="#14b8a6" />
                            <stop offset="100%" stopColor="#06b6d4" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-bold text-gray-900">
                          {Math.round((billedCount / totalItems) * 100)}%
                        </span>
                        <span className="text-[9px] text-gray-500 -mt-0.5">
                          {billedCount}/{totalItems}
                        </span>
                      </div>
                    </div>

                    {/* Expand Icon */}
                    <svg
                      className={`w-6 h-6 text-gray-400 transition-transform ${
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
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedInvoice === activeInvoice.id && (
                <div
                  className="px-5 pb-5 pt-2 bg-gray-50 border-t border-gray-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="bg-white p-4 rounded-lg mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Items to Bill ({totalItems})
                    </h4>
                    <div className="space-y-3">
                      {activeInvoice.items.map((item) => (
                        <div
                          key={item.id}
                          className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                            billedItems[item.id]
                              ? "bg-teal-50 border-teal-500"
                              : "bg-white border-gray-200 hover:border-teal-300"
                          }`}
                          onClick={() => toggleItemBilled(item.id)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            {/* Left: Checkbox and Item Details */}
                            <div className="flex items-start gap-3 flex-1">
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                                  billedItems[item.id]
                                    ? "bg-teal-600"
                                    : "bg-white border-2 border-gray-300"
                                }`}
                              >
                                <svg
                                  className={`w-5 h-5 ${
                                    billedItems[item.id]
                                      ? "text-white"
                                      : "text-gray-400"
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
                              
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <p className="font-semibold text-sm text-gray-900">
                                      {item.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {item.item_code || item.sku}
                                    </p>
                                  </div>
                                  <div className="text-right ml-3">
                                    <span className="font-bold text-lg text-gray-900">
                                      {item.quantity}
                                    </span>
                                    <span className="text-xs text-gray-500 ml-1">
                                      {item.quantity > 1 ? "pcs" : "pc"}
                                    </span>
                                  </div>
                                </div>

                                {/* Additional Details Grid */}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 pt-3 border-t border-gray-200">
                                  {item.mrp && (
                                    <div>
                                      <p className="text-xs text-gray-500">MRP</p>
                                      <p className="text-sm font-medium text-gray-900">
                                        ₹{item.mrp}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {item.batch_no && (
                                    <div>
                                      <p className="text-xs text-gray-500">Batch</p>
                                      <p className="text-sm font-medium text-gray-900">
                                        {item.batch_no}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {item.remarks && (
                                  <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                                    <p className="text-xs text-yellow-800">
                                      <span className="font-semibold">Note:</span> {item.remarks}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right: Billed Badge */}
                            {billedItems[item.id] && (
                              <span className="px-3 py-1 bg-teal-600 text-white rounded-full text-xs font-medium flex-shrink-0">
                                ✓ Billed
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleCompleteBilling}
                    disabled={!allItemsBilled}
                    className={`w-full py-3 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                      allItemsBilled
                        ? "bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {allItemsBilled
                      ? "Complete Billing"
                      : `Bill Remaining ${totalItems - billedCount} Items`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completed Invoices Section */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 p-2 rounded-lg">
                <svg
                  className="w-6 h-6 text-emerald-600"
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
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-600">
                  Completed Invoices Today
                </h2>
              </div>
            </div>
          </div>

          {completedInvoices.length === 0 ? (
            <div className="text-center py-20">
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
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
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No completed invoices yet
              </h3>
              <p className="text-gray-500">
                Your completed invoices will appear here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                  <tr>
                    <th className="px-3 sm:px-6 py-4 text-left text-sm font-bold text-white">
                      Invoice Number
                    </th>
                    <th className="px-3 sm:px-6 py-4 text-left text-sm font-bold text-white">
                      Date
                    </th>
                    <th className="px-3 sm:px-6 py-4 text-left text-sm font-bold text-white">
                      Start Time
                    </th>
                    <th className="px-3 sm:px-6 py-4 text-left text-sm font-bold text-white">
                      End Time
                    </th>
                    <th className="px-3 sm:px-6 py-4 text-left text-sm font-bold text-white">
                      Duration
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {completedInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition">
                      <td className="px-3 sm:px-6 py-4">
                        <span className="font-semibold text-gray-900">
                          #{inv.invoice_no}
                        </span>
                      </td>

                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-600">
                        {new Date(inv.start_time).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-600">
                        {new Date(inv.start_time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-600">
                        {inv.end_time
                          ? new Date(inv.end_time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>

                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-600">
                        {inv.duration ? `${inv.duration} min` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}