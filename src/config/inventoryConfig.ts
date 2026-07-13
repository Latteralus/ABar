export const PURCHASING_CONFIG = {
  supplierName: "Metro Beverage & Supply Co.",
  /** Orders placed after close arrive at the start of the next operating day (Master Plan Section 17). */
  deliveryTiming: "next_operating_day_open" as const,
};

export const INVENTORY_CONFIG = {
  /** Default reorder target as a multiple of the reorder minimum, used when seeding starter stock. */
  defaultReorderTargetMultiplier: 3,
};
