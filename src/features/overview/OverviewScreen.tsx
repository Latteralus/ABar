import { useMemo } from "react";
import { useGameStore } from "@/stores/gameStore";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { TrendChart } from "@/components/ui/TrendChart";
import { formatCents } from "@/utils/money";
import { formatPercent } from "@/utils/format";
import { outstandingBillTotal } from "@/simulation/engine/finance";
import { summarizeDay, summarizeRange } from "@/simulation/engine/ledgerSummary";

export function OverviewScreen() {
  const state = useGameStore((s) => s.state);
  // Memoized on .length (see ReportsScreen/FinancialsScreen for why the array reference itself
  // isn't a useful dependency) — this card only needs to recompute when a new day actually closes.
  const revenueSeries = useMemo(
    () => state?.dailyReports.slice(-14).map((r) => ({ day: r.gameDay, value: r.revenue })) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: see comment above.
    [state?.dailyReports.length],
  );
  const profitSeries = useMemo(
    () => state?.dailyReports.slice(-14).map((r) => ({ day: r.gameDay, value: r.netProfit })) ?? [],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: see comment above.
    [state?.dailyReports.length],
  );
  if (!state) return null;

  const today = summarizeDay(state.ledger, state.gameDay);
  const weekStart = Math.max(1, state.gameDay - 6);
  const week = summarizeRange(state.ledger, weekStart, state.gameDay);

  const activeCustomers = state.customers.filter((c) => c.status !== "left" && c.status !== "removed");
  const lowStockItems = state.inventory.filter((i) => i.quantityOnHand < i.reorderMinimum);
  const recentEvents = state.activityLog.slice(-8).reverse();
  const recentReviews = [...state.reviews].slice(-5).reverse();
  const openBillTotal = outstandingBillTotal(state);
  const insolvencyDaysRemaining = state.insolvency ? Math.max(0, state.insolvency.bankruptcyGameDay - state.gameDay) : null;

  return (
    <div>
      <div className="page-header">
        <h1>Overview</h1>
      </div>

      <Card title="Today">
        <div className="card-grid">
          <StatTile label="Cash" value={formatCents(state.cash)} />
          <StatTile label="Debt" value={formatCents(state.loan?.remainingBalance ?? 0)} />
          <StatTile label="Outstanding Bills" value={formatCents(openBillTotal)} tone={openBillTotal > 0 ? "negative" : "neutral"} />
          <StatTile label="Revenue Today" value={formatCents(today.revenue)} />
          <StatTile label="Profit Today" value={formatCents(today.netProfit)} tone={today.netProfit >= 0 ? "positive" : "negative"} />
          <StatTile label="Revenue (7d)" value={formatCents(week.revenue)} />
          <StatTile label="Profit (7d)" value={formatCents(week.netProfit)} tone={week.netProfit >= 0 ? "positive" : "negative"} />
        </div>
      </Card>

      <Card title="Operations Snapshot">
        <div className="card-grid">
          <StatTile label="Occupancy" value={`${activeCustomers.length}`} />
          <StatTile label="Employees" value={`${state.employees.length}`} />
          <StatTile label="Open Tabs" value={`${state.tabs.filter((t) => t.status === "open").length}`} />
          <StatTile label="Inventory Warnings" value={`${lowStockItems.length}`} tone={lowStockItems.length > 0 ? "negative" : "neutral"} />
          <StatTile
            label="Service Reputation"
            value={formatPercent(state.reputation.score)}
            tone={state.reputation.score < 40 ? "negative" : state.reputation.score >= 65 ? "positive" : undefined}
          />
          <StatTile
            label="Insolvency"
            value={insolvencyDaysRemaining === null ? "Clear" : `${insolvencyDaysRemaining} days`}
            tone={insolvencyDaysRemaining === null ? "positive" : "negative"}
          />
        </div>
      </Card>

      {state.dailyReports.length > 0 && (
        <Card title="Last 14 Days">
          <TrendChart
            series={[
              { name: "Revenue", color: "#3b82f6", points: revenueSeries },
              { name: "Net Profit", color: "#0891b2", points: profitSeries },
            ]}
            formatValue={(v) => formatCents(v)}
            height={150}
          />
        </Card>
      )}

      <Card title="Recent Reviews">
        <div className="log-panel">
          {recentReviews.length === 0 && <p style={{ color: "var(--text-muted)" }}>No reviews yet.</p>}
          {recentReviews.map((review) => (
            <div key={review.id} className="log-entry">
              <span className="log-time">D{review.gameDay}</span>
              <span className="log-message">
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)} {review.customerName}: {review.text}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Recent Activity">
        <div className="log-panel">
          {recentEvents.length === 0 && <p style={{ color: "var(--text-muted)" }}>Nothing has happened yet.</p>}
          {recentEvents.map((entry) => (
            <div key={entry.id} className={`log-entry severity-${entry.severity}`}>
              <span className="log-time">D{entry.gameDay}</span>
              <span className="log-message">{entry.message}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
