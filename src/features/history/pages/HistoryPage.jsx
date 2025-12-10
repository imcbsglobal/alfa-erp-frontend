import { useEffect, useState } from "react";
import { getHistory } from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";

export default function HistoryPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("ALL");

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await getHistory(user.email); // email used for filtering
      setHistory(response.data);
    } finally {
      setLoading(false);
    }
  };

  const filtered = history.filter(h => {
    if (typeFilter === "ALL") return true;
    return h.action_type === typeFilter;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">History</h1>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="ALL">All</option>
          <option value="PICKING">Picking</option>
          <option value="PACKING">Packing</option>
          <option value="DELIVERY">Delivery</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        {loading ? (
          <p>Loading...</p>
        ) : filtered.length === 0 ? (
          <p>No history found</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2">Invoice</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Employee</th>
                <th className="px-4 py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={i} className="border-b">
                  <td className="px-4 py-3">{row.invoice_number}</td>
                  <td className="px-4 py-3">{row.action_type}</td>
                  <td className="px-4 py-3">{row.user_email}</td>
                  <td className="px-4 py-3">{row.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
