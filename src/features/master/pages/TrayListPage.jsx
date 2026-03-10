import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useUrlPage from '../../../utils/useUrlPage';
import toast from "react-hot-toast";
import { useAuth } from "../../auth/AuthContext";
import { getTrays, updateTray, deleteTray } from "../../../services/master";
import Pagination from "../../../components/Pagination";
import { formatDate } from '../../../utils/formatters';

export default function TrayListPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [trays, setTrays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useUrlPage();
  const itemsPerPage = 10;

  const [editingTray, setEditingTray] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const canManageTrays = currentUser?.role === "SUPERADMIN" || currentUser?.role === "ADMIN";

  useEffect(() => {
    loadTrays();
  }, []);

  const loadTrays = async () => {
    setLoading(true);
    try {
      const response = await getTrays();
      let trayArray = [];
      const apiData = response?.data;

      if (Array.isArray(apiData?.data?.results)) {
        trayArray = apiData.data.results;
      } else if (Array.isArray(apiData?.results)) {
        trayArray = apiData.results;
      } else if (Array.isArray(apiData?.data)) {
        trayArray = apiData.data;
      } else if (Array.isArray(apiData)) {
        trayArray = apiData;
      } else {
        console.warn("Unexpected tray API format:", apiData);
      }

      setTrays(trayArray);
    } catch (err) {
      console.error("Failed to load trays:", err);
      toast.error("Failed to load trays");
      setTrays([]);
    } finally {
      setLoading(false);
    }
  };

  const processedTrays = useMemo(() => {
    let filtered = [...trays];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (tray) =>
          tray.tray_code?.toLowerCase().includes(q) ||
          tray.tray_name?.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "ALL") {
      filtered = filtered.filter((tray) => tray.status === filterStatus);
    }
    return filtered;
  }, [trays, searchTerm, filterStatus]);

  const totalItems = processedTrays.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageItems = processedTrays.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openEdit = (tray) => {
    if (!canManageTrays) return;
    setEditingTray(tray);
  };

  const closeEdit = () => setEditingTray(null);

  const handleSaveEdit = async (updatedFields) => {
    if (!editingTray) return;
    try {
      await updateTray(editingTray.tray_id, updatedFields);
      toast.success("Tray updated successfully");
      closeEdit();
      loadTrays();
    } catch (err) {
      toast.error("Failed to update tray");
    }
  };

  const openDeleteConfirm = (tray) => {
    if (!canManageTrays) return;
    setDeleteTarget(tray);
  };

  const closeDeleteConfirm = () => setDeleteTarget(null);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTray(deleteTarget.tray_id);
      toast.success("Tray deleted successfully");
      closeDeleteConfirm();
      loadTrays();
    } catch (err) {
      toast.error("Failed to delete tray");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-5 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">Trays</h1>
          </div>
          {canManageTrays && (
            <button
              onClick={() => navigate("/master/tray/add")}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 transition font-semibold flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Tray
            </button>
          )}
        </div>

        {/* Search + Filter */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Search Trays</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
                  placeholder="Search by tray code or name..."
                />
                <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Filter by Status */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(searchTerm || filterStatus !== "ALL") && (
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className="text-xs sm:text-sm font-medium text-gray-600">Active Filters:</span>
              {searchTerm && (
                <span className="px-2 sm:px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs sm:text-sm font-medium flex items-center gap-2">
                  Search: "{searchTerm}"
                  <button onClick={() => { setSearchTerm(""); setCurrentPage(1); }} className="hover:text-teal-900">×</button>
                </span>
              )}
              {filterStatus !== "ALL" && (
                <span className="px-2 sm:px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs sm:text-sm font-medium flex items-center gap-2">
                  Status: {filterStatus}
                  <button onClick={() => { setFilterStatus("ALL"); setCurrentPage(1); }} className="hover:text-cyan-900">×</button>
                </span>
              )}
              <button
                onClick={() => { setSearchTerm(""); setFilterStatus("ALL"); setCurrentPage(1); }}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Table - Desktop */}
        <div className="hidden md:block bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <svg className="animate-spin h-10 w-10 text-teal-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-gray-600">Loading trays...</p>
              </div>
            </div>
          ) : totalItems === 0 ? (
            <div className="text-center py-20">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No trays found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || filterStatus !== "ALL" ? "Try adjusting your filters" : "Get started by adding your first tray"}
              </p>
              {canManageTrays && !searchTerm && filterStatus === "ALL" && (
                <button
                  onClick={() => navigate("/master/tray/add")}
                  className="px-6 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition font-semibold"
                >
                  Add First Tray
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">#</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">Tray Code</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">Created</th>
                      {canManageTrays && (
                        <th className="px-6 py-4 text-left text-sm font-bold text-white">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentPageItems.map((tray, index) => (
                      <tr key={tray.tray_id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {startIndex + index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                              {tray.tray_code?.charAt(0)?.toUpperCase() || "T"}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-900">{tray.tray_code}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            tray.status === "ACTIVE"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}>
                            {tray.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(tray.created_at)}
                        </td>
                        {canManageTrays && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEdit(tray)}
                                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all text-xs"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => openDeleteConfirm(tray)}
                                className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg font-semibold shadow-lg hover:from-red-600 hover:to-pink-700 transition-all text-xs"
                              >
                                Delete
                              </button>
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
                label="trays"
                colorScheme="teal"
              />
            </>
          )}
        </div>

        {/* Cards - Mobile */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <svg className="animate-spin h-10 w-10 text-teal-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-gray-600 text-sm">Loading trays...</p>
              </div>
            </div>
          ) : totalItems === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="text-base font-semibold text-gray-700 mb-2">No trays found</h3>
              <p className="text-sm text-gray-500 mb-6">
                {searchTerm || filterStatus !== "ALL" ? "Try adjusting your filters" : "Get started by adding your first tray"}
              </p>
              {canManageTrays && !searchTerm && filterStatus === "ALL" && (
                <button
                  onClick={() => navigate("/master/tray/add")}
                  className="px-6 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition font-semibold text-sm"
                >
                  Add First Tray
                </button>
              )}
            </div>
          ) : (
            <>
              {currentPageItems.map((tray, index) => (
                <div key={tray.tray_id} className="bg-white rounded-xl shadow-md p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {tray.tray_code?.charAt(0)?.toUpperCase() || "T"}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{tray.tray_code}</div>
                        <div className="text-xs text-gray-500">#{startIndex + index + 1}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      tray.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {tray.status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Tray Name:</span>
                      <span className="text-gray-900 font-medium">{tray.tray_name}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Created:</span>
                      <span className="text-gray-900 font-medium">{formatDate(tray.created_at)}</span>
                    </div>
                  </div>

                  {canManageTrays && (
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => openEdit(tray)}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all text-xs text-center"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(tray)}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg font-semibold shadow-lg hover:from-red-600 hover:to-pink-700 transition-all text-xs text-center"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <Pagination
                currentPage={safePage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                label="trays"
                colorScheme="teal"
              />
            </>
          )}
        </div>
      </div>

      {/* Edit Slide-over */}
      {editingTray && (
        <EditTraySlideOver
          tray={editingTray}
          onClose={closeEdit}
          onSave={handleSaveEdit}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          title="Delete Tray"
          message={`Are you sure you want to delete tray "${deleteTarget.tray_name}"? This action cannot be undone.`}
          onCancel={closeDeleteConfirm}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

/* ================ Edit Slide-over ================ */

function EditTraySlideOver({ tray, onClose, onSave }) {
  const [formData, setFormData] = useState({
    tray_code: tray.tray_code || "",
    tray_name: tray.tray_name || "",
    description: tray.description || "",
    status: tray.status || "ACTIVE",
    remarks: tray.remarks || "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.tray_code.trim()) newErrors.tray_code = "Tray code is required";
    if (!formData.tray_name.trim()) newErrors.tray_name = "Tray name is required";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

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
      <div className="relative ml-auto h-full w-full sm:max-w-md bg-white shadow-xl flex flex-col">
        <div className="px-4 sm:px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800">Edit Tray</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tray Code *</label>
            <input
              type="text"
              name="tray_code"
              value={formData.tray_code}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border ${errors.tray_code ? "border-red-300" : "border-gray-300"} rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm`}
              placeholder="e.g., TRAY001"
            />
            {errors.tray_code && <p className="mt-1 text-xs text-red-600">{errors.tray_code}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tray Name *</label>
            <input
              type="text"
              name="tray_name"
              value={formData.tray_name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border ${errors.tray_name ? "border-red-300" : "border-gray-300"} rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm`}
              placeholder="e.g., Main Tray"
            />
            {errors.tray_name && <p className="mt-1 text-xs text-red-600">{errors.tray_name}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
              placeholder="Tray description (optional)"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status *</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Remarks</label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
              placeholder="Remarks (optional)"
              rows={2}
            />
          </div>
        </form>

        <div className="px-4 sm:px-6 py-4 border-t flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-60 text-sm font-medium"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================ Delete Confirm Modal ================ */

function DeleteConfirmModal({ title, message, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-3 sm:px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 sm:px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}