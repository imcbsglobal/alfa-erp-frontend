import { useState, useEffect } from "react";
import * as LucideIcons from "lucide-react";
import { X } from "lucide-react";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import {
  getUsersApi,
  getAllMenusApi,
  getUserMenusApi,
  assignMenusApi,
} from "../../../services/accessControl";
import toast from "react-hot-toast";
import { MENU_CONFIG } from "../../../layout/Sidebar/menuConfig";
import Pagination from "../../../components/Pagination";

// Function to get icon component from menu config
const getIconFromConfig = (menu) => {
  const menuId = menu.id;
  const menuCode = menu.code;
  const menuName = menu.name;
  
  // First, try to find by menu ID or code in MENU_CONFIG (including submenus)
  const findMenuConfig = (menus, id, code, name) => {
    for (const menuItem of menus) {
      // Check if this menu matches by id, code, or name (case insensitive)
      if (menuItem.id === id || 
          menuItem.code === id || 
          menuItem.id === code || 
          menuItem.code === code ||
          menuItem.label?.toLowerCase() === name?.toLowerCase()) {
        return menuItem;
      }
      // Check submenu items
      if (menuItem.submenu && menuItem.submenu.length > 0) {
        const found = findMenuConfig(menuItem.submenu, id, code, name);
        if (found) return found;
      }
    }
    return null;
  };

  const menuConfig = findMenuConfig(MENU_CONFIG, menuId, menuCode, menuName);
  
  if (menuConfig?.icon) {
    // If icon is a React component (from lucide-react)
    if (typeof menuConfig.icon === 'function' || typeof menuConfig.icon === 'object') {
      const IconComponent = menuConfig.icon;
      return <IconComponent className="w-4 h-4" />;
    }
    // If icon is a string (icon name from lucide-react)
    if (typeof menuConfig.icon === 'string') {
      const IconComponent = LucideIcons[menuConfig.icon];
      if (IconComponent) {
        return <IconComponent className="w-4 h-4" />;
      }
    }
  }

  // Fallback: try to match by code name or menu name with icon mappings from MENU_CONFIG
  const iconNameMap = {
    // Main menus
    dashboard: "LayoutDashboard",
    billing: "FileText",
    invoice: "FileText",
    invoices: "ClipboardCheck",
    picking: "ClipboardCheck",
    packing: "Box",
    delivery: "Truck",
    history: "Clock",
    user_management: "Users",
    "user-management": "Users",
    master: "Settings",
    
    // Invoice submenus
    invoice_list: "ListChecks",
    "invoice list": "ListChecks",
    reviewed_bills: "AlertCircle",
    "reviewed bills": "AlertCircle",
    
    // Picking submenus
    picking_list: "ClipboardCheck",
    "picking list": "ClipboardCheck",
    my_picking: "PlusCircle",
    "my assigned picking": "PlusCircle",
    
    // Packing submenus
    packing_list: "Box",
    "packing list": "Box",
    my_packing: "PlusCircle",
    "my assigned packing": "PlusCircle",
    
    // Delivery submenus
    dispatch: "Truck",
    "dispatch orders": "Truck",
    courier_list: "Package",
    "courier list": "Package",
    company_list: "Warehouse",
    "company delivery list": "Warehouse",
    my_delivery: "PlusCircle",
    "my assigned delivery": "PlusCircle",
    
    // History submenus
    history_list: "History",
    consolidate: "Layers",
    
    // User Management submenus
    user_list: "Users",
    "user list": "Users",
    user_control: "UserCog",
    "user control": "UserCog",
    
    // Master submenus
    job_title: "Briefcase",
    "job title": "Briefcase",
    department: "Building",
    courier: "Send",
  };

  const iconName = iconNameMap[menuCode?.toLowerCase()] || 
                   iconNameMap[menuId?.toLowerCase()] || 
                   iconNameMap[menuName?.toLowerCase()] ||
                   "Settings";
  const IconComponent = LucideIcons[iconName];
  
  if (IconComponent) {
    return <IconComponent className="w-4 h-4" />;
  }

  // Final fallback
  const DefaultIcon = LucideIcons.Settings;
  return <DefaultIcon className="w-4 h-4" />;
};

export default function UserControlPage() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [availableMenus, setAvailableMenus] = useState([]);
  const [userPermissions, setUserPermissions] = useState({});
  const [expandedMenus, setExpandedMenus] = useState({});
  const [showMobileUserList, setShowMobileUserList] = useState(true);
  const USERS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getUsersApi();
      const allUsers = res.data?.data?.results || [];

      // ❌ Hide Superadmin + Store users (Picker, Packer, Delivery, Billing)
      const filtered = allUsers.filter(
        (u) =>
          u.role !== "SUPERADMIN" &&
          !["PICKER", "PACKER", "DELIVERY", "BILLING"].includes(
            u.role?.toUpperCase()
          ) &&
          !["PICKER", "PACKER", "DELIVERY", "BILLING"].includes(
            u.job_title_name?.toUpperCase()
          )
      );

      const sorted = filtered.sort((a, b) => {
        const nameA = (a.name || a.full_name || "").toLowerCase();
        const nameB = (b.name || b.full_name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setUsers(sorted);

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

  // Get unique job roles for filter
  const uniqueRoles = ["ALL", ...new Set(users.map(u => u.job_title_name).filter(Boolean))];

  const filteredUsers = users.filter((u) => {
    const name =
      u.name ||
      u.full_name ||
      `${u.first_name || ""} ${u.last_name || ""}`.trim();

    const email = u.email || "";
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch =
      name.toLowerCase().includes(searchLower) ||
      email.toLowerCase().includes(searchLower);

    const matchesRole =
      roleFilter === "ALL" || u.job_title_name === roleFilter;

    return matchesSearch && matchesRole;
  });

  const indexOfLastUser = currentPage * USERS_PER_PAGE;
  const indexOfFirstUser = indexOfLastUser - USERS_PER_PAGE;

  const paginatedUsers = filteredUsers.slice(
    indexOfFirstUser,
    indexOfLastUser
  );

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setShowMobileUserList(false);
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

  useEffect(() => {
    setExpandedMenus({});
  }, [availableMenus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

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
            {getIconFromConfig(menu)}
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
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-2 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile back button - only show on mobile when user is selected */}
          {selectedUser && (
            <button
              onClick={() => {
                setShowMobileUserList(true);
                setSelectedUser(null);
              }}
              className="lg:hidden p-1 hover:bg-gray-100 rounded"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className="text-lg sm:text-xl font-bold text-gray-800">User Access Control</h1>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* User List Sidebar */}
        <div className={`${
          showMobileUserList ? 'block' : 'hidden'
        } lg:block w-full lg:w-80 bg-white border-r border-gray-200 flex flex-col h-full max-h-screen`}>
          <div className="p-3 sm:p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Users</h2>
              <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
                {filteredUsers.length}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <svg
                  className="absolute left-2.5 top-2 h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full pl-3 pr-8 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-teal-500 focus:outline-none appearance-none bg-white"
                >
                  {uniqueRoles.map(role => (
                    <option key={role} value={role}>
                      {role === "ALL" ? "All Job Roles" : role}
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute right-2.5 top-2 h-4 w-4 text-gray-400 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
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
              paginatedUsers.map((u) => {
                const userInitial = (u.name || u.full_name || u.email || "U").charAt(0).toUpperCase();
                const isSelected = selectedUser?.id === u.id;

                return (
                  <button
                    key={u.id}
                    onClick={() => handleUserSelect(u)}
                    className={`w-full text-left px-3 sm:px-4 py-2.5 border-b border-gray-100 transition-colors ${
                      isSelected
                        ? "bg-teal-50 border-l-4 border-l-teal-600"
                        : "hover:bg-gray-50 border-l-4 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex-shrink-0 ${
                          u.role === "ADMIN"
                            ? "bg-purple-500"
                            : "bg-teal-500"
                        } flex items-center justify-center text-white font-semibold text-xs sm:text-sm`}
                      >
                        {userInitial}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm truncate text-gray-800 uppercase">
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
                        <p className="text-[11px] text-gray-400 truncate">
                          {u.job_title_name || "No Job Title"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredUsers.length}
            itemsPerPage={USERS_PER_PAGE}
            onPageChange={setCurrentPage}
            label="users"
            colorScheme="teal"
          />
        </div>

        {/* Permissions Panel */}
        <div className={`${
          !showMobileUserList ? 'block' : 'hidden'
        } lg:block flex-1 flex flex-col bg-white`}>
          {!selectedUser ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <svg className="w-12 sm:w-16 h-12 sm:h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-1">Select a User</h3>
                <p className="text-sm text-gray-500">Choose a user to manage permissions</p>
              </div>
            </div>
          ) : (
            <>
              <div className="border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-2 bg-gray-50 flex-shrink-0">
                <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-sm sm:text-base font-bold text-gray-800 uppercase">
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
                      <p className="text-xs sm:text-sm text-gray-600">{selectedUser.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
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
                      className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 rounded hover:bg-teal-100 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setUserPermissions({})}
                      className="flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {availableMenus.map(menu => (
                  <MenuItem key={menu.id} menu={menu} />
                ))}
              </div>

              <div className="border-t border-gray-200 px-3 sm:px-6 py-3 sm:py-2 bg-gray-50 flex-shrink-0">
                <button
                  onClick={handleSavePermissions}
                  disabled={saveLoading}
                  className="w-full py-2.5 sm:py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-md hover:bg-teal-700 transition-colors font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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