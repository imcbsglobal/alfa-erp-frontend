import { useState, useEffect } from "react";
import { getDeliveryHistory } from "../../../services/sales";
import toast from "react-hot-toast";
import { formatNumber } from '../../../utils/formatters';
import { RefreshCw } from 'lucide-react';

export default function DeliveryUserSummaryPage() {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalDeliveries, setTotalDeliveries] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  useEffect(() => {
    loadSummary();
  }, [date]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      let page = 1;
      let allSessions = [];

      while (true) {
        const res = await getDeliveryHistory({
          start_date: date,
          end_date: date,
          page_size: 100,
          page,
        });

        const results = res.data.results || [];
        allSessions = allSessions.concat(results);

        if (!res.data.next || results.length === 0) break;
        page++;
      }

      // Count delivered sessions per staff
      const delivered = allSessions.filter((s) => s.delivery_status === 'DELIVERED');
      const userMap = {};

      for (const session of delivered) {
        const userName = session.delivery_user_name || session.delivery_user_email || 'Unknown';
        const userId = session.delivery_user_email || userName;

        if (!userMap[userId]) {
          userMap[userId] = {
            user_id: userId,
            user_name: userName,
            delivery_count: 0,
          };
        }
        userMap[userId].delivery_count += 1;
      }

      const aggregated = Object.values(userMap).sort((a, b) => a.user_name.localeCompare(b.user_name));

      setSummary(aggregated);
      setTotalDeliveries(delivered.length);
    } catch (err) {
      console.error("Failed to load delivery summary:", err);
      toast.error("Failed to load delivery summary");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadSummary();
    toast.success("Summary refreshed");
  };

  const visibleRows = summary.slice(0, rowsPerPage);
  const visibleTotal = visibleRows.reduce((sum, item) => sum + item.delivery_count, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Delivery User Summary</h1>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Date:</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Rows:</label>
                <select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white min-w-[80px]"
                >
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-md font-medium text-sm hover:from-teal-600 hover:to-cyan-700 transition-all flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-500">Loading summary...</div>
          ) : summary.length === 0 ? (
            <div className="py-20 text-center text-gray-500">No delivery data found for this date</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Delivery Staff</th>
                      <th className="px-6 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Delivered Bills</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {visibleRows.map((item, index) => (
                      <tr
                        key={item.user_id}
                        className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.user_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900">
                          {formatNumber(item.delivery_count, 0, '0')}
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-teal-100 font-bold">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" colSpan={2}>
                        Total Delivered Bills
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-gray-900">
                        {formatNumber(visibleTotal, 0, '0')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{visibleRows.length}</span> of{' '}
                  <span className="font-medium">{summary.length}</span> staff member{summary.length !== 1 ? 's' : ''} with a total of{' '}
                  <span className="font-medium">{formatNumber(totalDeliveries, 0, '0')}</span> delivered bills
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
