import { useState, useEffect, useMemo } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { ChevronDownIcon, LogoutIcon } from "./Icons";
import { Sidebar } from "./Sidebar/Sidebar";
import ToastProvider from "../components/ToastProvider";
import { MENU_CONFIG, PAGE_TITLES } from "./Sidebar/menuConfig";

import {
  HomeIcon,
  UsersIcon,
  CogIcon,
  BriefcaseIcon,
  BuildingIcon,
  InvoiceIcon,
  ListIcon,
} from "./Icons";

const iconMap = {
  dashboard: HomeIcon,
  people: UsersIcon,
  settings: CogIcon,
  work: BriefcaseIcon,
  business: BuildingIcon,
  receipt: InvoiceIcon,
  list_alt: ListIcon,
  tune: CogIcon,
  local_shipping: InvoiceIcon,
  payment: InvoiceIcon,
  assessment: ListIcon,
};

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, menus = [], logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // ✅ SAFELY BUILD MENUS FROM BACKEND DATA
  const visibleMenus = useMemo(() => {
    // SUPERADMIN → static full menu
    if (user?.role === "SUPERADMIN") {
      return MENU_CONFIG;
    }

    // Others → backend-assigned menus
    return menus.map(menu => ({
      id: menu.code,
      label: menu.name,
      icon: iconMap[menu.icon] || ListIcon,
      path: menu.url,
      type: menu.children?.length ? "dropdown" : "single",
      submenu: menu.children?.map(child => ({
        label: child.name,
        icon: iconMap[child.icon] || ListIcon,
        path: child.url,
      })) || [],
    }));
  }, [user, menus]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      const sidebar = document.querySelector("aside");
      const profileMenu = document.querySelector("[data-profile-menu]");
      const profileButton = document.querySelector("[data-profile-button]");

      if (profileButton && profileButton.contains(e.target)) return;
      if (sidebar && !sidebar.contains(e.target)) setOpenMenuId(null);
      if (profileMenu && !profileMenu.contains(e.target)) setShowProfileMenu(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    if (PAGE_TITLES[location.pathname]) return PAGE_TITLES[location.pathname];
    if (location.pathname.includes("/invoice/edit")) return "Edit Invoice";
    if (location.pathname.includes("/invoices/view")) return "View Invoice";
    return "Dashboard";
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden" style={{ position: "relative", isolation: "isolate" }}>
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        openMenuId={openMenuId}
        onToggleMenu={handleToggleMenu}
        onNavigate={handleNavigate}
        visibleMenus={visibleMenus}
        permissionsLoaded={true}
      />

      <main
        className="flex-1 bg-gray-50 transition-all duration-300"
        style={{
          marginLeft: sidebarOpen ? "16rem" : "5rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        <header
          className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm"
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            left: sidebarOpen ? "16rem" : "5rem",
            zIndex: 900,
            transition: "left 0.3s",
          }}
        >
          <div>
            <h1 className="text-xl font-bold text-gray-800">{getPageTitle()}</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Welcome back, {user?.name || "User"}
            </p>
          </div>

          {/* Profile */}
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
                  <img src={user.profilePhoto} alt={user.name} className="w-full h-full object-cover" />
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

            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 shadow-xl rounded-lg py-2">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="font-semibold text-gray-800 text-sm">{user?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                >
                  <LogoutIcon className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="pt-16 p-6 h-full overflow-y-auto">
          <ToastProvider />
          <Outlet />
        </div>
      </main>
    </div>
  );
}
