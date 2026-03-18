import { AppShell } from "../components/layout/AppShell";
import { PortalShell } from "../components/portal/PortalShell";
import { AppRouter } from "./router";
import { useLocation } from "react-router-dom";

export function App() {
  const location = useLocation();
  const isLoginRoute = location.pathname === "/login";
  const isPortalLoginRoute = location.pathname === "/portal/login";
  const isPortalRoute = location.pathname.startsWith("/portal");

  if (isLoginRoute || isPortalLoginRoute) {
    return <AppRouter />;
  }

  if (isPortalRoute) {
    return (
      <PortalShell>
        <AppRouter />
      </PortalShell>
    );
  }

  return (
    <AppShell>
      <AppRouter />
    </AppShell>
  );
}
