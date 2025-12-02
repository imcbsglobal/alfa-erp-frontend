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

// Role-based dashboard component
function RoleDashboard() {
  const { user } = useAuth();
  
  if (user?.role === "USER") {
    return <UserDashboard />;
  }
  // Both SUPER_ADMIN and ADMIN see the same dashboard
  return <SuperAdminDashboard />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Super Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={["SUPER_ADMIN"]} />}>
        <Route element={<MainLayout />}>
          <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
        </Route>
      </Route>

      {/* Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]} />}>
        <Route element={<MainLayout />}>
          <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
          <Route path="/user-management" element={<UserListPage />} />
          <Route path="/user-control" element={<UserControlPage />} />
          <Route path="/add-user" element={<AddUserPage />} />
          {/* Master Routes */}
          <Route path="/master/job-title" element={<JobTitleListPage />} />
          <Route path="/master/job-title/add" element={<AddJobTitlePage />} />
        </Route>
      </Route>

      {/* User Routes */}
      <Route element={<ProtectedRoute allowedRoles={["USER"]} />}>
        <Route element={<MainLayout />}>
          <Route path="/user/dashboard" element={<UserDashboard />} />
          <Route path="/user-management" element={<UserListPage />} />
          <Route path="/user-control" element={<UserControlPage />} />
          <Route path="/add-user" element={<AddUserPage />} />
          {/* Master Routes for users with permissions */}
          <Route path="/master/job-title" element={<JobTitleListPage />} />
          <Route path="/master/job-title/add" element={<AddJobTitlePage />} />
        </Route>
      </Route>

      {/* Common Dashboard */}
      <Route element={<ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "USER"]} />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<RoleDashboard />} />
        </Route>
      </Route>
    </Routes>
  );
}