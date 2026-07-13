import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { summarizeBalanceSheet } from "@/simulation/engine/balanceSheet";

describe("balance sheet", () => {
  it("sums assets from cash, inventory, equipment, and attractions, and always balances by construction", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: true });
    state.cash = 500_00;
    state.inventory[0].quantityOnHand = 10;
    state.inventory[0].averageUnitCost = 200;
    state.equipment.push({
      id: "equip-test",
      name: "Test Fridge",
      category: "refrigerator",
      purchasePrice: 1_000_00,
      speedRating: 50,
      condition: 100,
      currentStatus: "operational",
      repairHistory: [],
    });

    const sheet = summarizeBalanceSheet(state);

    expect(sheet.cash).toBe(500_00);
    expect(sheet.inventoryValue).toBe(2_000);
    expect(sheet.equipmentValue).toBe(1_000_00);
    expect(sheet.propertyValue).toBe(0); // leased, not owned
    expect(sheet.totalAssets).toBe(sheet.cash + sheet.inventoryValue + sheet.equipmentValue + sheet.attractionValue + sheet.propertyValue);
    expect(sheet.totalAssets).toBe(sheet.totalLiabilities + sheet.totalEquity);
  });

  it("reads loan payable from the Loan object directly, including accrued interest not mirrored to the ledger", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: true });
    state.loan!.remainingBalance = 900_000;
    state.loan!.interestAccrued = 5_000;

    const sheet = summarizeBalanceSheet(state);

    expect(sheet.loanPayable).toBe(905_000);
  });

  it("values an owned (not leased) property", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "buy", acceptLoan: false });
    const sheet = summarizeBalanceSheet(state);
    expect(sheet.propertyValue).toBeGreaterThan(0);
  });
});
