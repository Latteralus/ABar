import { describe, expect, it } from "vitest";
import { SeededRandom } from "@/simulation/random/SeededRandom";

describe("SeededRandom", () => {
  it("produces an identical sequence for the same seed", () => {
    const a = new SeededRandom(12345);
    const b = new SeededRandom(12345);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = new SeededRandom(1);
    const b = new SeededRandom(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it("resumes deterministically from a persisted state", () => {
    const original = new SeededRandom(777);
    original.next();
    original.next();
    const savedState = original.getState();
    const expectedNext = original.next();

    const resumed = new SeededRandom(777, savedState);
    expect(resumed.next()).toBe(expectedNext);
  });

  it("int() stays within the requested inclusive bounds", () => {
    const rng = new SeededRandom(42);
    for (let i = 0; i < 200; i++) {
      const value = rng.int(3, 7);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(7);
    }
  });
});
