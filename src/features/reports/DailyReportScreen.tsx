import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { RankedBarChart } from "@/components/ui/RankedBarChart";
import { formatCents } from "@/utils/money";
import type { DailyReport, ProductSalesLine } from "@/types";

export function DailyReportView({ report }: { report: DailyReport }) {
  const salesColumns: DataTableColumn<ProductSalesLine>[] = [
    { key: "name", header: "Product", render: (l) => l.productName },
    { key: "qty", header: "Qty Sold", render: (l) => `${l.quantitySold}` },
    { key: "revenue", header: "Revenue", render: (l) => formatCents(l.revenue) },
  ];

  const lossEntries = Object.entries(report.lossReasons) as [string, number][];

  return (
    <Card title={`Day ${report.gameDay} Report`}>
      <div className="card-grid">
        <StatTile label="Customers" value={`${report.customerCount}`} />
        <StatTile label="Groups" value={`${report.groupCount}`} />
        <StatTile label="Revenue" value={formatCents(report.revenue)} />
        <StatTile label="COGS" value={formatCents(report.cogs)} />
        <StatTile label="Gross Profit" value={formatCents(report.grossProfit)} tone={report.grossProfit >= 0 ? "positive" : "negative"} />
        <StatTile label="Payroll Accrued" value={formatCents(report.payrollAccrued)} />
        <StatTile label="Operating Expenses" value={formatCents(report.operatingExpenses)} />
        <StatTile label="Net Profit" value={formatCents(report.netProfit)} tone={report.netProfit >= 0 ? "positive" : "negative"} />
        <StatTile label="Avg Satisfaction" value={`${report.averageSatisfaction}`} />
        <StatTile label="Avg Wait" value={`${report.averageWaitMinutes}m`} />
        <StatTile label="Customers Lost" value={`${report.customersLost}`} tone={report.customersLost > 0 ? "negative" : "neutral"} />
        <StatTile label="Inventory Used" value={`${report.inventoryConsumedUnits}`} />
        <StatTile
          label="Inventory Wasted"
          value={`${report.inventoryWastedUnits}`}
          tone={report.inventoryWastedUnits > 0 ? "negative" : "neutral"}
        />
      </div>

      <p className="card-title" style={{ marginTop: 16 }}>
        Sales by Product
      </p>
      <RankedBarChart
        items={report.salesByProduct.map((l) => ({ label: l.productName, value: l.revenue }))}
        formatValue={(v) => formatCents(v)}
        emptyLabel="No sales."
      />
      <div style={{ marginTop: 12 }}>
        <DataTable columns={salesColumns} rows={report.salesByProduct} rowKey={(l) => l.productId} emptyLabel="No sales." />
      </div>

      {lossEntries.length > 0 && (
        <>
          <p className="card-title" style={{ marginTop: 16 }}>
            Reasons Customers Left
          </p>
          <ul>
            {lossEntries.map(([reason, count]) => (
              <li key={reason}>
                {reason.replace(/_/g, " ")}: {count}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
