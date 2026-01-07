import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Pagination from "../../../components/Pagination";
import { getDeliveryHistory } from "../../../services/sales";
import DeliveryDetailModal from "../../../components/DeliveryDetailModal";

export default function DeliveryHistory() {
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 8;

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  useEffect(() => {
    load();
  }, [currentPage, search, filterType, filterStatus, filterDate]);

  const load = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        page_size: itemsPerPage,
      };

      if (search.trim()) params.search = search.trim();
      if (filterType) params.delivery_type = filterType;
      if (filterStatus) params.status = filterStatus;
      if (filterDate) params.start_date = filterDate;

      const response = await getDeliveryHistory(params);
      setHistory(response.data.results);
      setTotalCount(response.data.count);
    } catch (error) {
      console.error("Failed to load delivery history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (delivery) => {
    setSelectedDelivery(delivery);
    setModalOpen(true);
  };

  const handleViewInvoice = (invoiceNo, e) => {
    e.stopPropagation();
    navigate(`/invoices/${invoiceNo}`);
  };

  const formatDuration = (minutes) => {
    if (!minutes) return "-";
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const typeBadge = (type) => {
    const styles = {
      DIRECT: "bg-blue-100 text-blue-700 border-blue-200",
      COURIER: "bg-purple-100 text-purple-700 border-purple-200",
      INTERNAL: "bg-green-100 text-green-700 border-green-200",
    };

    const labels = {
      DIRECT: "Counter Pickup",
      COURIER: "Courier",
      INTERNAL: "Company Delivery",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[type] || "bg-gray-100 text-gray-700"}`}>
        {labels[type] || type}
      </span>
    );
  };

  const statusBadge = (status) => {
    const styles = {
      PENDING: "bg-gray-100 text-gray-700 border-gray-200",
      IN_TRANSIT: "bg-yellow-100 text-yellow-700 border-yellow-200",
      DELIVERED: "bg-green-100 text-green-700 border-green-200",
    };

    const labels = {
      PENDING: "Pending",
      IN_TRANSIT: "In Transit",
      DELIVERED: "Delivered",
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status] || "bg-gray-100 text-gray-700"}`}>
        {labels[status] || status}
      </span>
    );
  };

  const toggleExpand = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        {/* HEADER + FILTERS */}
        <div className="flex flex-col sm:flex-row sm:justify-between mb-4 gap-3 sm:items-center">
          <h2 className="text-xl font-bold text-gray-800">Delivery History</h2>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search invoice or details..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="border px-3 py-2 rounded-lg sm:w-64 w-full"
            />

            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="border px-3 py-2 rounded-lg w-full sm:w-auto"
            >
              <option value="">All Types</option>
              <option value="DIRECT">Counter Pickup</option>
              <option value="COURIER">Courier</option>
              <option value="INTERNAL">Company Delivery</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="border px-3 py-2 rounded-lg w-full sm:w-auto"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DELIVERED">Delivered</option>
            </select>

            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setCurrentPage(1);
              }}
              className="border px-3 py-2 rounded-lg sm:w-44 w-full"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <>
            {/* DESKTOP TABLE */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-teal-500 to-cyan-600">
                    <th className="px-6 py-4 text-white text-left">Invoice</th>
                    <th className="px-6 py-4 text-white text-left">Customer</th>
                    <th className="px-6 py-4 text-white text-left">Type</th>
                    <th className="px-6 py-4 text-white text-left">Details</th>
                    <th className="px-6 py-4 text-white text-left">Status</th>
                    <th className="px-6 py-4 text-white text-left">Duration</th>
                  </tr>
                </thead>

                <tbody>
                  {history.map((h) => (
                    <tr 
                      key={h.id} 
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleRowClick(h)}
                    >
                      <td className="px-6 py-3">
                        <button
                          onClick={(e) => handleViewInvoice(h.invoice_no, e)}
                          className="text-teal-600 hover:text-teal-800 font-medium hover:underline"
                        >
                          {h.invoice_no}
                        </button>
                      </td>

                      <td className="px-6 py-3">
                        <p className="font-medium">{h.customer_name}</p>
                        <p className="text-xs text-gray-500">{h.customer_email}</p>
                      </td>

                      <td className="px-6 py-3">{typeBadge(h.delivery_type)}</td>

                      <td className="px-6 py-3 text-gray-700">
                        {h.delivery_type === "DIRECT" && (
                          <p className="text-xs text-gray-500">Customer collected</p>
                        )}

                        {h.delivery_type === "COURIER" && (
                          <>
                            <p className="font-medium">{h.courier_name}</p>
                            <p className="text-xs text-gray-500">Track: {h.tracking_no}</p>
                          </>
                        )}

                        {h.delivery_type === "INTERNAL" && (
                          <>
                            <p className="font-medium">{h.delivery_user_name}</p>
                            <p className="text-xs text-gray-500">{h.delivery_user_email}</p>
                          </>
                        )}
                      </td>

                      <td className="px-6 py-3">{statusBadge(h.delivery_status)}</td>

                      <td className="px-6 py-3">
                        {h.duration ? (
                          <span className="text-gray-700 font-medium">{formatDuration(h.duration)}</span>
                        ) : (
                          <span className="text-gray-400">In Progress</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {history.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-gray-500">
                        No delivery records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}
            <div className="lg:hidden space-y-4">
              {history.map((h) => (
                <div key={h.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => handleRowClick(h)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewInvoice(h.invoice_no, e);
                          }}
                          className="font-bold text-teal-600 hover:underline"
                        >
                          {h.invoice_no}
                        </button>
                        <p className="text-sm text-gray-600">{h.customer_name}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {typeBadge(h.delivery_type)}
                        {statusBadge(h.delivery_status)}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 space-y-1">
                      <p>📅 {formatDateTime(h.start_time)}</p>
                      <p>⏱️ {formatDuration(h.duration)}</p>
                    </div>

                    <div className="mt-2 text-center text-gray-400 text-xs">
                      Tap to view details
                    </div>
                  </div>
                </div>
              ))}

              {history.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No delivery records found
                </div>
              )}
            </div>
          </>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={totalCount}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          label="delivery records"
        />
      </div>

      {/* DELIVERY DETAIL MODAL */}
      <DeliveryDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        deliveryData={selectedDelivery}
      />
    </>
  );
}