import { NavLink } from "react-router-dom";
import { useGameStore } from "@/stores/gameStore";

const NAV_ITEMS = [
  { to: "/overview", label: "Overview" },
  { to: "/operations", label: "Live Operations" },
  { to: "/employees", label: "Employees" },
  { to: "/inventory", label: "Inventory" },
  { to: "/menu", label: "Menu & Pricing" },
  { to: "/purchasing", label: "Purchasing" },
  { to: "/equipment", label: "Equipment" },
  { to: "/attractions", label: "Attractions" },
  { to: "/financials", label: "Financials" },
  { to: "/reports", label: "Reports" },
  { to: "/reputation", label: "Reputation" },
  { to: "/advertising", label: "Advertising" },
  { to: "/settings", label: "Settings" },
];

export function Sidebar() {
  const saveName = useGameStore((s) => s.state?.saveName);

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">{saveName?.toUpperCase()}</div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
