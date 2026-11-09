import { Navigate, Outlet, useLocation } from "react-router-dom";

import useAuth from "./useAuth";

function FullPageMessage({ children }) {
  return <div className="grid min-h-screen place-items-center bg-paper text-muted">{children}</div>;
}

// Signed-in owners only; everyone else goes to login, then back here
export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageMessage>Loading your dashboard…</FullPageMessage>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

// Login and register: signed-in owners skip straight to the dashboard
export function PublicOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) return <FullPageMessage>Loading…</FullPageMessage>;
  if (user) return <Navigate to="/overview" replace />;
  return <Outlet />;
}