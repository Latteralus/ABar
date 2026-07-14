import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { consumeInventoryForOrder } from "@/simulation/engine/orderProcessing";
import { activeProperty } from "@/simulation/engine/activeProperty";
import type { Employee, GameState, Order, OwnedPropertyState } from "@/types";

function makeStateWithStock(): { state: GameState; prop: OwnedPropertyState } {
  const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
  const prop = activeProperty(state);
  for (const item of prop.inventory) item.quantityOnHand = 100;
  return { state, prop };
}

function makeColaOrder(): Order {
  return {
    id: "order-test",
    customerId: "cust-test",
    productId: "prod-cola",
    tabId: "tab-test",
    status: "queued",
    createdAtGameMinute: 0,
    preparedByEmployeeId: null,
    deliveredByEmployeeId: null,
  };
}

function makeBartender(accuracy: number): Employee {
  return {
    id: "emp-test",
    firstName: "Test",
    lastName: "Bartender",
    role: "bartender",
    wagePerShiftCents: 10000,
    personality: [], // no personality effects, isolates the accuracy-skill test
    skills: { bartending: 50, serving: 50, cooking: 50, speed: 50, accuracy, charisma: 50, cleanliness: 50, security: 50, management: 50 },
    shiftsWorked: 0,
    hiredAtGameMinute: 0,
    currentTaskId: null,
    status: "idle",
    performance: { customersServed: 0, itemsPrepared: 0, ordersFulfilled: 0, wasteGeneratedCents: 0, tipsEarnedCents: 0 },
  };
}

describe("consumeInventoryForOrder", () => {
  it("consumes exact recipe quantities at perfect accuracy", () => {
    const { prop } = makeStateWithStock();
    const order = makeColaOrder();
    const colaBefore = prop.inventory.find((i) => i.id === "inv-cola-syrup")!.quantityOnHand;

    const result = consumeInventoryForOrder(prop, order, makeBartender(100));
    expect(result.success).toBe(true);

    const colaAfter = prop.inventory.find((i) => i.id === "inv-cola-syrup")!.quantityOnHand;
    expect(colaBefore - colaAfter).toBeCloseTo(1, 5);
  });

  it("wastes more inventory at low accuracy than at high accuracy", () => {
    const { prop: lowAccuracyProp } = makeStateWithStock();
    const { prop: highAccuracyProp } = makeStateWithStock();

    consumeInventoryForOrder(lowAccuracyProp, makeColaOrder(), makeBartender(0));
    consumeInventoryForOrder(highAccuracyProp, makeColaOrder(), makeBartender(100));

    const lowRemaining = lowAccuracyProp.inventory.find((i) => i.id === "inv-cola-syrup")!.quantityOnHand;
    const highRemaining = highAccuracyProp.inventory.find((i) => i.id === "inv-cola-syrup")!.quantityOnHand;

    expect(lowRemaining).toBeLessThan(highRemaining);
  });

  it("fails gracefully when an ingredient is out of stock", () => {
    const { prop } = makeStateWithStock();
    const colaItem = prop.inventory.find((i) => i.id === "inv-cola-syrup")!;
    colaItem.quantityOnHand = 0;

    const result = consumeInventoryForOrder(prop, makeColaOrder(), makeBartender(100));
    expect(result.success).toBe(false);
    expect(result.missingItemName).toBeTruthy();
  });
});
