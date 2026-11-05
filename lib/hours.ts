// Weekly opening hours, evaluated in the campus time zone.

export const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type Day = (typeof DAYS)[number];
export type DayHours = { open: string; close: string } | null; // null = closed
export type Hours = Partial<Record<Day, DayHours>>;

export const DAY_NAMES: Record<Day, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};
export const WEEK_ORDER: Day[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const CAMPUS_TZ = process.env.NEXT_PUBLIC_CAMPUS_TZ || "America/Toronto";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Day of week and minutes since midnight in the campus time zone. */
export function campusNow(date = new Date(), tz = CAMPUS_TZ) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const day = DAYS.indexOf(String(parts.weekday).slice(0, 3).toLowerCase() as Day);
  return { day, minutes: Number(parts.hour) * 60 + Number(parts.minute), hour: Number(parts.hour) };
}

/** Is the spot open at this moment? null when hours are unknown. */
export function isOpenNow(hours: Hours | null | undefined, date = new Date()): boolean | null {
  if (!hours || !Object.keys(hours).length) return null;
  const { day, minutes } = campusNow(date);

  const today = hours[DAYS[day]];
  if (today) {
    const o = toMin(today.open), c = toMin(today.close);
    if (c > o ? minutes >= o && minutes < c : minutes >= o) return true;
  }
  // Still open from yesterday's overnight hours?
  const y = hours[DAYS[(day + 6) % 7]];
  if (y) {
    const o = toMin(y.open), c = toMin(y.close);
    if (c <= o && minutes < c) return true;
  }
  return false;
}

export function todayKey(date = new Date()): Day {
  return DAYS[campusNow(date).day];
}

export function formatTime(t: string) {
  if (t === "24:00" || t === "00:00") return "midnight";
  const h = Number(t.slice(0, 2)), m = t.slice(3, 5);
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return m === "00" ? `${h12} ${suffix}` : `${h12}:${m} ${suffix}`;
}

export function formatDay(h: DayHours | undefined) {
  if (h === undefined) return "Unknown";
  if (h === null) return "Closed";
  if (h.open === "00:00" && h.close === "24:00") return "Open 24 hours";
  return `${formatTime(h.open)} – ${formatTime(h.close)}`;
}

export function formatHour(h: number) {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

/** Validates user input; returns cleaned hours, null for "unknown", or an error string. */
export function parseHours(input: unknown): Hours | null | string {
  if (input == null) return null;
  if (typeof input !== "object") return "Hours are in the wrong format.";
  const out: Hours = {};
  for (const d of DAYS) {
    const v = (input as Record<string, unknown>)[d];
    if (v === undefined) continue;
    if (v === null) { out[d] = null; continue; }
    const { open, close } = v as { open?: unknown; close?: unknown };
    if (typeof open !== "string" || typeof close !== "string" || !TIME.test(open) || !TIME.test(close) || open === "24:00") {
      return `Check the hours for ${DAY_NAMES[d]}.`;
    }
    if (open === close) return `${DAY_NAMES[d]}: opening and closing time can't be the same.`;
    out[d] = { open, close };
  }
  return Object.keys(out).length ? out : null;
}
