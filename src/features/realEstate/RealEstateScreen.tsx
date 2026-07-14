import { useGameStore } from "@/stores/gameStore";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { formatCents } from "@/utils/money";
import { PROPERTY_CATALOG, describeNeighborhood } from "@/data/properties";
import { findOwnedProperty } from "@/simulation/engine/activeProperty";
import type { GameState, OwnedPropertyState, Property } from "@/types";

interface PortfolioRow {
  prop: OwnedPropertyState;
  catalogEntry: Property;
  isActive: boolean;
}

function performanceSummary(row: PortfolioRow): string {
  if (row.isActive) return "Live — see Overview/Financials for today's numbers";
  const estimate = row.prop.backgroundEstimate;
  if (!estimate || estimate.sampleDayCount === 0) return "Not yet estimated";
  return `~${formatCents(estimate.averageDailyRevenue)} revenue / ~${formatCents(estimate.averageDailyCogs)} COGS per day (${estimate.sampleDayCount}d avg)`;
}

export function RealEstateScreen() {
  const state = useGameStore((s) => s.state) as GameState | null;
  const leaseOrBuyProperty = useGameStore((s) => s.leaseOrBuyProperty);
  const switchActiveProperty = useGameStore((s) => s.switchActiveProperty);
  const endLeaseOrSellProperty = useGameStore((s) => s.endLeaseOrSellProperty);
  if (!state) return null;

  const canSwitchNow = state.dayState === "between_days";
  const marketEntries = PROPERTY_CATALOG.filter((entry) => !findOwnedProperty(state, entry.id));
  const portfolioRows: PortfolioRow[] = state.properties.map((prop) => ({
    prop,
    catalogEntry: PROPERTY_CATALOG.find((p) => p.id === prop.propertyId)!,
    isActive: prop.propertyId === state.activePropertyId,
  }));

  const marketColumns: DataTableColumn<Property>[] = [
    { key: "name", header: "Name", render: (p) => p.name },
    { key: "neighborhood", header: "Neighborhood", render: (p) => describeNeighborhood(p.neighborhood) },
    { key: "capacity", header: "Customer Capacity", render: (p) => `${p.customerCapacity}` },
    { key: "seating", header: "Seating", render: (p) => `${p.seatingCapacity}` },
    { key: "lease", header: "Lease/wk", render: (p) => formatCents(p.leasePricePerWeek) },
    { key: "buy", header: "Purchase Price", render: (p) => formatCents(p.purchasePrice) },
    {
      key: "actions",
      header: "",
      render: (p) => (
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => leaseOrBuyProperty(p.id, "lease")}>
            Lease
          </button>
          <button
            className="btn btn-primary"
            onClick={() => leaseOrBuyProperty(p.id, "buy")}
            disabled={(state.cash ?? 0) < p.purchasePrice}
          >
            Buy
          </button>
        </div>
      ),
    },
  ];

  const portfolioColumns: DataTableColumn<PortfolioRow>[] = [
    { key: "name", header: "Name", render: (r) => r.catalogEntry.name },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge variant={r.isActive ? "positive" : "neutral"}>
          {r.isActive ? "Active" : "Background"}
        </Badge>
      ),
    },
    { key: "acquisition", header: "Acquisition", render: (r) => (r.prop.acquisitionType === "buy" ? "Bought" : "Leased") },
    { key: "performance", header: "Trailing Performance", render: performanceSummary },
    {
      key: "switch",
      header: "",
      render: (r) =>
        r.isActive ? null : (
          <button
            className="btn"
            onClick={() => switchActiveProperty(r.prop.propertyId)}
            disabled={!canSwitchNow}
            title={canSwitchNow ? undefined : "Switching is only allowed between days — close out the current day first."}
          >
            Switch Here
          </button>
        ),
    },
    {
      key: "close",
      header: "",
      render: (r) =>
        r.isActive || state.properties.length <= 1 ? null : (
          <button className="btn btn-danger" onClick={() => endLeaseOrSellProperty(r.prop.propertyId)}>
            {r.prop.acquisitionType === "buy" ? "Sell" : "End Lease"}
          </button>
        ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Real Estate</h1>
      </div>

      <Card title="Portfolio">
        <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
          Only the active property is fully simulated minute-by-minute. Every other owned property keeps paying its own rent/payroll/utilities
          and posts an estimated revenue/COGS day derived from its own trailing real history.
        </p>
        <DataTable columns={portfolioColumns} rows={portfolioRows} rowKey={(r) => r.prop.propertyId} />
      </Card>

      <Card title="Market">
        <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
          Leasing costs nothing up front but pays rent every week. Buying costs more today but no landlord and adds a resale value if you
          ever close the location out. Nothing is transferable between properties — equipment, staff, and inventory all stay put.
        </p>
        <DataTable columns={marketColumns} rows={marketEntries} rowKey={(p) => p.id} emptyLabel="Every catalog property is already owned." />
      </Card>
    </div>
  );
}
