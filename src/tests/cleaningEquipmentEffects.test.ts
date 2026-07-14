import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { commandService } from "@/services/commandService";
import { EventBus } from "@/simulation/events/EventBus";
import { hasOperationalDishwasher, hasOperationalGlassWasher } from "@/simulation/engine/cleaningEquipmentEffects";
import { describeEquipmentBenefit } from "@/data/equipment/equipmentCatalog";
import { activeProperty } from "@/simulation/engine/activeProperty";

describe("cleaningEquipmentEffects", () => {
  it("hasOperationalGlassWasher is true only for an operational/degraded owned glass washer", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    expect(hasOperationalGlassWasher(prop)).toBe(false);

    commandService.purchaseEquipment(state, new EventBus(), "equip-glass-washer");
    expect(hasOperationalGlassWasher(prop)).toBe(true);

    const washer = prop.equipment.find((e) => e.category === "glass_washer")!;
    washer.currentStatus = "failed";
    expect(hasOperationalGlassWasher(prop)).toBe(false);
  });

  it("hasOperationalDishwasher is true only for an operational/degraded owned dishwasher", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    expect(hasOperationalDishwasher(prop)).toBe(false);

    commandService.purchaseEquipment(state, new EventBus(), "equip-dishwasher");
    expect(hasOperationalDishwasher(prop)).toBe(true);
  });

  it("describes the real benefits instead of falling back to the generic message", () => {
    expect(describeEquipmentBenefit("glass_washer")).not.toMatch(/glassware tracking is added/i);
    expect(describeEquipmentBenefit("dishwasher")).not.toMatch(/future kitchen workflows/i);
  });
});
