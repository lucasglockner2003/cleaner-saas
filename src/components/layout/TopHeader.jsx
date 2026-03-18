import { useLocation } from "react-router-dom";
import { NAV_ITEMS } from "../../constants/navigation";

export function TopHeader() {
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
      <div className="top-header-chip">MVP Foundation</div>
    </header>
  );
}
