import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { commandService } from "@/services/commandService";
import { EventBus } from "@/simulation/events/EventBus";
import { hasOperationalMaintenanceTool } from "@/simulation/engine/maintenanceToolEffects";
import { describeEquipmentBenefit } from "@/data/equipment/equipmentCatalog";

describe("maintenanceToolEffects", () => {
  it("hasOperationalMaintenanceTool is true only for an operational/degraded owned tool kit", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    expect(hasOperationalMaintenanceTool(state)).toBe(false);

    commandService.purchaseEquipment(state, new EventBus(), "equip-maintenance-kit");
    expect(hasOperationalMaintenanceTool(state)).toBe(true);

    const tool = state.equipment.find((e) => e.category === "maintenance_tool")!;
    tool.currentStatus = "failed";
    expect(hasOperationalMaintenanceTool(state)).toBe(false);
  });

  it("describes the real benefit instead of falling back to the generic message", () => {
    const description = describeEquipmentBenefit("maintenance_tool");
    expect(description).not.toBe("No direct gameplay effect yet.");
    expect(description).not.toMatch(/future hook/i);
  });
});
