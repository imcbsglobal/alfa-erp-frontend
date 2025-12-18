import { useState, useEffect } from "react";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import {
  getUsersApi,
  getAllMenusApi,
  getUserMenusApi,
  assignMenusApi,
} from "../../../services/accessControl";
import toast from "react-hot-toast";
// Simple SVG icon components to replace lucide-react
const HomeIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

const UsersIcon = ({ className }) => (
  <svg
    className={className}
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
);

const CogIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const BriefcaseIcon = ({ className }) => (
  <svg
    className={className}
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
);

const BuildingIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  </svg>
);

const FileTextIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const ListIcon = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6h16M4 10h16M4 14h16M4 18h16"
    />
  </svg>
);

const permissionIcons = {
  dashboard: <HomeIcon className="w-6 h-6" />,

  // User Management Section
  users: <UsersIcon className="w-6 h-6" />,
  user_management: <UsersIcon className="w-6 h-6" />,
  user_list: <UsersIcon className="w-6 h-6" />,
  user_control: <CogIcon className="w-6 h-6" />,

  // Invoice Section
  invoice: <FileTextIcon className="w-6 h-6" />,
  invoice_list: <ListIcon className="w-6 h-6" />,

  // Master Section
  master: <TuneOutlinedIcon className="w-6 h-6" />,
  job_title: <BriefcaseIcon className="w-6 h-6" />,
  department: <BuildingIcon className="w-6 h-6" />,

  // Default fallback
  default: <CogIcon className="w-6 h-6" />,
};

// Mock menus for fallback
const mockMenus = [
  { id: 1, name: "Dashboard", code: "dashboard" },
  { id: 2, name: "User Management", code: "user_management" },
  { id: 3, name: "User List", code: "user_list" },
  { id: 4, name: "User Control", code: "user_control" },
  { id: 5, name: "Invoice", code: "invoice" },
  { id: 6, name: "Invoice List", code: "invoice_list" },
  { id: 7, name: "Master", code: "master" },
  { id: 8, name: "Job Title", code: "job_title" },
  { id: 9, name: "Department", code: "department" },
];

export default function UserControlPage() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [availableMenus, setAvailableMenus] = useState([]);
  const [userPermissions, setUserPermissions] = useState({});
  const [expandedMenus, setExpandedMenus] = useState({});

  // Fetch users from API
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsersApi();
      setUsers(res.data.data.results || []);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch menus from API
  const fetchAllMenus = async () => {
    try {
      const res = await getAllMenusApi();
      setAvailableMenus(res.data.data.menus || []);
    } catch (err) {
      console.error("Failed to fetch menus", err);
      setAvailableMenus([]);
    }
  };

  // Initialize - fetch users and menus
  useEffect(() => {
    fetchUsers();
    fetchAllMenus();
  }, []);

  // Fetch user permissions when user is selected
  useEffect(() => {
    if (selectedUser) {
      fetchUserPermissions(selectedUser.id);
    }
  }, [selectedUser]);

  const fetchUserPermissions = async (userId) => {
    try {
      const res = await getUserMenusApi(userId);

      const permissions = {};

      res.data.data.assignments.forEach((assignment) => {
        permissions[assignment.menu] = true;
      });

      setUserPermissions(permissions);
    } catch (err) {
      console.error("Failed to fetch user menus", err);
      setUserPermissions({});
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
  };

  const togglePermission = (menuId) => {
    setUserPermissions(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };  

  const toggleExpand = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  // Auto-expand all parent menus on user selection
  useEffect(() => {
    if (availableMenus.length > 0) {
      const expanded = {};
      availableMenus.forEach(menu => {
        if (menu.children?.length > 0) {
          expanded[menu.id] = true;
        }
      });
      setExpandedMenus(expanded);
    }
  }, [availableMenus]);

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    setSaveLoading(true);
    try {
      // Get only the menu IDs where view is true (enabled menus)
      const menu_ids = Object.keys(userPermissions).filter(
        id => userPermissions[id] === true
      );
        // .map((id) => parseInt(id)); // Ensure they're numbers if your API expects that

      console.log("Saving menu_ids:", menu_ids); // Debug log

      await assignMenusApi({
        user_id: selectedUser.id,
        menu_ids,
      });

      toast.success("Permissions updated successfully");

      // Wait a moment for the backend to process
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Re-fetch to ensure UI is in sync with backend
      await fetchUserPermissions(selectedUser.id);
    } catch (err) {
      console.error("Save error:", err);
      toast.error(
        "Failed to update permissions: " +
          (err.response?.data?.message || err.message)
      );
    } finally {
      setSaveLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const name =
      u.name ||
      u.full_name ||
      `${u.first_name || ""} ${u.last_name || ""}`.trim();
    const email = u.email || "";
    const searchLower = searchTerm.toLowerCase();

    return (
      name.toLowerCase().includes(searchLower) ||
      email.toLowerCase().includes(searchLower)
    );
  });

  const getEnabledCount = () =>
      Object.values(userPermissions).filter(Boolean).length;

  const MenuItem = ({ menu, level = 0 }) => {
    const enabled = !!userPermissions[menu.id];
    const hasChildren = menu.children?.length > 0;
    const isExpanded = expandedMenus[menu.id];

    return (
      <div className="mb-2">
        <div
          style={{ marginLeft: level * 24 }}
          className={`flex items-center gap-2 p-3 rounded-lg border transition-all ${
            enabled
              ? "border-teal-500 bg-gradient-to-r from-teal-50 to-cyan-50 shadow-sm"
              : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
          }`}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(menu.id)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <svg
                className={`w-4 h-4 text-gray-600 transition-transform ${
                  isExpanded ? "rotate-90" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          ) : (
            <div className="w-6" />
          )}

          <button
            onClick={() => togglePermission(menu.id)}
            className="flex-1 flex justify-between items-center"
          >
            <div className="flex items-center gap-3">
              <div className={enabled ? "text-teal-600" : "text-gray-400"}>
                {permissionIcons[menu.code] || permissionIcons.default}
              </div>
              <div className="text-left">
                <span className="font-medium block text-sm">{menu.name}</span>
                <span className="text-xs text-gray-500">{menu.code}</span>
              </div>
            </div>

            {enabled && (
              <svg
                className="w-5 h-5 text-teal-600 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </button>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-2">
            {menu.children.map((child) => (
              <MenuItem
                key={child.id}
                menu={child}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            User Access Control
          </h1>
          <p className="text-gray-600">
            Manage menu access and permissions for admins and users at Alfa
            Agencies
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span>Select User</span>
                <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-1 rounded-full">
                  {filteredUsers.length}
                </span>
              </h2>

              {/* Search */}
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
                <svg
                  className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
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

              {/* User List */}
              <div className="space-y-1 max-h-[500px] overflow-y-auto pr-2">
                {loading ? (
                  <p className="text-center text-gray-500 py-8">
                    Loading users...
                  </p>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <svg
                      className="w-16 h-16 mx-auto text-gray-300 mb-3"
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
                    <p className="text-gray-500 font-medium">No users found</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Create users in the Add User page
                    </p>
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const userName =
                      u.name ||
                      u.full_name ||
                      `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
                      "Unknown User";
                    const userInitial = userName.charAt(0).toUpperCase();

                    return (
                      <button
                        key={u.id}
                        onClick={() => handleUserSelect(u)}
                        className={`w-full text-left p-4 rounded-lg transition-all ${
                          selectedUser?.id === u.id
                            ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
                            : "bg-gray-50 hover:bg-gray-100 text-gray-800"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full ${
                              selectedUser?.id === u.id
                                ? "bg-white/20"
                                : u.role === "ADMIN"
                                ? "bg-gradient-to-br from-purple-400 to-purple-500"
                                : "bg-gradient-to-br from-teal-400 to-cyan-500"
                            } flex items-center justify-center text-white font-semibold`}
                          >
                            {userInitial}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold truncate">
                                {userName}
                              </p>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  selectedUser?.id === u.id
                                    ? "bg-white/20"
                                    : u.role === "ADMIN"
                                    ? "bg-purple-100 text-purple-700"
                                    : "bg-teal-100 text-teal-700"
                                }`}
                              >
                                {u.role}
                              </span>
                            </div>
                            <p
                              className={`text-sm truncate ${
                                selectedUser?.id === u.id
                                  ? "text-teal-100"
                                  : "text-gray-500"
                              }`}
                            >
                              {u.email}
                            </p>
                            {u.department && (
                              <p
                                className={`text-xs mt-1 ${
                                  selectedUser?.id === u.id
                                    ? "text-teal-100"
                                    : "text-gray-400"
                                }`}
                              >
                                📍 {u.department}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Permissions Panel */}
          <div className="lg:col-span-2">
            {!selectedUser ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <svg
                  className="w-24 h-24 mx-auto text-gray-300 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Select a User
                </h3>
                <p className="text-gray-600">
                  Choose a user from the list to manage their menu access and
                  permissions
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md">
                {/* Selected User Header */}
                <div className="border-b border-gray-200 p-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-16 h-16 rounded-full ${
                          selectedUser.role === "ADMIN"
                            ? "bg-gradient-to-br from-purple-400 to-purple-500"
                            : "bg-gradient-to-br from-teal-400 to-cyan-500"
                        } flex items-center justify-center text-white text-2xl font-bold shadow-md`}
                      >
                        {(
                          selectedUser.name ||
                          selectedUser.full_name ||
                          selectedUser.email ||
                          "U"
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-2xl font-bold text-gray-800">
                            {selectedUser.name ||
                              selectedUser.full_name ||
                              `${selectedUser.first_name || ""} ${
                                selectedUser.last_name || ""
                              }`.trim() ||
                              "Unknown User"}
                          </h2>
                          <span
                            className={`text-xs px-3 py-1 rounded-full font-semibold ${
                              selectedUser.role === "ADMIN"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-teal-100 text-teal-700"
                            }`}
                          >
                            {selectedUser.role}
                          </span>
                        </div>
                        <p className="text-gray-600">{selectedUser.email}</p>
                        {selectedUser.department && (
                          <p className="text-sm text-gray-500 mt-1">
                            📍 {selectedUser.department}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Enabled Menus</p>
                      <p className="text-3xl font-bold text-teal-600">
                        {getEnabledCount()}/{availableMenus.length}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Permissions List */}
                <div className="p-6">
                  {/* Select All/Deselect All */}
                  <div className="flex gap-3 mb-4">
                    <button
                      onClick={() => {
                        const updates = {};

                        const walk = (menus) => {
                          menus.forEach((m) => {
                            updates[m.id] = true;
                            if (m.children?.length) {
                              walk(m.children);
                            }
                          });
                        };

                        walk(availableMenus);
                        setUserPermissions(updates);
                      }}
                      className="flex-1 py-2 px-4 bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition-colors font-medium text-sm"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setUserPermissions({})}
                      className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                    >
                      Deselect All
                    </button>
                  </div>

                  {/* Menu List */}
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {availableMenus.map(menu => (
                      <MenuItem
                        key={menu.id}
                        menu={menu}
                      />
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <div className="border-t border-gray-200 p-6">
                  <button
                    onClick={handleSavePermissions}
                    disabled={saveLoading}
                    className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saveLoading ? (
                      <>
                        <svg
                          className="w-5 h-5 animate-spin"
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
                        Saving...
                      </>
                    ) : (
                      <>
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
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Save Permissions
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
