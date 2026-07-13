import type { EquipmentCategory, GameState, Property } from "@/types";

/** Static metadata for equipment the player may purchase (Master Plan Section 33). Starter equipment lives on the Property instead — see starterProperty.ts. */
export interface EquipmentCatalogEntry {
  id: string;
  name: string;
  category: EquipmentCategory;
  purchasePrice: number;
  capacity?: number;
  speedRating: number;
  /** Abstract floor/utility footprint units. Checked against Property.equipmentFloorSpaceUnits. */
  spaceUnits: number;
  /** 1=basic, 2=mid-tier, 3=premium. Higher-tier items are upgrades over lower-tier owned units in the same category. */
  tier: number;
}

export const EQUIPMENT_CATALOG: readonly EquipmentCatalogEntry[] = [
  {
    id: "equip-bar-station-standard",
    name: "Standard Bar Station",
    category: "bar_station",
    purchasePrice: 3_500_00,
    speedRating: 65,
    spaceUnits: 20,
    tier: 2,
  },
  {
    id: "equip-bar-station-premium",
    name: "High-Volume Cocktail Station",
    category: "bar_station",
    purchasePrice: 7_500_00,
    speedRating: 85,
    spaceUnits: 26,
    tier: 3,
  },

  {
    id: "equip-second-fridge",
    name: "Reach-In Refrigerator",
    category: "refrigerator",
    purchasePrice: 1_800_00,
    capacity: 250,
    speedRating: 55,
    spaceUnits: 16,
    tier: 1,
  },
  {
    id: "equip-undercounter-fridge",
    name: "Undercounter Bar Refrigerator",
    category: "refrigerator",
    purchasePrice: 2_400_00,
    capacity: 180,
    speedRating: 70,
    spaceUnits: 10,
    tier: 2,
  },
  {
    id: "equip-walk-in-cooler",
    name: "Small Walk-In Cooler",
    category: "refrigerator",
    purchasePrice: 12_000_00,
    capacity: 1200,
    speedRating: 80,
    spaceUnits: 42,
    tier: 3,
  },

  {
    id: "equip-chest-freezer",
    name: "Chest Freezer",
    category: "freezer",
    purchasePrice: 1_200_00,
    capacity: 150,
    speedRating: 50,
    spaceUnits: 14,
    tier: 1,
  },
  {
    id: "equip-upright-freezer",
    name: "Commercial Upright Freezer",
    category: "freezer",
    purchasePrice: 3_200_00,
    capacity: 350,
    speedRating: 65,
    spaceUnits: 18,
    tier: 2,
  },

  {
    id: "equip-cook-station",
    name: "Commercial Cook Station",
    category: "cooking_equipment",
    purchasePrice: 2_500_00,
    speedRating: 50,
    spaceUnits: 22,
    tier: 1,
  },
  {
    id: "equip-microwave",
    name: "Commercial Microwave",
    category: "cooking_equipment",
    purchasePrice: 650_00,
    speedRating: 40,
    spaceUnits: 4,
    tier: 1,
  },
  {
    id: "equip-countertop-fryer",
    name: "Countertop Deep Fryer",
    category: "cooking_equipment",
    purchasePrice: 900_00,
    speedRating: 55,
    spaceUnits: 8,
    tier: 1,
  },
  {
    id: "equip-floor-fryer",
    name: "Floor Model Deep Fryer",
    category: "cooking_equipment",
    purchasePrice: 2_800_00,
    speedRating: 75,
    spaceUnits: 18,
    tier: 2,
  },
  {
    id: "equip-flat-top-griddle",
    name: "Flat-Top Griddle",
    category: "cooking_equipment",
    purchasePrice: 2_200_00,
    speedRating: 65,
    spaceUnits: 16,
    tier: 2,
  },
  {
    id: "equip-convection-oven",
    name: "Half-Size Convection Oven",
    category: "cooking_equipment",
    purchasePrice: 3_500_00,
    speedRating: 70,
    spaceUnits: 18,
    tier: 2,
  },

  {
    id: "equip-two-tap-draft",
    name: "Two-Tap Draft Beer System",
    category: "draft_system",
    purchasePrice: 2_200_00,
    speedRating: 55,
    spaceUnits: 10,
    tier: 1,
  },
  {
    id: "equip-six-tap-draft",
    name: "Six-Tap Draft Beer System",
    category: "draft_system",
    purchasePrice: 6_500_00,
    speedRating: 75,
    spaceUnits: 18,
    tier: 2,
  },

  {
    id: "equip-glass-washer",
    name: "Underbar Glass Washer",
    category: "glass_washer",
    purchasePrice: 3_000_00,
    speedRating: 65,
    spaceUnits: 10,
    tier: 1,
  },
  {
    id: "equip-dishwasher",
    name: "Commercial Dishwasher",
    category: "dishwasher",
    purchasePrice: 4_500_00,
    speedRating: 65,
    spaceUnits: 16,
    tier: 1,
  },
  {
    id: "equip-storage-shelving",
    name: "Heavy-Duty Storage Shelving",
    category: "storage_shelving",
    purchasePrice: 600_00,
    capacity: 250,
    speedRating: 50,
    spaceUnits: 8,
    tier: 1,
  },
  {
    id: "equip-pos-modern",
    name: "Modern POS Terminal",
    category: "point_of_sale",
    purchasePrice: 1_800_00,
    speedRating: 80,
    spaceUnits: 2,
    tier: 2,
  },
  {
    id: "equip-security-camera",
    name: "Security Camera System",
    category: "security_system",
    purchasePrice: 2_500_00,
    speedRating: 60,
    spaceUnits: 3,
    tier: 1,
  },
  {
    id: "equip-maintenance-kit",
    name: "Maintenance Tool Kit",
    category: "maintenance_tool",
    purchasePrice: 750_00,
    speedRating: 55,
    spaceUnits: 4,
    tier: 1,
  },

  { id: "equip-flat-screen-tv", name: "Flat-Screen TV", category: "tv", purchasePrice: 500_00, speedRating: 50, spaceUnits: 3, tier: 1 },
  {
    id: "equip-large-screen-tv",
    name: "Large-Screen TV",
    category: "tv",
    purchasePrice: 1_400_00,
    speedRating: 50,
    spaceUnits: 5,
    tier: 2,
  },
];

export function getEquipmentCatalogEntry(id: string): EquipmentCatalogEntry {
  const entry = EQUIPMENT_CATALOG.find((item) => item.id === id);
  if (!entry) throw new Error(`Unknown equipment catalog id: ${id}`);
  return entry;
}

export function usedEquipmentSpace(state: GameState): number {
  return state.equipment.reduce((sum, e) => sum + (e.spaceUnits ?? 0), 0);
}

export function isUpgradeForOwnedEquipment(state: GameState, entry: EquipmentCatalogEntry): boolean {
  return state.equipment.some((e) => e.category === entry.category && (e.tier ?? 1) < entry.tier);
}

export function wouldExceedEquipmentSpace(state: GameState, property: Property, entry: EquipmentCatalogEntry): boolean {
  return usedEquipmentSpace(state) + entry.spaceUnits > property.equipmentFloorSpaceUnits;
}

/** Plain-language explanation of what a piece of equipment actually does, for the Equipment screen (Master Plan Section 52 — "avoid unexplained numbers"). */
export function describeEquipmentBenefit(category: EquipmentCategory, capacity?: number): string {
  switch (category) {
    case "cooking_equipment":
      return "Enables or improves food prep capacity (microwaves, fryers, griddles, ovens, cook stations).";
    case "bar_station":
      return "Required to prepare drinks; higher-tier stations support faster drink service.";
    case "refrigerator":
      return `Adds ${capacity ?? 0} units of refrigerated storage capacity.`;
    case "freezer":
      return `Adds ${capacity ?? 0} units of frozen storage capacity.`;
    case "draft_system":
      return "Required to pour draft beer (e.g. Draft Lager) from a keg.";
    case "glass_washer":
      return "Supports faster glass turnaround once glassware tracking is added.";
    case "dishwasher":
      return "Supports dishwashing capacity for future kitchen workflows.";
    case "storage_shelving":
      return `Adds ${capacity ?? 0} units of general storage capacity.`;
    case "point_of_sale":
      return "Speeds up checkout (process_payment tasks) when in good condition.";
    case "security_system":
      return "Future hook for incident prevention and customer safety.";
    case "maintenance_tool":
      return "Future hook for faster/lower-cost staff repairs.";
    case "tv":
      return "Keeps seated customers around longer and occasionally prompts them to order another round while watching.";
    default:
      return "No direct gameplay effect yet.";
  }
}
