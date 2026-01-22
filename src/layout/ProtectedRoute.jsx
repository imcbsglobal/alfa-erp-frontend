import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;


  if (
    allowedRoles &&
    !allowedRoles.includes(user.role)
  ) {
    console.log("Access denied for role:", user.role,allowedRoles);
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}