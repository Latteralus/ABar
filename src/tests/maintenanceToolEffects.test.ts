import { describe, expect, it } from "vitest";
import { createNewGameState } from "@/services/newGameService";
import { commandService } from "@/services/commandService";
import { EventBus } from "@/simulation/events/EventBus";
import { hasOperationalMaintenanceTool } from "@/simulation/engine/maintenanceToolEffects";
import { describeEquipmentBenefit } from "@/data/equipment/equipmentCatalog";
import { activeProperty } from "@/simulation/engine/activeProperty";

describe("maintenanceToolEffects", () => {
  it("hasOperationalMaintenanceTool is true only for an operational/degraded owned tool kit", () => {
    const state = createNewGameState({ saveName: "Test", acquisitionType: "lease", acceptLoan: false });
    const prop = activeProperty(state);
    expect(hasOperationalMaintenanceTool(prop)).toBe(false);

    commandService.purchaseEquipment(state, new EventBus(), "equip-maintenance-kit");
    expect(hasOperationalMaintenanceTool(prop)).toBe(true);

    const tool = prop.equipment.find((e) => e.category === "maintenance_tool")!;
    tool.currentStatus = "failed";
    expect(hasOperationalMaintenanceTool(prop)).toBe(false);
  });

  it("describes the real benefit instead of falling back to the generic message", () => {
    const description = describeEquipmentBenefit("maintenance_tool");
    expect(description).not.toBe("No direct gameplay effect yet.");
    expect(description).not.toMatch(/future hook/i);
  });
});
