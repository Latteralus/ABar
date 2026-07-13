import { STARTER_PROPERTY } from "./starterProperty";
import type { Property } from "@/types";

const PROPERTY_CATALOG: readonly Property[] = [STARTER_PROPERTY];

export function getProperty(id: string): Property {
  const property = PROPERTY_CATALOG.find((p) => p.id === id);
  if (!property) throw new Error(`Unknown property id: ${id}`);
  return property;
}

export { STARTER_PROPERTY };
