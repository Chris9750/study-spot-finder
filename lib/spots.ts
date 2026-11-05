import { query } from "./db";
import { CAMPUS_TZ, isOpenNow } from "./hours";
import type { HourBucket, Photo, Review, SortKey, SpotFilters, SpotSummary } from "./types";

// Busyness: use the live (last 2h) value when there is one, else the average.
const BUSY = "COALESCE(busy_now, avg_busyness)";

// "Best" = quiet + good Wi-Fi + outlets + not busy, each normalised to 0..1.
const SCORE = `(
  (5 - COALESCE(avg_noise, 3)) / 4
  + (COALESCE(avg_wifi, 3) - 1) / 4
  + (COALESCE(avg_outlets, 3) - 1) / 4
  + (5 - COALESCE(${BUSY}, 3)) / 4
)`;

const ORDER: Record<SortKey, string> = {
  best: `${SCORE} DESC, review_count DESC`,
  quiet: "avg_noise ASC NULLS LAST",
  wifi: "avg_wifi DESC NULLS LAST",
  outlets: "avg_outlets DESC NULLS LAST",
  empty: `${BUSY} ASC NULLS LAST`,
  newest: "created_at DESC",
};

export async function listSpots(f: SpotFilters = {}): Promise<SpotSummary[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (clause: string, value: unknown) => {
    params.push(value);
    where.push(clause.replace("?", `$${params.length}`));
  };

  if (f.maxNoise) add("avg_noise <= ?", f.maxNoise);
  if (f.minWifi) add("avg_wifi >= ?", f.minWifi);
  if (f.minOutlets) add("avg_outlets >= ?", f.minOutlets);
  if (f.maxBusy) add(`${BUSY} <= ?`, f.maxBusy);
  if (f.accessible) where.push("accessible");
  if (f.bookable) where.push("bookable");
  if (f.food) where.push("food_nearby");
  if (f.q) {
    params.push(`%${f.q}%`);
    const p = `$${params.length}`;
    where.push(`(name ILIKE ${p} OR building ILIKE ${p})`);
  }

  const sql = `
    SELECT * FROM spot_stats
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY ${ORDER[f.sort ?? "best"] ?? ORDER.best}
    LIMIT 200`;
  const now = new Date();
  const rows = (await query<SpotSummary>(sql, params)).map((s) => ({
    ...s,
    open_now: isOpenNow(s.hours, now),
  }));
  // Opening hours live in JSON, so "open now" is filtered here rather than in SQL.
  return f.openNow ? rows.filter((s) => s.open_now === true) : rows;
}

export async function getSpot(id: number) {
  const [spot] = await query<SpotSummary>("SELECT * FROM spot_stats WHERE id = $1", [id]);
  if (!spot) return null;
  spot.open_now = isOpenNow(spot.hours);
  const [reviews, photos, busyByHour] = await Promise.all([
    query<Review>(
      `SELECT id, spot_id, noise, wifi, outlets, busyness, comment, author_name, created_at
       FROM reviews WHERE spot_id = $1 AND NOT hidden
       ORDER BY created_at DESC LIMIT 50`,
      [id],
    ),
    query<Photo>(
      `SELECT id, caption, width, height, created_at FROM photos
       WHERE spot_id = $1 AND NOT hidden ORDER BY created_at DESC`,
      [id],
    ),
    getBusyByHour(id),
  ]);
  return { spot, reviews, photos, busyByHour };
}

/** Average busyness for each hour of the day (campus time) over the last 90 days. */
export async function getBusyByHour(spotId: number): Promise<HourBucket[]> {
  const rows = await query<{ hour: number; avg: number; n: number }>(
    `SELECT EXTRACT(HOUR FROM created_at AT TIME ZONE $2)::INT AS hour,
            AVG(busyness)::FLOAT AS avg, COUNT(*)::INT AS n
     FROM reviews
     WHERE spot_id = $1 AND NOT hidden AND created_at > now() - INTERVAL '90 days'
     GROUP BY 1`,
    [spotId, CAMPUS_TZ],
  );
  const byHour = new Map(rows.map((r) => [r.hour, r]));
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    avg: byHour.get(hour)?.avg ?? null,
    n: byHour.get(hour)?.n ?? 0,
  }));
}

export function parseFilters(sp: URLSearchParams): SpotFilters {
  const num = (k: string) => {
    const v = Number(sp.get(k));
    return v >= 1 && v <= 5 ? v : undefined;
  };
  const flag = (k: string) => sp.get(k) === "1" || sp.get(k) === "true" || undefined;
  const sort = sp.get("sort") as SortKey | null;
  return {
    maxNoise: num("maxNoise"),
    minWifi: num("minWifi"),
    minOutlets: num("minOutlets"),
    maxBusy: num("maxBusy"),
    openNow: flag("openNow"),
    accessible: flag("accessible"),
    bookable: flag("bookable"),
    food: flag("food"),
    q: sp.get("q")?.trim().slice(0, 100) || undefined,
    sort: sort && sort in ORDER ? sort : "best",
  };
}
