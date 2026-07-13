import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { EventBus } from "@/simulation/events/EventBus";
import { closeDay, openDay } from "@/simulation/engine/dayCycle";

describe("dayCycle", () => {
  it("delivers pending purchase orders when the next day opens", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const bus = new EventBus();

    state.purchaseOrders.push({
      id: "po-1",
      orderNumber: 1,
      orderedAtGameMinute: 0,
      expectedDeliveryGameMinute: 0,
      lines: [{ inventoryItemId: "inv-bottled-lager", quantity: 24, unitCost: 110 }],
      totalCost: 24 * 110,
      paymentStatus: "paid",
      deliveryStatus: "pending",
    });

    openDay(state, bus);

    const lager = state.inventory.find((i) => i.id === "inv-bottled-lager")!;
    expect(lager.quantityOnHand).toBe(24);
    expect(state.purchaseOrders[0].deliveryStatus).toBe("delivered");
    expect(state.dayState).toBe("open");
    expect(state.gameMinute).toBe(0);
  });

  it("closeDay advances the day counter and stores a report, then returns control to between_days", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const bus = new EventBus();
    openDay(state, bus);

    closeDay(state, bus);

    expect(state.dailyReports).toHaveLength(1);
    expect(state.dailyReports[0].gameDay).toBe(1);
    expect(state.gameDay).toBe(2);
    expect(state.dayState).toBe("between_days");
  });
});
