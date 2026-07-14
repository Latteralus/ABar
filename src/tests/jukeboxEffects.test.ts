import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { commandService } from "@/services/commandService";
import { EventBus } from "@/simulation/events/EventBus";
import { hasOperationalJukebox, processJukeboxSongs, shouldPlayASong } from "@/simulation/engine/jukeboxEffects";
import { JUKEBOX_CONFIG } from "@/config/jukeboxConfig";
import { advanceCustomers } from "@/simulation/engine/customerLifecycle";
import { describeEquipmentBenefit } from "@/data/equipment/equipmentCatalog";
import { activeProperty } from "@/simulation/engine/activeProperty";
import type { SeededRandom } from "@/simulation/random/SeededRandom";
import type { Customer } from "@/types";

function customer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "cust-1",
    firstName: "Alex",
    lastName: "Kim",
    archetypeId: "archetype-regular",
    ageGroup: "adult",
    incomeLevel: "middle",
    spendingBudget: 5_000,
    preferredCategories: [],
    priceSensitivity: 50,
    patience: 50,
    reviewTendency: 0,
    reorderTendency: 50,
    attractionAffinity: 50,
    intoxication: 0,
    satisfaction: 80,
    groupId: null,
    arrivalGameMinute: 0,
    status: "consuming",
    seatId: "cust-1",
    tabId: null,
    itemsOrderedCount: 1,
    totalSpent: 0,
    statusEnteredAtGameMinute: 0,
    phaseTargetMinutes: 5,
    ...overrides,
  };
}

describe("jukeboxEffects", () => {
  it("hasOperationalJukebox is true only for an operational/degraded owned jukebox", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    expect(hasOperationalJukebox(prop)).toBe(false);

    commandService.purchaseEquipment(state, new EventBus(), "equip-jukebox-classic");
    expect(hasOperationalJukebox(prop)).toBe(true);

    const jukebox = prop.equipment.find((e) => e.category === "jukebox")!;
    jukebox.currentStatus = "degraded";
    expect(hasOperationalJukebox(prop)).toBe(true);

    jukebox.currentStatus = "failed";
    expect(hasOperationalJukebox(prop)).toBe(false);

    jukebox.currentStatus = "awaiting_repair";
    expect(hasOperationalJukebox(prop)).toBe(false);
  });

  it("shouldPlayASong respects the seeded RNG chance roll", () => {
    const alwaysPlays = { chance: () => true } as unknown as SeededRandom;
    const neverPlays = { chance: () => false } as unknown as SeededRandom;
    expect(shouldPlayASong(alwaysPlays, customer())).toBe(true);
    expect(shouldPlayASong(neverPlays, customer())).toBe(false);
  });

  it("charges the flat song fee to revenue_attraction and bumps satisfaction when the roll succeeds", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const bus = new EventBus();
    commandService.purchaseEquipment(state, bus, "equip-jukebox-classic");
    prop.customers.push(customer({ satisfaction: 70 }));
    const cashBefore = state.cash;
    const alwaysPlays = { chance: () => true } as unknown as SeededRandom;

    processJukeboxSongs(state, prop, alwaysPlays, bus);

    expect(state.cash).toBe(cashBefore + JUKEBOX_CONFIG.songFeeCents);
    const feeEntry = state.ledger.find((e) => e.category === "revenue_attraction");
    expect(feeEntry?.amount).toBe(JUKEBOX_CONFIG.songFeeCents);
    const cashEntry = state.ledger.find((e) => e.category === "asset_cash" && e.amount === JUKEBOX_CONFIG.songFeeCents);
    expect(cashEntry).toBeTruthy();
    expect(prop.customers[0].satisfaction).toBe(70 + JUKEBOX_CONFIG.satisfactionGainOnPlayingASong);
  });

  it("does nothing when no jukebox is owned, or none are operational", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    const bus = new EventBus();
    prop.customers.push(customer());
    const cashBefore = state.cash;
    const alwaysPlays = { chance: () => true } as unknown as SeededRandom;

    processJukeboxSongs(state, prop, alwaysPlays, bus);
    expect(state.cash).toBe(cashBefore);

    commandService.purchaseEquipment(state, bus, "equip-jukebox-classic");
    const jukebox = prop.equipment.find((e) => e.category === "jukebox")!;
    jukebox.currentStatus = "failed";
    const cashAfterPurchase = state.cash;

    processJukeboxSongs(state, prop, alwaysPlays, bus);
    expect(state.cash).toBe(cashAfterPurchase);
  });

  it("extends the consuming->deciding_next_order dwell time when a jukebox is operational", () => {
    const rng = { int: () => 10, chance: () => false } as unknown as SeededRandom;

    const withoutJukebox = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const withoutJukeboxProp = activeProperty(withoutJukebox);
    withoutJukeboxProp.customers.push(customer({ statusEnteredAtGameMinute: 0, phaseTargetMinutes: 0 }));
    withoutJukebox.gameMinute = 1;
    advanceCustomers(withoutJukebox, withoutJukeboxProp, rng, new EventBus());
    const targetWithout = withoutJukeboxProp.customers[0].phaseTargetMinutes;

    const withJukebox = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const withJukeboxProp = activeProperty(withJukebox);
    commandService.purchaseEquipment(withJukebox, new EventBus(), "equip-jukebox-classic");
    withJukeboxProp.customers.push(customer({ statusEnteredAtGameMinute: 0, phaseTargetMinutes: 0 }));
    withJukebox.gameMinute = 1;
    advanceCustomers(withJukebox, withJukeboxProp, rng, new EventBus());
    const targetWith = withJukeboxProp.customers[0].phaseTargetMinutes;

    expect(targetWith).toBeGreaterThan(targetWithout!);
  });

  it("describes the real jukebox benefit instead of falling back to the generic message", () => {
    const description = describeEquipmentBenefit("jukebox");
    expect(description).not.toBe("No direct gameplay effect yet.");
    expect(description.length).toBeGreaterThan(0);
  });
});
