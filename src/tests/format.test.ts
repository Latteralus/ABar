import { describe, expect, it } from "vitest";
import { clampRound } from "@/utils/clamp";
import { formatPercent, formatQuantity } from "@/utils/format";

describe("clampRound", () => {
  it("kills binary floating-point noise without collapsing to a whole number", () => {
    // Reproduces the reported bug: repeated += 0.15 drifts to garbage like 79.20000000000016.
    let satisfaction = 79.05;
    satisfaction = satisfaction + 0.15000000000000002; // simulate the drift a real float addition produces
    expect(clampRound(satisfaction)).toBe(79.2);
  });

  it("preserves slow sub-1 accumulation across repeated small increments", () => {
    let satisfaction = 50;
    for (let i = 0; i < 5; i++) {
      satisfaction = clampRound(satisfaction + 0.15);
    }
    expect(satisfaction).toBeGreaterThan(50);
    expect(satisfaction).toBeCloseTo(50.75, 5);
  });

  it("clamps to the given bounds", () => {
    expect(clampRound(150)).toBe(100);
    expect(clampRound(-10)).toBe(0);
  });
});

describe("formatPercent", () => {
  it("rounds to a whole number for display", () => {
    expect(formatPercent(79.20000000000016)).toBe("79");
    expect(formatPercent(50.75)).toBe("51");
  });
});

describe("formatQuantity", () => {
  it("rounds discrete units (bottles, cases, ...) to a whole number", () => {
    expect(formatQuantity(152.78622399999998, "bottle")).toBe("153");
    expect(formatQuantity(3.4, "serving")).toBe("3");
  });

  it("keeps up to 2 decimal places for continuous/measured units", () => {
    expect(formatQuantity(105.28048927848, "ounce")).toBe("105.28");
    expect(formatQuantity(12, "fluid_ounce")).toBe("12");
  });
});
