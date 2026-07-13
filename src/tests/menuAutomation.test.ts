import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { commandService } from "@/services/commandService";
import { ensureMenuAutoActivation } from "@/simulation/engine/menuAutomation";
import { EventBus } from "@/simulation/events/EventBus";
import type { Employee } from "@/types";

function bartender(): Employee {
  return {
    id: "emp-1",
    firstName: "Test",
    lastName: "Bartender",
    role: "bartender",
    wagePerShiftCents: 10_000,
    personality: [],
    skills: { bartending: 50, serving: 50, cooking: 50, speed: 50, accuracy: 50, charisma: 50, cleanliness: 50, security: 50, management: 50 },
    shiftsWorked: 0,
    hiredAtGameMinute: 0,
    currentTaskId: null,
    status: "idle",
    performance: { customersServed: 0, itemsPrepared: 0, ordersFulfilled: 0, wasteGeneratedCents: 0, tipsEarnedCents: 0 },
  };
}

describe("menuAutomation", () => {
  it("does not activate a listing missing staff or supply", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    ensureMenuAutoActivation(state, new EventBus());
    const listing = state.menu.find((m) => m.productId === "prod-bottled-lager")!;
    expect(listing.isActive).toBe(false);
  });

  it("auto-activates a listing once equipment (already owned), staff, and supply are all satisfied", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.employees.push(bartender());
    const lager = state.inventory.find((i) => i.id === "inv-bottled-lager")!;
    lager.quantityOnHand = 50;

    ensureMenuAutoActivation(state, new EventBus());

    const listing = state.menu.find((m) => m.productId === "prod-bottled-lager")!;
    expect(listing.isActive).toBe(true);
  });

  it("never re-activates a listing the player explicitly turned off, even if capability is satisfied afterward", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    state.employees.push(bartender());
    state.inventory.find((i) => i.id === "inv-bottled-lager")!.quantityOnHand = 50;

    ensureMenuAutoActivation(state, new EventBus());
    expect(state.menu.find((m) => m.productId === "prod-bottled-lager")!.isActive).toBe(true);

    commandService.setMenuActive(state, "prod-bottled-lager", false);
    ensureMenuAutoActivation(state, new EventBus());

    expect(state.menu.find((m) => m.productId === "prod-bottled-lager")!.isActive).toBe(false);
  });

  it("never deactivates an already-active listing", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const listing = state.menu.find((m) => m.productId === "prod-cola")!;
    listing.isActive = true;
    // No staff and no cola syrup on hand — would fail eligibility if re-evaluated, but activation only ever adds, never removes.
    ensureMenuAutoActivation(state, new EventBus());
    expect(listing.isActive).toBe(true);
  });
});
