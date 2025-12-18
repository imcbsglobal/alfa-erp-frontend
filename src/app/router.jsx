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
import InvoicePickingPage from "../features/invoice/pages/InvoicePickingPage";
import HistoryPage from "../features/history/pages/HistoryPage";
import { useAuth } from "../features/auth/AuthContext";

import OperationsLayout from "../layout/OperationsLayout";

export default function AppRouter() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<Forbidden />} />

      {/* EVERYTHING ELSE */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>

          {/* Dashboard */}
          <Route
            path="/dashboard"
            element={
              user?.role === "SUPERADMIN"
                ? <SuperAdminDashboard />
                : <UserDashboard />
            }
          />

          {/* Admin Invoices */}
          <Route path="/invoices" element={<InvoiceListPage mode="ADMIN" />} />
          <Route path="/invoices/view/:id" element={<InvoiceViewPage />} />

          {/* My Invoices */}
          <Route path="/invoices/my" element={<MyInvoiceListPage />} />
          <Route path="/invoices/my/assigned/:id" element={<InvoicePickingPage mode="ASSIGNED" />} />
          <Route path="/invoices/my/history/:id" element={<InvoicePickingPage mode="HISTORY" />} />

          {/* Ops Invoices */}
          <Route path="/ops/picking/invoices" element={<InvoiceListPage mode="PICKING" />} />
          <Route path="/ops/picking/invoices/view/:id" element={<InvoiceViewPage />} />
          <Route path="/ops/picking/invoices/pick/:id" element={<InvoicePickingPage />} />

          {/* Users */}
          <Route path="/user-management" element={<UserListPage />} />
          <Route path="/user-control" element={<UserControlPage />} />
          <Route path="/add-user" element={<AddUserPage />} />
          <Route path="/users/:id/edit" element={<AddUserPage />} />

          {/* Master */}
          <Route path="/master/job-title" element={<JobTitleListPage />} />
          <Route path="/master/job-title/add" element={<AddJobTitlePage />} />
          <Route path="/master/department" element={<DepartmentListPage />} />
          <Route path="/master/department/add" element={<AddDepartmentPage />} />

          {/* History */}
          <Route path="/history" element={<HistoryPage />} />

        </Route>
      </Route>
    </Routes>
  );
}

