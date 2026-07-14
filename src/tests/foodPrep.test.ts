import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { commandService } from "@/services/commandService";
import { EventBus } from "@/simulation/events/EventBus";
import { cogsCategoryForProduct, consumeInventoryForOrder, hasRequiredEquipment } from "@/simulation/engine/orderProcessing";
import { getProduct } from "@/data/products/products";
import { activeProperty } from "@/simulation/engine/activeProperty";
import type { Employee, OwnedPropertyState, Order } from "@/types";

function makeStateWithStock(): OwnedPropertyState {
  const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
  const prop = activeProperty(state);
  for (const item of prop.inventory) item.quantityOnHand = 100;
  return prop;
}

function makeBurgerOrder(): Order {
  return {
    id: "order-test",
    customerId: "cust-test",
    productId: "prod-burger",
    tabId: "tab-test",
    status: "queued",
    createdAtGameMinute: 0,
    preparedByEmployeeId: null,
    deliveredByEmployeeId: null,
  };
}

function makeCook(accuracy: number, cooking: number): Employee {
  return {
    id: "emp-test",
    firstName: "Test",
    lastName: "Cook",
    role: "cook",
    wagePerShiftCents: 10000,
    personality: [],
    skills: { bartending: 50, serving: 50, cooking, speed: 50, accuracy, charisma: 50, cleanliness: 50, security: 50, management: 50 },
    shiftsWorked: 0,
    hiredAtGameMinute: 0,
    currentTaskId: null,
    status: "idle",
    performance: { customersServed: 0, itemsPrepared: 0, ordersFulfilled: 0, wasteGeneratedCents: 0, tipsEarnedCents: 0 },
  };
}

describe("food orders", () => {
  it("categorizes food COGS separately from drinks", () => {
    expect(cogsCategoryForProduct(getProduct("prod-burger"))).toBe("cogs_food_ingredients");
    expect(cogsCategoryForProduct(getProduct("prod-cola"))).toBe("cogs_soft_drink");
    expect(cogsCategoryForProduct(getProduct("prod-whiskey-shot"))).toBe("cogs_alcohol");
  });

  it("consumes the burger recipe's exact ingredients", () => {
    const prop = makeStateWithStock();
    const pattyBefore = prop.inventory.find((i) => i.id === "inv-burger-patty")!.quantityOnHand;

    const result = consumeInventoryForOrder(prop, makeBurgerOrder(), makeCook(100, 100));
    expect(result.success).toBe(true);

    const pattyAfter = prop.inventory.find((i) => i.id === "inv-burger-patty")!.quantityOnHand;
    expect(pattyBefore - pattyAfter).toBeCloseTo(1, 5);
  });

  it("rewards a cook's cooking skill with higher quality, not just accuracy", () => {
    const lowCookingProp = makeStateWithStock();
    const highCookingProp = makeStateWithStock();

    const lowResult = consumeInventoryForOrder(lowCookingProp, makeBurgerOrder(), makeCook(80, 0));
    const highResult = consumeInventoryForOrder(highCookingProp, makeBurgerOrder(), makeCook(80, 100));

    expect(highResult.qualityResult).toBeGreaterThan(lowResult.qualityResult);
  });

  it("hasRequiredEquipment is false for food until a cooking station is owned", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    expect(hasRequiredEquipment(prop, "prod-burger")).toBe(false);

    prop.equipment.push({
      id: "equip-test-grill",
      name: "Test Grill",
      category: "cooking_equipment",
      purchasePrice: 0,
      speedRating: 50,
      condition: 100,
      currentStatus: "operational",
      repairHistory: [],
    });
    expect(hasRequiredEquipment(prop, "prod-burger")).toBe(true);
  });

  it("blocks menu activation for food without the required equipment, with a clear error", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const result = commandService.setMenuActive(state, "prod-burger", true);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/equipment/i);
    expect(prop.menu.find((m) => m.productId === "prod-burger")?.isActive).toBe(false);
  });

  it("allows menu activation for food once the required equipment is purchased", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    commandService.purchaseEquipment(state, new EventBus(), "equip-cook-station");

    const result = commandService.setMenuActive(state, "prod-burger", true);
    expect(result.success).toBe(true);
    expect(prop.menu.find((m) => m.productId === "prod-burger")?.isActive).toBe(true);
  });
});
