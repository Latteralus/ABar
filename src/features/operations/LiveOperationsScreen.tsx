import { useGameStore } from "@/stores/gameStore";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { formatCents } from "@/utils/money";
import { formatPercent } from "@/utils/format";
import { getProperty } from "@/data/properties";
import { tabSubtotal } from "@/simulation/engine/payments";
import type { Tab } from "@/types";
import { CustomerTable } from "./CustomerTable";
import { EmployeeTable } from "./EmployeeTable";
import { ActivityLogPanel } from "./ActivityLogPanel";
import { FloorView } from "./FloorView";
import { summarizeDay } from "@/simulation/engine/ledgerSummary";

export function LiveOperationsScreen() {
  const state = useGameStore((s) => s.state);
  if (!state) return null;

  const property = getProperty(state.propertyId);
  const activeCustomers = state.customers.filter((c) => c.status !== "left" && c.status !== "removed");
  const waitingCount = activeCustomers.filter((c) => c.status.startsWith("waiting")).length;
  const seatedCount = activeCustomers.filter((c) => c.seatId !== null).length;
  const standingCapacity = Math.max(0, property.customerCapacity - property.seatingCapacity);
  const unseatedCount = activeCustomers.filter((c) => c.seatId === null || c.status === "waiting_for_seat").length;
  const today = summarizeDay(state.ledger, state.gameDay);
  const openTabs = state.tabs.filter((t) => t.status === "open");

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
          <StatTile label="Customers" value={`${activeCustomers.length} / ${property.customerCapacity}`} />
          <StatTile label="Available Seats" value={`${Math.max(0, property.seatingCapacity - seatedCount)} / ${property.seatingCapacity}`} />
          <StatTile label="Standing / Waiting" value={`${Math.min(unseatedCount, standingCapacity)} / ${standingCapacity}`} />
          <StatTile label="Waiting" value={`${waitingCount}`} />
          <StatTile label="Revenue Today" value={formatCents(today.revenue)} />
          <StatTile label="Open Tabs" value={`${openTabs.length}`} />
          <StatTile
            label="Cleanliness"
            value={formatPercent(state.barCleanliness)}
            tone={state.barCleanliness < 40 ? "negative" : state.barCleanliness < 70 ? undefined : "positive"}
          />
        </div>
      </Card>

      <Card title="Floor">
        <FloorView state={state} property={property} />
      </Card>

      <Card title="Customers">
        <CustomerTable customers={activeCustomers} gameMinute={state.gameMinute} tabs={state.tabs} />
      </Card>

      <Card title="Employees">
        <EmployeeTable state={state} />
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
