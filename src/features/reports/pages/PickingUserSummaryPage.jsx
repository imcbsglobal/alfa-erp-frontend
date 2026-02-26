import { useState, useEffect } from "react";
import api from "../../../services/api";
import toast from "react-hot-toast";
import { formatNumber } from '../../../utils/formatters';
import { RefreshCw } from 'lucide-react';

export default function PickingUserSummaryPage() {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPicks, setTotalPicks] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  useEffect(() => {
    loadSummary();
  }, [date]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      // Fetch ALL pages to get complete data
      let page = 1;
      let allSessions = [];

      while (true) {
        const res = await api.get("/sales/picking/history/", {
          params: {
            start_date: date,
            end_date: date,
            page_size: 100,
            page,
          }
        });

        const results = res.data.results || [];
        allSessions = allSessions.concat(results);

        // Stop if no more pages
        if (!res.data.next || results.length === 0) break;
        page++;
      }

      // Aggregate by picker
      const pickerMap = {};
      for (const session of allSessions) {
        const pickerName = session.picker_name || session.picker?.name || session.picker?.email || "Unknown";
        const pickerId = session.picker?.id || pickerName;

        if (!pickerMap[pickerId]) {
          pickerMap[pickerId] = {
            picker_id: pickerId,
            picker_name: pickerName,
            pick_count: 0,
          };
        }
        pickerMap[pickerId].pick_count += 1;
      }

      // Sort by pick count descending
      const aggregated = Object.values(pickerMap).sort((a, b) => a.picker_name.localeCompare(b.picker_name));

      setSummary(aggregated);
      setTotalPicks(allSessions.length);
    } catch (err) {
      console.error("❌ Failed to load picking summary:", err);
      toast.error("Failed to load picking summary");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadSummary();
    toast.success("Summary refreshed");
  };

  const visibleRows = summary.slice(0, rowsPerPage);
  const visibleTotal = visibleRows.reduce((sum, item) => sum + item.pick_count, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header with Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Picking User Summary</h1>

            <div className="flex flex-wrap items-center gap-3">
              {/* Date Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Date:</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                />
              </div>

              {/* Rows Per Page */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Rows:</label>
                <select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white min-w-[80px]"
                >
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              {/* Refresh */}
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

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-500">Loading summary...</div>
          ) : summary.length === 0 ? (
            <div className="py-20 text-center text-gray-500">No picking data found for this date</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">Picker Name</th>
                      <th className="px-6 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">Bills Picked</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {visibleRows.map((item, index) => (
                      <tr
                        key={item.picker_id}
                        className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.picker_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900">
                          {formatNumber(item.pick_count, 0, '0')}
                        </td>
                      </tr>
                    ))}

                    {/* Total Row */}
                    <tr className="bg-teal-100 font-bold">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" colSpan={2}>
                        Total Bills Picked
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-gray-900">
                        {formatNumber(visibleTotal, 0, '0')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{visibleRows.length}</span> of{' '}
                  <span className="font-medium">{summary.length}</span> picker{summary.length !== 1 ? 's' : ''} with a total of{' '}
                  <span className="font-medium">{formatNumber(totalPicks, 0, '0')}</span> bills picked
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}