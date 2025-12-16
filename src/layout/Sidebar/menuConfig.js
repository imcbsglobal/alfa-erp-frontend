import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import { 
  HomeIcon, 
  UsersIcon, 
  CogIcon,
  BriefcaseIcon,
  BuildingIcon,
  InvoiceIcon,
  ListIcon,
  PlusCircleIcon,
} from "../Icons";

export const MENU_CONFIG = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: HomeIcon,
    path: "/dashboard",
    type: "single", // single menu item (no submenu)
  },
  {
    id: "history",
    label: "History",
    icon: ListIcon,
    type: "single",
    path: "/history",
    hasAccess: (user) => ["SUPERADMIN", "ADMIN", "STORE", "USER"].includes(user?.role),
  },
  {
    id: "invoice",
    label: "Invoice",
    icon: InvoiceIcon,
    type: "dropdown", // dropdown with submenu
    submenu: [
      {
        label: "Invoice List",
        icon: ListIcon,
        path: "/invoices",
      },
    ],
    // Check if any submenu path matches current location
    isActive: (pathname) => pathname.includes("/invoices"),
  },
  {
    id: "user-management",
    label: "User Management",
    icon: UsersIcon,
    type: "dropdown",
    // Permission check - return true to show menu
    hasAccess: (user, permissions) => {
      if (user?.role === "SUPERADMIN" || user?.role === "ADMIN") {
        return true;
      }
      return permissions["user-management"]?.view === true;
    },
    submenu: [
      {
        label: "User List",
        icon: UsersIcon,
        path: "/user-management",
      },
      {
        label: "User Control",
        icon: CogIcon,
        path: "/user-control",
      },
    ],
    isActive: (pathname) => ["/user-management", "/user-control"].includes(pathname),
  },
  {
    id: "master",
    label: "Master",
    icon: TuneOutlinedIcon,
    type: "dropdown",
    hasAccess: (user) => user?.role === "SUPERADMIN" || user?.role === "ADMIN",
    submenu: [
      {
        label: "Job Title",
        icon: BriefcaseIcon,
        path: "/master/job-title",
      },
      {
        label: "Department",
        icon: BuildingIcon,
        path: "/master/department",
      },
    ],
    isActive: (pathname) => pathname.includes("/master/"),
  },
  
  // ============================================================
  // ADD YOUR NEW MENUS HERE - Examples:
  // ============================================================
  
  // Example 1: Single menu item
  // {
  //   id: "settings",
  //   label: "Settings",
  //   icon: SettingsIcon,
  //   path: "/settings",
  //   type: "single",
  // },
  
  // Example 2: Dropdown with submenu
  // {
  //   id: "reports",
  //   label: "Reports",
  //   icon: ReportIcon,
  //   type: "dropdown",
  //   submenu: [
  //     { label: "Sales Report", icon: ChartIcon, path: "/reports/sales" },
  //     { label: "Inventory Report", icon: BoxIcon, path: "/reports/inventory" },
  //   ],
  //   isActive: (pathname) => pathname.includes("/reports"),
  // },
  
  // Example 3: Menu with role-based access
  // {
  //   id: "analytics",
  //   label: "Analytics",
  //   icon: AnalyticsIcon,
  //   type: "dropdown",
  //   hasAccess: (user) => ["SUPERADMIN", "ADMIN", "MANAGER"].includes(user?.role),
  //   submenu: [
  //     { label: "Dashboard", icon: HomeIcon, path: "/analytics/dashboard" },
  //     { label: "Trends", icon: TrendIcon, path: "/analytics/trends" },
  //   ],
  //   isActive: (pathname) => pathname.includes("/analytics"),
  // },
];

// Page title mapping - add your routes here
export const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/invoices": "Invoice Management",
  "/user-management": "User Management",
  "/add-user": "Add User",
  "/user-control": "User Control",
  "/master/job-title": "Job Titles",
  "/master/job-title/add": "Add Job Title",
  "/master/department": "Departments",
  "/master/department/add": "Add Department",
  // Add more page titles here
};
