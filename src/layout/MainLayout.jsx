import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { ChevronDownIcon, LogoutIcon } from "./Icons";
import { Sidebar } from "./Sidebar/Sidebar";
import { MENU_CONFIG, PAGE_TITLES } from "./Sidebar/menuConfig";
import ToastProvider from "../components/ToastProvider";

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [userPermissions, setUserPermissions] = useState({});
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      const sidebar = document.querySelector('aside');
      const profileMenu = document.querySelector('[data-profile-menu]');
      const profileButton = document.querySelector('[data-profile-button]');
      
      if (profileButton && profileButton.contains(e.target)) {
        return;
      }
      
      if (sidebar && !sidebar.contains(e.target)) {
        setOpenMenuId(null);
      }
      
      if (profileMenu && !profileMenu.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load permissions
  useEffect(() => {
    const loadPermissions = () => {
      if (user?.email) {
        const storedPermissions = JSON.parse(localStorage.getItem("userPermissions")) || {};
        const currentUserPermissions = storedPermissions[user.email] || {};
        setUserPermissions(currentUserPermissions);
        setPermissionsLoaded(true);
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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleNavigate = (path) => {
    navigate(path);
    setOpenMenuId(null);
  };

  const handleToggleMenu = (menuId) => {
    setOpenMenuId(menuId);
    setShowProfileMenu(false);
  };

  const getPageTitle = () => {
    // Check for exact match
    if (PAGE_TITLES[location.pathname]) {
      return PAGE_TITLES[location.pathname];
    }
    
    // Check for partial matches
    if (location.pathname.includes("/invoice/edit")) return "Edit Invoice";
    if (location.pathname.includes("/invoice/view")) return "View Invoice";
    
    return "Dashboard";
  };

  // Filter menus based on permissions
  const visibleMenus = MENU_CONFIG.filter(menu => {
    if (!menu.hasAccess) return true;
    return menu.hasAccess(user, userPermissions);
  });

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden" style={{ position: 'relative', isolation: 'isolate' }}>
      {/* Sidebar Component */}
      <Sidebar 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        openMenuId={openMenuId}
        onToggleMenu={handleToggleMenu}
        onNavigate={handleNavigate}
        visibleMenus={visibleMenus}
        permissionsLoaded={permissionsLoaded}
      />

      {/* Main Content Area */}
      <main 
        className={`flex-1 bg-gray-50 transition-all duration-300`}
        style={{
          marginLeft: sidebarOpen ? '16rem' : '5rem',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Fixed Header */}
        <header 
          className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm"
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            left: sidebarOpen ? '16rem' : '5rem',
            zIndex: 900,
            transition: 'left 0.3s'
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
          <div className="relative" data-profile-menu style={{ zIndex: 950 }}>
            <button
              data-profile-button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setOpenMenuId(null);
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
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 shadow-xl rounded-lg py-2" style={{ zIndex: 1100 }}>
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
        <div className="pt-16 p-6 h-full overflow-y-auto" style={{ position: 'relative', zIndex: 1 }}>
          <ToastProvider />
          <Outlet />
        </div>
      </main>
    </div>
  );
}