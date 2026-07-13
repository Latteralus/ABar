import { useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { formatCents } from "@/utils/money";
import { formatGameClock } from "@/utils/time";
import { outstandingBillTotal } from "@/simulation/engine/finance";
import { summarizeDay } from "@/simulation/engine/ledgerSummary";
import { summarizeBalanceSheet } from "@/simulation/engine/balanceSheet";
import { summarizeCashFlow } from "@/simulation/engine/cashFlow";
import { ReceiptView } from "./ReceiptView";
import type { Bill, LedgerEntry, Receipt } from "@/types";

export function FinancialsScreen() {
  const state = useGameStore((s) => s.state);
  const payBill = useGameStore((s) => s.payBill);
  const makeLoanPayment = useGameStore((s) => s.makeLoanPayment);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [loanPaymentInput, setLoanPaymentInput] = useState<string>("");
  const [cashFlowRange, setCashFlowRange] = useState<"today" | "week">("today");
  if (!state) return null;

  const today = summarizeDay(state.ledger, state.gameDay);
  const barTipShareToday = state.ledger
    .filter((e) => e.gameDay === state.gameDay && e.category === "revenue_bar_tip_share")
    .reduce((s, e) => s + e.amount, 0);
  const barTipShareAllTime = state.ledger.filter((e) => e.category === "revenue_bar_tip_share").reduce((s, e) => s + e.amount, 0);
  const employeeTipShareAllTime = state.employees.reduce((s, e) => s + e.performance.tipsEarnedCents, 0);
  const recentLedger = [...state.ledger].slice(-30).reverse();
  const recentReceipts = [...state.receipts].slice(-25).reverse();
  const selectedReceipt = state.receipts.find((r) => r.id === selectedReceiptId) ?? null;
  const openBills = state.bills.filter((b) => b.status !== "paid").sort((a, b) => a.dueGameDay - b.dueGameDay);
  const balanceSheet = summarizeBalanceSheet(state);
  const cashFlowFromDay = cashFlowRange === "today" ? state.gameDay : Math.max(1, state.gameDay - 6);
  const cashFlow = summarizeCashFlow(state, cashFlowFromDay, state.gameDay);

  const ledgerColumns: DataTableColumn<LedgerEntry>[] = [
    { key: "time", header: "Time", render: (e) => `D${e.gameDay} ${formatGameClock(e.gameMinute)}` },
    { key: "category", header: "Category", render: (e) => e.category.replace(/_/g, " ") },
    { key: "type", header: "Type", render: (e) => e.type },
    { key: "amount", header: "Amount", render: (e) => formatCents(e.amount) },
    { key: "description", header: "Description", render: (e) => e.description },
  ];

  const receiptColumns: DataTableColumn<Receipt>[] = [
    { key: "num", header: "Receipt #", render: (r) => `#${r.receiptNumber}` },
    { key: "customer", header: "Customer", render: (r) => r.customerName },
    { key: "total", header: "Total", render: (r) => formatCents(r.total) },
    {
      key: "view",
      header: "",
      render: (r) => (
        <button className="btn" onClick={() => setSelectedReceiptId(r.id)}>
          View
        </button>
      ),
    },
  ];

  const billColumns: DataTableColumn<Bill>[] = [
    { key: "due", header: "Due", render: (b) => `Day ${b.dueGameDay}` },
    { key: "kind", header: "Kind", render: (b) => b.kind.replace(/_/g, " ") },
    { key: "desc", header: "Description", render: (b) => b.description },
    { key: "status", header: "Status", render: (b) => b.status },
    { key: "amount", header: "Amount", render: (b) => formatCents(b.amount) },
    {
      key: "pay",
      header: "",
      render: (b) => (
        <button className="btn" onClick={() => payBill(b.id)}>
          Pay
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Financials</h1>
      </div>

      <Card title="Today's Income Statement (Simplified)">
        <div className="card-grid">
          <StatTile label="Revenue" value={formatCents(today.revenue)} />
          <StatTile label="COGS" value={formatCents(today.cogs)} />
          <StatTile label="Gross Profit" value={formatCents(today.grossProfit)} tone={today.grossProfit >= 0 ? "positive" : "negative"} />
          <StatTile label="Operating Expenses" value={formatCents(today.operatingExpenses)} />
          <StatTile label="Net Profit" value={formatCents(today.netProfit)} tone={today.netProfit >= 0 ? "positive" : "negative"} />
          <StatTile
            label="Open Bills"
            value={formatCents(outstandingBillTotal(state))}
            tone={outstandingBillTotal(state) > 0 ? "negative" : "neutral"}
          />
          <StatTile label="Loan Balance" value={formatCents(state.loan?.remainingBalance ?? 0)} />
        </div>
      </Card>

      <Card title="Bills & Obligations">
        <DataTable columns={billColumns} rows={openBills} rowKey={(b) => b.id} emptyLabel="No outstanding bills." />
      </Card>

      {state.loan && (
        <Card title="Loan">
          <div className="card-grid">
            <StatTile label="Remaining Balance" value={formatCents(state.loan.remainingBalance)} />
            <StatTile label="Interest Accrued" value={formatCents(state.loan.interestAccrued)} />
            <StatTile label="Next Due" value={`Day ${state.loan.nextDueGameDay}`} />
            <StatTile label="Minimum Payment" value={formatCents(state.loan.minimumPayment)} />
          </div>
          <div className="form-row" style={{ marginTop: 12 }}>
            <label>Make a payment (early/extra payments reduce interest sooner)</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="number"
                step="0.01"
                style={{ width: 120 }}
                placeholder={(state.loan.minimumPayment / 100).toFixed(2)}
                value={loanPaymentInput}
                onChange={(e) => setLoanPaymentInput(e.target.value)}
              />
              <button
                className="btn btn-primary"
                onClick={() => {
                  const dollars = Number(loanPaymentInput || (state.loan!.minimumPayment / 100).toFixed(2));
                  const result = makeLoanPayment(Math.round(dollars * 100));
                  if (result.success) setLoanPaymentInput("");
                }}
              >
                Make Payment
              </button>
            </div>
          </div>
        </Card>
      )}

      <Card title="Balance Sheet (As of Today)">
        <div className="card-grid">
          <StatTile label="Cash" value={formatCents(balanceSheet.cash)} />
          <StatTile label="Inventory" value={formatCents(balanceSheet.inventoryValue)} />
          <StatTile label="Equipment" value={formatCents(balanceSheet.equipmentValue)} />
          <StatTile label="Attractions" value={formatCents(balanceSheet.attractionValue)} />
          <StatTile label="Property" value={formatCents(balanceSheet.propertyValue)} />
          <StatTile label="Total Assets" value={formatCents(balanceSheet.totalAssets)} tone="positive" />
        </div>
        <div className="card-grid" style={{ marginTop: 12 }}>
          <StatTile label="Loan Payable" value={formatCents(balanceSheet.loanPayable)} />
          <StatTile label="Supply Tabs Payable" value={formatCents(balanceSheet.supplyTabsPayable)} />
          <StatTile label="Accrued Payroll" value={formatCents(balanceSheet.accruedPayroll)} />
          <StatTile label="Utility/Licensing Bills" value={formatCents(balanceSheet.utilityBillsPayable)} />
          <StatTile label="Lease Obligations" value={formatCents(balanceSheet.leaseObligationsPayable)} />
          <StatTile label="Sales Tax Payable" value={formatCents(balanceSheet.salesTaxPayable)} />
          <StatTile label="Total Liabilities" value={formatCents(balanceSheet.totalLiabilities)} tone="negative" />
        </div>
        <div className="card-grid" style={{ marginTop: 12 }}>
          <StatTile label="Owner Capital" value={formatCents(balanceSheet.ownerCapital)} />
          <StatTile
            label="Retained Earnings"
            value={formatCents(balanceSheet.retainedEarnings)}
            tone={balanceSheet.retainedEarnings >= 0 ? "positive" : "negative"}
          />
          <StatTile label="Total Equity" value={formatCents(balanceSheet.totalEquity)} />
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 8 }}>
          Assets ({formatCents(balanceSheet.totalAssets)}) = Liabilities ({formatCents(balanceSheet.totalLiabilities)}) + Equity (
          {formatCents(balanceSheet.totalEquity)}) — balances by construction; Retained Earnings is whatever equity is left over after Owner
          Capital.
        </p>
      </Card>

      <Card
        title="Cash Flow"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <button className={`btn ${cashFlowRange === "today" ? "btn-primary" : ""}`} onClick={() => setCashFlowRange("today")}>
              Today
            </button>
            <button className={`btn ${cashFlowRange === "week" ? "btn-primary" : ""}`} onClick={() => setCashFlowRange("week")}>
              This Week
            </button>
          </div>
        }
      >
        <div className="card-grid">
          <StatTile label="Beginning Cash" value={formatCents(cashFlow.beginningCash)} />
          <StatTile
            label="Operating"
            value={formatCents(cashFlow.operatingCashFlow)}
            tone={cashFlow.operatingCashFlow >= 0 ? "positive" : "negative"}
          />
          <StatTile
            label="Investing"
            value={formatCents(cashFlow.investingCashFlow)}
            tone={cashFlow.investingCashFlow >= 0 ? "positive" : "negative"}
          />
          <StatTile
            label="Financing"
            value={formatCents(cashFlow.financingCashFlow)}
            tone={cashFlow.financingCashFlow >= 0 ? "positive" : "negative"}
          />
          <StatTile
            label="Net Cash Flow"
            value={formatCents(cashFlow.netCashFlow)}
            tone={cashFlow.netCashFlow >= 0 ? "positive" : "negative"}
          />
          <StatTile label="Ending Cash" value={formatCents(cashFlow.endingCash)} />
        </div>
      </Card>

      <Card title="Tips (Section 24: 25% Bar / 75% Split Among Working Staff)">
        <div className="card-grid">
          <StatTile label="Bar Share Today" value={formatCents(barTipShareToday)} />
          <StatTile label="Bar Share All-Time" value={formatCents(barTipShareAllTime)} />
          <StatTile label="Employee Share (career)" value={formatCents(employeeTipShareAllTime)} />
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
        <Card title="Receipts">
          <DataTable columns={receiptColumns} rows={recentReceipts} rowKey={(r) => r.id} emptyLabel="No receipts yet." />
        </Card>
        {selectedReceipt && (
          <Card title="Receipt Detail">
            <ReceiptView receipt={selectedReceipt} />
          </Card>
        )}
      </div>

      <Card title="Ledger">
        <DataTable columns={ledgerColumns} rows={recentLedger} rowKey={(e) => e.id} emptyLabel="No ledger entries yet." />
      </Card>
    </div>
  );
}
