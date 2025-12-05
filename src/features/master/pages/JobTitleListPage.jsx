// src/features/master/pages/JobTitleListPage.jsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../auth/AuthContext";
import {
  getJobTitles,
  updateJobTitle,
  deleteJobTitle,
} from "../../../services/auth";

export default function JobTitleListPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [jobTitles, setJobTitles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("title");
  const [sortDirection, setSortDirection] = useState("asc");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [editingJob, setEditingJob] = useState(null); // job object or null
  const [deleteTarget, setDeleteTarget] = useState(null); // job object or null

  // Only SUPERADMIN / ADMIN can manage
  const canManageJobTitles =
    currentUser?.role === "SUPERADMIN" || currentUser?.role === "ADMIN";

  // Load job titles from API
  useEffect(() => {
    loadJobTitles();
  }, []);

  const loadJobTitles = async () => {
  setLoading(true);
  try {
    const response = await getJobTitles();

    console.log("JOB TITLE API RAW RESPONSE:", response);

    let jobArray = [];

    // Extract valid array from backend response
    if (Array.isArray(response?.data?.data)) {
      jobArray = response.data.data;
    } else if (Array.isArray(response?.data?.results)) {
      jobArray = response.data.results;
    } else {
      console.warn("API returned non-array structure. Using empty array.", response);
    }

    setJobTitles(jobArray);

    // Store for AddUserPage dropdown
    localStorage.setItem("jobTitles", JSON.stringify(jobArray));
  } catch (err) {
    console.error("Failed to load job titles:", err);
    toast.error("Failed to load job titles");
    setJobTitles([]);
  } finally {
    setLoading(false);
  }
};

  // Filter + sort in memory
  const processedJobTitles = useMemo(() => {
    let filtered = [...jobTitles];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title?.toLowerCase().includes(q) ||
          job.description?.toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => {
      const valA =
        sortField === "created"
          ? a.created_at || a.createdAt || ""
          : a.title || "";
      const valB =
        sortField === "created"
          ? b.created_at || b.createdAt || ""
          : b.title || "";

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [jobTitles, searchTerm, sortField, sortDirection]);

  // Pagination
  const totalItems = processedJobTitles.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const currentPageItems = processedJobTitles.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleSortChange = (field) => {
    if (sortField === field) {
      // toggle direction
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleNavigateToAdd = () => {
    if (!canManageJobTitles) {
      toast.error("You don't have permission to add job titles");
      return;
    }
    navigate("/master/job-title/add");
  };

  const openEdit = (job) => {
    if (!canManageJobTitles) return;
    setEditingJob(job);
  };

  const closeEdit = () => {
    setEditingJob(null);
  };

  const handleSaveEdit = async (updatedFields) => {
    if (!editingJob) return;
    try {
      await updateJobTitle(editingJob.id, {
        title: updatedFields.title,
        description: updatedFields.description,
      });
      toast.success("Job title updated");
      await loadJobTitles();
      setEditingJob(null);
    } catch (error) {
      console.error("Update job title error:", error);
      toast.error("Failed to update job title");
    }
  };

  const openDeleteConfirm = (job) => {
    if (!canManageJobTitles) return;
    setDeleteTarget(job);
  };

  const closeDeleteConfirm = () => {
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteJobTitle(deleteTarget.id);
      toast.success("Job title deleted");
      await loadJobTitles();
      setDeleteTarget(null);
    } catch (error) {
      console.error("Delete job title error:", error);
      toast.error("Failed to delete job title");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">
              Job Titles
            </h1>
            <p className="text-gray-600">
              Manage job titles for Alfa Agencies
            </p>
          </div>

          {canManageJobTitles && (
            <button
              onClick={handleNavigateToAdd}
              className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 transition font-semibold flex items-center gap-2 shadow-lg"
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
              Add Job Title
            </button>
          )}
        </div>

        {/* Search + Sort */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6 flex flex-col md:flex-row gap-4 md:items-end md:justify-between">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Search Job Titles
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title or description..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
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

          <div className="flex gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Sort by
              </label>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="title">Title</option>
                <option value="created">Created Date</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Direction
              </label>
              <button
                type="button"
                onClick={() =>
                  setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm flex items-center gap-1"
              >
                {sortDirection === "asc" ? "Asc" : "Desc"}
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {sortDirection === "asc" ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-8 7 8"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 8-7-8"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <svg
                  className="animate-spin h-10 w-10 text-teal-500 mx-auto mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <p className="text-gray-600">Loading job titles...</p>
              </div>
            </div>
          ) : totalItems === 0 ? (
            <div className="text-center py-20">
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No job titles found
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm
                  ? "Try adjusting your search"
                  : "Get started by adding your first job title"}
              </p>
              {canManageJobTitles && (
                <button
                  onClick={handleNavigateToAdd}
                  className="px-6 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition font-semibold"
                >
                  Add First Job Title
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">
                        Job Title
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">
                        Description
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">
                        Created
                      </th>
                      {canManageJobTitles && (
                        <th className="px-6 py-4 text-left text-sm font-bold text-white">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentPageItems.map((job) => (
                      <tr key={job.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                              {job.title?.charAt(0)?.toUpperCase() || "J"}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-900">
                                {job.title}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {job.description || "-"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {job.created_at || job.createdAt
                            ? new Date(
                                job.created_at || job.createdAt
                              ).toLocaleDateString()
                            : "-"}
                        </td>
                        {canManageJobTitles && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEdit(job)}
                                className="px-2 py-1 text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => openDeleteConfirm(job)}
                                className="px-2 py-1 text-red-600 hover:text-red-800 hover:underline"
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-wrap gap-4">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to{" "}
                    {Math.min(startIndex + itemsPerPage, totalItems)} of{" "}
                    {totalItems} job titles
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.max(1, p - 1))
                      }
                      disabled={safePage === 1}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                        safePage === 1
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-white border border-gray-300 text-gray-700 hover:bg-teal-50 hover:border-teal-500 hover:text-teal-700"
                      }`}
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {safePage} of {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={safePage === totalPages}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                        safePage === totalPages
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-white border border-gray-300 text-gray-700 hover:bg-teal-50 hover:border-teal-500 hover:text-teal-700"
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info */}
        {!loading && totalItems > 0 && (
          <div className="mt-6 text-center text-sm text-gray-600">
            Total {totalItems} job titles
          </div>
        )}
      </div>

      {/* Slide-over Edit Panel */}
      {editingJob && (
        <EditJobTitleSlideOver
          job={editingJob}
          onClose={closeEdit}
          onSave={handleSaveEdit}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          title="Delete Job Title"
          message={`Are you sure you want to delete "${deleteTarget.title}"? This action cannot be undone.`}
          onCancel={closeDeleteConfirm}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

/* ================ Slide-over Component ================ */

function EditJobTitleSlideOver({ job, onClose, onSave }) {
  const [title, setTitle] = useState(job.title || "");
  const [description, setDescription] = useState(job.description || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(job.title || "");
    setDescription(job.description || "");
  }, [job]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      await onSave({ title, description });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative ml-auto h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            Edit Job Title
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Job Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-60"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-40"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          {title || "Are you sure?"}
        </h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
