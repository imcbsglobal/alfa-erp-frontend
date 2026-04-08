import React, { useState, useEffect, useRef } from "react";
import { getItemsBilledToday } from "../../../services/sales";
import toast from "react-hot-toast";
import { Download, ArrowUpDown, Search, X } from 'lucide-react';
import { formatAmount } from '../../../utils/formatters';
import * as XLSX from 'xlsx';
import Pagination from '../../../components/Pagination';
import { usePersistedFilters } from '../../../utils/usePersistedFilters';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function ItemsBilledTodayPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('total_quantity');
  const [sortOrder, setSortOrder] = useState('desc');
  const [summary, setSummary] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;
  const searchRef = useRef(null);
  
  const [savedFilters, saveFilters] = usePersistedFilters('items-billed-today-filters', {
    dateFilter: new Date().toISOString().split('T')[0],
    searchQuery: '',
  });
  const [dateFilter, setDateFilter] = useState(savedFilters.dateFilter);
  const [savedSearchQuery, setSavedSearchQuery] = useState(savedFilters.searchQuery);

  const debouncedSearch = useDebounce(searchQuery, 400);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    saveFilters({ dateFilter, searchQuery });
  }, [dateFilter, searchQuery]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, dateFilter]);

  useEffect(() => {
    loadItems();
  }, [sortBy, sortOrder, dateFilter, debouncedSearch]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const params = {
        sort: sortBy,
        order: sortOrder,
      };

      // Add date filter
      if (dateFilter) {
        params.start_date = dateFilter;
        params.end_date = dateFilter;
      }

      const response = await getItemsBilledToday(params);
      setItems(response.data.data || []);
      setSummary(response.data.summary || {});
    } catch (err) {
      console.error("Failed to load items:", err);
      toast.error("Failed to load items billed today");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      // Toggle order if same field
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      // Set new field and reset to descending
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const filteredItems = items.filter((item) => {
    const q = debouncedSearch.toLowerCase();
    if (!q) return true;
    return (
      item.item_code.toLowerCase().includes(q) ||
      item.item_name.toLowerCase().includes(q)
    );
  });

  // Paginate filtered items
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const paginatedItems = filteredItems.slice(indexOfFirst, indexOfLast);

  const handleExportExcel = () => {
    if (!filteredItems.length) {
      toast.error("No items to export");
      return;
    }

    try {
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      
      // Prepare data for main sheet
      const mainData = [
        ['Item Code', 'Item Name', 'Company', 'Quantity Sold', 'Unit Price', 'Total Revenue', 'Bills Count', 'Packing', 'Barcode', 'Location'],
        ...filteredItems.map((item) => [
          item.item_code,
          item.item_name,
          item.company_name,
          item.total_quantity,
          item.unit_price.toFixed(2),
          item.total_revenue.toFixed(2),
          item.number_of_bills,
          item.packing || 'N/A',
          item.barcode || 'N/A',
          item.shelf_location || 'N/A',
        ]),
        [],
        ['Summary'],
        ['Total Items Type', summary?.total_items_type || 0],
        ['Total Quantity', summary?.total_quantity || 0],
        ['Total Revenue', (summary?.total_revenue || 0).toFixed(2)],
        ['Total Bills', summary?.total_bills || 0],
      ];

      // Create worksheet and add data
      const worksheet = XLSX.utils.aoa_to_sheet(mainData);
      
      // Set column widths
      const colWidths = [12, 20, 15, 14, 12, 14, 10, 12, 12, 15];
      worksheet['!cols'] = colWidths.map(w => ({ wch: w }));

      // Add styling to header row
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "0D9488" } },
        alignment: { horizontal: "center", vertical: "center" }
      };

      for (let i = 0; i < 10; i++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: i })];
        if (cell) cell.s = headerStyle;
      }

      XLSX.utils.book_append_sheet(workbook, worksheet, "Items Report");
      XLSX.writeFile(workbook, `items-sold-today-${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast.success('Excel file exported successfully');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export Excel file');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <ArrowUpDown size={14} className="text-gray-400" />;
    return (
      <ArrowUpDown
        size={14}
        className={sortOrder === 'desc' ? 'text-teal-600 rotate-180' : 'text-teal-600'}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Items Wise Report</h1>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm p-3 mb-4">
          <div className="flex flex-wrap items-center gap-3">

            {/* Date */}
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Date:</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
              />
            </div>

            <div className="h-6 w-px bg-gray-200" />

            {/* Search */}
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Search:</label>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Item Code or Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 pr-7 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm w-[300px]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={loadItems}
                className="px-4 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold text-sm shadow hover:from-teal-600 hover:to-cyan-700 transition-all whitespace-nowrap"
              >
                Refresh
              </button>
              <button
                onClick={handleExportExcel}
                className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg font-semibold text-sm shadow hover:from-emerald-600 hover:to-green-700 transition-all whitespace-nowrap flex items-center gap-1.5"
              >
                <Download size={14} />
                Export Excel
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-500">Loading items...</div>
          ) : filteredItems.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              {searchQuery ? 'No items match your search' : 'No items billed today'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '18%' }} />
                </colgroup>
                <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:opacity-80"
                      onClick={() => handleSort('item_code')}
                    >
                      <div className="flex items-center gap-2">
                        Item Code
                        <SortIcon field="item_code" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:opacity-80"
                      onClick={() => handleSort('item_name')}
                    >
                      <div className="flex items-center gap-2">
                        Item Name
                        <SortIcon field="item_name" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Company
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:opacity-80"
                      onClick={() => handleSort('total_quantity')}
                    >
                      <div className="flex items-center gap-2 justify-center">
                        Qty Sold
                        <SortIcon field="total_quantity" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:opacity-80"
                      onClick={() => handleSort('total_revenue')}
                    >
                      <div className="flex items-center gap-2 justify-end">
                        Total Revenue
                        <SortIcon field="total_revenue" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:opacity-80"
                      onClick={() => handleSort('number_of_bills')}
                    >
                      <div className="flex items-center gap-2 justify-center">
                        Bills
                        <SortIcon field="number_of_bills" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedItems.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm font-semibold text-teal-700">
                        {item.item_code}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <p className="font-medium">{item.item_name}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.company_name}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-gray-900">
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                          {item.total_quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        ₹{item.unit_price.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-green-700">
                        ₹{formatAmount(item.total_revenue)}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-700">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-semibold text-xs">
                          {item.number_of_bills}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="flex flex-col gap-1">
                          {item.packing && (
                            <div>
                              <span className="text-gray-500">Packing:</span> {item.packing}
                            </div>
                          )}
                          {item.barcode && (
                            <div>
                              <span className="text-gray-500">Barcode:</span> {item.barcode}
                            </div>
                          )}
                          {item.shelf_location && (
                            <div>
                              <span className="text-gray-500">Location:</span> {item.shelf_location}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer Summary */}
          {filteredItems.length > 0 && (
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Filtered Items</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredItems.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Total Quantity</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {filteredItems.reduce((sum, item) => sum + item.total_quantity, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Average Price</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ₹{(
                      filteredItems.reduce((sum, item) => sum + item.total_revenue, 0) /
                      filteredItems.reduce((sum, item) => sum + item.total_quantity, 0)
                    ).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Total Revenue (Filtered)</p>
                  <p className="text-2xl font-bold text-green-700">
                    ₹{formatAmount(filteredItems.reduce((sum, item) => sum + item.total_revenue, 0))}
                  </p>
                </div>
              </div>
            </div>
          )}
          {/* Pagination */}
          {filteredItems.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredItems.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              label="items"
              colorScheme="teal"
            />
          )}
        </div>
      </div>
    </div>
  );
}
