import React, { useState, useEffect, useRef } from "react";
import { getItemsBilledToday, getInvoices } from "../../../services/sales";
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
  const [sortBy, setSortBy] = useState('invoice_date');
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
      let itemsData = response.data.data || [];

      // Fetch invoice data efficiently in parallel instead of sequential loop
      const uniqueInvoiceNos = [...new Set(itemsData.map(item => item.bill_no))];
      const invoiceTotalsMap = {};

      // Fetch all invoices in batches to avoid overwhelming the API
      const BATCH_SIZE = 50;
      const invoiceNoBatches = [];
      for (let i = 0; i < uniqueInvoiceNos.length; i += BATCH_SIZE) {
        invoiceNoBatches.push(uniqueInvoiceNos.slice(i, i + BATCH_SIZE));
      }

      // Process batches in parallel using Promise.all
      const batchPromises = invoiceNoBatches.map(batch =>
        Promise.all(
          batch.map(invoiceNo =>
            getInvoices({ invoice_no__exact: invoiceNo })
              .then(res => {
                const invoices = res.data.results || res.data;
                if (!invoices || invoices.length === 0) {
                  console.warn(`No invoice found for ${invoiceNo}`);
                  invoiceTotalsMap[invoiceNo] = 0;
                  return;
                }
                
                // Backend should now filter, so first result should be the match
                const matchingInvoice = invoices.find(inv => inv.invoice_no === invoiceNo);
                if (matchingInvoice) {
                  invoiceTotalsMap[invoiceNo] = parseFloat(matchingInvoice.Total) || 0;
                } else {
                  console.warn(`Invoice mismatch for ${invoiceNo}:`, invoices.length, 'results');
                  invoiceTotalsMap[invoiceNo] = 0;
                }
              })
              .catch(err => {
                console.error(`Failed to fetch invoice ${invoiceNo}:`, err.response?.status || err.message);
                invoiceTotalsMap[invoiceNo] = 0;
              })
          )
        )
      );

      // Execute all batches
      await Promise.all(batchPromises);
      
      // Log statistics for debugging
      const successCount = Object.values(invoiceTotalsMap).filter(v => v > 0).length;
      console.log(`✅ Fetched ${successCount}/${uniqueInvoiceNos.length} invoice totals`);

      // Enrich items with invoice Total
      itemsData = itemsData.map(item => ({
        ...item,
        invoiceTotal: invoiceTotalsMap[item.bill_no] || 0
      }));

      setItems(itemsData);
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
      item.bill_no.toLowerCase().includes(q) ||
      item.item_name.toLowerCase().includes(q) ||
      item.customer_name.toLowerCase().includes(q) ||
      item.company_name.toLowerCase().includes(q)
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
        ['Bill No', 'Date', 'Item Name', 'Customer Name', 'Customer Location', 'Quantity', 'Rate/Unit', 'Invoice Total', 'Company', 'Packing', 'Shelf Location'],
        ...filteredItems.map((item) => [
          item.bill_no,
          item.invoice_date,
          item.item_name,
          item.customer_name,
          item.customer_location || '',
          item.quantity,
          item.rate.toFixed(2),
          parseFloat(item.invoiceTotal).toFixed(2),
          item.company_name,
          item.packing || 'N/A',
          item.shelf_location || 'N/A',
        ]),
        [],
        ['Summary'],
        ['Total Line Items', summary?.total_line_items || 0],
        ['Total Quantity', summary?.total_quantity || 0],
        ['Total Revenue', (summary?.total_revenue || 0).toFixed(2)],
        ['Total Bills', summary?.total_bills || 0],
      ];

      // Create worksheet and add data
      const worksheet = XLSX.utils.aoa_to_sheet(mainData);
      
      // Set column widths
      const colWidths = [12, 12, 20, 18, 16, 10, 10, 12, 15, 12, 15];
      worksheet['!cols'] = colWidths.map(w => ({ wch: w }));

      // Add styling to header row
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "0D9488" } },
        alignment: { horizontal: "center", vertical: "center" }
      };

      for (let i = 0; i < 11; i++) {
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
          <h1 className="text-2xl font-bold text-gray-800">Items Wise Report </h1>
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
                  placeholder="Bill No, Item Name, Customer, Company..."
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
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '12%' }} />
                </colgroup>
                <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:opacity-80"
                      onClick={() => handleSort('bill_no')}
                    >
                      <div className="flex items-center gap-2">
                        Bill No
                        <SortIcon field="bill_no" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:opacity-80"
                      onClick={() => handleSort('invoice_date')}
                    >
                      <div className="flex items-center gap-2">
                        Date
                        <SortIcon field="invoice_date" />
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
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Company
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:opacity-80"
                      onClick={() => handleSort('quantity')}
                    >
                      <div className="flex items-center gap-2 justify-center">
                        Qty
                        <SortIcon field="quantity" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:opacity-80"
                      onClick={() => handleSort('rate')}
                    >
                      <div className="flex items-center gap-2 justify-end">
                        Rate/Unit
                        <SortIcon field="rate" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-bold text-white uppercase tracking-wider cursor-pointer hover:opacity-80"
                      onClick={() => handleSort('invoice_total')}
                    >
                      <div className="flex items-center gap-2 justify-end">
                        Invoice Total
                        <SortIcon field="invoice_total" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedItems.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm font-semibold text-teal-700">
                        {item.bill_no}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {item.invoice_date}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <p className="font-medium">{item.item_name}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        <p className="font-medium">{item.customer_name}</p>
                        <p className="text-xs text-gray-500">
                          {item.customer_location || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.company_name}
                      </td>
                      <td className="px-4 py-3 text-center text-sm font-bold text-gray-900">
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-700">
                        {item.rate.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-blue-700">
                        {formatAmount(item.invoiceTotal)}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Line Items</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredItems.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase font-semibold">Total Quantity</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {filteredItems.reduce((sum, item) => sum + item.quantity, 0)}
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
