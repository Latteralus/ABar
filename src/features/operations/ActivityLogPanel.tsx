import type { ActivityLogEntry } from "@/types";
import { formatGameClock } from "@/utils/time";

export function ActivityLogPanel({ entries }: { entries: ActivityLogEntry[] }) {
  const recent = [...entries].reverse();
  return (
    <div className="log-panel">
      {recent.length === 0 && <p style={{ color: "var(--text-muted)" }}>No activity yet.</p>}
      {recent.map((entry) => (
        <div key={entry.id} className={`log-entry severity-${entry.severity}`}>
          <span className="log-time">{formatGameClock(entry.gameMinute)}</span>
          <span className="log-message">{entry.message}</span>
        </div>
      ))}
    </div>
  );
}
