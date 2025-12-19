import { useEffect, useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
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

  const allItemsPicked =
    activeInvoice?.items?.every((item) => pickedItems[item.id]) || false;
  const pickedCount =
    activeInvoice?.items?.filter((item) => pickedItems[item.id]).length || 0;
  const totalItems = activeInvoice?.items?.length || 0;

  const { user } = useAuth();

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

  const calculateDuration = (start, end) => {
    const diff = Math.floor((new Date(end) - new Date(start)) / 60000);
    return `${diff} min`;
  };

  if (loading) return <div className="p-6">Loading...</div>;

  /* ------------------------------------------------------------------ */
  /*  RENDER
  /* ------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            My Assigned Invoices
          </h1>
          <p className="text-gray-600">
            View and manage your assigned picking tasks.
          </p>
        </div>

        {/* Active Bill Section */}
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
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Active Bill</h2>
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
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                          {activeInvoice.customer?.phone}
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
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {activeInvoice.customer?.address}
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
                            (1 - pickedCount / totalItems)}`}
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
                          {Math.round((pickedCount / totalItems) * 100)}%
                        </span>
                        <span className="text-[9px] text-gray-500 -mt-0.5">
                          {pickedCount}/{totalItems}
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
                      Items to Pick ({totalItems})
                    </h4>
                    <div className="space-y-2">
                      {activeInvoice.items.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${
                            pickedItems[item.id]
                              ? "bg-teal-50 border-teal-500"
                              : "bg-white border-gray-200 hover:border-teal-300"
                          }`}
                          onClick={() => toggleItemPicked(item.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                                pickedItems[item.id]
                                  ? "bg-teal-600"
                                  : "bg-white border-2 border-gray-300"
                              }`}
                            >
                              <svg
                                className={`w-5 h-5 ${
                                  pickedItems[item.id]
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
                            <div>
                              <p className="font-medium text-sm text-gray-900">
                                {item.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                SKU: {item.sku}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sm text-gray-900">
                              {item.quantity} {item.quantity > 1 ? "pcs" : "pc"}
                            </span>
                            {pickedItems[item.id] && (
                              <span className="px-3 py-1 bg-teal-600 text-white rounded-full text-xs font-medium">
                                Picked
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleCompletePicking}
                    disabled={!allItemsPicked}
                    className={`w-full py-3 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                      allItemsPicked
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
                    {allItemsPicked
                      ? "Complete Picking"
                      : `Pick Remaining ${totalItems - pickedCount} Items`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completed Bills Section */}
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
                <h2 className="text-xl font-bold text-gray-900">
                  Completed Bills
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
                No completed deliveries yet
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
                    <th className="px-3 sm:px-6 py-4 text-left text-sm font-bold text-white"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {completedInvoices.map((inv) => (
                    <Fragment key={inv.id}>
                      <tr
                        className="hover:bg-gray-50 transition cursor-pointer"
                        onClick={() =>
                          setExpandedInvoice(
                            expandedInvoice === inv.id ? null : inv.id
                          )
                        }
                      >
                        <td className="px-3 sm:px-6 py-4">
                          <span className="font-semibold text-gray-900">
                            #{inv.invoice_no}
                          </span>
                        </td>

                        <td className="px-3 sm:px-6 py-4 text-sm text-gray-600">
                          {new Date(inv.start_time).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
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

                        <td className="px-3 sm:px-6 py-4 text-right">
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform inline-block ${
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
                        </td>
                      </tr>

                      {/* Expanded Details Row */}
                      {expandedInvoice === inv.id && (
                        <tr>
                          <td colSpan="6" className="px-3 sm:px-6 py-4 bg-gray-50">
                            <div className="space-y-4">
                              {/* Customer Details */}
                              <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                                  Customer Details
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  <div>
                                    <p className="text-xs text-gray-500">Name</p>
                                    <p className="text-sm font-medium text-gray-900">
                                      {inv.customer_name}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Phone</p>
                                    <p className="text-sm font-medium text-gray-900">
                                      {inv.customer?.phone || "-"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Address</p>
                                    <p className="text-sm font-medium text-gray-900">
                                      {inv.customer?.address || "-"}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Items Picked */}
                              <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                                  Items Picked ({inv.items?.length || 0})
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {inv.items?.map((item) => (
                                    <div
                                      key={item.id || `${inv.id}-${item.sku}`}
                                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                      <div>
                                        <p className="font-medium text-sm text-gray-900">
                                          {item.product_name || item.name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          SKU: {item.sku || "N/A"}
                                        </p>
                                      </div>
                                      <span className="font-bold text-sm text-gray-900">
                                        {item.quantity}{" "}
                                        {item.quantity > 1 ? "pcs" : "pc"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Status */}
                              <div className="flex justify-end">
                                <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold">
                                  PICKED
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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