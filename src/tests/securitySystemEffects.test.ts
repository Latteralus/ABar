import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { commandService } from "@/services/commandService";
import { EventBus } from "@/simulation/events/EventBus";
import { hasOperationalSecuritySystem } from "@/simulation/engine/securitySystemEffects";
import { describeEquipmentBenefit } from "@/data/equipment/equipmentCatalog";

describe("securitySystemEffects", () => {
  it("hasOperationalSecuritySystem is true only for an operational/degraded owned camera system", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    expect(hasOperationalSecuritySystem(state)).toBe(false);

    commandService.purchaseEquipment(state, new EventBus(), "equip-security-camera");
    expect(hasOperationalSecuritySystem(state)).toBe(true);

    const camera = state.equipment.find((e) => e.category === "security_system")!;
    camera.currentStatus = "failed";
    expect(hasOperationalSecuritySystem(state)).toBe(false);
  });

  it("describes the real benefit instead of falling back to the generic message", () => {
    const description = describeEquipmentBenefit("security_system");
    expect(description).not.toBe("No direct gameplay effect yet.");
    expect(description).not.toMatch(/future hook/i);
  });
});
