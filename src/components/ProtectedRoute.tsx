import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingScreen } from "./LoadingScreen";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types";

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const location = useLocation();
  const { firebaseUser, appUser, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!appUser || appUser.disabled) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (roles && !roles.includes(appUser.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
