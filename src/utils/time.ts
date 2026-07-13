import { formatClockTime, minuteOfDayToClockTime } from "@/simulation/clock/gameTime";

export function formatGameClock(minuteOfDay: number): string {
  return formatClockTime(minuteOfDayToClockTime(minuteOfDay));
}

export function formatGameDay(gameDay: number): string {
  return `Day ${gameDay}`;
}
