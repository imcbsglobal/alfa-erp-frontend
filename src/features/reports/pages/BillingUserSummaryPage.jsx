import { useState, useEffect } from "react";
import { getBillingUserSummary } from "../../../services/sales";
import toast from "react-hot-toast";
import { formatNumber } from '../../../utils/formatters';
import { RefreshCw } from 'lucide-react';

export default function BillingUserSummaryPage() {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalBills, setTotalBills] = useState(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [endDate, setEndDate] = useState('');
  const [billingStatus, setBillingStatus] = useState('BILLED');
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Load summary data when filters change
  useEffect(() => {
    loadSummary();
  }, [startDate, endDate, billingStatus]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const params = {
        billing_status: billingStatus,
      };

      if (startDate) {
        params.start_date = startDate;
      }

      if (endDate) {
        params.end_date = endDate;
      }

      const res = await getBillingUserSummary(params);
      
      if (res.data.success) {
        const data = res.data.data || [];
        setSummary(data);
        
        // Calculate total bills
        const bills = data.reduce((sum, item) => sum + item.bill_count, 0);
        setTotalBills(bills);
      } else {
        toast.error("Failed to load billing summary");
      }
    } catch (err) {
      console.error("❌ Failed to load billing summary:", err);
      toast.error("Failed to load billing summary");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadSummary();
    toast.success("Summary refreshed");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-800">
              Billing User Summary
            </h1>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Date:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
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

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-md font-medium text-sm hover:bg-gradient-to-r from-teal-500 to-cyan-600 transition-colors flex items-center gap-2"
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
            <div className="py-20 text-center text-gray-500">
              Loading summary...
            </div>
          ) : summary.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              No billing data found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                        User Name
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-bold text-white uppercase tracking-wider">
                        Bill Count
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {summary.slice(0, rowsPerPage).map((item, index) => (
                      <tr
                        key={item.salesman_id || index}
                        className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.salesman_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm font-bold text-gray-900">
                            {formatNumber(item.bill_count, 0, '0')}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {/* Total Invoice Summary Row */}
                    <tr className="bg-teal-100 font-bold">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" colSpan={2}>
                        Total Invoices
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-gray-900">
                        {formatNumber(
                          summary.slice(0, rowsPerPage).reduce((sum, item) => sum + item.bill_count, 0),
                          0,
                          '0'
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* Footer with count */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{Math.min(rowsPerPage, summary.length)}</span> of <span className="font-medium">{summary.length}</span> user{summary.length !== 1 ? 's' : ''} with a total of <span className="font-medium">{formatNumber(totalBills, 0, '0')}</span> bills
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
