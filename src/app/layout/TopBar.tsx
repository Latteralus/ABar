import { useGameStore } from "@/stores/gameStore";
import { formatGameClock, formatGameDay } from "@/utils/time";
import { formatCents } from "@/utils/money";
import { Badge } from "@/components/ui/Badge";

export function TopBar() {
  const state = useGameStore((s) => s.state);
  const pause = useGameStore((s) => s.pause);
  const resume = useGameStore((s) => s.resume);
  const openBar = useGameStore((s) => s.openBar);

  if (!state) return null;

  const isOpen = state.dayState === "open";

  return (
    <header className="topbar">
      <div className="clock-cluster">
        <span className="clock-time">
          {formatGameDay(state.gameDay)} · {formatGameClock(state.gameMinute)}
        </span>
        <Badge variant={isOpen ? "positive" : "neutral"}>{isOpen ? "Open" : state.dayState.replace("_", " ")}</Badge>
        {state.dayState === "between_days" && (
          <button className="btn btn-primary" onClick={openBar}>
            Open Bar
          </button>
        )}
        {isOpen && (
          <button className="btn" onClick={state.isPaused ? resume : pause}>
            {state.isPaused ? "Resume" : "Pause"}
          </button>
        )}
        {state.isPaused && <Badge variant="warning">Paused</Badge>}
        {state.insolvency && (
          <Badge variant="negative">Bankruptcy in {Math.max(0, state.insolvency.bankruptcyGameDay - state.gameDay)} days</Badge>
        )}
      </div>
      <div className="clock-cluster">
        <span>Cash: {formatCents(state.cash)}</span>
      </div>
    </header>
  );
}
