import { STARTER_PROPERTY } from "./starterProperty";
import { BACKSTREET_TAP } from "./backstreetTap";
import { MAPLE_STREET_PUBLIC_HOUSE } from "./mapleStreetPublicHouse";
import { THE_MERIDIAN_ROOM } from "./theMeridianRoom";
import type { NeighborhoodProfile, Property } from "@/types";

export const PROPERTY_CATALOG: readonly Property[] = [STARTER_PROPERTY, BACKSTREET_TAP, MAPLE_STREET_PUBLIC_HOUSE, THE_MERIDIAN_ROOM];

export function getProperty(id: string): Property {
  const property = PROPERTY_CATALOG.find((p) => p.id === id);
  if (!property) throw new Error(`Unknown property id: ${id}`);
  return property;
}

const INCOME_LABEL: Record<NeighborhoodProfile["averageCustomerIncome"], string> = {
  low: "low-income",
  middle: "middle-income",
  high: "high-income",
};

/** Plain-language explanation of a property's neighborhood, matching equipmentCatalog.ts's describeEquipmentBenefit convention ("avoid unexplained numbers"). */
export function describeNeighborhood(neighborhood: NeighborhoodProfile): string {
  const incomeLabel = INCOME_LABEL[neighborhood.averageCustomerIncome];
  const trafficLabel =
    neighborhood.trafficLevel >= 70 ? "high foot traffic" : neighborhood.trafficLevel >= 40 ? "moderate foot traffic" : "low foot traffic";
  const competitionLabel =
    neighborhood.competitionLevel >= 70
      ? "heavy competition nearby"
      : neighborhood.competitionLevel >= 40
        ? "some competition nearby"
        : "little competition nearby";
  return `A ${incomeLabel} neighborhood with ${trafficLabel} and ${competitionLabel}.`;
}

export { STARTER_PROPERTY, BACKSTREET_TAP, MAPLE_STREET_PUBLIC_HOUSE, THE_MERIDIAN_ROOM };
