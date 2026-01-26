import { useEffect, useState } from "react";
import Pagination from "../../../components/Pagination";
import { getPickingHistory, getPackingHistory, getDeliveryHistory } from "../../../services/sales";
import ConsolidateDetailModal from "../../../components/ConsolidateDetailModal";
import { formatDateTime } from '../../../utils/formatters';

export default function InvoiceHistoryView() {
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    load();
  }, [currentPage, search, filterStatus, filterDate]);

  const load = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        page_size: itemsPerPage,
      };

      if (search.trim()) params.search = search.trim();
      if (filterDate) params.start_date = filterDate;

      // Fetch all three histories in parallel
      const [pickingRes, packingRes, deliveryRes] = await Promise.all([
        getPickingHistory(params).catch(() => ({ data: { results: [], count: 0 } })),
        getPackingHistory(params).catch(() => ({ data: { results: [], count: 0 } })),
        getDeliveryHistory(params).catch(() => ({ data: { results: [], count: 0 } })),
      ]);

      // Combine and organize data by invoice
      const invoiceMap = new Map();

      // Add picking data
      (pickingRes.data?.results || []).forEach(item => {
        if (!invoiceMap.has(item.invoice_no)) {
          invoiceMap.set(item.invoice_no, {
            invoice_no: item.invoice_no,
            customer_name: item.customer_name,
            customer_email: item.customer_email,
            customer_phone: item.customer_phone,
            picking: item,
            packing: null,
            delivery: null,
            latest_date: new Date(item.start_time),
          });
        }
      });

      // Add packing data
      (packingRes.data?.results || []).forEach(item => {
        const invoice = invoiceMap.get(item.invoice_no);
        if (invoice) {
          invoice.packing = item;
          const packDate = new Date(item.start_time);
          if (packDate > invoice.latest_date) {
            invoice.latest_date = packDate;
          }
        } else {
          invoiceMap.set(item.invoice_no, {
            invoice_no: item.invoice_no,
            customer_name: item.customer_name,
            customer_email: item.customer_email,
            customer_phone: item.customer_phone,
            picking: null,
            packing: item,
            delivery: null,
            latest_date: new Date(item.start_time),
          });
        }
      });

      // Add delivery data
      (deliveryRes.data?.results || []).forEach(item => {
        const invoice = invoiceMap.get(item.invoice_no);
        if (invoice) {
          invoice.delivery = item;
          const delDate = new Date(item.start_time);
          if (delDate > invoice.latest_date) {
            invoice.latest_date = delDate;
          }
        } else {
          invoiceMap.set(item.invoice_no, {
            invoice_no: item.invoice_no,
            customer_name: item.customer_name,
            customer_email: item.customer_email,
            customer_phone: item.customer_phone,
            picking: null,
            packing: null,
            delivery: item,
            latest_date: new Date(item.start_time),
          });
        }
      });

      // Convert to array and sort by latest date
      let combined = Array.from(invoiceMap.values()).sort(
        (a, b) => b.latest_date - a.latest_date
      );

      // Apply status filter
      if (filterStatus) {
        combined = combined.filter(item => {
          if (filterStatus === "COMPLETED") {
            return item.delivery?.delivery_status === "DELIVERED";
          } else if (filterStatus === "IN_PROGRESS") {
            return item.delivery?.delivery_status !== "DELIVERED" || !item.delivery;
          } else if (filterStatus === "PICKED") {
            return item.picking?.picking_status === "PICKED";
          } else if (filterStatus === "PACKED") {
            return item.packing?.packing_status === "PACKED";
          }
          return true;
        });
      }

      setHistory(combined);
      setTotalCount(combined.length);
    } catch (error) {
      console.error("Failed to load invoice history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (item) => {
    setSelectedInvoiceData(item);
    setModalOpen(true);
  };

  const toggleExpand = (invoiceNo) => {
    setExpandedRow(expandedRow === invoiceNo ? null : invoiceNo);
  };

  const formatDuration = (minutes) => {
    if (!minutes) return "-";
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const statusBadge = (status) => {
    const styles = {
      PREPARING: "bg-yellow-100 text-yellow-700 border-yellow-200",
      PICKED: "bg-green-100 text-green-700 border-green-200",
      VERIFIED: "bg-blue-100 text-blue-700 border-blue-200",
      PENDING: "bg-gray-100 text-gray-700 border-gray-200",
      IN_PROGRESS: "bg-yellow-100 text-yellow-700 border-yellow-200",
      PACKED: "bg-green-100 text-green-700 border-green-200",
      IN_TRANSIT: "bg-blue-100 text-blue-700 border-blue-200",
      DELIVERED: "bg-green-100 text-green-700 border-green-200",
    };

    if (!status) return <span className="text-gray-400 text-xs">Not Started</span>;

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-semibold border ${
          styles[status] || "bg-gray-100 text-gray-700"
        }`}
      >
        {status.replace(/_/g, " ")}
      </span>
    );
  };

  const getOverallStatus = (item) => {
    if (item.delivery?.delivery_status === "DELIVERED") {
      return { label: "COMPLETED", color: "bg-green-100 text-green-700 border-green-200" };
    }
    if (item.delivery?.delivery_status === "IN_TRANSIT") {
      return { label: "IN TRANSIT", color: "bg-blue-100 text-blue-700 border-blue-200" };
    }
    if (item.packing?.packing_status === "PACKED") {
      return { label: "READY FOR DELIVERY", color: "bg-purple-100 text-purple-700 border-purple-200" };
    }
    if (item.picking?.picking_status === "PICKED" || item.picking?.picking_status === "VERIFIED") {
      return { label: "IN PACKING", color: "bg-yellow-100 text-yellow-700 border-yellow-200" };
    }
    if (item.picking?.picking_status === "PREPARING") {
      return { label: "IN PICKING", color: "bg-orange-100 text-orange-700 border-orange-200" };
    }
    return { label: "PENDING", color: "bg-gray-100 text-gray-700 border-gray-200" };
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-md p-6">
        {/* HEADER + FILTERS */}
        <div className="flex flex-col sm:flex-row sm:justify-between mb-4 gap-3 sm:items-center">
          <h2 className="text-xl font-bold text-gray-800">Complete Invoice History</h2>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search invoice or customer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 w-full sm:w-64"
            />

            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="border px-3 py-2 rounded-lg w-full sm:w-auto"
            >
              <option value="">All Status</option>
              <option value="COMPLETED">Completed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="PICKED">Picked</option>
              <option value="PACKED">Packed</option>
            </select>

            <input
              type="date"
              className="px-3 py-2 border border-gray-300 rounded-lg w-full sm:w-auto"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* TABLE */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <>
            {/* DESKTOP VIEW */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-teal-500 to-cyan-600 text-left">
                    <th className="px-4 py-4 text-sm font-bold text-white">Invoice</th>
                    <th className="px-4 py-4 text-sm font-bold text-white">Customer</th>
                    <th className="px-4 py-4 text-sm font-bold text-white">Overall Status</th>
                    <th className="px-4 py-4 text-sm font-bold text-white">Picking</th>
                    <th className="px-4 py-4 text-sm font-bold text-white">Packing</th>
                    <th className="px-4 py-4 text-sm font-bold text-white">Delivery</th>
                    <th className="px-4 py-4 text-sm font-bold text-white">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {history.map((item) => {
                    const overallStatus = getOverallStatus(item);
                    const isRepick = item.picking?.notes?.includes('[RE-PICK]');
                    
                    return (
                      <tr
                        key={item.invoice_no}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleViewDetails(item)}
                            className="text-teal-600 hover:text-teal-800 font-bold hover:underline"
                          >
                            {item.invoice_no}
                          </button>
                          {isRepick && (
                            <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-semibold">
                              RE-PICK
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-sm">{item.customer_name}</p>
                          <p className="text-xs text-gray-500">{item.customer_email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${overallStatus.color}`}>
                            {overallStatus.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {item.picking ? (
                            <div className="space-y-1">
                              {statusBadge(item.picking.picking_status)}
                              <p className="text-xs text-gray-500">{item.picking.picker_name}</p>
                              <p className="text-xs text-gray-400">{formatDuration(item.picking.duration)}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.packing ? (
                            <div className="space-y-1">
                              {statusBadge(item.packing.packing_status)}
                              <p className="text-xs text-gray-500">{item.packing.packer_name}</p>
                              <p className="text-xs text-gray-400">{formatDuration(item.packing.duration)}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.delivery ? (
                            <div className="space-y-1">
                              {statusBadge(item.delivery.delivery_status)}
                              <p className="text-xs text-gray-500">
                                {item.delivery.delivery_type === "COURIER" && `📦 ${item.delivery.courier_name}`}
                                {item.delivery.delivery_type === "INTERNAL" && `🚚 ${item.delivery.delivery_user_name}`}
                                {item.delivery.delivery_type === "DIRECT" && "🏪 Counter Pickup"}
                              </p>
                              <p className="text-xs text-gray-400">{formatDuration(item.delivery.duration)}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleViewDetails(item)}
                            className="text-teal-600 hover:text-teal-800 text-sm font-medium hover:underline"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {history.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-gray-500">
                        No invoice history found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* EXPANDED DETAILS (optional inline view) */}
              {expandedRow && history.find(h => h.invoice_no === expandedRow) && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  {(() => {
                    const item = history.find(h => h.invoice_no === expandedRow);
                    return (
                      <div className="grid grid-cols-3 gap-6">
                        {/* Picking Details */}
                        <div className="space-y-2">
                          <h4 className="font-bold text-gray-700 border-b pb-2">📦 Picking Details</h4>
                          {item.picking ? (
                            <>
                              <div><span className="font-medium">Picker:</span> {item.picking.picker_name}</div>
                              <div><span className="font-medium">Email:</span> {item.picking.picker_email}</div>
                              <div><span className="font-medium">Status:</span> {statusBadge(item.picking.picking_status)}</div>
                              <div><span className="font-medium">Start:</span> {formatDateTime(item.picking.start_time)}</div>
                              <div><span className="font-medium">End:</span> {formatDateTime(item.picking.end_time)}</div>
                              <div><span className="font-medium">Duration:</span> {formatDuration(item.picking.duration)}</div>
                              {item.picking.notes && (
                                <div><span className="font-medium">Notes:</span> <span className="text-sm text-gray-600">{item.picking.notes}</span></div>
                              )}
                            </>
                          ) : (
                            <p className="text-gray-400 text-sm">Not started</p>
                          )}
                        </div>

                        {/* Packing Details */}
                        <div className="space-y-2">
                          <h4 className="font-bold text-gray-700 border-b pb-2">📦 Packing Details</h4>
                          {item.packing ? (
                            <>
                              <div><span className="font-medium">Packer:</span> {item.packing.packer_name}</div>
                              <div><span className="font-medium">Email:</span> {item.packing.packer_email}</div>
                              <div><span className="font-medium">Status:</span> {statusBadge(item.packing.packing_status)}</div>
                              <div><span className="font-medium">Start:</span> {formatDateTime(item.packing.start_time)}</div>
                              <div><span className="font-medium">End:</span> {formatDateTime(item.packing.end_time)}</div>
                              <div><span className="font-medium">Duration:</span> {formatDuration(item.packing.duration)}</div>
                              {item.packing.notes && (
                                <div><span className="font-medium">Notes:</span> <span className="text-sm text-gray-600">{item.packing.notes}</span></div>
                              )}
                            </>
                          ) : (
                            <p className="text-gray-400 text-sm">Not started</p>
                          )}
                        </div>

                        {/* Delivery Details */}
                        <div className="space-y-2">
                          <h4 className="font-bold text-gray-700 border-b pb-2">🚚 Delivery Details</h4>
                          {item.delivery ? (
                            <>
                              <div><span className="font-medium">Type:</span> {item.delivery.delivery_type.replace(/_/g, " ")}</div>
                              {item.delivery.delivery_type === "COURIER" && (
                                <>
                                  <div><span className="font-medium">Courier:</span> {item.delivery.courier_name}</div>
                                  <div><span className="font-medium">Tracking:</span> {item.delivery.tracking_no}</div>
                                </>
                              )}
                              {item.delivery.delivery_type === "INTERNAL" && (
                                <>
                                  <div><span className="font-medium">Driver:</span> {item.delivery.delivery_user_name}</div>
                                  <div><span className="font-medium">Email:</span> {item.delivery.delivery_user_email}</div>
                                </>
                              )}
                              <div><span className="font-medium">Status:</span> {statusBadge(item.delivery.delivery_status)}</div>
                              <div><span className="font-medium">Start:</span> {formatDateTime(item.delivery.start_time)}</div>
                              <div><span className="font-medium">End:</span> {formatDateTime(item.delivery.end_time)}</div>
                              <div><span className="font-medium">Duration:</span> {formatDuration(item.delivery.duration)}</div>
                              {item.delivery.notes && (
                                <div><span className="font-medium">Notes:</span> <span className="text-sm text-gray-600">{item.delivery.notes}</span></div>
                              )}
                            </>
                          ) : (
                            <p className="text-gray-400 text-sm">Not started</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* MOBILE VIEW */}
            <div className="lg:hidden space-y-4">
              {history.map((item) => {
                const overallStatus = getOverallStatus(item);
                const isRepick = item.picking?.notes?.includes('[RE-PICK]');
                
                return (
                  <div key={item.invoice_no} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <button
                          onClick={() => handleViewDetails(item)}
                          className="font-bold text-teal-600 hover:underline"
                        >
                          {item.invoice_no}
                        </button>
                        {isRepick && (
                          <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-semibold">
                            RE-PICK
                          </span>
                        )}
                        <p className="text-sm text-gray-600">{item.customer_name}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${overallStatus.color}`}>
                        {overallStatus.label}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      {item.picking && (
                        <div className="flex justify-between items-center py-1 border-b">
                          <span className="text-gray-600">📦 Picking:</span>
                          <div className="text-right">
                            {statusBadge(item.picking.picking_status)}
                            <p className="text-xs text-gray-500">{item.picking.picker_name}</p>
                          </div>
                        </div>
                      )}

                      {item.packing && (
                        <div className="flex justify-between items-center py-1 border-b">
                          <span className="text-gray-600">📦 Packing:</span>
                          <div className="text-right">
                            {statusBadge(item.packing.packing_status)}
                            <p className="text-xs text-gray-500">{item.packing.packer_name}</p>
                          </div>
                        </div>
                      )}

                      {item.delivery && (
                        <div className="flex justify-between items-center py-1">
                          <span className="text-gray-600">🚚 Delivery:</span>
                          <div className="text-right">
                            {statusBadge(item.delivery.delivery_status)}
                            <p className="text-xs text-gray-500">
                              {item.delivery.delivery_type === "COURIER" && item.delivery.courier_name}
                              {item.delivery.delivery_type === "INTERNAL" && item.delivery.delivery_user_name}
                              {item.delivery.delivery_type === "DIRECT" && "Counter Pickup"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleViewDetails(item)}
                      className="mt-3 w-full text-center bg-teal-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-teal-600"
                    >
                      View Full Details
                    </button>
                  </div>
                );
              })}

              {history.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No invoice history found
                </div>
              )}
            </div>
          </>
        )}

        {/* PAGINATION */}
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {history.length} of {totalCount} invoices
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage * itemsPerPage >= totalCount}
              className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* CONSOLIDATE DETAIL MODAL */}
      {modalOpen && selectedInvoiceData && (
        <ConsolidateDetailModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedInvoiceData(null);
          }}
          invoiceNo={selectedInvoiceData.invoice_no}
          invoiceData={selectedInvoiceData}
        />
      )}
    </>
  );
}