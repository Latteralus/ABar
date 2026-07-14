import { ENGINE_CONFIG } from "@/config/gameConfig";
import { isPastClosingTime } from "@/simulation/clock/gameTime";
import { SimulationClock } from "@/simulation/clock/SimulationClock";
import { EventBus } from "@/simulation/events/EventBus";
import { SeededRandom } from "@/simulation/random/SeededRandom";
import type { GameState } from "@/types";
import { processArrivals } from "./customerArrivals";
import { advanceCustomers } from "./customerLifecycle";
import { advanceEmployees } from "./employeeAI";
import { ensureOrderTasks } from "./orderProcessing";
import { ensureSeatingTasks } from "./seatingTasks";
import { ensureCleaningTasks } from "./cleaning";
import { processIntoxicatedCustomers } from "./intoxicationHandling";
import { generateStaffIdleFlavor } from "./staffIdleFlavor";
import { ensureMaintenanceTasks, processEquipmentWear } from "./equipmentMaintenance";
import { processJukeboxSongs } from "./jukeboxEffects";
import { processAttractionDecisions } from "./customerAttractionDecisions";
import { ensureAttractionQueueProgress } from "./attractionQueue";
import { advanceAttractionSessions } from "./attractionSessions";
import { ensureAttractionTasks } from "./attractionTasks";
import { processAttractionWear } from "./attractionCondition";
import { closeDay, openDay } from "./dayCycle";

export type EngineCommitHandler = (state: GameState) => void;

/**
 * Orchestrates one simulated minute at a time by composing the focused engine modules
 * (arrivals, customer lifecycle, employee AI, day cycle). Holds the single mutable working
 * copy of GameState; React never touches this object directly — it only sees committed
 * snapshots pushed through the onCommit callback (Master Plan Section 47).
 */
export class SimulationEngine {
  private readonly clock: SimulationClock;
  private rng: SeededRandom;
  private readonly bus = new EventBus();
  private accumulatedGameMinutes = 0;
  private state: GameState;
  private readonly onCommit: EngineCommitHandler;

  constructor(initialState: GameState, onCommit: EngineCommitHandler) {
    this.state = initialState;
    this.rng = new SeededRandom(initialState.rngSeed, initialState.rngState);
    this.onCommit = onCommit;
    this.clock = new SimulationClock((delta) => this.handleClockTick(delta), ENGINE_CONFIG.clockTickIntervalMs);
  }

  get eventBus(): EventBus {
    return this.bus;
  }

  getState(): GameState {
    return this.state;
  }

  /** Swaps in a freshly loaded save, resetting the RNG to the saved state for deterministic continuation. */
  replaceState(state: GameState): void {
    this.state = state;
    this.rng = new SeededRandom(state.rngSeed, state.rngState);
    this.accumulatedGameMinutes = 0;
    this.commit();
  }

  start(): void {
    this.clock.start();
  }

  pause(): void {
    this.state.isPaused = true;
    this.clock.pause();
    this.commit();
  }

  resume(): void {
    this.state.isPaused = false;
    this.clock.resume();
    this.commit();
  }

  /** Lets player-command handlers (hire, price change, open bar, ...) push their mutation immediately. */
  commitNow(): void {
    this.commit();
  }

  /** Routes player-triggered randomness (e.g. generating hiring candidates) through the same seeded RNG as the tick loop, preserving determinism (Section 43). */
  generateWithRandom<T>(fn: (rng: SeededRandom) => T): T {
    const result = fn(this.rng);
    this.state.rngState = this.rng.getState();
    return result;
  }

  /** Manual "Open Bar" — used both for the very first day and whenever auto-open is off. */
  openBarNow(): void {
    if (this.state.dayState !== "between_days") return;
    openDay(this.state, this.bus);
    this.commit();
  }

  private handleClockTick(deltaGameMinutes: number): void {
    if (this.state.isPaused || this.state.dayState !== "open") return;

    this.accumulatedGameMinutes += deltaGameMinutes;
    let advanced = false;
    while (this.accumulatedGameMinutes >= 1) {
      this.advanceOneMinute();
      this.accumulatedGameMinutes -= 1;
      advanced = true;
    }
    if (advanced) this.commit();
  }

  private advanceOneMinute(): void {
    const state = this.state;
    state.gameMinute += 1;

    processArrivals(state, this.rng, this.bus);
    advanceCustomers(state, this.rng, this.bus);
    processAttractionDecisions(state, this.rng, this.bus);
    ensureAttractionQueueProgress(state, this.bus);
    advanceAttractionSessions(state, this.bus);
    ensureAttractionTasks(state, this.bus);
    processAttractionWear(state, this.rng, this.bus);
    ensureOrderTasks(state, this.rng, this.bus);
    ensureSeatingTasks(state);
    ensureCleaningTasks(state);
    ensureMaintenanceTasks(state, this.bus);
    processEquipmentWear(state, this.rng, this.bus);
    processJukeboxSongs(state, this.rng, this.bus);
    processIntoxicatedCustomers(state, this.rng, this.bus);
    advanceEmployees(state, this.rng, this.bus);
    generateStaffIdleFlavor(state, this.rng, this.bus);

    state.rngState = this.rng.getState();

    if (isPastClosingTime(state.gameMinute)) {
      closeDay(state, this.bus);
      if (state.autoOpenEnabled) {
        openDay(state, this.bus);
      }
    }
  }

  private commit(): void {
    this.state.lastPlayedAtIso = new Date().toISOString();
    this.onCommit(this.state);
  }
}
