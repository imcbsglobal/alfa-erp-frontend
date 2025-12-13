import { useEffect, useState } from "react";
import Pagination from "../../../components/Pagination";

export default function PackingHistory() {
  const [history, setHistory] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [search, setSearch] = useState("");
  const [filterPacker, setFilterPacker] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    // TODO: Replace with API
    setHistory([
      {
        id: 1,
        invoice: "INV-004",
        packer: "packer1@gmail.com",
        time: "12:30 PM",
        date: "2024-12-10",
      },
      {
        id: 2,
        invoice: "INV-005",
        packer: "packer2@gmail.com",
        time: "1:10 PM",
        date: "2024-12-10",
      },
    ]);
  }, []);

  // APPLY FILTERS
  useEffect(() => {
    let data = [...history];

    // Search invoice or packer
    if (search.trim() !== "") {
      data = data.filter(
        (x) =>
          x.invoice.toLowerCase().includes(search.toLowerCase()) ||
          x.packer.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filter by packer
    if (filterPacker) {
      data = data.filter((x) => x.packer === filterPacker);
    }

    // Filter by date
    if (filterDate) {
      data = data.filter((x) => x.date === filterDate);
    }

    setFiltered(data);
    setCurrentPage(1); // reset pagination whenever filters change
  }, [search, filterPacker, filterDate, history]);

  // PAGINATION
  const indexLast = currentPage * itemsPerPage;
  const indexFirst = indexLast - itemsPerPage;
  const rows = filtered.slice(indexFirst, indexLast);

  // Unique packer list
  const uniquePackers = [...new Set(history.map((h) => h.packer))];

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
            className="px-3 py-2 border border-gray-300 rounded-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Packer Dropdown */}
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg"
            value={filterPacker}
            onChange={(e) => setFilterPacker(e.target.value)}
          >
            <option value="">All Packers</option>
            {uniquePackers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Date Filter */}
          <input
            type="date"
            className="px-3 py-2 border border-gray-300 rounded-lg"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE */}
      <table className="w-full">
        <thead>
          <tr className="bg-gradient-to-r from-teal-500 to-cyan-600 text-left">
            <th className="px-6 py-4 text-sm font-bold text-white">Invoice</th>
            <th className="px-6 py-4 text-sm font-bold text-white">Packer</th>
            <th className="px-6 py-4 text-sm font-bold text-white">Time</th>
            <th className="px-6 py-4 text-sm font-bold text-white">Date</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((h) => (
            <tr key={h.id} className="border-b hover:bg-gray-50">
              <td className="px-6 py-3">{h.invoice}</td>
              <td className="px-6 py-3">{h.packer}</td>
              <td className="px-6 py-3">{h.time}</td>
              <td className="px-6 py-3">{h.date}</td>
            </tr>
          ))}

          {rows.length === 0 && (
            <tr>
              <td colSpan="4" className="text-center py-4 text-gray-500">
                No records found
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* PAGINATION */}
      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        label="pack records"
      />
    </div>
  );
}
