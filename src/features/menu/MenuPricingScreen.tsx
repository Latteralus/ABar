import { useGameStore } from "@/stores/gameStore";
import { Card } from "@/components/ui/Card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { PRODUCT_CATALOG } from "@/data/products/products";
import { Badge } from "@/components/ui/Badge";
import { formatCents } from "@/utils/money";
import { classifyPriceTier, priceTierTone } from "@/utils/pricing";
import { baseCostCentsForProduct } from "@/simulation/engine/orderProcessing";
import type { MenuListing } from "@/types";

interface Row {
  listing: MenuListing;
  name: string;
  category: string;
  costCents: number;
  suggestedPrice: number;
}

export function MenuPricingScreen() {
  const state = useGameStore((s) => s.state);
  const setMenuPrice = useGameStore((s) => s.setMenuPrice);
  const setMenuActive = useGameStore((s) => s.setMenuActive);
  if (!state) return null;

  const rows: Row[] = state.menu.map((listing) => {
    const product = PRODUCT_CATALOG.find((p) => p.id === listing.productId)!;
    return {
      listing,
      name: product.name,
      category: product.category,
      costCents: baseCostCentsForProduct(state, listing.productId),
      suggestedPrice: product.suggestedPrice,
    };
  });

  const setPriceFromMargin = (productId: string, costCents: number, marginPercent: number) => {
    const clampedMargin = Math.min(99, marginPercent);
    const price = costCents <= 0 ? 0 : Math.round(costCents / (1 - clampedMargin / 100));
    setMenuPrice(productId, Math.max(0, price));
  };

  const columns: DataTableColumn<Row>[] = [
    { key: "name", header: "Product", render: (r) => r.name },
    { key: "category", header: "Category", render: (r) => r.category.replace("_", " ") },
    { key: "cost", header: "Cost", render: (r) => formatCents(r.costCents) },
    {
      key: "price",
      header: "Price",
      render: (r) => (
        <input
          type="number"
          step="0.25"
          style={{ width: 90 }}
          value={(r.listing.price / 100).toFixed(2)}
          onChange={(e) => setMenuPrice(r.listing.productId, Math.round(Number(e.target.value) * 100))}
        />
      ),
    },
    {
      key: "margin",
      header: "Margin %",
      render: (r) => {
        const marginPercent = r.listing.price > 0 ? ((r.listing.price - r.costCents) / r.listing.price) * 100 : 0;
        return (
          <input
            type="number"
            step="1"
            style={{ width: 70 }}
            value={Math.round(marginPercent)}
            onChange={(e) => setPriceFromMargin(r.listing.productId, r.costCents, Number(e.target.value))}
          />
        );
      },
    },
    {
      key: "tier",
      header: "Price Tier",
      render: (r) => {
        const tier = classifyPriceTier(r.listing.price, r.suggestedPrice);
        return <Badge variant={priceTierTone(tier)}>{tier}</Badge>;
      },
    },
    {
      key: "active",
      header: "On Menu",
      render: (r) => (
        <input type="checkbox" checked={r.listing.isActive} onChange={(e) => setMenuActive(r.listing.productId, e.target.checked)} />
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Menu &amp; Pricing</h1>
      </div>
      <Card title="Products">
        <p style={{ color: "var(--text-secondary)", marginTop: 0 }}>
          Recipes and ingredients are fixed — choose which products to offer and set the price customers pay. Suggested prices:{" "}
          {PRODUCT_CATALOG.map((p) => `${p.name} ${formatCents(p.suggestedPrice)}`).join(", ")}.
        </p>
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.listing.productId} />
      </Card>
    </div>
  );
}
