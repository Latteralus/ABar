import { useGameStore } from "@/stores/gameStore";
import { Card } from "@/components/ui/Card";
import { DebugPanel } from "./DebugPanel";

export function SettingsScreen() {
  const state = useGameStore((s) => s.state);
  const setAutoOpen = useGameStore((s) => s.setAutoOpen);
  const setBarTipShare = useGameStore((s) => s.setBarTipShare);
  const saveCurrentGame = useGameStore((s) => s.saveCurrentGame);
  const exitToMenu = useGameStore((s) => s.exitToMenu);
  if (!state) return null;

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <Card title="Operations">
        <div className="form-row">
          <label>
            <input type="checkbox" checked={state.autoOpenEnabled} onChange={(e) => setAutoOpen(e.target.checked)} /> Automatically open the bar at
            the start of each day
          </label>
        </div>
      </Card>

      <Card title="Tip Policy">
        <div className="form-row">
          <label>
            Bar share of tips: {Math.round(state.policies.barTipSharePercent * 100)}%
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={Math.round(state.policies.barTipSharePercent * 100)}
              onChange={(e) => setBarTipShare(Number(e.target.value))}
              style={{ marginLeft: 12, verticalAlign: "middle" }}
            />
          </label>
          <p style={{ color: "var(--text-secondary)", margin: "8px 0 0" }}>
            Remaining tips are split among working staff. A future employee-relations system can react to this policy.
          </p>
        </div>
      </Card>

      <Card title="Save">
        <button className="btn btn-primary" onClick={saveCurrentGame}>
          Save Now
        </button>
        <button className="btn" style={{ marginLeft: 8 }} onClick={exitToMenu}>
          Exit to Main Menu
        </button>
      </Card>

      {import.meta.env.DEV && <DebugPanel />}
    </div>
  );
}
