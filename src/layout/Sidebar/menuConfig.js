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

export const MENU_CONFIG = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: HomeIcon,
    path: "/dashboard",
    type: "single",
  },
  {
    id: "billing",
    label: "Invoice",
    icon: InvoiceIcon,
    type: "dropdown",
    hasAccess: (user) => user?.role === "BILLER" || user?.role === "SUPERADMIN",
    submenu: [
      {
        label: "Invoice List",
        icon: ListIcon,
        path: (user) => user?.role === "BILLER" ? "/ops/billing/invoices" : "/billing/invoices",
        hasAccess: (user) => user?.role === "BILLER" || user?.role === "SUPERADMIN",
      },
      {
        label: "Reviewed Bills",
        icon: AlertCircleIcon,
        path: (user) => user?.role === "BILLER" ? "/ops/billing/reviewed" : "/billing/reviewed",
        hasAccess: (user) => user?.role === "BILLER" || user?.role === "SUPERADMIN",
      },
    ],
    isActive: (pathname) =>
      pathname.startsWith("/billing") || pathname.startsWith("/ops/billing"),
  },
  {
    id: "invoices",
    label: "Picking",
    icon: InvoiceIcon,
    type: "dropdown",
    hasAccess: (user) =>
      !["PICKER", "PACKER", "BILLER", "DELIVERY"].includes(user?.role),
    submenu: [
      {
        label: "Picking List",
        icon: ListIcon,
        path: "/invoices",
      },
      {
        label: "My Assigned Picking",
        icon: PlusCircleIcon,
        path: "/invoices/my",
        hasAccess: (user, permissions) =>
          permissions["my-invoices"]?.view === true,
      },
    ],
    isActive: (pathname) =>
      pathname.startsWith("/invoices"),
  },
  {
    id: "packing",
    label: "Packing",
    icon: InvoiceIcon,
    type: "dropdown",
    hasAccess: (user) => user?.role === "PACKER" || user?.role === "SUPERADMIN",
    submenu: [
      {
        label: "Packing List",
        icon: ListIcon,
        path: (user) => user?.role === "PACKER" ? "/ops/packing/invoices" : "/packing/invoices",
        hasAccess: (user) => user?.role === "PACKER" || user?.role === "SUPERADMIN",
      },
      {
        label: "My Assigned Packing",
        icon: PlusCircleIcon,
        path: (user) => user?.role === "PACKER" ? "/ops/packing/my" : "/packing/my",
        hasAccess: (user, permissions) =>
          user?.role === "PACKER" || 
          user?.role === "SUPERADMIN" || 
          permissions["my-packing"]?.view === true,
      },
    ],
    isActive: (pathname) =>
      pathname.startsWith("/packing") || pathname.startsWith("/ops/packing"),
  },
  {
    id: "delivery",
    label: "Delivery",
    icon: TruckIcon,
    type: "dropdown",
    hasAccess: (user) => ["SUPERADMIN", "ADMIN", "DELIVERY"].includes(user?.role),
    submenu: [
      {
        label: "Dispatch Orders",
        icon: ListIcon,
        path: (user) => user?.role === "DELIVERY" ? "/ops/delivery/dispatch" : "/delivery/dispatch",
      },
      {
        label: "Courier List",
        icon: TruckIcon,
        path: (user) => user?.role === "DELIVERY" ? "/ops/delivery/courier-list" : "/delivery/courier-list",
      },
      {
        label: "Company Delivery List",
        icon: TruckIcon,
        path: (user) => user?.role === "DELIVERY" ? "/ops/delivery/company-list" : "/delivery/company-list",
      },
      {
        label: "My Assigned Delivery",
        icon: PlusCircleIcon,
        path: (user) => user?.role === "DELIVERY" ? "/ops/delivery/my" : "/delivery/my",
      },
    ],
    isActive: (pathname) =>
      pathname.startsWith("/delivery") || pathname.startsWith("/ops/delivery"),
  },
  {
    id: "history",
    label: "History",
    icon: ListIcon,
    type: "dropdown", // Changed from "single"
    hasAccess: (user) => ["SUPERADMIN", "ADMIN", "STORE", "USER"].includes(user?.role),
    submenu: [
      {
        label: "History",
        icon: ListIcon,
        path: "/history",
      },
      {
        label: "Consolidate",
        icon: ListIcon,
        path: "/history/consolidate",
      },
    ],
    isActive: (pathname) => pathname.startsWith("/history"),
  },
  {
    id: "user-management",
    label: "User Management",
    icon: UsersIcon,
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
      {
        label: "Courier",
        icon: PackageIcon,
        path: "/master/courier",
      },
    ],
    isActive: (pathname) => pathname.includes("/master/"),
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
};