import { GAME_TIME_CONFIG } from "@/config/gameConfig";

export interface ClockTime {
  hour: number; // 0-23
  minute: number; // 0-59
}

/** Minutes elapsed since the operating day opened (2:00 p.m.) — 0 at open, 720 at 2:00 a.m. close. */
export function minutesSinceOpen(minuteOfDay: number): number {
  return minuteOfDay;
}

export function isPastClosingTime(minuteOfDay: number): boolean {
  return minuteOfDay >= GAME_TIME_CONFIG.operatingDayLengthMinutes;
}

/** Converts minutes-since-open into a wall-clock hour/minute, wrapping past midnight. */
export function minuteOfDayToClockTime(minuteOfDay: number): ClockTime {
  const totalMinutes = (GAME_TIME_CONFIG.openHour * 60 + minuteOfDay) % (24 * 60);
  return {
    hour: Math.floor(totalMinutes / 60),
    minute: Math.floor(totalMinutes % 60),
  };
}

export function formatClockTime(time: ClockTime): string {
  const period = time.hour < 12 ? "AM" : "PM";
  const hour12 = time.hour % 12 === 0 ? 12 : time.hour % 12;
  const minute = time.minute.toString().padStart(2, "0");
  return `${hour12}:${minute} ${period}`;
}
