import { useGameStore } from "@/stores/gameStore";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { formatCents } from "@/utils/money";
import { formatPercent } from "@/utils/format";
import { getProperty } from "@/data/properties";
import { effectiveSeatingCapacity } from "@/data/equipment/equipmentCatalog";
import { tabSubtotal } from "@/simulation/engine/payments";
import { activeProperty } from "@/simulation/engine/activeProperty";
import type { Tab } from "@/types";
import { CustomerTable } from "./CustomerTable";
import { EmployeeTable } from "./EmployeeTable";
import { ActivityLogPanel } from "./ActivityLogPanel";
import { FloorView } from "./FloorView";
import { summarizeDay } from "@/simulation/engine/ledgerSummary";

export function LiveOperationsScreen() {
  const state = useGameStore((s) => s.state);
  if (!state) return null;
  const prop = activeProperty(state);

  const property = getProperty(prop.propertyId);
  const seating = effectiveSeatingCapacity(prop, property);
  const activeCustomers = prop.customers.filter((c) => c.status !== "left" && c.status !== "removed");
  const waitingCount = activeCustomers.filter((c) => c.status.startsWith("waiting")).length;
  const seatedCount = activeCustomers.filter((c) => c.seatId !== null).length;
  const standingCapacity = Math.max(0, seating.customerCapacity - seating.seatingCapacity);
  const unseatedCount = activeCustomers.filter((c) => c.seatId === null || c.status === "waiting_for_seat").length;
  const today = summarizeDay(state.ledger, state.gameDay);
  const openTabs = prop.tabs.filter((t) => t.status === "open");

  const tabColumns: DataTableColumn<Tab>[] = [
    { key: "num", header: "Tab #", render: (t) => `#${t.tabNumber}` },
    { key: "customer", header: "Customer", render: (t) => t.customerName },
    { key: "items", header: "Items", render: (t) => `${t.lineItems.length}` },
    { key: "total", header: "Running Total", render: (t) => formatCents(tabSubtotal(t)) },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Live Operations</h1>
      </div>

      <Card>
        <div className="card-grid">
          <StatTile label="Customers" value={`${activeCustomers.length} / ${seating.customerCapacity}`} />
          <StatTile
            label="Available Seats"
            value={`${Math.max(0, seating.seatingCapacity - seatedCount)} / ${seating.seatingCapacity}`}
          />
          <StatTile label="Standing / Waiting" value={`${Math.min(unseatedCount, standingCapacity)} / ${standingCapacity}`} />
          <StatTile label="Waiting" value={`${waitingCount}`} />
          <StatTile label="Revenue Today" value={formatCents(today.revenue)} />
          <StatTile label="Open Tabs" value={`${openTabs.length}`} />
          <StatTile
            label="Cleanliness"
            value={formatPercent(prop.barCleanliness)}
            tone={prop.barCleanliness < 40 ? "negative" : prop.barCleanliness < 70 ? undefined : "positive"}
          />
        </div>
      </Card>

      <Card title="Floor">
        <FloorView prop={prop} gameMinute={state.gameMinute} property={property} />
      </Card>

      <Card title="Customers">
        <CustomerTable customers={activeCustomers} gameMinute={state.gameMinute} tabs={prop.tabs} />
      </Card>

      <Card title="Employees">
        <EmployeeTable prop={prop} />
      </Card>

      <Card title="Open Tabs">
        <DataTable columns={tabColumns} rows={openTabs} rowKey={(t) => t.id} emptyLabel="No open tabs." />
      </Card>

      <Card title="Activity Log">
        <ActivityLogPanel entries={state.activityLog.slice(-100)} />
      </Card>
    </div>
  );
}
