import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../../constants/navigation";
import { useAuth } from "../../auth/useAuth";

export function Sidebar() {
  const { canAccess } = useAuth();
  const navItems = NAV_ITEMS.filter((item) => canAccess(item.allowedRoles));

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <p className="brand-kicker">Cleaner Ops</p>
        <h1>Control Center</h1>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            end={item.path === "/"}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
