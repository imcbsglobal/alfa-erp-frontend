import { useState, useEffect, useMemo } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { ChevronDownIcon, LogoutIcon, MenuIcon } from "./Icons";
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
  PlusCircleIcon,
} from "./Icons";

// Import all lucide-react icons used in MENU_CONFIG
import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  Box,
  Truck,
  Clock,
  Users,
  UserCog,
  ListChecks,
  PlusCircle,
  AlertCircle,
  Briefcase,
  Building,
  Package,
  Layers,
  History,
  Send,
  Warehouse,
  Pill,
} from "lucide-react";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";

// Extended icon map with all icons from MENU_CONFIG
const iconMap = {
  // Custom icons
  HomeIcon: HomeIcon,
  UsersIcon: UsersIcon,
  CogIcon: CogIcon,
  BriefcaseIcon: BriefcaseIcon,
  BuildingIcon: BuildingIcon,
  InvoiceIcon: InvoiceIcon,
  ListIcon: ListIcon,
  PlusCircleIcon: PlusCircleIcon,
  
  // Lucide-react icons (matching MENU_CONFIG)
  LayoutDashboard: LayoutDashboard,
  FileText: FileText,
  ClipboardCheck: ClipboardCheck,
  Box: Box,
  Truck: Truck,
  Clock: Clock,
  Users: Users,
  UserCog: UserCog,
  ListChecks: ListChecks,
  PlusCircle: PlusCircle,
  AlertCircle: AlertCircle,
  Briefcase: Briefcase,
  Building: Building,
  Package: Package,
  Layers: Layers,
  History: History,
  Send: Send,
  Warehouse: Warehouse,
  Pill: Pill,
  
  // MUI icons
  TuneOutlinedIcon: TuneOutlinedIcon,
};


export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, menus = [], logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Set sidebar open by default on desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Build menus from backend data with proper icon mapping
  const visibleMenus = useMemo(() => {
    if (user?.role === "SUPERADMIN") {
      return MENU_CONFIG;
    }

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
        type: child.children?.length ? "nested-dropdown" : "single",
        submenu: child.children?.map(nestedChild => ({
          label: nestedChild.name,
          icon: iconMap[nestedChild.icon] || ListIcon,
          path: nestedChild.url,
        })) || [],
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
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
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
    <div
      className="h-screen bg-gray-50 flex overflow-hidden"
      style={{ position: "relative" }}
    >
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
        className="flex-1 bg-gray-50 transition-all duration-300 w-full"
        style={{
          marginLeft: window.innerWidth >= 1024
            ? (sidebarOpen ? "16rem" : "5rem")
            : 0,
          position: "relative",
        }}
      >
        <header
          className="h-14 sm:h-16 bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 shadow-sm"
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            left: window.innerWidth >= 1024 ? (sidebarOpen ? "16rem" : "5rem") : 0,
            zIndex: 30,
            transition: "left 0.3s",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle Menu"
            >
              <MenuIcon className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <div className="relative" data-profile-menu style={{ zIndex: 950 }}>
            <button
              data-profile-button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setOpenMenuId(null);
              }}
              className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg hover:bg-gray-50 transition-all"
            >
              <div className="text-right hidden sm:block">
                <p className="font-semibold text-gray-800 text-sm">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.role?.replace("_", " ").toLowerCase() || "User"}
                </p>
              </div>

              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-teal-100 overflow-hidden">
                {user?.profilePhoto ? (
                  <img src={user.profilePhoto} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm sm:text-base">{user?.name?.charAt(0).toUpperCase() || "U"}</span>
                )}
              </div>

              <ChevronDownIcon
                className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-600 transition-transform ${
                  showProfileMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 sm:w-64 bg-white border border-gray-200 shadow-xl rounded-lg py-2">
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

        <div className="pt-16 sm:pt-20 p-3 sm:p-6 h-full overflow-y-auto">
          <ToastProvider />
          <Outlet />
        </div>
      </main>
    </div>
  );
}