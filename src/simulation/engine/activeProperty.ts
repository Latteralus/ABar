import type { EntityId, GameState, OwnedPropertyState } from "@/types";

/** The one property currently getting the full live minute-by-minute simulation. Every engine/UI
 * file that used to read a top-level GameState array (state.customers, state.equipment, ...)
 * reads it off this instead. */
export function activeProperty(state: GameState): OwnedPropertyState {
  const found = state.properties.find((p) => p.propertyId === state.activePropertyId);
  if (!found) throw new Error(`No owned property state for active id: ${state.activePropertyId}`);
  return found;
}

/** Every owned property except the active one — these run on the background daily estimate (see backgroundOperations.ts) instead of live simulation. */
export function backgroundProperties(state: GameState): OwnedPropertyState[] {
  return state.properties.filter((p) => p.propertyId !== state.activePropertyId);
}

export function findOwnedProperty(state: GameState, propertyId: EntityId): OwnedPropertyState | undefined {
  return state.properties.find((p) => p.propertyId === propertyId);
}
