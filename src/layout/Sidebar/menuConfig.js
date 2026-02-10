import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import { Truck as TruckIcon, AlertCircle as AlertCircleIcon, Package as PackageIcon } from "lucide-react";
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
    Settings,
    Database,
  } from "lucide-react";

export const MENU_CONFIG = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
    type: "single",
    hasAccess: (user) => user?.role === "SUPERADMIN" || user?.role === "ADMIN",
  },
  {
    id: "orders",
    label: "Orders",
    icon: Pill, // or use Package, Box, or any icon that represents orders
    type: "dropdown",
    hasAccess: (user) => 
      !["USER"].includes(user?.role), // Adjust based on who should see orders
    submenu: [
      {
        label: "Invoice",
        icon: FileText,
        type: "nested-dropdown",
        hasAccess: (user) => user?.role === "BILLER" || user?.role === "SUPERADMIN",
        submenu: [
          {
            label: "Invoice List",
            icon: ListChecks,
            path: (user) => user?.role === "BILLER" ? "/ops/billing/invoices" : "/billing/invoices",
            hasAccess: (user) => user?.role === "BILLER" || user?.role === "SUPERADMIN",
          },
          {
            label: "Reviewed Bills",
            icon: AlertCircle,
            path: (user) => user?.role === "BILLER" ? "/ops/billing/reviewed" : "/billing/reviewed",
            hasAccess: (user) => user?.role === "BILLER" || user?.role === "SUPERADMIN",
          },
        ],
      },
      {
        label: "Picking",
        icon: ClipboardCheck,
        type: "nested-dropdown",
        hasAccess: (user) =>
          !["PICKER", "PACKER", "BILLER", "DELIVERY"].includes(user?.role),
        submenu: [
          {
            label: "Picking List",
            icon: ClipboardCheck,
            path: "/invoices",
          },
          {
            label: "My Assigned Picking",
            icon: PlusCircle,
            path: "/invoices/my",
            hasAccess: (user, permissions) =>
              permissions["my-invoices"]?.view === true,
          },
        ],
      },
      {
        label: "Packing",
        icon: Box,
        type: "nested-dropdown",
        hasAccess: (user) => user?.role === "PACKER" || user?.role === "SUPERADMIN",
        submenu: [
          {
            label: "Packing List",
            icon: Box,
            path: (user) => user?.role === "PACKER" ? "/ops/packing/invoices" : "/packing/invoices",
            hasAccess: (user) => user?.role === "PACKER" || user?.role === "SUPERADMIN",
          },
          {
            label: "My Assigned Packing",
            icon: PlusCircle,
            path: (user) => user?.role === "PACKER" ? "/ops/packing/my" : "/packing/my",
            hasAccess: (user, permissions) =>
              user?.role === "PACKER" || 
              user?.role === "SUPERADMIN" || 
              permissions["my-packing"]?.view === true,
          },
        ],
      },
      {
        label: "Delivery",
        icon: Truck,
        type: "nested-dropdown",
        hasAccess: (user) => ["SUPERADMIN", "ADMIN", "DELIVERY"].includes(user?.role),
        submenu: [
          {
            label: "Dispatch Orders",
            icon: Truck,
            path: (user) => user?.role === "DELIVERY" ? "/ops/delivery/dispatch" : "/delivery/dispatch",
          },
          {
            label: "Courier List",
            icon: Package,
            path: (user) => user?.role === "DELIVERY" ? "/ops/delivery/courier-list" : "/delivery/courier-list",
          },
          {
            label: "Company Delivery List",
            icon: Warehouse,
            path: (user) => user?.role === "DELIVERY" ? "/ops/delivery/company-list" : "/delivery/company-list",
          },
          {
            label: "My Assigned Delivery",
            icon: PlusCircle,
            path: (user) => user?.role === "DELIVERY" ? "/ops/delivery/my" : "/delivery/my",
          },
        ],
      },
    ],
    isActive: (pathname) =>
      pathname.startsWith("/billing") || 
      pathname.startsWith("/ops/billing") ||
      pathname.startsWith("/invoices") ||
      pathname.startsWith("/packing") || 
      pathname.startsWith("/ops/packing") ||
      pathname.startsWith("/delivery") || 
      pathname.startsWith("/ops/delivery"),
  },
  {
    id: "reports",
    label: "Reports",
    icon: Clock,
    type: "dropdown", // Changed from "single"
    hasAccess: (user) => ["SUPERADMIN", "ADMIN", "STORE", "USER"].includes(user?.role),
    submenu: [
      {
        label: "Reports",
        icon: History,
        path: "/history",
      },
      {
        label: "Consolidate",
        icon: Layers,
        path: "/history/consolidate",
      },
      {
        label: "Invoice Reports",
        icon: FileText,
        path: "/history/invoice-report",
      },
    ],
    isActive: (pathname) => pathname.startsWith("/history"),
  },
  {
    id: "user-management",
    label: "User Management",
    icon: Users,
    type: "dropdown",
    hasAccess: (user, permissions) => {
      if (user?.role === "SUPERADMIN" || user?.role === "ADMIN") {
        return true;
      }
      return permissions["user-management"]?.view === true;
    },
    submenu: [
      {
        label: "User List",
        icon: Users,
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
        icon: Briefcase,
        path: "/master/job-title",
      },
      {
        label: "Department",
        icon: BuildingIcon,
        path: "/master/department",
      },
      {
        label: "Courier",
        icon: Send,
        path: "/master/courier",
      },
    ],
    isActive: (pathname) => pathname.includes("/master/"),
  },
  {
    id: "admin-privilege",
    label: "Advanced Control",
    icon: Settings,
    path: "/admin/privilege",
    type: "single",
    hasAccess: (user) => user?.role === "SUPERADMIN" || user?.role === "ADMIN",
  },
  {
    id: "developer",
    label: "Developer Options",
    icon: Database,
    path: "/developer/settings",
    type: "single",
    hasAccess: (user) => user?.role === "SUPERADMIN",
  },
  
];

// Page title mapping
export const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/invoices": "Invoice Management",
  "/invoices/my": "My Assigned Bills",
  "/packing/invoices": "Packing Management",
  "/packing/my": "My Assigned Packing",
  "/ops/packing/invoices": "Packing Management",
  "/ops/packing/my": "My Assigned Packing",
  "/billing/invoices": "Billing Management",
  "/billing/reviewed": "Reviewed Bills",
  "/billing/my": "My Assigned Billing",
  "/ops/billing/invoices": "Billing Management",
  "/ops/billing/reviewed": "Reviewed Bills",
  "/ops/billing/my": "My Assigned Billing",
  "/delivery/dispatch": "Delivery Dispatch",
  "/ops/delivery/dispatch": "Delivery Dispatch",
  "/delivery/my": "My Assigned Delivery",
  "/ops/delivery/my": "My Assigned Delivery",
  "/delivery/courier-list": "Courier Delivery List",
  "/ops/delivery/courier-list": "Courier Delivery List",
  "/delivery/company-list": "Company Delivery List",
  "/ops/delivery/company-list": "Company Delivery List",
  "/user-management": "User Management",
  "/add-user": "Add User",
  "/user-control": "User Control",
  "/master/job-title": "Job Titles",
  "/master/job-title/add": "Add Job Title", 
  "/master/department": "Departments",
  "/master/department/add": "Add Department",
  "/master/courier": "Couriers",
  "/master/courier/add": "Add Courier",
  "/history": "History",
  "/history/consolidate": "Consolidate History",
  "/history/invoice-report": "Invoice Report",
  "/developer/settings": "Developer Options",
  "/admin/privilege": "Advanced Control",
};