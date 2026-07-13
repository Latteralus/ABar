import { nanoid } from "nanoid";

/**
 * Entity IDs are opaque labels, not gameplay decisions — using nanoid here does not threaten
 * save/reload determinism (Master Plan Section 43), which only requires that RNG-driven
 * *decisions* (arrivals, product choice, skill rolls, etc.) flow through SeededRandom.
 */
export function createId(prefix: string): string {
  return `${prefix}-${nanoid(10)}`;
}
