import { useEffect, useState } from "react";

export default function StoreDashboard() {
  const [stats, setStats] = useState({
    pending: 0,
    picked: 0,
    packing: 0,
    delivered: 0,
  });

  const [recent, setRecent] = useState([]);

  useEffect(() => {
    // Replace with API calls
    setStats({
      pending: 14,
      picked: 6,
      packing: 4,
      delivered: 20,
    });

    setRecent([
      { id: 1, invoice: "INV-001", employee: "a@gmail.com", status: "Picked" },
      { id: 2, invoice: "INV-002", employee: "packer@gmail.com", status: "Packing" },
      { id: 3, invoice: "INV-003", employee: "driver@gmail.com", status: "Delivered" },
    ]);
  }, []);

  const card = (label, value, color) => (
    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
      <p className="text-gray-500 text-sm">{label}</p>
      <h2 className={`text-3xl font-bold ${color}`}>{value}</h2>
    </div>
  );

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Store Dashboard</h1>
      <p className="text-gray-600 mb-6">Shared store login activity overview</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {card("Pending", stats.pending, "text-yellow-600")}
        {card("Picked", stats.picked, "text-blue-600")}
        {card("Packing", stats.packing, "text-purple-600")}
        {card("Delivered", stats.delivered, "text-green-600")}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="border-b pb-3 mb-4">
          <h2 className="text-xl font-bold text-gray-800">Recent Activity</h2>
        </div>

        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {recent.map((r) => (
              <tr key={r.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3">{r.invoice}</td>
                <td className="px-4 py-3">{r.employee}</td>
                <td className="px-4 py-3 font-semibold">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
