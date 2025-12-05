// MainLayout.jsx - Fixed Layout Version
import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import ToastProvider from "../components/ToastProvider";
import toast, { Toaster } from "react-hot-toast";

import { 
  HomeIcon, 
  UsersIcon, 
  UserPlusIcon, 
  CogIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  LogoutIcon,
  BriefcaseIcon,
  UserCircleIcon,
  SettingsIcon,
  UserManagementIcon,
  MasterIcon,
} from "./Icons";

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUserManagementMenu, setShowUserManagementMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userPermissions, setUserPermissions] = useState({});
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [showMasterMenu, setShowMasterMenu] = useState(false);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      const sidebar = document.querySelector('aside');
      const profileMenu = document.querySelector('[data-profile-menu]');
      const userMgmtButton = document.querySelector('[data-user-mgmt-button]');
      const profileButton = document.querySelector('[data-profile-button]');
      const masterButton = document.querySelector('[data-master-button]');
      
      if (userMgmtButton && userMgmtButton.contains(e.target)) {
        return;
      }
      if (profileButton && profileButton.contains(e.target)) {
        return;
      }
      
      if (sidebar && !sidebar.contains(e.target)) {
        setShowUserManagementMenu(false);
      }
      
      if (profileMenu && !profileMenu.contains(e.target)) {
        setShowProfileMenu(false);
      }
      if (masterButton && masterButton.contains(e.target)) {
        return;
      }

      if (sidebar && !sidebar.contains(e.target)) {
        setShowUserManagementMenu(false);
        setShowMasterMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load permissions on mount and when location changes
  useEffect(() => {
    const loadPermissions = () => {
      if (user?.email) {
        const storedPermissions = JSON.parse(localStorage.getItem("userPermissions")) || {};
        const currentUserPermissions = storedPermissions[user.email] || {};
        setUserPermissions(currentUserPermissions);
        setPermissionsLoaded(true);
        
        console.log("Permissions loaded for:", user.email);
        console.log("User Management Access:", !!currentUserPermissions["user-management"]);
      }
    };

    loadPermissions();

    const handleStorageChange = (e) => {
      if (e.key === "userPermissions") {
        loadPermissions();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("permissionsUpdated", loadPermissions);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("permissionsUpdated", loadPermissions);
    };
  }, [user, location.pathname]);

  const hasUserManagementAccess = () => {
    if (user?.role === "SUPERADMIN" || user?.role === "ADMIN") {
      return true;
    }
    return userPermissions["user-management"]?.view === true;
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;
  
  const isUserManagementActive = () => {
    return ["/user-management", "/user-control"].includes(location.pathname);
  };

  const isMasterMenuActive = () => {
    return location.pathname.includes("/master/");
  };

  const closeAllMenus = () => {
    setShowUserManagementMenu(false);
    setShowProfileMenu(false);
  };

  const menuItems = [
    {
      label: "Dashboard",
      icon: HomeIcon,
      path: "/dashboard",
      action: () => {
        navigate("/dashboard");
        closeAllMenus();
      }
    }
  ];

  const userManagementSubmenu = [
    {
      label: "User List",
      icon: UsersIcon,
      path: "/user-management"
    },
    {
      label: "User Control",
      icon: CogIcon,
      path: "/user-control"
    }
  ];

  const masterSubmenu = [
    {
      label: "Job Title",
      icon: BriefcaseIcon,
      path: "/master/job-title"
    }
  ];

  const getPageTitle = () => {
    if (location.pathname === "/dashboard") return "Dashboard";
    if (location.pathname === "/user-management") return "User Management";
    if (location.pathname === "/add-user") return "Add User";
    if (location.pathname === "/user-control") return "User Control";
    if (location.pathname === "/master/job-title") return "Job Titles";
    if (location.pathname === "/master/job-title/add") return "Add Job Title";
    if (location.pathname.includes("/super-admin/")) return "Dashboard";
    if (location.pathname.includes("/admin/")) return "Dashboard";
    if (location.pathname.includes("/user/")) return "Dashboard";
    return "Dashboard";
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <ToastProvider />
      {/* Fixed Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col fixed left-0 top-0 h-full z-[9999]`}
        style={{ overflow: "visible" }}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-bold shadow-sm">
                AA
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-gray-800 text-base leading-tight">Alfa Agencies</span>
                <span className="text-xs text-gray-500">Admin Panel</span>
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-bold mx-auto shadow-sm">
              AA
            </div>
          )}
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 py-4 px-3 space-y-1" style={{ overflowY: 'auto', overflowX: 'visible' }}>
          {/* Dashboard Menu Item */}
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={item.action}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                isActive(item.path)
                  ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
                  : "text-gray-700 hover:bg-teal-50 hover:text-teal-700 hover:border-l-4 hover:border-teal-500"
              } ${!sidebarOpen && "justify-center"}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}

          {/* User Management Dropdown */}
          {permissionsLoaded && hasUserManagementAccess() && (
            <div className="relative" style={{ overflow: 'visible' }}>
              <button
                type="button"
                data-user-mgmt-button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowUserManagementMenu(!showUserManagementMenu);
                  setShowMasterMenu(false);
                  setShowProfileMenu(false);
                }}
                onMouseEnter={() => {
                  if (!sidebarOpen) {
                    setShowUserManagementMenu(true);
                    setShowMasterMenu(false);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                  isUserManagementActive()
                    ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-teal-50 hover:text-teal-700 hover:border-l-4 hover:border-teal-500"
                } ${!sidebarOpen && "justify-center"}`}
              >
                <UsersIcon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="font-medium flex-1 text-left">User Management</span>
                    <ChevronDownIcon 
                      className={`w-4 h-4 transition-transform duration-200 ${
                        showUserManagementMenu ? "rotate-180" : ""
                      }`} 
                    />
                  </>
                )}
              </button>

              {/* Submenu - Expanded Sidebar */}
              {sidebarOpen && showUserManagementMenu && (
                <div className="mt-1 space-y-1 pl-4" style={{ position: 'relative', zIndex: 60 }}>
                  {userManagementSubmenu.map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(item.path);
                        setShowUserManagementMenu(false);
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sm transition-all ${
                        isActive(item.path) 
                          ? "bg-teal-50 text-teal-700 font-medium shadow-sm" 
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Submenu - Collapsed Sidebar (Flyout) */}
              {!sidebarOpen && showUserManagementMenu && (
                <div className="absolute -top-1 left-full ml-2 mt-1 bg-white border border-gray-200 shadow-xl rounded-lg py-2 min-w-[200px] z-[9999]">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      User Management
                    </p>
                  </div>
                  {userManagementSubmenu.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path);
                        setShowUserManagementMenu(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-2.5 w-full text-sm transition-all ${
                        isActive(item.path)
                          ? "bg-teal-100 text-teal-700 font-semibold border-l-4 border-teal-500"
                          : "text-gray-700 hover:bg-teal-50 hover:text-teal-700 hover:border-l-4 hover:border-teal-500"
                      }`}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Master Dropdown */}
          {permissionsLoaded && (user?.role === "SUPERADMIN" || user?.role === "ADMIN") && (
            <div className="relative" style={{ overflow: 'visible' }}>
              <button
                type="button"
                data-master-button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowMasterMenu(!showMasterMenu);
                  setShowUserManagementMenu(false);
                  setShowProfileMenu(false);
                }}
                onMouseEnter={() => {
                  if (!sidebarOpen) {
                    setShowMasterMenu(true);
                    setShowUserManagementMenu(false);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                  isMasterMenuActive()
                    ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-teal-50 hover:text-teal-700 hover:border-l-4 hover:border-teal-500"
                } ${!sidebarOpen && "justify-center"}`}
              >
                <TuneOutlinedIcon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="font-medium flex-1 text-left">Master</span>
                    <ChevronDownIcon 
                      className={`w-4 h-4 transition-transform duration-200 ${
                        showMasterMenu ? "rotate-180" : ""
                      }`} 
                    />
                  </>
                )}
              </button>

              {/* Submenu - Expanded Sidebar */}
              {sidebarOpen && showMasterMenu && (
                <div className="mt-1 space-y-1 pl-4" style={{ position: 'relative', zIndex: 60 }}>
                  {masterSubmenu.map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate(item.path);
                        setShowMasterMenu(false);
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sm transition-all ${
                        location.pathname.includes(item.path)
                          ? "bg-teal-50 text-teal-700 font-medium shadow-sm" 
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Submenu - Collapsed Sidebar (Flyout) */}
              {!sidebarOpen && showMasterMenu && (
                <div className="absolute -top-1 left-full ml-2 mt-1 bg-white border border-gray-200 shadow-xl rounded-lg py-2 min-w-[200px] z-[9999]">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Master
                    </p>
                  </div>
                  {masterSubmenu.map((item) => (
                    <button
                      key={item.path}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(item.path);
                        setShowMasterMenu(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-2.5 w-full text-sm transition-all ${
                        isActive(item.path)
                          ? "bg-teal-100 text-teal-700 font-semibold border-l-4 border-teal-500"
                          : "text-gray-700 hover:bg-teal-50 hover:text-teal-700 hover:border-l-4 hover:border-teal-500"
                      }`}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md hover:shadow-lg hover:border-teal-300 transition-all z-10 group"
          aria-label="Toggle Sidebar"
        >
          <ChevronLeftIcon 
            className={`w-4 h-4 text-gray-600 group-hover:text-teal-600 transition-all ${
              !sidebarOpen && "rotate-180"
            }`} 
          />
        </button>
      </aside>

      {/* Main Content Area with proper margin */}
      <main 
        className={`flex-1 overflow-x-hidden bg-gray-50 transition-all duration-300 ${
          sidebarOpen ? "ml-64" : "ml-20"
        }`}
      >
        {/* Fixed Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm fixed top-0 right-0 z-40 transition-all duration-300"
          style={{
            left: sidebarOpen ? '16rem' : '5rem'
          }}
        >
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              {getPageTitle()}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Welcome back, {user?.name || "User"}
            </p>
          </div>

          {/* Profile Section */}
          <div className="relative" data-profile-menu>
            <button
              data-profile-button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowUserManagementMenu(false);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-all"
            >
              <div className="text-right hidden sm:block">
                <p className="font-semibold text-gray-800 text-sm">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.role?.replace("_", " ").toLowerCase() || "User"}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-teal-100 overflow-hidden">
                {user?.profilePhoto ? (
                  <img 
                    src={user.profilePhoto} 
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user?.name?.charAt(0).toUpperCase() || "U"
                )}
              </div>
              <ChevronDownIcon 
                className={`w-4 h-4 text-gray-600 transition-transform ${
                  showProfileMenu ? "rotate-180" : ""
                }`} 
              />
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 shadow-xl rounded-lg py-2 z-50">
                {/* User Info Section */}
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold shadow-md overflow-hidden">
                      {user?.profilePhoto ? (
                        <img 
                          src={user.profilePhoto} 
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        user?.name?.charAt(0).toUpperCase() || "U"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">
                        {user?.name || "User"}
                      </p>
                      <p className="text-xs text-gray-500 truncate capitalize">
                        {user?.role?.replace("_", " ").toLowerCase() || "User"}
                      </p>
                      <p className="text-xs text-teal-600 mt-0.5">
                        Alfa Agencies
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Logout */}
                <div className="py-1">
                  <button 
                    onClick={handleLogout} 
                    className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
                  >
                    <LogoutIcon className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="pt-16 p-6 h-full overflow-y-auto">
          <Outlet />
        </div>
      </main>
      
      <Toaster position="top-right" reverseOrder={false} />
    </div>
  );
}