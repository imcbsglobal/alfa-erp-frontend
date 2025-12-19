// src/pages/users/UserListPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import {
  getJobTitles,
  getUsers,
  activateUser,
  deactivateUser,
  deleteUser,
  changeUserPassword,
} from "../../../services/auth";

export default function UserListPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterJobTitle, setFilterJobTitle] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [jobTitles, setJobTitles] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Permission check
  const hasUserManagementPermission = () => {
    if (
      currentUser?.role === "SUPERADMIN" ||
      currentUser?.role === "ADMIN"
    )
      return true;

    const permissionMap = JSON.parse(
      localStorage.getItem("userPermissions") || "{}"
    );
    const userPermissions = currentUser?.email
      ? permissionMap[currentUser.email] || {}
      : {};
    return userPermissions["user-management"]?.view === true;
  };

  const canAddUsers = hasUserManagementPermission();
  const canManageUsers = hasUserManagementPermission();

  // Load users via API
  useEffect(() => {
    loadUsers();
    loadJobTitles();
  }, []);

  const loadJobTitles = async () => {
    try {
      const res = await getJobTitles();
      const apiData = res?.data?.data;
      setJobTitles(Array.isArray(apiData?.results) ? apiData.results : []);
    } catch (err) {
      console.error("Failed to load job titles:", err);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await getUsers();

      const apiData = response?.data?.data;
      const userList = Array.isArray(apiData?.results) ? apiData.results : [];

      const sortedUsers = userList.sort((a, b) =>
        a.name?.toLowerCase() > b.name?.toLowerCase() ? 1 : -1
      );

      setUsers(sortedUsers);
      setFilteredUsers(sortedUsers);

    } catch (err) {
      console.error("Failed to load users:", err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  // Filtering - reset to page 1 when filters change
  useEffect(() => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.job_title_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterRole !== "ALL") {
      filtered = filtered.filter((u) => u.role === filterRole);
    }

    if (filterStatus !== "ALL") {
      if (filterStatus === "ACTIVE") {
        filtered = filtered.filter((u) => u.is_active === true);
      } else if (filterStatus === "INACTIVE") {
        filtered = filtered.filter((u) => u.is_active === false);
      }
    }

    if (filterJobTitle !== "ALL") {
      filtered = filtered.filter((u) => u.job_title_name === filterJobTitle);
    }

    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [users, searchTerm, filterRole, filterStatus, filterJobTitle]);

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToAddUser = () => {
    navigate("/add-user");
  };

  const handleEditUser = (id) => {
    navigate(`/users/${id}/edit`);
  };

  const handleToggleStatus = async (user) => {
    try {
      if (user.is_active) {
        await deactivateUser(user.id);
      } else {
        await activateUser(user.id);
      }
      await loadUsers();
    } catch (err) {
      console.error("Toggle status failed:", err);
      alert("Failed to update status. Check console/backend.");
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUser(id);
      await loadUsers();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete user. Check console/backend.");
    }
  };

  const handleResetPassword = async (user) => {
    const newPassword = window.prompt(
      `Enter new password for ${user.email} (min 6 chars):`
    );
    if (!newPassword) return;
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    try {
      await changeUserPassword({
        user_id: user.id,
        new_password: newPassword,
      });
      alert("Password changed successfully.");
    } catch (err) {
      console.error("Password reset failed:", err);
      alert("Failed to change password. Check console/backend.");
    }
  };

  // Badge colors
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "SUPERADMIN":
        return "bg-red-100 text-red-700 border-red-200";
      case "ADMIN":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "USER":
        return "bg-teal-100 text-teal-700 border-teal-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusBadgeColor = (status) => {
    return status === "ACTIVE"
      ? "bg-green-100 text-green-700 border-green-200"
      : "bg-gray-100 text-gray-500 border-gray-200";
  };

  // Pagination component matching JobTitleListPage
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
          {/* Info */}
          <div className="text-xs sm:text-sm text-gray-600">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredUsers.length)} of {filteredUsers.length} users
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
            {/* Previous Button */}
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

            {/* First Page */}
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

            {/* Page Numbers */}
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

            {/* Last Page */}
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

            {/* Next Button */}
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
              User Management
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Manage admins and users for Alfa Agencies
            </p>
          </div>

          {canAddUsers && (
            <button
              onClick={handleNavigateToAddUser}
              className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
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
              Add New User
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-teal-500">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Users</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-800">{users.length}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-purple-500">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Admins</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-800">
              {
                users.filter(
                  (u) => u.role === "ADMIN" || u.role === "SUPERADMIN"
                ).length
              }
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-green-500">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Active</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-800">
              {users.filter((u) => u.is_active === true).length}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border-l-4 border-gray-400">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Inactive</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-800">
              {users.filter((u) => u.is_active === false).length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
            </div>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPERADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="USER">User</option>
            </select>

            <select
              value={filterJobTitle}
              onChange={(e) => setFilterJobTitle(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
            >
              <option value="ALL">All Job Titles</option>
              {jobTitles.map((jobTitle) => (
                <option key={jobTitle.id} value={jobTitle.title}>
                  {jobTitle.title}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
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
                <p className="text-gray-600">Loading users...</p>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-20 px-4">
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
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No users found
              </h3>
              <p className="text-gray-500">
                Try adjusting your filters
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-teal-500 to-cyan-600">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">
                        User
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">
                        Job Title
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">
                        Role
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">
                        Created By
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold overflow-hidden">
                              {user.avatar ? (
                                <img
                                  src={user.avatar}
                                  className="w-full h-full object-cover"
                                  alt=""
                                />
                              ) : (
                                user.name?.charAt(0)?.toUpperCase()
                              )}
                            </div>
                            <div>
                              <p className="font-semibold">{user.name?.toUpperCase()}</p>
                              <p className="text-sm text-gray-500">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {user.job_title_name || "-"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`px-3 py-1 rounded-full border text-xs font-bold ${getRoleBadgeColor(
                              user.role
                            )}`}
                          >
                            {user.role}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-500">
                          {user.created_by || "-"}
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`min-w-[80px] text-center inline-block px-4 py-1 rounded-full border text-xs font-bold ${
                              getStatusBadgeColor(user.is_active ? "ACTIVE" : "INACTIVE")
                            }`}
                          >
                            {user.is_active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => handleEditUser(user.id)}
                              className="px-2 py-1 text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="px-2 py-1 text-red-600 hover:text-red-800 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden divide-y divide-gray-200">
                {currentItems.map((user) => (
                  <div key={user.id} className="p-4 hover:bg-gray-50 transition">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            className="w-full h-full object-cover"
                            alt=""
                          />
                        ) : (
                          user.name?.charAt(0)?.toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{user.name?.toUpperCase()}</p>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className={`px-2 py-1 rounded-full border text-xs font-bold ${getRoleBadgeColor(user.role)}`}>
                            {user.role}
                          </span>
                          <span className={`px-2 py-1 rounded-full border text-xs font-bold ${getStatusBadgeColor(user.is_active ? "ACTIVE" : "INACTIVE")}`}>
                            {user.is_active ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm mb-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Job Title:</span>
                        <span className="font-medium">{user.job_title_name || "-"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Created By:</span>
                        <span className="font-medium">{user.created_by || "-"}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => handleEditUser(user.id)}
                        className="flex-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="flex-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {renderPagination()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}