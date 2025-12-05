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
  const [loading, setLoading] = useState(true);
  const [jobTitles, setJobTitles] = useState([]);


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
      setJobTitles(res.data.results); 
    } catch (err) {
      console.error("Failed to load job titles:", err);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      console.log("Fetched users:", data.data.results);
      const sortedUsers = data.data.results.sort((a, b) =>
        a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1
      );
      setUsers(sortedUsers);
      setFilteredUsers(sortedUsers);
    } catch (err) {
      console.error("Failed to load users:", err);
    } finally {
      setLoading(false);
    }
  };

  // Filtering
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
      filtered = filtered.filter((u) => u.status === filterStatus);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, filterRole, filterStatus]);

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
      // Adjust keys if your backend expects different names
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              User Management
            </h1>
            <p className="text-gray-600">
              Manage admins and users for Alfa Agencies
            </p>
          </div>

          {canAddUsers && (
            <button
              onClick={handleNavigateToAddUser}
              className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg hover:from-teal-600 hover:to-cyan-700 transition-all"
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-teal-500">
            <p className="text-sm text-gray-600 mb-1">Total Users</p>
            <p className="text-3xl font-bold text-gray-800">{users.length}</p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <p className="text-sm text-gray-600 mb-1">Admins</p>
            <p className="text-3xl font-bold text-gray-800">
              {
                users.filter(
                  (u) => u.role === "ADMIN" || u.role === "SUPERADMIN"
                ).length
              }
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <p className="text-sm text-gray-600 mb-1">Active</p>
            <p className="text-3xl font-bold text-gray-800">
              {users.filter((u) => u.is_active).length}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-gray-400">
            <p className="text-sm text-gray-600 mb-1">Inactive</p>
            <p className="text-3xl font-bold text-gray-800">
              {users.filter((u) => u.status === "INACTIVE").length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg"
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
                    d="M15 15l5 5m-5-5a7 7 0 10-9.9 0A7 7 0 0015 15z"
                  />
                </svg>
              </span>
            </div>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-lg"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPERADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="USER">User</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2.5 border rounded-lg"
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
            <div className="py-20 text-center text-gray-600">
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-20 text-center text-gray-600">
              No users found
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 border-b border-gray-100">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold overflow-hidden">
                            {user.profile_photo ? (
                              <img
                                src={user.profile_photo}
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
          )}
        </div>

        {!loading && filteredUsers.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-600">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        )}
      </div>
    </div>
  );
}