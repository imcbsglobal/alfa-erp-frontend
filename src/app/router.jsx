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
import InvoicePickingPage from "../features/invoice/pages/InvoicePickingPage";
import HistoryPage from "../features/history/pages/HistoryPage";
import { useAuth } from "../features/auth/AuthContext";

import OperationsLayout from "../layout/OperationsLayout";
import MyInvoiceListPage from "../features/invoice/pages/MyInvoiceListPage";

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
          <Route path="/invoices" element={<InvoiceListPage />} />
          <Route path="/invoices/view/:id" element={<InvoiceViewPage />} />
          <Route path="/invoices/my" element={<MyInvoiceListPage />} />
          <Route path="/user-management" element={<UserListPage />} />
          <Route path="/user-control" element={<UserControlPage />} />
          <Route path="/add-user" element={<AddUserPage />} />
          <Route path="/users/:id/edit" element={<AddUserPage />} />

          <Route path="/master/job-title" element={<JobTitleListPage />} />
          <Route path="/master/job-title/add" element={<AddJobTitlePage />} />
          <Route path="/master/department" element={<DepartmentListPage />} />
          <Route path="/master/department/add" element={<AddDepartmentPage />} />

          <Route path="/history" element={<HistoryPage />} />
        </Route>
      </Route>

      <Route
        element={
          <ProtectedRoute allowedRoles={["PICKER", "PACKER", "DELIVERY", "STORE"]} />
        }
      >
        <Route element={<OperationsLayout />}>
          {/* Picking */}
          <Route path="/ops/picking/invoices" element={<InvoiceListPage />} />
          <Route path="/ops/picking/invoices/view/:id" element={<InvoiceViewPage />} />
          <Route path="/ops/picking/invoices/pick/:id" element={<InvoicePickingPage />} />

          {/* Packing (future) */}
          {/* <Route path="/ops/packing/..." /> */}

          {/* Delivery (future) */}
          {/* <Route path="/ops/delivery/..." /> */}
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/403" replace />} />
    </Routes>
  );
}
