import type { GameState } from "./gameState";

/** Bump when GameState's shape changes; saveService uses this to run migrations. */
export const CURRENT_SAVE_VERSION = 10;

export interface SaveFileEnvelope {
  version: number;
  savedAtIso: string;
  state: GameState;
}

export interface SaveSummary {
  saveId: string;
  saveName: string;
  createdAtIso: string;
  lastPlayedAtIso: string;
  gameDay: number;
  cash: number;
}
