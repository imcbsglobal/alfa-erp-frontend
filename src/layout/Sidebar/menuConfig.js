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
    id: "history",
    label: "History",
    icon: ListIcon,
    type: "single",
    path: "/history",
    hasAccess: (user) => ["SUPERADMIN", "ADMIN", "STORE", "USER"].includes(user?.role),
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
  "/billing/my": "My Assigned Billing",
  "/ops/billing/invoices": "Billing Management",
  "/ops/billing/my": "My Assigned Billing",
  "/user-management": "User Management",
  "/add-user": "Add User",
  "/user-control": "User Control",
  "/master/job-title": "Job Titles",
  "/master/job-title/add": "Add Job Title",
  "/master/department": "Departments",
  "/master/department/add": "Add Department",
  "/history": "History",
};