import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";

export function ProtectedRoute({ children, allowedRoles = [], allowedUserTypes = [] }) {
  const { isAuthenticated, isAuthLoading, canAccess, canAccessUserType, user } = useAuth();
  const location = useLocation();

  if (isAuthLoading) {
    return (
      <div className="loading-screen">
        <p>Loading session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const loginPath = allowedUserTypes.includes("customer") ? "/portal/login" : "/login";
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }

  if (!canAccessUserType(allowedUserTypes)) {
    const fallbackPath = user?.user_type === "customer" ? "/portal" : "/";
    return <Navigate to={fallbackPath} replace />;
  }

  if (!canAccess(allowedRoles)) {
    const fallbackPath = user?.user_type === "customer" ? "/portal" : "/";
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
}
