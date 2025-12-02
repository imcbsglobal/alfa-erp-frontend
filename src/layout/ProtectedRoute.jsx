// ProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check user-management routes specifically
  const isUserManagementRoute = [
    "/user-management",
    "/user-control",
    "/add-user"
  ].includes(location.pathname);

  // If it's a user-management route, check permissions
  if (isUserManagementRoute) {
    // Admins and Super Admins always have access
    if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
      console.log("✅ Admin/SuperAdmin accessing user management route");
      return <Outlet />;
    }

    // For regular users, check permissions
    const permissionMap = JSON.parse(localStorage.getItem("userPermissions") || "{}");
    const userPermissions = user.email ? (permissionMap[user.email] || {}) : {};
    const hasUserManagementPermission = userPermissions["user-management"]?.view === true;

    console.log("User:", user.email, "| Has permission:", hasUserManagementPermission);

    if (!hasUserManagementPermission) {
      console.log("❌ Access denied - redirecting to dashboard");
      return <Navigate to="/dashboard" replace />;
    }

    console.log("✅ User has permission to access user management");
    return <Outlet />;
  }

  // Check role-based access for other routes
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.log("❌ Role not allowed - redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}