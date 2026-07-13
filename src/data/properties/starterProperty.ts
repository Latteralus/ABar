import type { Property } from "@/types";

/** The single predetermined starter property. The Property type supports more than one; only this exists in Stage 1. */
export const STARTER_PROPERTY: Property = {
  id: "property-dive-bar-starter",
  name: "The Rusty Anchor",
  description:
    "A small, worn dive bar on a quiet commercial strip. Low rent, loyal walk-in traffic, and just enough room to get started.",
  purchasePrice: 8_000_00,
  leasePricePerWeek: 60_000,
  customerCapacity: 24,
  seatingCapacity: 20,
  barSeatingSlots: 8,
  tableSeatingSlots: 12,
  equipmentFloorSpaceUnits: 120,
  storageCapacityUnits: 600,
  attractionFloorSpaceUnits: 40,
  neighborhood: {
    averageCustomerIncome: "middle",
    trafficLevel: 45,
    competitionLevel: 35,
  },
  existingEquipment: [
    { id: "equip-bar-station-1", name: "Basic Bar Station", category: "bar_station", purchasePrice: 0, speedRating: 50, spaceUnits: 18, tier: 1, condition: 70, currentStatus: "operational", repairHistory: [] },
    { id: "equip-fridge-1", name: "Back-Bar Refrigerator", category: "refrigerator", purchasePrice: 0, capacity: 200, speedRating: 50, spaceUnits: 14, tier: 1, condition: 65, currentStatus: "operational", repairHistory: [] },
    { id: "equip-pos-1", name: "Point of Sale Terminal", category: "point_of_sale", purchasePrice: 0, speedRating: 50, spaceUnits: 2, tier: 1, condition: 80, currentStatus: "operational", repairHistory: [] },
  ],
};
