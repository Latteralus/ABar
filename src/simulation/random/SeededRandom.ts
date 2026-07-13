/**
 * Centralized deterministic random source. Every random draw anywhere in the simulation must go
 * through an instance of this class — never call Math.random() directly in gameplay code, or
 * save/reload determinism breaks (Master Plan Section 43).
 *
 * Uses mulberry32: a small, fast PRNG with a single 32-bit integer of state, which makes it
 * trivial to persist and restore exactly in a save file.
 */
export class SeededRandom {
  private state: number;
  public readonly seed: number;

  constructor(seed: number, state?: number) {
    this.seed = seed >>> 0;
    this.state = (state ?? seed) >>> 0;
  }

  /** Returns a float in [0, 1). */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Float in [min, max). */
  float(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /** True with the given probability (0-1). */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error("SeededRandom.pick called with an empty array");
    }
    return items[this.int(0, items.length - 1)];
  }

  /** Weighted pick where weights don't need to sum to 1. */
  weightedPick<T>(items: readonly { value: T; weight: number }[]): T {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let roll = this.next() * total;
    for (const item of items) {
      roll -= item.weight;
      if (roll <= 0) return item.value;
    }
    return items[items.length - 1].value;
  }

  getState(): number {
    return this.state;
  }
}
