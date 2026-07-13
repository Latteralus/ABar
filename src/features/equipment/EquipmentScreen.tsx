import { useGameStore } from "@/stores/gameStore";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { formatCents } from "@/utils/money";
import { formatPercent } from "@/utils/format";
import {
  describeEquipmentBenefit,
  EQUIPMENT_CATALOG,
  isUpgradeForOwnedEquipment,
  usedEquipmentSpace,
  wouldExceedEquipmentSpace,
} from "@/data/equipment/equipmentCatalog";
import { getProperty } from "@/data/properties";
import { activeTaskForEquipment, progressPercent } from "@/utils/taskProgress";
import type { Equipment, EquipmentStatus } from "@/types";

const CATEGORY_LABEL: Record<string, string> = {
  bar_station: "Bar Station",
  refrigerator: "Refrigerator",
  freezer: "Freezer",
  draft_system: "Draft System",
  glass_washer: "Glass Washer",
  dishwasher: "Dishwasher",
  cooking_equipment: "Cooking Equipment",
  table: "Table",
  bar_stool: "Bar Stool",
  storage_shelving: "Storage Shelving",
  point_of_sale: "Point of Sale",
  security_system: "Security System",
  maintenance_tool: "Maintenance Tool",
};

const STATUS_LABEL: Record<EquipmentStatus, string> = {
  operational: "Operational",
  degraded: "Degraded",
  failed: "Failed",
  awaiting_repair: "Awaiting Repair",
  under_repair: "Under Repair",
};

const STATUS_BADGE_VARIANT: Record<EquipmentStatus, "positive" | "warning" | "negative" | "neutral"> = {
  operational: "positive",
  degraded: "warning",
  failed: "negative",
  awaiting_repair: "neutral",
  under_repair: "neutral",
};

export function EquipmentScreen() {
  const state = useGameStore((s) => s.state);
  const purchaseEquipment = useGameStore((s) => s.purchaseEquipment);
  const requestContractRepair = useGameStore((s) => s.requestContractRepair);

  if (!state) return null;
  const property = getProperty(state.propertyId);
  const equipmentSpaceUsed = usedEquipmentSpace(state);

  const columns: DataTableColumn<Equipment>[] = [
    { key: "name", header: "Name", render: (e) => e.name },
    { key: "category", header: "Category", render: (e) => CATEGORY_LABEL[e.category] ?? e.category },
    { key: "benefit", header: "Benefit", render: (e) => describeEquipmentBenefit(e.category, e.capacity) },
    { key: "tier", header: "Tier", render: (e) => `T${e.tier ?? 1}` },
    { key: "space", header: "Space", render: (e) => `${e.spaceUnits ?? 0}` },
    { key: "capacity", header: "Capacity", render: (e) => e.capacity ?? "—" },
    { key: "condition", header: "Condition", render: (e) => `${formatPercent(e.condition)}%` },
    { key: "status", header: "Status", render: (e) => <Badge variant={STATUS_BADGE_VARIANT[e.currentStatus]}>{STATUS_LABEL[e.currentStatus]}</Badge> },
    {
      key: "repairProgress",
      header: "Repair Progress",
      render: (e) => {
        if (e.currentStatus !== "under_repair") return "—";
        const task = activeTaskForEquipment(state, e.id);
        if (!task || !task.assignedEmployeeId) return "—";
        const employee = state.employees.find((emp) => emp.id === task.assignedEmployeeId);
        return `${employee ? `${employee.firstName} ${employee.lastName}` : "Unknown"} — ${progressPercent(task)}%`;
      },
    },
    { key: "repairs", header: "Repairs", render: (e) => `${e.repairHistory.length}` },
    {
      key: "repair",
      header: "",
      render: (e) =>
        e.currentStatus === "failed" ? (
          <button className="btn" onClick={() => requestContractRepair(e.id)}>
            Request Contract Repair
          </button>
        ) : null,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Equipment</h1>
      </div>

      <Card title="Owned Equipment">
        <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
          Equipment space used: {equipmentSpaceUsed} / {property.equipmentFloorSpaceUnits}. Higher-tier items are upgrades over lower-tier owned units in the same category; they still occupy physical space.
        </p>
        <DataTable columns={columns} rows={state.equipment} rowKey={(e) => e.id} emptyLabel="No equipment owned yet." />
      </Card>

      <Card title="Purchase Equipment">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Benefit</th>
              <th>Tier</th>
              <th>Space</th>
              <th>Upgrade</th>
              <th>Price</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {EQUIPMENT_CATALOG.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.name}</td>
                <td>{CATEGORY_LABEL[entry.category] ?? entry.category}</td>
                <td>{describeEquipmentBenefit(entry.category, entry.capacity)}</td>
                <td>T{entry.tier}</td>
                <td>
                  {entry.spaceUnits} ({equipmentSpaceUsed + entry.spaceUnits}/{property.equipmentFloorSpaceUnits})
                </td>
                <td>{isUpgradeForOwnedEquipment(state, entry) ? <Badge variant="positive">Upgrade</Badge> : <Badge variant="neutral">New</Badge>}</td>
                <td>{formatCents(entry.purchasePrice)}</td>
                <td>
                  <button
                    className="btn btn-primary"
                    onClick={() => purchaseEquipment(entry.id)}
                    disabled={state.cash < entry.purchasePrice || wouldExceedEquipmentSpace(state, property, entry)}
                    title={wouldExceedEquipmentSpace(state, property, entry) ? "Not enough equipment floor space in this property." : undefined}
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
