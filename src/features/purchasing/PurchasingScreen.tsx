import { useMemo, useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { formatCents } from "@/utils/money";
import { formatQuantity } from "@/utils/format";
import { getProperty } from "@/data/properties";
import { getStorageUsage, POOL_BY_STORAGE_LOCATION, type StorageUsage } from "@/simulation/engine/spoilage";
import type { InventoryItem, PurchaseOrder, PurchaseOrderLine } from "@/types";

interface SupplyOrderTableProps {
  items: InventoryItem[];
  usage: StorageUsage;
  quantities: Record<string, number>;
  setQuantity: (itemId: string, value: number) => void;
}

function SupplyOrderTable({ items, usage, quantities, setQuantity }: SupplyOrderTableProps) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Unit Cost</th>
          <th>On Hand</th>
          <th>Max Capacity</th>
          <th>Order Qty</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const pool = usage[POOL_BY_STORAGE_LOCATION[item.storageLocation]];
          const roomLeft = Math.max(0, Math.floor(pool.capacity - pool.used));
          const qty = quantities[item.id] ?? 0;
          return (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td>{formatCents(item.averageUnitCost)}</td>
              <td>{formatQuantity(item.quantityOnHand, item.unit)}</td>
              <td>{pool.capacity}</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button className="btn" style={{ padding: "2px 8px" }} onClick={() => setQuantity(item.id, qty - 1)} disabled={qty <= 0}>
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    style={{ width: 70 }}
                    value={qty}
                    onChange={(e) => setQuantity(item.id, Number(e.target.value))}
                  />
                  <button className="btn" style={{ padding: "2px 8px" }} onClick={() => setQuantity(item.id, qty + 1)}>
                    +
                  </button>
                </div>
              </td>
              <td>
                <button className="btn" onClick={() => setQuantity(item.id, roomLeft)} disabled={roomLeft <= 0}>
                  Buy Max ({roomLeft})
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function PurchasingScreen() {
  const state = useGameStore((s) => s.state);
  const placePurchaseOrder = useGameStore((s) => s.placePurchaseOrder);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [payment, setPayment] = useState<"cash" | "tab">("cash");
  const [error, setError] = useState<string | null>(null);

  const totalCost = useMemo(() => {
    if (!state) return 0;
    return state.inventory.reduce((sum, item) => sum + (quantities[item.id] ?? 0) * item.averageUnitCost, 0);
  }, [state, quantities]);

  // Room left is based on current on-hand stock only — it doesn't account for other lines in
  // this same draft order also claiming space in the same pool, so it's a helpful ceiling, not
  // an exact guarantee once you're buying several pool-mates in one order.
  const usage = useMemo(() => (state ? getStorageUsage(state, getProperty(state.propertyId)) : null), [state]);

  const setQuantity = (itemId: string, value: number) => setQuantities((q) => ({ ...q, [itemId]: Math.max(0, Math.round(value)) }));

  if (!state || !usage) return null;

  const foodItems = state.inventory.filter((item) => item.category === "food");
  const drinkItems = state.inventory.filter((item) => item.category !== "food");

  const submit = () => {
    const lines: PurchaseOrderLine[] = state.inventory
      .filter((item) => (quantities[item.id] ?? 0) > 0)
      .map((item) => ({ inventoryItemId: item.id, quantity: quantities[item.id], unitCost: item.averageUnitCost }));
    const result = placePurchaseOrder(lines, payment);
    if (!result.success) {
      setError(result.error ?? "Order failed.");
    } else {
      setError(null);
      setQuantities({});
    }
  };

  const orderColumns: DataTableColumn<PurchaseOrder>[] = [
    { key: "num", header: "PO #", render: (po) => `#${po.orderNumber}` },
    { key: "lines", header: "Items", render: (po) => `${po.lines.length}` },
    { key: "total", header: "Total", render: (po) => formatCents(po.totalCost) },
    {
      key: "payment",
      header: "Payment",
      render: (po) => (po.paymentStatus === "paid" ? <Badge variant="positive">Paid</Badge> : <Badge variant="warning">On Tab</Badge>),
    },
    {
      key: "delivery",
      header: "Delivery",
      render: (po) =>
        po.deliveryStatus === "delivered" ? (
          <Badge variant="positive">Delivered</Badge>
        ) : (
          <Badge variant="neutral">Pending — next open</Badge>
        ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Purchasing</h1>
      </div>

      <Card title="Place Supply Order — Food">
        <SupplyOrderTable items={foodItems} usage={usage} quantities={quantities} setQuantity={setQuantity} />
      </Card>

      <Card title="Place Supply Order — Drinks & Supplies">
        <SupplyOrderTable items={drinkItems} usage={usage} quantities={quantities} setQuantity={setQuantity} />
      </Card>

      <Card title="Order Summary">
        <div className="form-row">
          <label>Payment</label>
          <select value={payment} onChange={(e) => setPayment(e.target.value as "cash" | "tab")}>
            <option value="cash">Pay cash now</option>
            <option value="tab">Put on supply tab</option>
          </select>
        </div>

        <p>Total: {formatCents(totalCost)}</p>
        {error && <p style={{ color: "var(--negative)" }}>{error}</p>}
        <button className="btn btn-primary" onClick={submit} disabled={totalCost === 0}>
          Place Order
        </button>
      </Card>

      <Card title="Purchase Orders">
        <DataTable
          columns={orderColumns}
          rows={[...state.purchaseOrders].reverse()}
          rowKey={(po) => po.id}
          emptyLabel="No orders placed yet."
        />
      </Card>
    </div>
  );
}
