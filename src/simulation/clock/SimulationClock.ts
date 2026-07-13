import { GAME_TIME_CONFIG } from "@/config/gameConfig";

export type ClockTickHandler = (deltaGameMinutes: number) => void;

/**
 * Owns the mapping from wall-clock real time to elapsed game minutes and drives a tick loop.
 * Deliberately knows nothing about customers, employees, or game day state — it only answers
 * "how much simulated time passed" and calls back into whoever asked (the SimulationEngine).
 */
export class SimulationClock {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private lastRealTimeMs = 0;
  private running = false;
  private readonly onTick: ClockTickHandler;
  private readonly tickIntervalMs: number;

  constructor(onTick: ClockTickHandler, tickIntervalMs = 200) {
    this.onTick = onTick;
    this.tickIntervalMs = tickIntervalMs;
  }

  get isRunning(): boolean {
    return this.running;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastRealTimeMs = Date.now();
    this.intervalHandle = setInterval(() => this.tick(), this.tickIntervalMs);
  }

  pause(): void {
    this.running = false;
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  resume(): void {
    if (this.running) return;
    this.start();
  }

  stop(): void {
    this.pause();
  }

  private tick(): void {
    const now = Date.now();
    const realDeltaMs = now - this.lastRealTimeMs;
    this.lastRealTimeMs = now;
    const deltaGameMinutes = realDeltaMs * GAME_TIME_CONFIG.gameMinutesPerRealMs;
    this.onTick(deltaGameMinutes);
  }
}
