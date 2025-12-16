// src/app/router.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../features/auth/pages/LoginPage";
import ProtectedRoute from "../layout/ProtectedRoute";
import MainLayout from "../layout/MainLayout";

import SuperAdminDashboard from "../features/dashboard/SuperAdminDashboard";
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

export default function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* ADMIN / SUPERADMIN / USER → WITH SIDEBAR */}
      <Route element={<ProtectedRoute allowedRoles={["SUPERADMIN", "ADMIN", "USER"]} />}>
        <Route element={<MainLayout />}>

          <Route path="/dashboard" element={<SuperAdminDashboard />} />

          {/* ✅ INVOICE LIST WITH SIDEBAR */}
          <Route path="/invoices" element={<InvoiceListPage />} />
          <Route path="/invoice/view/:id" element={<InvoiceViewPage />} />

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

      {/* STORE → NO SIDEBAR */}
      <Route element={<ProtectedRoute allowedRoles={["PICKER"]} />}>
        <Route path="/invoices" element={<InvoiceListPage />} />
        <Route path="/invoice/pick/:id" element={<InvoicePickingPage />} />
      </Route>
    </Routes>
  );
}
