import { NavLink } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { useAppData } from "../../hooks/useAppData";
import { FeedbackBanner } from "../ui/FeedbackBanner";
import { PORTAL_NAV_ITEMS } from "../../constants/portalNavigation";

export function PortalShell({ children }) {
  const { user, logout } = useAuth();
  const { lastFeedback, actions, isBootstrapping } = useAppData();

  if (isBootstrapping) {
    return (
      <div className="loading-screen">
        <p>Loading your portal data...</p>
      </div>
    );
  }

  return (
    <div className="portal-shell">
      <header className="portal-header">
        <div>
          <p className="brand-kicker">Cleaner Ops</p>
          <h1>Customer Portal</h1>
          <p className="muted">Welcome back, {user?.full_name}</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={logout}>
          Logout
        </button>
      </header>

      <nav className="portal-nav">
        {PORTAL_NAV_ITEMS.map((item) => (
          <NavLink key={item.path} to={item.path} end={item.path === "/portal"} className={({ isActive }) => (isActive ? "portal-nav-link active" : "portal-nav-link")}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <FeedbackBanner feedback={lastFeedback} onDismiss={actions.clearFeedback} />

      <main className="portal-content">{children}</main>
    </div>
  );
}
