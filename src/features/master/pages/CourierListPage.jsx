// src/features/master/pages/CourierListPage.jsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../auth/AuthContext";
import { getCouriers, updateCourier, deleteCourier } from "../../../services/sales";
import Pagination from "../../../components/Pagination";

export default function CourierListPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [editingCourier, setEditingCourier] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const canManageCouriers =
    currentUser?.role === "SUPERADMIN" || currentUser?.role === "ADMIN";

  useEffect(() => {
    loadCouriers();
  }, []);

  const loadCouriers = async () => {
    setLoading(true);
    try {
      const response = await getCouriers();
      let courierArray = [];
      const apiData = response?.data;

      if (Array.isArray(apiData?.data)) {
        courierArray = apiData.data;
      } else {
        courierArray = [];
      }

      setCouriers(courierArray);
    } catch (err) {
      console.error("Failed to load couriers:", err);
      toast.error("Failed to load couriers");
      setCouriers([]);
    } finally {
      setLoading(false);
    }
  };

  const processedCouriers = useMemo(() => {
    let filtered = [...couriers];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) => 
          c.courier_name?.toLowerCase().includes(q) ||
          c.courier_code?.toLowerCase().includes(q) ||
          c.contact_person?.toLowerCase().includes(q)
      );
    }

    if (filterType !== "ALL") {
      filtered = filtered.filter((c) => c.type === filterType);
    }

    if (filterStatus !== "ALL") {
      filtered = filtered.filter((c) => c.status === filterStatus);
    }

    return filtered;
  }, [couriers, searchTerm, filterType, filterStatus]);

  const totalItems = processedCouriers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageItems = processedCouriers.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, filterStatus]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openEdit = (courier) => {
    if (!canManageCouriers) return;
    setEditingCourier(courier);
  };

  const handleSaveEdit = async (updatedFields) => {
    if (!editingCourier) return;
    try {
      await updateCourier(editingCourier.courier_id, updatedFields);
      toast.success("Courier updated");
      await loadCouriers();
      setEditingCourier(null);
    } catch (error) {
      console.error("Update courier error:", error);
      toast.error("Failed to update courier");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCourier(deleteTarget.courier_id);
      toast.success("Courier deleted");
      await loadCouriers();
      setDeleteTarget(null);
    } catch (error) {
      console.error("Delete courier error:", error);
      toast.error("Failed to delete courier");
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between text-xs">
        <div className="text-gray-600">
          {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-2 py-1 rounded ${currentPage === 1 ? "bg-gray-100 text-gray-400" : "bg-white border hover:bg-teal-50"}`}
          >
            ‹
          </button>
          {pageNumbers.map((num) => (
            <button
              key={num}
              onClick={() => handlePageChange(num)}
              className={`px-3 py-1 rounded ${currentPage === num ? "bg-teal-600 text-white" : "bg-white border hover:bg-teal-50"}`}
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-2 py-1 rounded ${currentPage === totalPages ? "bg-gray-100 text-gray-400" : "bg-white border hover:bg-teal-50"}`}
          >
            ›
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Couriers</h1>
          {canManageCouriers && (
            <button
              onClick={() => navigate("/master/courier/add")}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 transition font-semibold flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-3 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                placeholder="Search..."
              />
              <svg className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="EXTERNAL">External</option>
              <option value="INTERNAL">Internal</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="animate-spin h-8 w-8 text-teal-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : totalItems === 0 ? (
            <div className="text-center py-16 px-4">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-base font-semibold text-gray-700 mb-2">No couriers found</h3>
              <p className="text-sm text-gray-500">
                {searchTerm || filterType !== "ALL" || filterStatus !== "ALL" ? "Try adjusting your filters" : "Get started by adding a courier"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Code</th>
                      <th className="px-3 py-2 text-left font-semibold">Name</th>
                      <th className="px-3 py-2 text-left font-semibold">Type</th>
                      <th className="px-3 py-2 text-left font-semibold">Contact</th>
                      <th className="px-3 py-2 text-left font-semibold">Phone</th>
                      <th className="px-3 py-2 text-left font-semibold">Status</th>
                      {canManageCouriers && <th className="px-3 py-2 text-left font-semibold">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentPageItems.map((c) => (
                      <tr key={c.courier_id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">{c.courier_code}</td>
                        <td className="px-3 py-2 text-gray-900">{c.courier_name}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.type === "INTERNAL" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`}>
                            {c.type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-600">{c.contact_person || "-"}</td>
                        <td className="px-3 py-2 text-gray-600">{c.phone}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {c.status}
                          </span>
                        </td>
                        {canManageCouriers && (
                          <td className="px-3 py-2">
                            <div className="flex gap-2">
                              <button onClick={() => openEdit(c)} className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all">Edit</button>
                              <button onClick={() => setDeleteTarget(c)} className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all">Delete</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={safePage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                label="couriers"
                colorScheme="teal"
              />
            </>
          )}
        </div>
      </div>

      {editingCourier && (
        <EditCourierSlideOver courier={editingCourier} onClose={() => setEditingCourier(null)} onSave={handleSaveEdit} />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title="Delete Courier"
          message={`Delete "${deleteTarget.courier_name}"? This cannot be undone.`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function EditCourierSlideOver({ courier, onClose, onSave }) {
  const [formData, setFormData] = useState({
    courier_code: courier.courier_code || "",
    courier_name: courier.courier_name || "",
    type: courier.type || "EXTERNAL",
    contact_person: courier.contact_person || "",
    phone: courier.phone || "",
    alt_phone: courier.alt_phone || "",
    email: courier.email || "",
    address: courier.address || "",
    service_area: courier.service_area || "",
    rate_type: courier.rate_type || "FLAT",
    base_rate: courier.base_rate || "",
    vehicle_type: courier.vehicle_type || "",
    max_weight: courier.max_weight || "",
    cod_supported: courier.cod_supported || false,
    status: courier.status || "ACTIVE",
    remarks: courier.remarks || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.courier_name.trim() || !formData.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="fixed inset-0 bg-black bg-opacity-40" onClick={onClose} />
      <div className="relative ml-auto h-full w-full max-w-2xl bg-white shadow-xl flex flex-col">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Edit Courier</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
              <input
                type="text"
                value={formData.courier_code}
                onChange={(e) => setFormData({...formData, courier_code: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={formData.courier_name}
                onChange={(e) => setFormData({...formData, courier_name: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
              >
                <option value="EXTERNAL">External</option>
                <option value="INTERNAL">Internal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone *</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Alt Phone</label>
              <input
                type="text"
                value={formData.alt_phone}
                onChange={(e) => setFormData({...formData, alt_phone: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Service Area</label>
              <input
                type="text"
                value={formData.service_area}
                onChange={(e) => setFormData({...formData, service_area: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Vehicle Type</label>
              <input
                type="text"
                value={formData.vehicle_type}
                onChange={(e) => setFormData({...formData, vehicle_type: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Rate Type</label>
              <select
                value={formData.rate_type}
                onChange={(e) => setFormData({...formData, rate_type: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
              >
                <option value="FLAT">Flat</option>
                <option value="WEIGHT">Weight</option>
                <option value="DISTANCE">Distance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Base Rate</label>
              <input
                type="number"
                step="0.01"
                value={formData.base_rate}
                onChange={(e) => setFormData({...formData, base_rate: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Max Weight</label>
              <input
                type="number"
                step="0.01"
                value={formData.max_weight}
                onChange={(e) => setFormData({...formData, max_weight: e.target.value})}
                className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.cod_supported}
                onChange={(e) => setFormData({...formData, cod_supported: e.target.checked})}
                className="w-4 h-4 text-teal-600 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">COD Supported</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
            <input
              type="text"
              value={formData.remarks}
              onChange={(e) => setFormData({...formData, remarks: e.target.value})}
              className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </form>

        <div className="px-4 py-3 border-t flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded text-gray-700 hover:bg-gray-50 text-sm">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving} className="flex-1 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-60 text-sm">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ title, message, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-40" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-4">
        <h3 className="text-base font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50 text-sm">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}