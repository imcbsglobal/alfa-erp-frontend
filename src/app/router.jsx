import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../features/auth/pages/LoginPage";
import ProtectedRoute from "../layout/ProtectedRoute";
import MainLayout from "../layout/MainLayout";
import Forbidden from "../pages/Forbidden";

import SuperAdminDashboard from "../features/dashboard/SuperAdminDashboard";
import UserDashboard from "../features/dashboard/UserDashboard";
import UserControlPage from "../features/users/pages/UserControlPage";
import AddUserPage from "../features/users/pages/AddUserPage";
import UserListPage from "../features/users/pages/UserListPage";

import JobTitleListPage from "../features/master/pages/JobTitleListPage";
import AddJobTitlePage from "../features/master/pages/AddJobTitlePage";
import DepartmentListPage from "../features/master/pages/DepartmentListPage";
import AddDepartmentPage from "../features/master/pages/AddDepartmentPage";

import InvoiceListPage from "../features/invoice/pages/InvoiceListPage";
import InvoiceViewPage from "../features/invoice/pages/InvoiceViewPage";
import MyInvoiceListPage from "../features/invoice/pages/MyInvoiceListPage";
import HistoryPage from "../features/history/pages/HistoryPage";
import { useAuth } from "../features/auth/AuthContext";

import OperationsLayout from "../layout/OperationsLayout";
import PackingInvoiceListPage from "../features/packing/pages/PackingInvoiceListPage";
import PackingInvoiceViewPage from "../features/packing/pages/PackingInvoiceViewPage";
import MyPackingListPage from "../features/packing/pages/MyPackingListPage";

// Import Billing Pages
import BillingInvoiceListPage from "../features/billing/pages/BillingInvoiceListPage";
import BillingInvoiceViewPage from "../features/billing/pages/BillingInvoiceViewPage";
import BillingReviewedListPage from "../features/billing/pages/BillingReviewedListPage";

// Import Delivery Pages
import DeliveryDispatchPage from "../features/delivery/pages/DeliveryDispatchPage";
import MyDeliveryListPage from "../features/delivery/pages/MyDeliveryListPage";

export default function AppRouter() {
  const { user, menus = [], logout } = useAuth();
  
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<Forbidden />} />

      {/* ADMIN / SUPERADMIN / USER */}
      <Route element={<ProtectedRoute allowedRoles={["SUPERADMIN", "ADMIN", "USER"]} />}>
        <Route element={<MainLayout />}>
          <Route
            path="/dashboard"
            element={
              user?.role === "SUPERADMIN"
                ? <SuperAdminDashboard />
                : <UserDashboard />
            }
          />
          
          {/* Picking routes */}
          <Route path="/invoices" element={<InvoiceListPage />} />
          <Route path="/invoices/view/:id" element={<InvoiceViewPage />} />
          <Route path="/invoices/my" element={<MyInvoiceListPage />} />
          
          {/* Packing routes for SUPERADMIN */}
          <Route path="/packing/invoices" element={<PackingInvoiceListPage />} />
          <Route path="/packing/invoices/view/:id" element={<PackingInvoiceViewPage />} />
          <Route path="/packing/my" element={<MyPackingListPage />} />

          {/* Billing routes for SUPERADMIN */}
          <Route path="/billing/invoices" element={<BillingInvoiceListPage />} />
          <Route path="/billing/invoices/view/:id" element={<BillingInvoiceViewPage />} />
          <Route path="/billing/reviewed" element={<BillingReviewedListPage />} />

          {/* Delivery routes for SUPERADMIN/ADMIN */}
          <Route path="/delivery/dispatch" element={<DeliveryDispatchPage />} />
          <Route path="/delivery/my" element={<MyDeliveryListPage />} />

          {/* User Management */}
          <Route path="/user-management" element={<UserListPage />} />
          <Route path="/user-control" element={<UserControlPage />} />
          <Route path="/add-user" element={<AddUserPage />} />
          <Route path="/users/:id/edit" element={<AddUserPage />} />

          {/* Master Data */}
          <Route path="/master/job-title" element={<JobTitleListPage />} />
          <Route path="/master/job-title/add" element={<AddJobTitlePage />} />
          <Route path="/master/department" element={<DepartmentListPage />} />
          <Route path="/master/department/add" element={<AddDepartmentPage />} />

          {/* History */}
          <Route path="/history" element={<HistoryPage />} />
        </Route>
      </Route>

      {/* OPERATIONS (PICKER, PACKER, BILLER, DELIVERY, STORE) */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["PICKER", "PACKER", "BILLER", "DELIVERY", "STORE"]} />
        }
      >
        <Route element={<OperationsLayout />}>
          {/* Picking */}
          <Route path="/ops/picking/invoices" element={<InvoiceListPage />} />
          <Route path="/ops/picking/invoices/view/:id" element={<InvoiceViewPage />} />

          {/* Packing */}
          <Route path="/ops/packing/invoices" element={<PackingInvoiceListPage />} />
          <Route path="/ops/packing/invoices/view/:id" element={<PackingInvoiceViewPage />} />
          <Route path="/ops/packing/my" element={<MyPackingListPage />} />

          {/* Billing */}
          <Route path="/ops/billing/invoices" element={<BillingInvoiceListPage />} />
          <Route path="/ops/billing/invoices/view/:id" element={<BillingInvoiceViewPage />} />
          <Route path="/ops/billing/reviewed" element={<BillingReviewedListPage />} />

          {/* Delivery */}
          <Route path="/ops/delivery/dispatch" element={<DeliveryDispatchPage />} />
          <Route path="/ops/delivery/my" element={<MyDeliveryListPage />} />
        </Route>
      </Route>

      {/* Fallback */}
      {/* <Route path="*" element={<Navigate to="/403" replace />} /> */}
    </Routes>
  );
}