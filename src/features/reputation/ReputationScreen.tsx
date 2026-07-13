import { useMemo } from "react";
import { useGameStore } from "@/stores/gameStore";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { TrendChart } from "@/components/ui/TrendChart";
import { formatPercent } from "@/utils/format";
import { reputationDailyChange, reputationWeeklyChange } from "@/simulation/engine/reputation";
import type { ReputationDayRecord, Review } from "@/types";

function signed(value: number): string {
  return value > 0 ? `+${formatPercent(value)}` : formatPercent(value);
}

export function ReputationScreen() {
  const state = useGameStore((s) => s.state);
  // Memoized on .length, not the array reference — see ReportsScreen/FinancialsScreen.
  const scoreSeries = useMemo(
    () => state?.reputation.history.map((r) => ({ day: r.gameDay, value: r.score })) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: see comment above.
    [state?.reputation.history.length],
  );
  if (!state) return null;

  const latest = state.reputation.history[state.reputation.history.length - 1] ?? null;
  const recentHistory = [...state.reputation.history].slice(-14).reverse();
  const recentReviews = [...state.reviews].slice(-25).reverse();

  const dailyChange = reputationDailyChange(state);
  const weeklyChange = reputationWeeklyChange(state);

  const historyColumns: DataTableColumn<ReputationDayRecord>[] = [
    { key: "day", header: "Day", render: (r) => `Day ${r.gameDay}` },
    { key: "score", header: "Score", render: (r) => formatPercent(r.score) },
    { key: "positive", header: "Positive Factors", render: (r) => r.positiveFactors.join(", ") || "—" },
    { key: "negative", header: "Negative Factors", render: (r) => r.negativeFactors.join(", ") || "—" },
  ];

  const reviewColumns: DataTableColumn<Review>[] = [
    { key: "day", header: "Day", render: (r) => `Day ${r.gameDay}` },
    { key: "customer", header: "Customer", render: (r) => r.customerName },
    { key: "rating", header: "Rating", render: (r) => "★".repeat(r.rating) + "☆".repeat(5 - r.rating) },
    { key: "text", header: "Review", render: (r) => r.text },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Reputation</h1>
      </div>

      <Card title="Service Reputation">
        <div className="card-grid">
          <StatTile label="Current Score" value={formatPercent(state.reputation.score)} />
          <StatTile
            label="Daily Change"
            value={signed(dailyChange)}
            tone={dailyChange > 0 ? "positive" : dailyChange < 0 ? "negative" : "neutral"}
          />
          <StatTile
            label="Weekly Change"
            value={signed(weeklyChange)}
            tone={weeklyChange > 0 ? "positive" : weeklyChange < 0 ? "negative" : "neutral"}
          />
        </div>
        {latest && (
          <div className="card-grid" style={{ marginTop: 12 }}>
            <StatTile label="Top Positive Factors" value={latest.positiveFactors.join(", ") || "—"} tone="positive" />
            <StatTile label="Top Negative Factors" value={latest.negativeFactors.join(", ") || "—"} tone="negative" />
          </div>
        )}
      </Card>

      <Card title="Score History">
        <TrendChart series={[{ name: "Reputation", color: "#3b82f6", points: scoreSeries }]} formatValue={(v) => Math.round(v).toString()} />
        <div style={{ marginTop: 16 }}>
          <DataTable columns={historyColumns} rows={recentHistory} rowKey={(r) => String(r.gameDay)} emptyLabel="No days closed yet." />
        </div>
      </Card>

      <Card title="Reviews">
        <DataTable columns={reviewColumns} rows={recentReviews} rowKey={(r) => r.id} emptyLabel="No reviews yet." />
      </Card>
    </div>
  );
}
