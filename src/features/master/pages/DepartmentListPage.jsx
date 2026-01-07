// src/features/master/pages/DepartmentListPage.jsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../auth/AuthContext";
import Pagination from "../../../components/Pagination";
import {
  getDepartments,
  updateDepartment,
  deleteDepartment,
} from "../../../services/auth";

export default function DepartmentListPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterName, setFilterName] = useState("ALL");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [editingDept, setEditingDept] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const canManageDepartments =
    currentUser?.role === "SUPERADMIN" || currentUser?.role === "ADMIN";

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const response = await getDepartments();

      let deptArray = [];
      const apiData = response?.data;

      if (Array.isArray(apiData?.data?.results)) {
        deptArray = apiData.data.results;
      }
      else if (Array.isArray(apiData?.results)) {
        deptArray = apiData.results;
      }
      else if (Array.isArray(apiData?.data)) {
        deptArray = apiData.data;
      }
      else if (Array.isArray(apiData)) {
        deptArray = apiData;
      }

      setDepartments(deptArray);
      localStorage.setItem("departments", JSON.stringify(deptArray));
    } catch (err) {
      console.error("Failed to load departments:", err);
      toast.error("Failed to load departments");
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const uniqueDepartmentNames = useMemo(() => {
    const names = new Set();
    departments.forEach(dept => {
      if (dept.name) names.add(dept.name);
    });
    return Array.from(names).sort();
  }, [departments]);

  const processedDepartments = useMemo(() => {
    let filtered = [...departments];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (dept) => dept.name?.toLowerCase().includes(q) 
      );
    }

    if (filterName !== "ALL") {
      filtered = filtered.filter((dept) => dept.name === filterName);
    }

    return filtered;
  }, [departments, searchTerm, filterName]);

  const totalItems = processedDepartments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageItems = processedDepartments.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterName]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToAdd = () => {
    if (!canManageDepartments) {
      toast.error("You don't have permission to add departments");
      return;
    }
    navigate("/master/department/add");
  };

  const openEdit = (dept) => {
    if (!canManageDepartments) return;
    setEditingDept(dept);
  };

  const closeEdit = () => {
    setEditingDept(null);
  };

  const handleSaveEdit = async (updatedFields) => {
    if (!editingDept) return;
    try {
      await updateDepartment(editingDept.id, {
        name: updatedFields.name,
      });
      toast.success("Department updated");
      await loadDepartments();
      setEditingDept(null);
    } catch (error) {
      console.error("Update department error:", error);
      toast.error("Failed to update department");
    }
  };

  const openDeleteConfirm = (dept) => {
    if (!canManageDepartments) return;
    setDeleteTarget(dept);
  };

  const closeDeleteConfirm = () => {
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDepartment(deleteTarget.id);
      toast.success("Department deleted");
      await loadDepartments();
      setDeleteTarget(null);
    } catch (error) {
      console.error("Delete department error:", error);
      toast.error("Failed to delete department");
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
      <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs sm:text-sm text-gray-600">
            Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} departments
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-2 sm:px-3 py-2 rounded-lg font-medium transition-all ${
                currentPage === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-teal-50 hover:text-teal-600 border border-gray-300"
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {startPage > 1 && (
              <>
                <button
                  onClick={() => handlePageChange(1)}
                  className="px-3 sm:px-4 py-2 rounded-lg font-medium bg-white text-gray-700 hover:bg-teal-50 hover:text-teal-600 border border-gray-300 transition-all text-sm"
                >
                  1
                </button>
                {startPage > 2 && <span className="text-gray-400 text-sm">...</span>}
              </>
            )}

            {pageNumbers.map((number) => (
              <button
                key={number}
                onClick={() => handlePageChange(number)}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                  currentPage === number
                    ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-teal-50 hover:text-teal-600 border border-gray-300"
                }`}
              >
                {number}
              </button>
            ))}

            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && <span className="text-gray-400 text-sm">...</span>}
                <button
                  onClick={() => handlePageChange(totalPages)}
                  className="px-3 sm:px-4 py-2 rounded-lg font-medium bg-white text-gray-700 hover:bg-teal-50 hover:text-teal-600 border border-gray-300 transition-all text-sm"
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-2 sm:px-3 py-2 rounded-lg font-medium transition-all ${
                currentPage === totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white text-gray-700 hover:bg-teal-50 hover:text-teal-600 border border-gray-300"
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-5 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">
              Departments
            </h1>
          </div>

          {canManageDepartments && (
            <button
              onClick={handleNavigateToAdd}
              className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 transition font-semibold flex items-center justify-center gap-2 shadow-lg"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Department
            </button>
          )}
        </div>

        {/* Search + Filter */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search Departments
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
                  placeholder="Search by name..."
                />
                <svg
                  className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Filter by Name
              </label>
              <select
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
              >
                <option value="ALL">All Departments</option>
                {uniqueDepartmentNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(searchTerm || filterName !== "ALL") && (
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className="text-xs sm:text-sm font-medium text-gray-600">Active Filters:</span>
              {searchTerm && (
                <span className="px-2 sm:px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs sm:text-sm font-medium flex items-center gap-2">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm("")} className="hover:text-teal-900">×</button>
                </span>
              )}
              {filterName !== "ALL" && (
                <span className="px-2 sm:px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs sm:text-sm font-medium flex items-center gap-2">
                  Name: {filterName}
                  <button onClick={() => setFilterName("ALL")} className="hover:text-cyan-900">×</button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterName("ALL");
                }}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <svg className="animate-spin h-10 w-10 text-teal-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-gray-600">Loading departments...</p>
              </div>
            </div>
          ) : totalItems === 0 ? (
            <div className="text-center py-20 px-4">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No departments found</h3>
              <p className="text-sm text-gray-500 mb-6">
                {searchTerm || filterName !== "ALL" ? "Try adjusting your filters" : "Get started by adding your first department"}
              </p>
              {canManageDepartments && !searchTerm && filterName === "ALL" && (
                <button
                  onClick={handleNavigateToAdd}
                  className="px-4 sm:px-6 py-2 sm:py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition font-semibold text-sm"
                >
                  Add First Department
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">#</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">Department Name</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">Created</th>
                      {canManageDepartments && (
                        <th className="px-6 py-4 text-left text-sm font-bold text-white">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentPageItems.map((dept, index) => (
                      <tr key={dept.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {startIndex + index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                              {dept.name?.charAt(0)?.toUpperCase() || "D"}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-900">{dept.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {dept.created_at || dept.createdAt ? new Date(dept.created_at || dept.createdAt).toLocaleDateString() : "-"}
                        </td>
                        {canManageDepartments && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button onClick={() => openEdit(dept)} className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-al">Edit</button>
                              <button onClick={() => openDeleteConfirm(dept)} className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-al">Delete</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden divide-y divide-gray-200">
                {currentPageItems.map((dept, index) => (
                  <div key={dept.id} className="p-4 hover:bg-gray-50 transition">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {dept.name?.charAt(0)?.toUpperCase() || "D"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{dept.name}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Created: {dept.created_at || dept.createdAt ? new Date(dept.created_at || dept.createdAt).toLocaleDateString() : "-"}
                        </p>
                      </div>
                    </div>
                    {canManageDepartments && (
                      <div className="flex gap-2 pt-3 border-t border-gray-200">
                        <button onClick={() => openEdit(dept)} className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all">Edit</button>
                        <button onClick={() => openDeleteConfirm(dept)} className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all">Delete</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Pagination
                currentPage={safePage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                label="departments"
                colorScheme="teal"
              />
            </>
          )}
        </div>
      </div>

      {editingDept && (
        <EditDepartmentSlideOver department={editingDept} onClose={closeEdit} onSave={handleSaveEdit} />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title="Delete Department"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
          onCancel={closeDeleteConfirm}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

function EditDepartmentSlideOver({ department, onClose, onSave }) {
  const [name, setName] = useState(department.name || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(department.name || "");
  }, [department]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Department name is required");
      return;
    }
    setSaving(true);
    try {
      await onSave({ name });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="fixed inset-0 bg-black bg-opacity-40" onClick={onClose} />
      <div className="relative ml-auto h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="px-4 sm:px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Edit Department</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Department Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              placeholder="e.g., Sales, Marketing"
            />
          </div>
        </form>

        <div className="px-4 sm:px-6 py-4 border-t flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving} className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-60">
            {saving ? "Saving..." : "Save Changes"}
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
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{title || "Are you sure?"}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          <button onClick={onCancel} className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={onConfirm} className="w-full sm:w-auto px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}