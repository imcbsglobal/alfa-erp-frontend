import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import Pagination from "../../../components/Pagination";
import { useAuth } from "../../auth/AuthContext";
import { getPickingHistory } from "../../../services/sales";
import InvoiceDetailModal from "../../../components/InvoiceDetailModal";
import { formatDate, formatTime } from '../../../utils/formatters';

export default function PickingHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  useEffect(() => {
    load();

    // Listen for data clear events from developer settings
    const handleDataCleared = (event) => {
      const { tableName } = event.detail;
      if (tableName === 'all' || tableName === 'picking_sessions') {
        console.log('🔄 Data cleared - reloading picking history...');
        load();
      }
    };

    window.addEventListener('dataCleared', handleDataCleared);
    return () => window.removeEventListener('dataCleared', handleDataCleared);
  }, [currentPage, filterStatus, filterDate, search]);

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

      console.log('📅 Loading picking history with params:', params);

      const response = await getPickingHistory(params);
      
      setHistory(response.data.results);
      setTotalCount(response.data.count);
    } catch (error) {
      console.error("Failed to load picking history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (invoiceId) => {
    setSelectedInvoiceId(invoiceId);
    setModalOpen(true);
  };

  const handleViewInvoice = (invoiceId, e) => {
    e.stopPropagation(); // Prevent row click
    navigate(`/invoices/${invoiceId}`);
  };

  const formatDuration = (minutes) => {
    if (!minutes) return "-";
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const statusBadge = (status, notes) => {
    const styles = {
      PREPARING: "bg-yellow-100 text-yellow-700 border-yellow-200",
      PICKED: "bg-green-100 text-green-700 border-green-200",
      VERIFIED: "bg-blue-100 text-blue-700 border-blue-200",
    };

    const isRepick = notes && notes.includes('[RE-PICK]');

    return (
      <div className="flex items-center gap-2">
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border ${
            styles[status] || "bg-gray-100 text-gray-700"
          }`}
        >
          {status}
        </span>
        {isRepick && (
          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs font-semibold border border-orange-300">
            RE-PICK
          </span>
        )}
      </div>
    );
  };

  const handleClearFilters = () => {
    setSearch("");
    setFilterStatus("");
    setFilterDate("");
    setCurrentPage(1);
  };

  const hasActiveFilters = search || filterStatus || filterDate;

  return (
    <>
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        {/* HEADER + FILTERS */}
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Picking History</h2>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[350px]">
              <input
                type="text"
                placeholder="Search invoice or employee..."
                className="px-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all w-full"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all min-w-[350px]"
            >
              <option value="">All Status</option>
              <option value="PREPARING">Preparing</option>
              <option value="PICKED">Picked</option>
            </select>

            <input
              type="date"
              placeholder="Filter by date"
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all min-w-[350px]"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setCurrentPage(1);
              }}
            />

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all flex items-center gap-2 font-medium"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* TABLE */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-teal-500 to-cyan-600 text-left">
                  <th className="px-3 sm:px-6 py-4 text-sm font-bold text-white">
                    Invoice
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-sm font-bold text-white">
                    Customer
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-sm font-bold text-white">
                    Picker
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-sm font-bold text-white">
                    Status
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-sm font-bold text-white">
                    Date & Time
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-sm font-bold text-white">
                    Duration
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-sm font-bold text-white">
                    Notes
                  </th>
                </tr>
              </thead>

              <tbody>
                {history.map((h) => (
                  <tr
                    key={h.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleRowClick(h.invoice_no)}
                  >
                    <td className="px-3 sm:px-6 py-3">
                      <button className="text-teal-600 hover:text-teal-800 font-medium">
                        {h.invoice_no}
                      </button>
                    </td>
                    <td className="px-3 sm:px-6 py-3">
                      <p className="font-medium">{h.customer_name}</p>
                      <p className="text-xs text-gray-500">{h.customer_email}</p>
                    </td>
                    <td className="px-3 sm:px-6 py-3">
                      <p className="font-medium">{h.picker_name}</p>
                      <p className="text-xs text-gray-500">{h.picker_email}</p>
                    </td>
                    <td className="px-3 sm:px-6 py-3">
                      {statusBadge(h.picking_status, h.notes)}
                    </td>
                    <td className="px-3 sm:px-6 py-3">
                      <div className="text-sm text-gray-600">
                        <p className="font-medium">
                          {formatDate(h.start_time)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatTime(h.start_time)}
                          {h.end_time && (
                            <>
                              {" to "}
                              {formatTime(h.end_time)}
                            </>
                          )}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3">
                      {h.duration ? (
                        <button
                          onClick={(e) => handleViewInvoice(h.id, e)}
                          className="text-teal-600 hover:text-teal-800 font-medium hover:underline"
                        >
                          {formatDuration(h.duration)}
                        </button>
                      ) : (
                        <span className="text-gray-400">In Progress</span>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-3">
                      {h.notes ? (
                        <div className="max-w-xs">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                            {h.notes.includes('[ADMIN OVERRIDE]') ? (
                              <span className="text-orange-600 font-semibold">
                                {h.notes}
                              </span>
                            ) : (
                              h.notes
                            )}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                  </tr>
                ))}

                {history.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-4 text-gray-500">
                      No picking records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION COMPONENT */}
        <Pagination
          currentPage={currentPage}
          totalItems={totalCount}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          label="picking records"
        />
      </div>

      {/* INVOICE DETAIL MODAL */}
      <InvoiceDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        invoiceId={selectedInvoiceId}
      />
    </>
  );
}