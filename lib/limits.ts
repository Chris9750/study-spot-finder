import { query } from "./db";

// Per-user limits, enforced with plain queries so they work on any host
// (no Redis needed). Tune here.
export const LIMITS = {
  reviewPerSpotHours: 1, // one rating per spot per hour
  reviewsPerDay: 20,
  photosPerDay: 10,
  spotsPerDay: 5,
  editsPerDay: 20,
  reportsPerDay: 30,
};

// Open reports from this many different users auto-hide a photo or comment.
export const REPORT_HIDE_THRESHOLD = Number(process.env.REPORT_HIDE_THRESHOLD ?? 3);

async function count(sql: string, params: unknown[]) {
  const [row] = await query<{ n: number }>(sql, params);
  return row?.n ?? 0;
}

/** Returns an error message if the user is over a limit, else null. */
export async function checkLimit(
  kind: "review" | "photo" | "spot" | "edit" | "report",
  userId: number,
  spotId?: number,
): Promise<string | null> {
  const day = "now() - INTERVAL '1 day'";
  switch (kind) {
    case "review": {
      const recent = await count(
        `SELECT COUNT(*)::INT AS n FROM reviews
         WHERE user_id = $1 AND spot_id = $2
           AND created_at > now() - make_interval(hours => $3)`,
        [userId, spotId, LIMITS.reviewPerSpotHours],
      );
      if (recent) return "You've already rated this spot in the last hour. Try again later.";
      const today = await count(
        `SELECT COUNT(*)::INT AS n FROM reviews WHERE user_id = $1 AND created_at > ${day}`,
        [userId],
      );
      return today >= LIMITS.reviewsPerDay ? "Daily rating limit reached. Try again tomorrow." : null;
    }
    case "photo": {
      const n = await count(
        `SELECT COUNT(*)::INT AS n FROM photos WHERE user_id = $1 AND created_at > ${day}`,
        [userId],
      );
      return n >= LIMITS.photosPerDay ? "Daily photo limit reached. Try again tomorrow." : null;
    }
    case "spot": {
      const n = await count(
        `SELECT COUNT(*)::INT AS n FROM spots WHERE created_by = $1 AND created_at > ${day}`,
        [userId],
      );
      return n >= LIMITS.spotsPerDay ? "You've added a lot of spots today. Try again tomorrow." : null;
    }
    case "edit": {
      const n = await count(
        `SELECT COUNT(*)::INT AS n FROM spots WHERE updated_by = $1 AND updated_at > ${day}`,
        [userId],
      );
      return n >= LIMITS.editsPerDay ? "Daily edit limit reached. Try again tomorrow." : null;
    }
    case "report": {
      const n = await count(
        `SELECT COUNT(*)::INT AS n FROM reports WHERE user_id = $1 AND created_at > ${day}`,
        [userId],
      );
      return n >= LIMITS.reportsPerDay ? "Daily report limit reached." : null;
    }
  }
}

export const tooMany = (message: string) => Response.json({ error: message }, { status: 429 });
