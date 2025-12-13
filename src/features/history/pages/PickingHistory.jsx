import { useEffect, useState } from "react";
import Pagination from "../../../components/Pagination";
import { useAuth } from "../../auth/AuthContext";

export default function PickingHistory() {
  const { user } = useAuth();

  const [history, setHistory] = useState([]);
  const [filtered, setFiltered] = useState([]);

  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    load();
  }, []);

  const load = () => {
    const mock = [
      { id: 1, invoice: "INV-001", employee: "a@gmail.com", start: "10:00 AM", end: "10:12 AM", date: "2024-12-10" },
      { id: 2, invoice: "INV-002", employee: "b@gmail.com", start: "10:20 AM", end: "10:45 AM", date: "2024-12-10" },
      { id: 3, invoice: "INV-003", employee: "a@gmail.com", start: "11:05 AM", end: "11:15 AM", date: "2024-12-10" },
    ];

    const data = user.role === "USER"
      ? mock.filter(x => x.employee === user.email)
      : mock;

    setHistory(data);
    setFiltered(data);
  };

  // FILTER LOGIC
  useEffect(() => {
    let data = [...history];

    if (search) {
      data = data.filter(
        x =>
          x.invoice.toLowerCase().includes(search.toLowerCase()) ||
          x.employee.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (date) {
      data = data.filter(x => x.date === date);
    }

    setFiltered(data);
    setCurrentPage(1);
  }, [search, date, history]);

  // PAGINATION CALCULATIONS
  const indexLast = currentPage * itemsPerPage;
  const indexFirst = indexLast - itemsPerPage;
  const rows = filtered.slice(indexFirst, indexLast);

  return (
    <div className="bg-white rounded-xl shadow-md p-6">

      {/* HEADER + FILTERS */}
      <div className="flex justify-between mb-4 items-center">
        <h2 className="text-xl font-bold text-gray-800">Picking History</h2>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search invoice or employee..."
            className="px-3 py-2 border border-gray-300 rounded-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <input
            type="date"
            className="px-3 py-2 border border-gray-300 rounded-lg"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE */}
      <table className="w-full">
        <thead>
          <tr className="bg-gradient-to-r from-teal-500 to-cyan-600 text-left">
            <th className="px-6 py-4 text-sm font-bold text-white">Invoice</th>
            <th className="px-6 py-4 text-sm font-bold text-white">Employee</th>
            <th className="px-6 py-4 text-sm font-bold text-white">Start</th>
            <th className="px-6 py-4 text-sm font-bold text-white">End</th>
            <th className="px-6 py-4 text-sm font-bold text-white">Date</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((h) => (
            <tr key={h.id} className="border-b hover:bg-gray-50">
              <td className="px-6 py-3">{h.invoice}</td>
              <td className="px-6 py-3">{h.employee}</td>
              <td className="px-6 py-3">{h.start}</td>
              <td className="px-6 py-3">{h.end}</td>
              <td className="px-6 py-3">{h.date}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* PAGINATION COMPONENT */}
      <Pagination
        currentPage={currentPage}
        totalItems={filtered.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        label="picking records"
      />
    </div>
  );
}
