import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Pagination from "../../../components/Pagination";
import { getPackingHistory } from "../../../services/sales";

export default function PackingHistory() {
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

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
      if (filterStatus) params.status = filterStatus;
      if (filterDate) params.start_date = filterDate;

      const response = await getPackingHistory(params);
      setHistory(response.data.results);
      setTotalCount(response.data.count);
    } catch (error) {
      console.error("Failed to load packing history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewInvoice = (invoiceId) => {
    navigate(`/invoices/${invoiceId}`);
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
      PENDING: "bg-gray-100 text-gray-700 border-gray-200",
      IN_PROGRESS: "bg-yellow-100 text-yellow-700 border-yellow-200",
      PACKED: "bg-green-100 text-green-700 border-green-200",
    };

    const labels = {
      PENDING: "Pending",
      IN_PROGRESS: "In Progress",
      PACKED: "Packed",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status] || "bg-gray-100 text-gray-700"}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      {/* HEADER + FILTER ROW */}
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Packing History</h2>

        <div className="flex gap-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Search invoice or packer..."
            className="px-3 py-2 border border-gray-300 rounded-lg w-64"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />

          {/* Status Filter */}
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg"
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PACKED">Packed</option>
          </select>

          {/* Date Filter */}
          <input
            type="date"
            className="px-3 py-2 border border-gray-300 rounded-lg"
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
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-teal-500 to-cyan-600 text-left">
              <th className="px-6 py-4 text-sm font-bold text-white">Invoice</th>
              <th className="px-6 py-4 text-sm font-bold text-white">Customer</th>
              <th className="px-6 py-4 text-sm font-bold text-white">Packer</th>
              <th className="px-6 py-4 text-sm font-bold text-white">Status</th>
              <th className="px-6 py-4 text-sm font-bold text-white">Date & Time</th>
              <th className="px-6 py-4 text-sm font-bold text-white">Duration</th>
            </tr>
          </thead>

          <tbody>
            {history.map((h) => (
              <tr key={h.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-3">
                  <button
                    onClick={() => handleViewInvoice(h.id)}
                    className="text-teal-600 hover:text-teal-800 font-medium hover:underline"
                  >
                    {h.invoice_no}
                  </button>
                </td>
                <td className="px-6 py-3">
                  <p className="font-medium">{h.customer_name}</p>
                  <p className="text-xs text-gray-500">{h.customer_email}</p>
                </td>
                <td className="px-6 py-3">
                  <p className="font-medium">{h.packer_name}</p>
                  <p className="text-xs text-gray-500">{h.packer_email}</p>
                </td>
                <td className="px-6 py-3">{statusBadge(h.packing_status)}</td>
                <td className="px-6 py-3">
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">
                      {new Date(h.start_time).toLocaleDateString('en-IN', {
                        year: '2-digit',
                        month: '2-digit',
                        day: '2-digit'
                      })}
                    </p>
                    <p className="text-xs text-gray-600">
                      {new Date(h.start_time).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                      {h.end_time && (
                        <> to {new Date(h.end_time).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}</>
                      )}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-3">
                  {h.duration ? (
                    <button
                      onClick={() => handleViewInvoice(h.id)}
                      className="text-teal-600 hover:text-teal-800 font-medium hover:underline"
                    >
                      {formatDuration(h.duration)}
                    </button>
                  ) : (
                    <span className="text-gray-400">In Progress</span>
                  )}
                </td>
              </tr>
            ))}

            {history.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-4 text-gray-500">
                  No packing records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {/* PAGINATION */}
      <Pagination
        currentPage={currentPage}
        totalItems={totalCount}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        label="pack records"
      />
    </div>
  );
}