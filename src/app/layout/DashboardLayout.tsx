import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { AmbientAudioControl } from "./AmbientAudioControl";

export function DashboardLayout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <TopBar />
      <main className="main-content">
        <Outlet />
      </main>
      <AmbientAudioControl />
    </div>
  );
}
