import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  // if (allowedRoles && !allowedRoles.some(r => user.roles.includes(r))) {
  //   return <Navigate to="/dashboard" replace />;
  // }

  return <Outlet />;
}
