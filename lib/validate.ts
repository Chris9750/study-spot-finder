import { parseHours, type Hours } from "./hours";

export function rating(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

export function text(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

export function coord(v: unknown, limit: number): number | null {
  if (v === null || v === "" || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
}

export function idParam(v: string): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function httpUrl(v: unknown): string | null {
  const t = text(v, 500);
  if (!t) return null;
  try {
    const u = new URL(t);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export type SpotInput = {
  name: string;
  building: string | null;
  description: string | null;
  lat: number;
  lng: number;
  hours: Hours | null;
  bookable: boolean;
  booking_url: string | null;
  food_nearby: boolean;
  accessible: boolean;
};

/** Validates the add/edit spot form body. */
export function parseSpotInput(body: Record<string, unknown>): SpotInput | string {
  const name = text(body.name, 120);
  const lat = coord(body.lat, 90);
  const lng = coord(body.lng, 180);
  if (!name) return "Give the spot a name.";
  if (lat === null || lng === null) return "Place the spot on the map.";

  const hours = parseHours(body.hours);
  if (typeof hours === "string") return hours;

  const bookable = body.bookable === true;
  const booking_url = bookable ? httpUrl(body.booking_url) : null;
  if (bookable && body.booking_url && !booking_url) return "The booking link must start with https://";

  return {
    name,
    building: text(body.building, 120),
    description: text(body.description, 1000),
    lat,
    lng,
    hours,
    bookable,
    booking_url,
    food_nearby: body.food_nearby === true,
    accessible: body.accessible === true,
  };
}

// Uploads are resized and re-encoded, so originals can be a bit larger.
export const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
