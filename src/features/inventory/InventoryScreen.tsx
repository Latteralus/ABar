import { useGameStore } from "@/stores/gameStore";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { formatCents } from "@/utils/money";
import { formatQuantity } from "@/utils/format";
import { GAME_TIME_CONFIG } from "@/config/gameConfig";
import { getProperty } from "@/data/properties";
import { getStorageUsage, type StorageUsage } from "@/simulation/engine/spoilage";
import { activeProperty } from "@/simulation/engine/activeProperty";
import type { InventoryItem } from "@/types";

const POOL_LABEL: Record<keyof StorageUsage, string> = {
  general: "General / Bar / Kitchen Storage",
  refrigerated: "Refrigerated Storage",
  frozen: "Frozen Storage",
};

const columns: DataTableColumn<InventoryItem>[] = [
  { key: "name", header: "Item", render: (i) => i.name },
  { key: "category", header: "Category", render: (i) => i.category.replace("_", " ") },
  { key: "onHand", header: "On Hand", render: (i) => `${formatQuantity(i.quantityOnHand, i.unit)} ${i.unit}` },
  { key: "pending", header: "Incoming", render: (i) => `${i.pendingDeliveryQuantity}` },
  { key: "reorder", header: "Reorder Min", render: (i) => `${i.reorderMinimum}` },
  { key: "cost", header: "Avg Cost", render: (i) => formatCents(i.averageUnitCost) },
  { key: "storage", header: "Storage", render: (i) => i.storageLocation.replace("_", " ") },
  { key: "freshness", header: "Freshness", render: renderFreshness },
  {
    key: "status",
    header: "Status",
    render: (i) => (i.quantityOnHand < i.reorderMinimum ? <Badge variant="negative">Low</Badge> : <Badge variant="positive">OK</Badge>),
  },
];

export function InventoryScreen() {
  const state = useGameStore((s) => s.state);
  if (!state) return null;

  const prop = activeProperty(state);
  const property = getProperty(prop.propertyId);
  const usage = getStorageUsage(prop, property);
  const foodItems = prop.inventory.filter((item) => item.category === "food");
  const drinkItems = prop.inventory.filter((item) => item.category !== "food");

  return (
    <div>
      <div className="page-header">
        <h1>Inventory</h1>
      </div>

      <Card title="Storage Capacity">
        {(Object.keys(usage) as (keyof StorageUsage)[]).map((pool) => {
          const { used, capacity } = usage[pool];
          const overCapacity = used > capacity;
          return (
            <p key={pool}>
              {POOL_LABEL[pool]}: {Math.round(used)} / {capacity} units{" "}
              {overCapacity && <Badge variant="warning">Over capacity — spoilage risk increased</Badge>}
            </p>
          );
        })}
      </Card>

      <Card title="Stock Levels — Food">
        <DataTable columns={columns} rows={foodItems} rowKey={(i) => i.id} emptyLabel="No food items in the catalog." />
      </Card>

      <Card title="Stock Levels — Drinks & Supplies">
        <DataTable columns={columns} rows={drinkItems} rowKey={(i) => i.id} emptyLabel="No drink items in the catalog." />
      </Card>
    </div>
  );
}

function renderFreshness(item: InventoryItem) {
  if (item.shelfLifeGameMinutes === undefined) return "—";
  const shelfLifeDays = item.shelfLifeGameMinutes / GAME_TIME_CONFIG.operatingDayLengthMinutes;
  const daysLeft = Math.max(0, Math.ceil(shelfLifeDays - item.daysSinceLastRestock));
  if (daysLeft <= 1) return <Badge variant="negative">{daysLeft}d left</Badge>;
  if (daysLeft <= Math.ceil(shelfLifeDays * 0.3)) return <Badge variant="warning">{daysLeft}d left</Badge>;
  return `${daysLeft}d left`;
}
