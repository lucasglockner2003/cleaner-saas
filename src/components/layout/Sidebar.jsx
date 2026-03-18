import { NavLink } from "react-router-dom";
import { NAV_ITEMS } from "../../constants/navigation";

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <p className="brand-kicker">Cleaner Ops</p>
        <h1>Control Center</h1>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
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

