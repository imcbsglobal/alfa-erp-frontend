import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { useAuth } from "../../auth/AuthContext";

export default function MyInvoiceListPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [pickedItems, setPickedItems] = useState({});

  // Demo data
  const demoActiveInvoice = {
    id: 'active1',
    invoice_no: 'AABB-0015',
    status: 'PICKING',
    customer: { 
      name: 'A Store', 
      phone: '+1 (555) 123-4567', 
      address: '123 Oak Street, Suite 400, Downtown, NY 10001' 
    },
    created_at: '2024-12-17T05:08:00',
    items: [
      { id: 'item1', name: 'Calpol 650 Tablet', sku: 'CAL-650', quantity: 24 },
      { id: 'item2', name: 'Nasoclear Saline Spray', sku: 'NAS-SAL', quantity: 12 }
    ]
  };

  const demoCompletedInvoices = [
    {
      id: 'demo1',
      invoice_no: 'INV-2024-0846',
      status: 'DELIVERED',
      customer: { name: 'Michael Chen', phone: '+1 (555) 234-5678', address: '456 Pine Avenue, Building B, Floor 3, Brooklyn, NY 11201' },
      created_at: '2024-12-17T08:30:00',
      updated_at: '2024-12-17T09:15:00',
      items: [
        { name: 'Mechanical Keyboard RGB', sku: 'MKR-101', quantity: 1 },
        { name: 'Gaming Mouse', sku: 'GMS-202', quantity: 2 },
        { name: 'Monitor Arm Dual', sku: 'MAD-303', quantity: 1 },
        { name: 'Desk Mat Premium', sku: 'DMP-404', quantity: 1 },
        { name: 'USB Cable Pack', sku: 'UCP-505', quantity: 3 }
      ]
    },
    {
      id: 'demo2',
      invoice_no: 'INV-2024-0845',
      status: 'DELIVERED',
      customer: { name: 'Emily Davis', phone: '+1 (555) 876-5432', address: '789 Elm Street, Suite 200, Manhattan, NY 10013' },
      created_at: '2024-12-17T07:00:00',
      updated_at: '2024-12-17T08:30:00',
      items: [
        { name: 'Wireless Headset Pro', sku: 'WHP-601', quantity: 1 },
        { name: 'Webcam 4K Ultra', sku: 'WCU-702', quantity: 1 },
        { name: 'LED Desk Lamp', sku: 'LDL-803', quantity: 2 },
        { name: 'Cable Management Kit', sku: 'CMK-904', quantity: 1 }
      ]
    },
    {
      id: 'demo3',
      invoice_no: 'INV-2024-0844',
      status: 'DELIVERED',
      customer: { name: 'Robert Wilson', phone: '+1 (555) 345-6789', address: '321 Oak Boulevard, Apartment 5C, Queens, NY 11354' },
      created_at: '2024-12-16T14:00:00',
      updated_at: '2024-12-16T16:45:00',
      items: [
        { name: 'Standing Desk Converter', sku: 'SDC-101', quantity: 1 },
        { name: 'Ergonomic Chair', sku: 'ERC-202', quantity: 1 },
        { name: 'Monitor 27" 4K', sku: 'MON-303', quantity: 2 },
        { name: 'Laptop Stand Aluminum', sku: 'LSA-404', quantity: 1 },
        { name: 'Keyboard Wrist Rest', sku: 'KWR-505', quantity: 1 },
        { name: 'Mouse Pad XXL', sku: 'MPX-606', quantity: 1 }
      ]
    }
  ];

  const [activeInvoice, setActiveInvoice] = useState(demoActiveInvoice);
  const [completedInvoices, setCompletedInvoices] = useState(demoCompletedInvoices);

  const toggleItemPicked = (itemId) => {
    setPickedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const allItemsPicked = activeInvoice?.items?.every(item => pickedItems[item.id]) || false;
  const pickedCount = activeInvoice?.items?.filter(item => pickedItems[item.id]).length || 0;
  const totalItems = activeInvoice?.items?.length || 0;

  const handleCompletePicking = () => {
    if (allItemsPicked && activeInvoice) {
      const completedInvoice = {
        ...activeInvoice,
        status: 'DELIVERED',
        updated_at: new Date().toISOString()
      };
      setCompletedInvoices([completedInvoice, ...completedInvoices]);
      setActiveInvoice(null);
      setPickedItems({});
      alert('Invoice completed!');
    }
  };

  const calculateDuration = (start, end) => {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diff = Math.floor((endTime - startTime) / 60000); // minutes
    return `${diff} min`;
  };

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">My Assigned Invoices</h1>
          <p className="text-gray-600">
            View and manage your assigned picking tasks.
          </p>
        </div>

        {/* Active Bill Section */}
        {activeInvoice && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-teal-50 p-2 rounded-lg">
                <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Active Bill</h2>
                <p className="text-sm text-gray-500">Currently in progress</p>
              </div>
            </div>

            <div 
              className="bg-white rounded-2xl border-2 border-teal-500 shadow-lg overflow-hidden cursor-pointer transition-all hover:shadow-xl"
              onClick={() => setExpandedInvoice(expandedInvoice === activeInvoice.id ? null : activeInvoice.id)}
            >
              {/* Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-teal-50 p-3 rounded-xl">
                      <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Invoice #{activeInvoice.invoice_no}</h3>
                      <p className="text-gray-500">{activeInvoice.customer?.name}</p>
                    </div>
                  </div>
                  <svg
                    className={`w-6 h-6 text-gray-400 transition-transform ${expandedInvoice === activeInvoice.id ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex px-4 py-2 bg-teal-50 text-teal-700 rounded-full text-sm font-medium items-center gap-2">
                    <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
                    In Progress
                  </span>
                </div>

                <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span>{pickedCount}/{totalItems} items picked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Started {new Date(activeInvoice.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>

                <div className="relative">
                  <div className="overflow-hidden h-3 text-xs flex rounded-full bg-gray-200">
                    <div
                      style={{ width: `${(pickedCount / totalItems) * 100}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-teal-500 to-cyan-600 transition-all duration-500"
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-right">{Math.round((pickedCount / totalItems) * 100)}% Complete</p>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedInvoice === activeInvoice.id && (
                <div className="px-6 pb-6 pt-2 bg-gray-50 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        PHONE
                      </p>
                      <p className="font-semibold text-sm">{activeInvoice.customer?.phone}</p>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        START TIME
                      </p>
                      <p className="font-semibold text-sm">
                        {new Date(activeInvoice.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg mb-4 flex items-start gap-2">
                    <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">DELIVERY ADDRESS</p>
                      <p className="text-sm text-gray-700">{activeInvoice.customer?.address}</p>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-lg mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Items to Pick ({totalItems})</h4>
                    <div className="space-y-2">
                      {activeInvoice.items.map((item) => (
                        <div 
                          key={item.id} 
                          className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${
                            pickedItems[item.id] 
                              ? 'bg-teal-50 border-teal-500' 
                              : 'bg-white border-gray-200 hover:border-teal-300'
                          }`}
                          onClick={() => toggleItemPicked(item.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                              pickedItems[item.id] 
                                ? 'bg-teal-600' 
                                : 'bg-white border-2 border-gray-300'
                            }`}>
                              <svg className={`w-5 h-5 ${pickedItems[item.id] ? 'text-white' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-medium text-sm text-gray-900">{item.name}</p>
                              <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sm text-gray-900">{item.quantity} {item.quantity > 1 ? 'pcs' : 'pc'}</span>
                            {pickedItems[item.id] && (
                              <span className="px-3 py-1 bg-teal-600 text-white rounded-full text-xs font-medium">
                                Picked
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleCompletePicking}
                    disabled={!allItemsPicked}
                    className={`w-full py-3 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
                      allItemsPicked
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {allItemsPicked ? 'Complete Picking' : `Pick Remaining ${totalItems - pickedCount} Items`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Completed Bills Section */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 p-2 rounded-lg">
                <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Completed Bills</h2>
              </div>
            </div>
          </div>

          {completedInvoices.length === 0 ? (
            <div className="text-center py-20">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No completed deliveries yet</h3>
              <p className="text-gray-500">Your completed invoices will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-white">Invoice Number</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-white">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-white">Start Time</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-white">End Time</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-white">Duration</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-white"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {completedInvoices.map((inv) => (
                    <>
                      <tr 
                        key={inv.id} 
                        className="hover:bg-gray-50 transition cursor-pointer"
                        onClick={() => setExpandedInvoice(expandedInvoice === inv.id ? null : inv.id)}
                      >
                        <td className="px-6 py-4">
                          <span className="font-semibold text-gray-900">#{inv.invoice_no}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(inv.created_at).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(inv.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(inv.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {calculateDuration(inv.created_at, inv.updated_at)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform inline-block ${expandedInvoice === inv.id ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </td>
                      </tr>
                      
                      {/* Expanded Details Row */}
                      {expandedInvoice === inv.id && (
                        <tr key={`${inv.id}-details`}>
                          <td colSpan="6" className="px-6 py-4 bg-gray-50">
                            <div className="space-y-4">
                              {/* Customer Details */}
                              <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  Customer Details
                                </h4>
                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Name</p>
                                    <p className="text-sm font-medium text-gray-900">{inv.customer?.name}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Phone</p>
                                    <p className="text-sm font-medium text-gray-900">{inv.customer?.phone}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Address</p>
                                    <p className="text-sm font-medium text-gray-900">{inv.customer?.address}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Items Delivered */}
                              <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                  Items Picked ({inv.items?.length || 0})
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                  {inv.items?.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                      <div className="flex items-center gap-3">
                                        <div className="bg-teal-100 p-2 rounded">
                                          <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                        </div>
                                        <div>
                                          <p className="font-medium text-sm text-gray-900">{item.product_name || item.name}</p>
                                          <p className="text-xs text-gray-500">SKU: {item.sku || 'N/A'}</p>
                                        </div>
                                      </div>
                                      <span className="font-bold text-sm text-gray-900">{item.quantity} {item.quantity > 1 ? 'pcs' : 'pc'}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div className="flex justify-end">
                                <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold border border-emerald-200 flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  PICKED
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}