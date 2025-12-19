import { useState, useEffect } from "react";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import {
  getUsersApi,
  getAllMenusApi,
  getUserMenusApi,
  assignMenusApi,
} from "../../../services/accessControl";
import toast from "react-hot-toast";

// Icon components
const HomeIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const UsersIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const CogIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const BriefcaseIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const BuildingIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const FileTextIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ListIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

const permissionIcons = {
  dashboard: <HomeIcon className="w-4 h-4" />,
  users: <UsersIcon className="w-4 h-4" />,
  user_management: <UsersIcon className="w-4 h-4" />,
  user_list: <UsersIcon className="w-4 h-4" />,
  user_control: <CogIcon className="w-4 h-4" />,
  invoice: <FileTextIcon className="w-4 h-4" />,
  invoice_list: <ListIcon className="w-4 h-4" />,
  master: <TuneOutlinedIcon className="w-4 h-4" />,
  job_title: <BriefcaseIcon className="w-4 h-4" />,
  department: <BuildingIcon className="w-4 h-4" />,
  default: <CogIcon className="w-4 h-4" />,
};

export default function UserControlPage() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [availableMenus, setAvailableMenus] = useState([]);
  const [userPermissions, setUserPermissions] = useState({});
  const [expandedMenus, setExpandedMenus] = useState({});

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

  const fetchAllMenus = async () => {
    try {
      const res = await getAllMenusApi();
      setAvailableMenus(res.data.data.menus || []);
    } catch (err) {
      console.error("Failed to fetch menus", err);
      setAvailableMenus([]);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAllMenus();
  }, []);

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

  // Keep all menus collapsed by default
  useEffect(() => {
    setExpandedMenus({});
  }, [availableMenus]);

  const handleSavePermissions = async () => {
    if (!selectedUser) return;

    setSaveLoading(true);
    try {
      const menu_ids = Object.keys(userPermissions).filter(
        id => userPermissions[id] === true
      );

      await assignMenusApi({
        user_id: selectedUser.id,
        menu_ids,
      });

      toast.success("Permissions updated successfully");
      await new Promise((resolve) => setTimeout(resolve, 500));
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
    const name = u.name || u.full_name || `${u.first_name || ""} ${u.last_name || ""}`.trim();
    const email = u.email || "";
    const searchLower = searchTerm.toLowerCase();
    return name.toLowerCase().includes(searchLower) || email.toLowerCase().includes(searchLower);
  });

  const MenuItem = ({ menu, level = 0 }) => {
    const enabled = !!userPermissions[menu.id];
    const hasChildren = menu.children?.length > 0;
    const isExpanded = expandedMenus[menu.id];

    return (
      <div className="border-b border-gray-100 last:border-0">
        <div
          style={{ paddingLeft: level * 24 + 12 }}
          className={`flex items-center gap-2 py-1.5 pr-3 hover:bg-gray-50 transition-colors ${
            enabled ? "bg-teal-50/50" : ""
          }`}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(menu.id)}
              className="p-0.5 hover:bg-gray-200 rounded transition-colors"
            >
              <svg
                className={`w-3.5 h-3.5 text-gray-500 transition-transform ${
                  isExpanded ? "rotate-90" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="w-4" />
          )}

          <div className={`${enabled ? "text-teal-600" : "text-gray-400"}`}>
            {permissionIcons[menu.code] || permissionIcons.default}
          </div>

          <button
            onClick={() => togglePermission(menu.id)}
            className="flex-1 flex items-center justify-between min-w-0"
          >
            <span className="text-sm font-medium text-gray-700 truncate">{menu.name}</span>
            
            <div className="flex-shrink-0 ml-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => {}}
                className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
              />
            </div>
          </button>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {menu.children.map((child) => (
              <MenuItem key={child.id} menu={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-2 flex-shrink-0">
        <h1 className="text-xl font-bold text-gray-800">User Access Control</h1>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Compact User List - Fixed Width Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Users</h2>
              <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                {filteredUsers.length}
              </span>
            </div>
            
            {/* Compact Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
              <svg
                className="absolute left-2.5 top-2 h-4 w-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* User List */}
          <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <svg className="w-8 h-8 animate-spin text-teal-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p className="text-gray-500 font-medium text-sm">No users found</p>
              </div>
            ) : (
              filteredUsers.map((u) => {
                const userInitial = (u.name || u.full_name || u.email || "U").charAt(0).toUpperCase();
                const isSelected = selectedUser?.id === u.id;

                return (
                  <button
                    key={u.id}
                    onClick={() => handleUserSelect(u)}
                    className={`w-full text-left px-4 py-2.5 border-b border-gray-100 transition-colors ${
                      isSelected
                        ? "bg-teal-50 border-l-4 border-l-teal-600"
                        : "hover:bg-gray-50 border-l-4 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex-shrink-0 ${
                          u.role === "ADMIN"
                            ? "bg-purple-500"
                            : "bg-teal-500"
                        } flex items-center justify-center text-white font-semibold text-xs`}
                      >
                        {userInitial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate text-gray-800">
                            {u.name || u.full_name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Unknown User"}
                          </p>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              u.role === "ADMIN"
                                ? "bg-purple-100 text-purple-700"
                                : u.role === "PICKER"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {u.role}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Permissions Panel */}
        <div className="flex-1 flex flex-col bg-white">
          {!selectedUser ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Select a User</h3>
                <p className="text-sm text-gray-500">Choose a user to manage permissions</p>
              </div>
            </div>
          ) : (
            <>
              {/* Selected User Header - Compact */}
              <div className="border-b border-gray-200 px-6 py-2 bg-gray-50 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex-shrink-0 ${
                        selectedUser.role === "ADMIN"
                          ? "bg-purple-500"
                          : "bg-teal-500"
                      } flex items-center justify-center text-white text-lg font-bold`}
                    >
                      {(selectedUser.name || selectedUser.full_name || selectedUser.email || "U").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-gray-800">
                          {selectedUser.name || selectedUser.full_name || `${selectedUser.first_name || ""} ${selectedUser.last_name || ""}`.trim() || "Unknown User"}
                        </h2>
                        <span
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            selectedUser.role === "ADMIN"
                              ? "bg-purple-100 text-purple-700"
                              : selectedUser.role === "PICKER"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {selectedUser.role}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{selectedUser.email}</p>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const updates = {};
                        const walk = (menus) => {
                          menus.forEach((m) => {
                            updates[m.id] = true;
                            if (m.children?.length) walk(m.children);
                          });
                        };
                        walk(availableMenus);
                        setUserPermissions(updates);
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 rounded hover:bg-teal-100 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setUserPermissions({})}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>

              {/* Permissions List - Compact Table Style */}
              <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
                {availableMenus.map(menu => (
                  <MenuItem key={menu.id} menu={menu} />
                ))}
              </div>

              {/* Save Button - Fixed at Bottom */}
              <div className="border-t border-gray-200 px-6 py-2 bg-gray-50 flex-shrink-0">
                <button
                  onClick={handleSavePermissions}
                  disabled={saveLoading}
                  className="w-full py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-md hover:bg-teal-700 transition-colors font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saveLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Permissions
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}