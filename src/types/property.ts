import type { Cents, EntityId } from "./common";
import type { Equipment } from "./equipment";

export interface NeighborhoodProfile {
  averageCustomerIncome: "low" | "middle" | "high";
  trafficLevel: number; // 0-100
  competitionLevel: number; // 0-100
}

export type AcquisitionType = "buy" | "lease";

export interface Property {
  id: EntityId;
  name: string;
  description: string;
  purchasePrice: Cents;
  leasePricePerWeek: Cents;
  customerCapacity: number;
  seatingCapacity: number;
  barSeatingSlots: number;
  tableSeatingSlots: number;
  /** Physical/utility room available for equipment footprints. Unlike storage capacity, this is a hard cap. */
  equipmentFloorSpaceUnits: number;
  storageCapacityUnits: number;
  /** Physical floor space available for attractions (pool tables, ...) — a hard cap on purchases, unlike storage capacity which only raises spoilage risk. */
  attractionFloorSpaceUnits: number;
  neighborhood: NeighborhoodProfile;
  existingEquipment: Equipment[];
}

/** The player's acquired copy of a Property — the data model supports owning more than one later. */
export interface OwnedProperty {
  propertyId: EntityId;
  acquisitionType: AcquisitionType;
  acquiredAtGameMinute: number;
}
