import { query } from "./db";
import type { Photo, Review, SortKey, SpotFilters, SpotSummary } from "./types";

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
  return query<SpotSummary>(sql, params);
}

export async function getSpot(id: number) {
  const [spot] = await query<SpotSummary>("SELECT * FROM spot_stats WHERE id = $1", [id]);
  if (!spot) return null;
  const [reviews, photos] = await Promise.all([
    query<Review>(
      "SELECT * FROM reviews WHERE spot_id = $1 ORDER BY created_at DESC LIMIT 100",
      [id],
    ),
    query<Photo>(
      "SELECT id, caption, created_at FROM photos WHERE spot_id = $1 ORDER BY created_at DESC",
      [id],
    ),
  ]);
  return { spot, reviews, photos };
}

export function parseFilters(sp: URLSearchParams): SpotFilters {
  const num = (k: string) => {
    const v = Number(sp.get(k));
    return v >= 1 && v <= 5 ? v : undefined;
  };
  const sort = sp.get("sort") as SortKey | null;
  return {
    maxNoise: num("maxNoise"),
    minWifi: num("minWifi"),
    minOutlets: num("minOutlets"),
    maxBusy: num("maxBusy"),
    q: sp.get("q")?.trim().slice(0, 100) || undefined,
    sort: sort && sort in ORDER ? sort : "best",
  };
}
