import { useLocation } from "react-router-dom";
import { NAV_ITEMS } from "../../constants/navigation";
import { useAuth } from "../../auth/useAuth";
import { useAppData } from "../../hooks/useAppData";
import { getRuntimeConfigReport } from "../../config/env";

export function TopHeader() {
  const { user, logout, sessionExpiringSoon } = useAuth();
  const { persistence } = useAppData();
  const configReport = getRuntimeConfigReport();
  const location = useLocation();
  const active =
    NAV_ITEMS.find((item) => item.path === location.pathname) ??
    NAV_ITEMS.find((item) => item.path !== "/" && location.pathname.startsWith(item.path));
  const today = new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "full"
  }).format(new Date());

  return (
    <header className="top-header">
      <div>
        <h2>{active?.label ?? "Operations"}</h2>
        <p>{today}</p>
      </div>
      <div className="inline-actions">
        {persistence?.syncState?.status !== "healthy" ? (
          <div className="top-header-chip danger">sync degraded</div>
        ) : null}
        {configReport.criticalIssues.length ? <div className="top-header-chip danger">config blocked</div> : null}
        {sessionExpiringSoon ? <div className="top-header-chip danger">session expiring</div> : null}
        <div className="top-header-chip">{user?.role ?? "user"}</div>
        <span className="muted">{user?.email}</span>
        <button type="button" className="btn btn-ghost" onClick={logout}>
          Logout
        </button>
      </div>
    </header>
  );
}
