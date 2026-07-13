import { describe, expect, it } from "vitest";
import { formatClockTime, isPastClosingTime, minuteOfDayToClockTime } from "@/simulation/clock/gameTime";

describe("gameTime", () => {
  it("starts the operating day at 2:00 p.m.", () => {
    expect(formatClockTime(minuteOfDayToClockTime(0))).toBe("2:00 PM");
  });

  it("wraps past midnight correctly", () => {
    // 600 minutes after 14:00 = 00:00 the next day.
    expect(formatClockTime(minuteOfDayToClockTime(600))).toBe("12:00 AM");
  });

  it("reaches 2:00 a.m. at exactly 720 minutes", () => {
    expect(formatClockTime(minuteOfDayToClockTime(720))).toBe("2:00 AM");
  });

  it("flags closing time at 720 minutes and not before", () => {
    expect(isPastClosingTime(719)).toBe(false);
    expect(isPastClosingTime(720)).toBe(true);
  });
});
