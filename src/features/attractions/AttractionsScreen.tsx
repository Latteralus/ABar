import { useGameStore } from "@/stores/gameStore";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { formatCents } from "@/utils/money";
import { formatPercent } from "@/utils/format";
import { ATTRACTION_CATALOG, getAttractionCatalogEntryForCategory } from "@/data/attractions/attractionCatalog";
import { classifyPriceTier, priceTierTone } from "@/utils/pricing";
import { computeAttractionStats, type AttractionStats } from "@/simulation/engine/attractionReporting";
import { activeTaskForAttraction, progressPercent } from "@/utils/taskProgress";
import type { Attraction, AttractionStatus, GameState } from "@/types";

interface Row {
  attraction: Attraction;
  stats: AttractionStats;
}

const CATEGORY_LABEL: Record<string, string> = {
  pool_table: "Pool Table",
};

const STATUS_LABEL: Record<AttractionStatus, string> = {
  operational: "Operational",
  degraded: "Degraded",
  failed: "Failed",
  awaiting_repair: "Awaiting Repair",
  under_repair: "Under Repair",
};

const STATUS_BADGE_VARIANT: Record<AttractionStatus, "positive" | "warning" | "negative" | "neutral"> = {
  operational: "positive",
  degraded: "warning",
  failed: "negative",
  awaiting_repair: "neutral",
  under_repair: "neutral",
};

export function AttractionsScreen() {
  const state = useGameStore((s) => s.state);
  const purchaseAttraction = useGameStore((s) => s.purchaseAttraction);
  const setAttractionPrice = useGameStore((s) => s.setAttractionPrice);
  const requestAttractionContractRepair = useGameStore((s) => s.requestAttractionContractRepair);

  if (!state) return null;
  const rows: Row[] = state.attractions.map((attraction) => ({
    attraction,
    stats: computeAttractionStats(state as GameState, attraction),
  }));

  const columns: DataTableColumn<Row>[] = [
    { key: "name", header: "Name", render: (r) => r.attraction.name },
    { key: "type", header: "Type", render: (r) => CATEGORY_LABEL[r.attraction.category] ?? r.attraction.category },
    {
      key: "status",
      header: "Status",
      render: (r) => <Badge variant={STATUS_BADGE_VARIANT[r.attraction.currentStatus]}>{STATUS_LABEL[r.attraction.currentStatus]}</Badge>,
    },
    {
      key: "price",
      header: "Price/Game",
      render: (r) => (
        <input
          type="number"
          step="0.25"
          style={{ width: 90 }}
          value={(r.attraction.pricePerGameCents / 100).toFixed(2)}
          onChange={(e) => setAttractionPrice(r.attraction.id, Math.round(Number(e.target.value) * 100))}
        />
      ),
    },
    {
      key: "tier",
      header: "Price Tier",
      render: (r) => {
        const catalog = getAttractionCatalogEntryForCategory(r.attraction.category);
        const tier = classifyPriceTier(r.attraction.pricePerGameCents, catalog.pricePerGameCents);
        return <Badge variant={priceTierTone(tier)}>{tier}</Badge>;
      },
    },
    { key: "users", header: "Current Users", render: (r) => `${r.stats.currentUsers}` },
    {
      key: "queue",
      header: "Queue",
      render: (r) => `${r.stats.queueParties} ${r.stats.queueParties === 1 ? "party" : "parties"} (~${r.stats.estimatedWaitMinutes}m wait)`,
    },
    {
      key: "progress",
      header: "Session Progress",
      render: (r) => (r.stats.sessionProgressPercent !== null ? `${r.stats.sessionProgressPercent}%` : "—"),
    },
    { key: "condition", header: "Condition", render: (r) => `${formatPercent(r.attraction.condition)}%` },
    {
      key: "repairProgress",
      header: "Repair/Clean Progress",
      render: (r) => {
        const task = activeTaskForAttraction(state, r.attraction.id);
        if (!task || !task.assignedEmployeeId) return "—";
        const employee = state.employees.find((emp) => emp.id === task.assignedEmployeeId);
        return `${employee ? `${employee.firstName} ${employee.lastName}` : "Unknown"} — ${progressPercent(task)}%`;
      },
    },
    { key: "revenueToday", header: "Revenue Today", render: (r) => formatCents(r.stats.revenueTodayCents) },
    { key: "revenueWeek", header: "Revenue (7d)", render: (r) => formatCents(r.stats.revenueWeekCents) },
    { key: "games", header: "Games Played", render: (r) => `${r.stats.gamesPlayedTotal} total, ${r.stats.gamesPlayedToday} today` },
    { key: "avgWait", header: "Avg Wait", render: (r) => `${r.stats.averageWaitMinutes}m` },
    { key: "abandon", header: "Queue Abandonment", render: (r) => `${r.stats.queueAbandonmentRatePercent}%` },
    {
      key: "satisfaction",
      header: "Satisfaction Effect",
      render: (r) => `${r.stats.satisfactionContributionTotal >= 0 ? "+" : ""}${r.stats.satisfactionContributionTotal}`,
    },
    { key: "secondary", header: "Est. Secondary Sales", render: (r) => formatCents(r.stats.estimatedSecondarySalesCents) },
    { key: "repairs", header: "Repairs", render: (r) => `${r.attraction.repairHistory.length}` },
    {
      key: "repair",
      header: "",
      render: (r) =>
        r.attraction.currentStatus === "failed" ? (
          <button className="btn" onClick={() => requestAttractionContractRepair(r.attraction.id)}>
            Request Contract Repair
          </button>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Attractions</h1>
      </div>

      <Card title="Owned Attractions">
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.attraction.id} emptyLabel="No attractions owned yet." />
      </Card>

      <Card title="Purchase Attraction">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Players</th>
              <th>Price/Game</th>
              <th>Floor Space</th>
              <th>Purchase Price</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ATTRACTION_CATALOG.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.name}</td>
                <td>{CATEGORY_LABEL[entry.category] ?? entry.category}</td>
                <td>
                  {entry.minParticipants}-{entry.maxParticipants}
                </td>
                <td>
                  {formatCents(entry.pricePerGameCents)} <Badge variant="neutral">Mid</Badge>
                </td>
                <td>{entry.floorSpaceUnits}</td>
                <td>{formatCents(entry.purchasePrice)}</td>
                <td>
                  <button
                    className="btn btn-primary"
                    onClick={() => purchaseAttraction(entry.id)}
                    disabled={state.cash < entry.purchasePrice}
                  >
                    Purchase
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
