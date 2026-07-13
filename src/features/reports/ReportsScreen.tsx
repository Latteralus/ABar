import { useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { DailyReportView } from "./DailyReportScreen";

export function ReportsScreen() {
  const state = useGameStore((s) => s.state);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  if (!state) return null;

  const reports = [...state.dailyReports].reverse();
  const selected = reports.find((r) => r.gameDay === selectedDay) ?? reports[0] ?? null;

  return (
    <div>
      <div className="page-header">
        <h1>Reports</h1>
      </div>

      {reports.length === 0 && <p style={{ color: "var(--text-muted)" }}>No daily reports yet — close out a day of business first.</p>}

      {reports.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {reports.map((r) => (
            <button key={r.gameDay} className="btn" onClick={() => setSelectedDay(r.gameDay)}>
              Day {r.gameDay}
            </button>
          ))}
        </div>
      )}

      {selected && <DailyReportView report={selected} />}
    </div>
  );
}
