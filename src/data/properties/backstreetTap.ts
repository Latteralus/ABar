import type { Property } from "@/types";

/** Cheapest, roughest rung of the ladder — every number below the starter property, and no starter fridge (forces an early purchase). */
export const BACKSTREET_TAP: Property = {
  id: "property-backstreet-tap",
  name: "Backstreet Tap",
  description: "A cramped taproom down a back alley in a low-income neighborhood. Dirt cheap, but the equipment shows its age and there's nowhere cold to keep anything.",
  purchasePrice: 4_000_00,
  leasePricePerWeek: 35_000,
  customerCapacity: 18,
  seatingCapacity: 14,
  barSeatingSlots: 6,
  tableSeatingSlots: 8,
  equipmentFloorSpaceUnits: 90,
  storageCapacityUnits: 450,
  attractionFloorSpaceUnits: 25,
  neighborhood: {
    averageCustomerIncome: "low",
    trafficLevel: 25,
    competitionLevel: 20,
  },
  existingEquipment: [
    {
      id: "equip-backstreet-bar-1",
      name: "Worn Bar Station",
      category: "bar_station",
      purchasePrice: 0,
      speedRating: 50,
      spaceUnits: 18,
      tier: 1,
      condition: 55,
      currentStatus: "operational",
      repairHistory: [],
    },
    {
      id: "equip-backstreet-pos-1",
      name: "Point of Sale Terminal",
      category: "point_of_sale",
      purchasePrice: 0,
      speedRating: 50,
      spaceUnits: 2,
      tier: 1,
      condition: 50,
      currentStatus: "operational",
      repairHistory: [],
    },
  ],
};
