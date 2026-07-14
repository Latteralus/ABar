import { useMemo, useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { Card } from "@/components/ui/Card";
import { TrendChart } from "@/components/ui/TrendChart";
import { formatCents } from "@/utils/money";
import { activeProperty } from "@/simulation/engine/activeProperty";
import { DailyReportView } from "./DailyReportScreen";

export function ReportsScreen() {
  const state = useGameStore((s) => s.state);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const prop = state ? activeProperty(state) : null;
  // Memoized on .length rather than the array reference: dailyReports.push()'d in place by
  // dayCycle.ts, so the reference is stable across ticks even as this screen re-renders on every
  // tick (see FinancialsScreen's cashHistory for the same reasoning, spelled out in more detail).
  const revenueSeries = useMemo(
    () => prop?.dailyReports.map((r) => ({ day: r.gameDay, value: r.revenue })) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: see comment above.
    [prop?.dailyReports.length],
  );
  const profitSeries = useMemo(
    () => prop?.dailyReports.map((r) => ({ day: r.gameDay, value: r.netProfit })) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: see comment above.
    [prop?.dailyReports.length],
  );
  if (!state || !prop) return null;

  const reports = [...prop.dailyReports].reverse();
  const selected = reports.find((r) => r.gameDay === selectedDay) ?? reports[0] ?? null;

  return (
    <div>
      <div className="page-header">
        <h1>Reports</h1>
      </div>

      {reports.length === 0 && <p style={{ color: "var(--text-muted)" }}>No daily reports yet — close out a day of business first.</p>}

      {reports.length > 0 && (
        <Card title="Revenue & Net Profit by Day">
          <TrendChart
            series={[
              { name: "Revenue", color: "#3b82f6", points: revenueSeries },
              { name: "Net Profit", color: "#0891b2", points: profitSeries },
            ]}
            formatValue={(v) => formatCents(v)}
          />
        </Card>
      )}

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
