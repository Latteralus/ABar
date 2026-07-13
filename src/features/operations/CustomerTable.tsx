import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { formatCents } from "@/utils/money";
import { formatPercent } from "@/utils/format";
import { tabSubtotal } from "@/simulation/engine/payments";
import type { Customer, GameState, Tab } from "@/types";

export const STATUS_LABEL: Record<Customer["status"], string> = {
  considering_visit: "Considering",
  arriving: "Arriving",
  waiting_for_seat: "Waiting for Seat",
  seated: "Seated",
  waiting_to_order: "Waiting to Order",
  waiting_for_drink: "Waiting for Drink",
  waiting_for_food: "Waiting for Food",
  consuming: "Consuming",
  deciding_next_order: "Deciding",
  waiting_for_attraction: "Waiting for Attraction",
  using_attraction: "At Attraction",
  waiting_to_pay: "Waiting to Pay",
  leaving: "Leaving",
  left: "Left",
  removed: "Removed",
};

interface CustomerTableProps {
  customers: Customer[];
  gameMinute: GameState["gameMinute"];
  tabs: Tab[];
}

/** While a tab is still open, its total isn't known yet (tax/tip are only computed at payment) — show the running subtotal, same number the Open Tabs table shows, instead of the stale `totalSpent` (which only updates once the tab is actually paid). */
function currentTabTotal(customer: Customer, tabs: Tab[]): number {
  const tab = tabs.find((t) => t.id === customer.tabId);
  if (tab && tab.status === "open") return tabSubtotal(tab);
  return customer.totalSpent;
}

export function CustomerTable({ customers, gameMinute, tabs }: CustomerTableProps) {
  const columns: DataTableColumn<Customer>[] = [
    { key: "name", header: "Name", render: (c) => `${c.firstName} ${c.lastName}` },
    {
      key: "status",
      header: "Status",
      render: (c) => <Badge variant={c.status === "left" ? "neutral" : "positive"}>{STATUS_LABEL[c.status]}</Badge>,
    },
    { key: "wait", header: "Wait", render: (c) => `${Math.max(0, gameMinute - c.statusEnteredAtGameMinute)}m` },
    { key: "satisfaction", header: "Satisfaction", render: (c) => formatPercent(c.satisfaction) },
    { key: "intoxication", header: "Intoxication", render: (c) => formatPercent(c.intoxication) },
    { key: "items", header: "Items", render: (c) => `${c.itemsOrderedCount}` },
    { key: "tab", header: "Tab Total", render: (c) => formatCents(currentTabTotal(c, tabs)) },
  ];

  return <DataTable columns={columns} rows={customers} rowKey={(c) => c.id} emptyLabel="No customers right now." />;
}
