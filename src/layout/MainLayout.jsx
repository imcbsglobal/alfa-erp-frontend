// MainLayout.jsx
import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
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
      
      // Don't close if clicking on the toggle buttons themselves
      if (userMgmtButton && userMgmtButton.contains(e.target)) {
        return;
      }
      if (profileButton && profileButton.contains(e.target)) {
        return;
      }
      
      // Close user management menu if clicking outside sidebar
      if (sidebar && !sidebar.contains(e.target)) {
        setShowUserManagementMenu(false);
      }
      
      // Close profile menu if clicking outside profile area
      if (profileMenu && !profileMenu.contains(e.target)) {
        setShowProfileMenu(false);
      }
      if (masterButton && masterButton.contains(e.target)) {
        return;
      }

      // And close Master menu when clicking outside:
      if (sidebar && !sidebar.contains(e.target)) {
        setShowUserManagementMenu(false);
        setShowMasterMenu(false); // Add this line
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load permissions on mount and when location changes (to catch updates)
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

    // Add storage event listener to detect permission changes
    const handleStorageChange = (e) => {
      if (e.key === "userPermissions") {
        loadPermissions();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Also listen for custom event (for same-tab updates)
    window.addEventListener("permissionsUpdated", loadPermissions);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("permissionsUpdated", loadPermissions);
    };
  }, [user, location.pathname]); // Re-run when location changes

  // Check if user has admin privileges OR has User Management permission
  const hasUserManagementAccess = () => {
    // Super Admin and Admin always have access
    if (user?.role === "SUPER_ADMIN" || user?.role === "ADMIN") {
      return true;
    }
    // Regular users have access if they have the permission
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

  // Add Master submenu array after userManagementSubmenu:
  const masterSubmenu = [
    {
      label: "Job Title",
      icon: BriefcaseIcon, // You'll need to create or import this icon
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col relative`}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
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

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-visible">
          {/* Dashboard Menu Item */}
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={item.action}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                isActive(item.path)
                  ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
                  : "text-gray-700 hover:bg-gray-100"
              } ${!sidebarOpen && "justify-center"}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}

          {/* User Management Dropdown - Show if user has role-based or permission-based access */}
          {permissionsLoaded && hasUserManagementAccess() && (
            <div className="relative">
              <button
                type="button"
                data-user-mgmt-button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowUserManagementMenu(!showUserManagementMenu);
                  setShowMasterMenu(false);        // <-- ADD THIS
                  setShowProfileMenu(false);
                }}
                onMouseEnter={() => {
                  if (!sidebarOpen) {
                    setShowUserManagementMenu(true);
                    setShowMasterMenu(false);      // <-- ADD THIS
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                  isUserManagementActive()
                    ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"
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
                <div className="mt-1 space-y-1 pl-4">
                  {console.log("✅ Submenu is rendering! showUserManagementMenu:", showUserManagementMenu)}
                  {userManagementSubmenu.map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("Submenu item clicked, navigating to:", item.path);
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
                <div className="absolute -top-1 left-full ml-2 mt-1 bg-white border border-gray-200 shadow-xl rounded-lg py-2 min-w-[200px] z-50">
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
                          ? "bg-teal-50 text-teal-700 font-semibold"
                          : "text-gray-700 hover:bg-gray-50"
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

          {/* Master Dropdown - Show for admins and users with master permissions */}
            {permissionsLoaded && (user?.role === "SUPER_ADMIN" || user?.role === "ADMIN") && (
              <div className="relative">
                <button
                  type="button"
                  data-master-button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowMasterMenu(!showMasterMenu);
                    setShowUserManagementMenu(false);   // ENSURE ONLY ONE OPEN
                    setShowProfileMenu(false);
                  }}
                  onMouseEnter={() => {
                    if (!sidebarOpen) {
                      setShowMasterMenu(true);
                      setShowUserManagementMenu(false); // CLOSE OTHER MENU
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                    isMasterMenuActive()
                      ? "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md"
                      : "text-gray-700 hover:bg-gray-100"
                  } ${!sidebarOpen && "justify-center"}`}
                >
                  {/* Briefcase Icon - You can use any icon */}
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
                  <div className="mt-1 space-y-1 pl-4">
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
                  <div className="absolute -top-1 left-full ml-2 mt-1 bg-white border border-gray-200 shadow-xl rounded-lg py-2 min-w-[200px] z-50">
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
                          location.pathname.includes(item.path)
                            ? "bg-teal-50 text-teal-700 font-medium" 
                            : "text-gray-700 hover:bg-gray-50"
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

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden bg-gray-50">
        {/* Header with Profile */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              {getPageTitle()}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Welcome back, {user?.name || "User"}
            </p>
          </div>

          {/* Profile Section - Top Right */}
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

        {/* Page Content */}
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}