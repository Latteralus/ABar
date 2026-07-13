import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { commandService } from "@/services/commandService";
import { EventBus } from "@/simulation/events/EventBus";
import { closeDay } from "@/simulation/engine/dayCycle";
import { accrueDailyPayroll, generateSundayBills, payBill, updateInsolvency } from "@/simulation/engine/finance";
import type { Employee } from "@/types";

function employee(id: string, wagePerShiftCents: number): Employee {
  return {
    id,
    firstName: "Test",
    lastName: id,
    role: "bartender",
    wagePerShiftCents,
    personality: [],
    skills: { bartending: 50, serving: 50, cooking: 50, speed: 50, accuracy: 50, charisma: 50, cleanliness: 50, security: 50, management: 50 },
    shiftsWorked: 0,
    hiredAtGameMinute: 0,
    currentTaskId: null,
    status: "idle",
    performance: { customersServed: 0, itemsPrepared: 0, ordersFulfilled: 0, wasteGeneratedCents: 0, tipsEarnedCents: 0 },
  };
}

describe("Stage 5 finance", () => {
  it("accrues payroll as an operating expense and payable bill", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.employees.push(employee("a", 10_000), employee("b", 12_000));

    const amount = accrueDailyPayroll(state);

    expect(amount).toBe(22_000);
    expect(state.ledger.some((e) => e.category === "opex_payroll" && e.amount === 22_000)).toBe(true);
    expect(state.ledger.some((e) => e.category === "liability_accrued_payroll" && e.amount === 22_000)).toBe(true);
    expect(state.bills.find((b) => b.kind === "payroll")?.amount).toBe(22_000);
  });

  it("daily reports include wage payroll in net profit", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.employees.push(employee("a", 10_000));
    closeDay(state, new EventBus());

    expect(state.dailyReports[0].payrollAccrued).toBe(10_000);
    expect(state.dailyReports[0].operatingExpenses).toBe(10_000);
    expect(state.dailyReports[0].netProfit).toBe(-10_000);
  });

  it("generates Sunday lease, utility, sales tax, and loan bills", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: true });
    state.gameDay = 7;
    state.ledger.push({ id: "tax", gameDay: 7, gameMinute: 0, category: "liability_sales_tax_payable", type: "credit", amount: 825, description: "tax" });

    generateSundayBills(state, new EventBus());

    expect(state.bills.some((b) => b.kind === "utilities")).toBe(true);
    expect(state.bills.some((b) => b.kind === "lease")).toBe(true);
    expect(state.bills.some((b) => b.kind === "sales_tax" && b.amount === 825)).toBe(true);
    expect(state.bills.some((b) => b.kind === "loan")).toBe(true);
  });

  it("paying a bill reduces cash and clears the liability", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.employees.push(employee("a", 10_000));
    accrueDailyPayroll(state);
    const bill = state.bills[0];
    state.cash = 50_000;

    const result = payBill(state, new EventBus(), bill.id);

    expect(result.success).toBe(true);
    expect(bill.status).toBe("paid");
    expect(state.cash).toBe(50_000 - bill.amount);
    expect(state.ledger.some((e) => e.category === "liability_accrued_payroll" && e.type === "debit" && e.amount === bill.amount)).toBe(true);
  });

  it("creates supply-tab bills when purchase orders are placed on tab", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const result = commandService.placePurchaseOrder(state, new EventBus(), [{ inventoryItemId: "inv-bottled-lager", quantity: 1, unitCost: 100 }], "tab");

    expect(result.success).toBe(true);
    expect(state.bills.some((b) => b.kind === "supply_tab" && b.amount === 100)).toBe(true);
  });

  it("keeps asset_cash entries reconciled to state.cash across a mixed sequence of cash-affecting commands", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: true });
    const bus = new EventBus();

    commandService.placePurchaseOrder(state, bus, [{ inventoryItemId: "inv-bottled-lager", quantity: 5, unitCost: 100 }], "cash");
    commandService.purchaseEquipment(state, bus, "equip-cook-station");
    state.equipment[state.equipment.length - 1].currentStatus = "failed";
    commandService.requestContractRepair(state, bus, state.equipment[state.equipment.length - 1].id);
    state.employees.push(employee("a", 10_000));
    accrueDailyPayroll(state, bus);
    payBill(state, bus, state.bills[0].id);

    const reconciledCash = state.ledger.filter((e) => e.category === "asset_cash").reduce((sum, e) => sum + (e.type === "credit" ? e.amount : -e.amount), 0);
    expect(reconciledCash).toBe(state.cash);
  });

  it("tracks insolvency recovery and bankruptcy", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.cash = -1;
    updateInsolvency(state);
    expect(state.insolvency?.bankruptcyGameDay).toBe(8);

    state.cash = 1;
    updateInsolvency(state);
    expect(state.insolvency).toBeNull();

    state.cash = -1;
    updateInsolvency(state);
    state.gameDay = 8;
    updateInsolvency(state);
    expect(state.dayState).toBe("bankrupt");
  });
});
