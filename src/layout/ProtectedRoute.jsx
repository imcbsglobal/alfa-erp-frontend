import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { canAccess, isSuperAdmin } from "../utils/permissions";

export default function ProtectedRoute({ requiredMenus }) {
  const { user, menus, loading } = useAuth();

  // Show nothing while loading
  if (loading) return null;

  // Not logged in → redirect to login
  if (!user) return <Navigate to="/login" replace />;

  // SUPERADMIN bypasses all menu checks
  if (isSuperAdmin(user)) return <Outlet />;

  // No menu requirements → allow access (public authenticated route)
  if (!requiredMenus) return <Outlet />;

  // Check menu-based access
  const hasAccess = canAccess(user, menus, requiredMenus);

  if (!hasAccess) {
    console.log("Access denied - User does not have required menu access:", requiredMenus);
    console.log("User menus:", menus);
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}