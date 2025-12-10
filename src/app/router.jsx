// src/app/router.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import LoginPage from "../features/auth/pages/LoginPage";
import ProtectedRoute from "../layout/ProtectedRoute";
import MainLayout from "../layout/MainLayout";
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


// Role-based dashboard component
function RoleDashboard() {
  const { user } = useAuth();

  if (user?.role === "SUPERADMIN" || user?.role === "ADMIN") {
    return <SuperAdminDashboard />;
  }

  if (user?.role === "STORE") {
    return <StoreDashboard />;
  }

  return <UserDashboard />;
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Logged-in Routes */}
      <Route element={<ProtectedRoute allowedRoles={["SUPERADMIN", "ADMIN", "USER"]} />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<RoleDashboard />} />

          {/* Common admin/user routes */}
          <Route path="/user-management" element={<UserListPage />} />
          <Route path="/user-control" element={<UserControlPage />} />
          <Route path="/add-user" element={<AddUserPage />} />
          <Route path="/users/:id/edit" element={<AddUserPage />} />

          {/* Master - Job Titles */}
          <Route path="/master/job-title" element={<JobTitleListPage />} />
          <Route path="/master/job-title/add" element={<AddJobTitlePage />} />

          {/* Invoice Routes */}
          <Route path="/invoice" element={<InvoiceListPage />} />
          <Route path="/invoice/view/:id" element={<InvoiceViewPage />} />

          {/* Master - Departments */}
          <Route path="/master/department" element={<DepartmentListPage />} />
          <Route path="/master/department/add" element={<AddDepartmentPage />} />
        </Route>
      </Route>

      {/* Superadmin exclusive */}
      <Route element={<ProtectedRoute allowedRoles={["SUPERADMIN"]} />}>
        <Route element={<MainLayout />}>
          <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
        </Route>
      </Route>

      {/* Admin exclusive (if different dashboard required) */}
      <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
        <Route element={<MainLayout />}>
          <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
        </Route>
      </Route>
    </Routes>
  );
}