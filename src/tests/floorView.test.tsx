import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { commandService } from "@/services/commandService";
import { EventBus } from "@/simulation/events/EventBus";
import { STARTER_PROPERTY } from "@/data/properties/starterProperty";
import { deriveFloorLayout } from "@/features/operations/FloorView";
import { activeProperty } from "@/simulation/engine/activeProperty";
import type { Customer } from "@/types";

function customer(id: string, overrides: Partial<Customer> = {}): Customer {
  return {
    id,
    firstName: `First${id}`,
    lastName: `Last${id}`,
    archetypeId: "archetype-regular",
    ageGroup: "adult",
    incomeLevel: "middle",
    spendingBudget: 5000,
    preferredCategories: ["beer"],
    priceSensitivity: 50,
    patience: 50,
    reviewTendency: 50,
    reorderTendency: 50,
    attractionAffinity: 50,
    intoxication: 0,
    satisfaction: 70,
    groupId: null,
    arrivalGameMinute: Number(id.replace(/\D/g, "")) || 0,
    status: "waiting_to_order",
    seatId: id,
    tabId: null,
    itemsOrderedCount: 0,
    totalSpent: 0,
    statusEnteredAtGameMinute: 0,
    ...overrides,
  };
}

describe("deriveFloorLayout", () => {
  it("renders the same total visual capacity as the property customer capacity", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const layout = deriveFloorLayout(prop, STARTER_PROPERTY);

    const visualSeats = layout.barSeats.length + layout.tables.reduce((sum, table) => sum + table.length, 0);
    expect(visualSeats).toBe(STARTER_PROPERTY.seatingCapacity);
    expect(visualSeats + layout.standingSlots.length).toBe(STARTER_PROPERTY.customerCapacity);
  });

  it("keeps seated customers visually stable by arrival order instead of status time", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    prop.customers.push(
      customer("cust-2", { arrivalGameMinute: 2, statusEnteredAtGameMinute: 1 }),
      customer("cust-1", { arrivalGameMinute: 1, statusEnteredAtGameMinute: 99 }),
    );

    const layout = deriveFloorLayout(prop, STARTER_PROPERTY);

    expect(layout.barSeats[0]?.id).toBe("cust-1");
    expect(layout.barSeats[1]?.id).toBe("cust-2");
  });

  it("places waiting customers into standing capacity before overflow", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    for (let i = 1; i <= 5; i++) {
      prop.customers.push(customer(`wait-${i}`, { status: "waiting_for_seat", seatId: null, arrivalGameMinute: i }));
    }

    const layout = deriveFloorLayout(prop, STARTER_PROPERTY);

    expect(layout.standingCapacity).toBe(4);
    expect(layout.standingSlots.filter(Boolean)).toHaveLength(4);
    expect(layout.overflowLine).toHaveLength(1);
  });

  it("renders more seats once table/bar_stool equipment is purchased", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: true });
    const prop = activeProperty(state);
    commandService.purchaseEquipment(state, new EventBus(), "equip-extra-dining-table");
    commandService.purchaseEquipment(state, new EventBus(), "equip-extra-bar-stools");

    const layout = deriveFloorLayout(prop, STARTER_PROPERTY);
    const visualSeats = layout.barSeats.length + layout.tables.reduce((sum, table) => sum + table.length, 0);

    expect(visualSeats).toBe(STARTER_PROPERTY.seatingCapacity + 8);
    expect(layout.seatedCapacity).toBe(STARTER_PROPERTY.seatingCapacity + 8);
  });
});
