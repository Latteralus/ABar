import { useGameStore } from "@/stores/gameStore";
import { Card } from "@/components/ui/Card";
import { getProperty } from "@/data/properties";
import { applySpoilage } from "@/simulation/engine/spoilage";
import { forceSundayBillingNow, updateInsolvency } from "@/simulation/engine/finance";

/** Dev-only tools (Master Plan Section 51). Vite strips this whole module's usage in production builds via the import.meta.env.DEV guard in SettingsScreen. */
export function DebugPanel() {
  const state = useGameStore((s) => s.state);
  const engine = useGameStore((s) => s.engine);
  if (!state || !engine) return null;

  const addCash = (amount: number) => {
    engine.getState().cash += amount;
    engine.commitNow();
  };

  return (
    <Card title="Debug Panel (Development Only)">
      <p style={{ color: "var(--text-secondary)", fontSize: 12 }}>RNG seed: {state.rngSeed}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn" onClick={() => addCash(100000)}>
          +$1,000 Cash
        </button>
        <button className="btn" onClick={() => addCash(-100000)}>
          -$1,000 Cash
        </button>
        <button
          className="btn"
          onClick={() => {
            engine.getState().gameMinute = 715;
            engine.commitNow();
          }}
        >
          Skip to Near Closing
        </button>
        <button
          className="btn"
          onClick={() => {
            const s = engine.getState();
            applySpoilage(s, engine.eventBus, getProperty(s.propertyId));
            engine.commitNow();
          }}
        >
          Force Spoilage Check
        </button>
        <button
          className="btn"
          onClick={() => {
            const s = engine.getState();
            for (const equipment of s.equipment) {
              equipment.condition = 0;
              equipment.currentStatus = "failed";
            }
            engine.commitNow();
          }}
        >
          Fail All Equipment
        </button>
        <button
          className="btn"
          onClick={() => {
            const s = engine.getState();
            for (const attraction of s.attractions) {
              attraction.condition = 0;
              attraction.currentStatus = "failed";
            }
            engine.commitNow();
          }}
        >
          Fail All Attractions
        </button>
        <button
          className="btn"
          onClick={() => {
            const s = engine.getState();
            forceSundayBillingNow(s, engine.eventBus);
            engine.commitNow();
          }}
        >
          Trigger Sunday Billing Now
        </button>
        <button
          className="btn"
          onClick={() => {
            const s = engine.getState();
            s.cash = -10000;
            updateInsolvency(s, engine.eventBus);
            engine.commitNow();
          }}
        >
          Force Negative Cash
        </button>
        <button
          className="btn"
          onClick={() => {
            const s = engine.getState();
            if (s.cash >= 0) s.cash = -10000;
            s.insolvency = { startedGameDay: s.gameDay, bankruptcyGameDay: s.gameDay };
            updateInsolvency(s, engine.eventBus);
            engine.commitNow();
          }}
        >
          Force Bankruptcy Now
        </button>
      </div>
    </Card>
  );
}
