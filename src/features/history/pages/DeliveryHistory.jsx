import { useEffect, useState } from "react";
import Pagination from "../../../components/Pagination";

export default function DeliveryHistory() {
  const [history, setHistory] = useState([]);

  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    // TODO: Replace with real API
    setHistory([
      {
        id: 1,
        invoice: "INV-007",
        mode: "SelfPickup",
        customer: "customer1@gmail.com",
        picked_at: "2:30 PM",
        date: "2024-12-10",
      },
      {
        id: 2,
        invoice: "INV-008",
        mode: "Courier",
        courier_name: "DTDC",
        tracking_id: "DTDC123456",
        delivered: "4:45 PM",
        date: "2024-12-10",
      },
      {
        id: 3,
        invoice: "INV-009",
        mode: "CompanyDelivery",
        driver: "driver1@gmail.com",
        delivered: "3:15 PM",
        date: "2024-12-11",
      },
    ]);
  }, []);

  // Badge formatter
  const modeBadge = (mode) => {
    const styles = {
      SelfPickup: "bg-blue-100 text-blue-700 border-blue-200",
      Courier: "bg-purple-100 text-purple-700 border-purple-200",
      CompanyDelivery: "bg-green-100 text-green-700 border-green-200",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[mode]}`}>
        {mode === "SelfPickup" && "Self Pickup"}
        {mode === "Courier" && "Courier"}
        {mode === "CompanyDelivery" && "Company Delivery"}
      </span>
    );
  };

  // FILTER LOGIC (invoice + mode + date)
  const filtered = history.filter((h) => {
    const matchSearch =
      h.invoice.toLowerCase().includes(search.toLowerCase()) ||
      (h.customer?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (h.courier_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
      (h.driver?.toLowerCase() || "").includes(search.toLowerCase());

    const matchMode = filterMode ? h.mode === filterMode : true;
    const matchDate = filterDate ? h.date === filterDate : true;

    return matchSearch && matchMode && matchDate;
  });

  // Pagination
  const indexLast = currentPage * itemsPerPage;
  const indexFirst = indexLast - itemsPerPage;
  const currentItems = filtered.slice(indexFirst, indexLast);

  return (
    <div className="bg-white rounded-xl shadow-md p-6">

      {/* HEADER + FILTERS ROW  */}
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Delivery History</h2>

        <div className="flex gap-3">
          {/* Search Invoice / Details */}
          <input
            type="text"
            placeholder="Search invoice or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border px-3 py-2 rounded-lg w-64"
          />

          {/* Mode Filter */}
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="border px-3 py-2 rounded-lg"
          >
            <option value="">All Modes</option>
            <option value="SelfPickup">Self Pickup</option>
            <option value="Courier">Courier</option>
            <option value="CompanyDelivery">Company Delivery</option>
          </select>

          {/* Date Filter */}
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="border px-3 py-2 rounded-lg w-44"
          />
        </div>
      </div>

      {/* Table */}
      <table className="w-full">
        <thead>
          <tr className="bg-gradient-to-r from-teal-500 to-cyan-600">
            <th className="px-6 py-4 text-white text-left">Invoice</th>
            <th className="px-6 py-4 text-white text-left">Mode</th>
            <th className="px-6 py-4 text-white text-left">Details</th>
            <th className="px-6 py-4 text-white text-left">Date</th>
            <th className="px-6 py-4 text-white text-left">Completed At</th>
          </tr>
        </thead>

        <tbody>
          {currentItems.map((h) => (
            <tr key={h.id} className="border-b hover:bg-gray-50">
              <td className="px-6 py-3">{h.invoice}</td>

              <td className="px-6 py-3">{modeBadge(h.mode)}</td>

              <td className="px-6 py-3 text-gray-700">
                {h.mode === "SelfPickup" && (
                  <>
                    <p className="font-medium">{h.customer}</p>
                    <p className="text-xs text-gray-500">Customer collected the order</p>
                  </>
                )}

                {h.mode === "Courier" && (
                  <>
                    <p className="font-medium">{h.courier_name}</p>
                    <p className="text-xs text-gray-500">Tracking: {h.tracking_id}</p>
                  </>
                )}

                {h.mode === "CompanyDelivery" && (
                  <>
                    <p className="font-medium">{h.driver}</p>
                    <p className="text-xs text-gray-500">Delivered by company driver</p>
                  </>
                )}
              </td>

              <td className="px-6 py-3">{h.date}</td>

              <td className="px-6 py-3">{h.delivered || h.picked_at || "-"}</td>
            </tr>
          ))}

          {currentItems.length === 0 && (
            <tr>
              <td colSpan="5" className="text-center py-4 text-gray-500">
                No delivery records found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination Component */}
      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        label="delivery records"
      />
    </div>
  );
}
