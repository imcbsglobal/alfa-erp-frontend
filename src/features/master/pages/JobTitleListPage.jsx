// src/features/master/pages/JobTitleListPage.jsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../auth/AuthContext";
import Pagination from "../../../components/Pagination";
import { formatDate } from '../../../utils/formatters';
import {
  getJobTitles,
  updateJobTitle,
  deleteJobTitle,
  getDepartments,
} from "../../../services/auth";

export default function JobTitleListPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [jobTitles, setJobTitles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterTitle, setFilterTitle] = useState("ALL");
  const [filterDepartment, setFilterDepartment] = useState("ALL");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [editingJob, setEditingJob] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const canManageJobTitles =
    currentUser?.role === "SUPERADMIN" || currentUser?.role === "ADMIN";

  useEffect(() => {
    loadJobTitles();
    loadDepartments();
  }, []);

  const loadJobTitles = async () => {
    setLoading(true);
    try {
      const response = await getJobTitles();

      console.log("JOB TITLE API RAW RESPONSE:", response);

      let jobArray = [];
        const apiData = response?.data;

        if (Array.isArray(apiData?.data?.results)) {
          jobArray = apiData.data.results;
        }
        else if (Array.isArray(apiData?.results)) {
          jobArray = apiData.results;
        }
        else if (Array.isArray(apiData?.data)) {
          jobArray = apiData.data;
        }
        else if (Array.isArray(apiData)) {
          jobArray = apiData;
        }
        else {
          console.warn("Unexpected job title API format:", apiData);
        }

        setJobTitles(jobArray);

      setJobTitles(jobArray);
      localStorage.setItem("jobTitles", JSON.stringify(jobArray));
    } catch (err) {
      console.error("Failed to load job titles:", err);
      toast.error("Failed to load job titles");
      setJobTitles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await getDepartments();
      const apiData = response?.data;
        let deptArray = [];

        if (Array.isArray(apiData?.data?.results)) {
          deptArray = apiData.data.results;
        }
        else if (Array.isArray(apiData?.results)) {
          deptArray = apiData.results;
        }
        else if (Array.isArray(apiData?.data)) {
          deptArray = apiData.data;
        }

        setDepartments(deptArray);

      setDepartments(deptArray);
    } catch (err) {
      console.error("Failed to load departments:", err);
    }
  };

  const getDepartmentName = (departmentId) => {
    if (!departmentId) return "-";
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || "-";
  };

  const uniqueJobTitles = useMemo(() => {
    const titles = new Set();
    jobTitles.forEach(job => {
      if (job.title) titles.add(job.title);
    });
    return Array.from(titles).sort();
  }, [jobTitles]);

  const uniqueDepartments = useMemo(() => {
    return departments.map(dept => ({ id: dept.id, name: dept.name }));
  }, [departments]);

  const processedJobTitles = useMemo(() => {
    let filtered = [...jobTitles];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.title?.toLowerCase().includes(q) ||
          getDepartmentName(job.department_id)?.toLowerCase().includes(q)
      );
    }

    if (filterTitle !== "ALL") {
      filtered = filtered.filter((job) => job.title === filterTitle);
    }

    if (filterDepartment !== "ALL") {
      filtered = filtered.filter((job) => job.department_id === parseInt(filterDepartment));
    }

    return filtered;
  }, [jobTitles, searchTerm, filterTitle, filterDepartment, departments]);

  const totalItems = processedJobTitles.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageItems = processedJobTitles.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterTitle, filterDepartment]);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        department_id: updatedFields.department_id,
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
          <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
            Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} job titles
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
                  className="hidden sm:block px-3 sm:px-4 py-2 rounded-lg font-medium bg-white text-gray-700 hover:bg-teal-50 hover:text-teal-600 border border-gray-300 transition-all text-sm"
                >
                  1
                </button>
                {startPage > 2 && <span className="hidden sm:inline text-gray-400">...</span>}
              </>
            )}

            {pageNumbers.map((number) => (
              <button
                key={number}
                onClick={() => handlePageChange(number)}
                className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-xs sm:text-sm ${
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
                {endPage < totalPages - 1 && <span className="hidden sm:inline text-gray-400">...</span>}
                <button
                  onClick={() => handlePageChange(totalPages)}
                  className="hidden sm:block px-3 sm:px-4 py-2 rounded-lg font-medium bg-white text-gray-700 hover:bg-teal-50 hover:text-teal-600 border border-gray-300 transition-all text-sm"
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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-5 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">
              Job Titles
            </h1>
          </div>

          {canManageJobTitles && (
            <button
              onClick={handleNavigateToAdd}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 transition font-semibold flex items-center justify-center gap-2 shadow-lg text-sm sm:text-base"
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
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

        {/* Search + Filter */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Search Job Titles
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
                  placeholder="Search by title or department..."
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
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter by Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Filter by Title
              </label>
              <select
                value={filterTitle}
                onChange={(e) => setFilterTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
              >
                <option value="ALL">All Titles</option>
                {uniqueJobTitles.map((title) => (
                  <option key={title} value={title}>
                    {title}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Department */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Filter by Department
              </label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
              >
                <option value="ALL">All Departments</option>
                {uniqueDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchTerm || filterTitle !== "ALL" || filterDepartment !== "ALL") && (
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className="text-xs sm:text-sm font-medium text-gray-600">Active Filters:</span>
              {searchTerm && (
                <span className="px-2 sm:px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs sm:text-sm font-medium flex items-center gap-2">
                  Search: "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm("")}
                    className="hover:text-teal-900"
                  >
                    ×
                  </button>
                </span>
              )}
              {filterTitle !== "ALL" && (
                <span className="px-2 sm:px-3 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs sm:text-sm font-medium flex items-center gap-2">
                  Title: {filterTitle}
                  <button
                    onClick={() => setFilterTitle("ALL")}
                    className="hover:text-cyan-900"
                  >
                    ×
                  </button>
                </span>
              )}
              {filterDepartment !== "ALL" && (
                <span className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs sm:text-sm font-medium flex items-center gap-2">
                  Department: {getDepartmentName(parseInt(filterDepartment))}
                  <button
                    onClick={() => setFilterDepartment("ALL")}
                    className="hover:text-purple-900"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterTitle("ALL");
                  setFilterDepartment("ALL");
                }}
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
                {searchTerm || filterTitle !== "ALL" || filterDepartment !== "ALL"
                  ? "Try adjusting your filters"
                  : "Get started by adding your first job title"}
              </p>
              {canManageJobTitles && !searchTerm && filterTitle === "ALL" && filterDepartment === "ALL" && (
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
                        #
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">
                        Job Title
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">
                        Department
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
                    {currentPageItems.map((job, index) => (
                      <tr key={job.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {startIndex + index + 1}
                        </td>
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                            {getDepartmentName(job.department_id)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(job.created_at || job.createdAt)}
                        </td>
                        {canManageJobTitles && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openEdit(job)}
                                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-al"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => openDeleteConfirm(job)}
                                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-al"
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
                label="job titles"
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
                <p className="text-gray-600 text-sm">Loading job titles...</p>
              </div>
            </div>
          ) : totalItems === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl">
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
              <h3 className="text-base font-semibold text-gray-700 mb-2">
                No job titles found
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {searchTerm || filterTitle !== "ALL" || filterDepartment !== "ALL"
                  ? "Try adjusting your filters"
                  : "Get started by adding your first job title"}
              </p>
              {canManageJobTitles && !searchTerm && filterTitle === "ALL" && filterDepartment === "ALL" && (
                <button
                  onClick={handleNavigateToAdd}
                  className="px-6 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition font-semibold text-sm"
                >
                  Add First Job Title
                </button>
              )}
            </div>
          ) : (
            <>
              {currentPageItems.map((job, index) => (
                <div key={job.id} className="bg-white rounded-xl shadow-md p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {job.title?.charAt(0)?.toUpperCase() || "J"}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {job.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          #{startIndex + index + 1}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Department:</span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                        {getDepartmentName(job.department_id)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Created:</span>
                      <span className="text-gray-900 font-medium">
                        {formatDate(job.created_at || job.createdAt)}
                      </span>
                    </div>
                  </div>

                  {canManageJobTitles && (
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => openEdit(job)}
                        className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(job)}
                        className="px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
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
                label="job titles"
                colorScheme="teal"
              />
            </>
          )}
        </div>
      </div>

      {/* Slide-over Edit Panel */}
      {editingJob && (
        <EditJobTitleSlideOver
          job={editingJob}
          departments={departments}
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

function EditJobTitleSlideOver({ job, departments, onClose, onSave }) {
  const [title, setTitle] = useState(job.title || "");
  const [departmentId, setDepartmentId] = useState(job.department_id || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(job.title || "");
    setDepartmentId(job.department_id || "");
  }, [job]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!departmentId) {
      toast.error("Department is required");
      return;
    }
    setSaving(true);
    try {
      await onSave({ title, department_id: departmentId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex">
      <div
        className="fixed inset-0 bg-black bg-opacity-40"
        onClick={onClose}
      />
      <div className="relative ml-auto h-full w-full sm:max-w-md bg-white shadow-xl flex flex-col">
        <div className="px-4 sm:px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800">
            Edit Job Title
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 p-2"
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

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Job Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
              placeholder="e.g., Sales Executive"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Department *
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
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
      <div
        className="fixed inset-0 bg-black bg-opacity-40"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2">
          {title || "Are you sure?"}
        </h3>
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