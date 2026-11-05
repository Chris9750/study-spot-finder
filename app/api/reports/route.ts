import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { REPORT_HIDE_THRESHOLD, checkLimit, tooMany } from "@/lib/limits";
import { currentUser, signInRequired } from "@/lib/session";
import { text } from "@/lib/validate";

const TABLE = { photo: "photos", review: "reviews" } as const;

// POST /api/reports  { type: "photo" | "review", id, reason? }
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return signInRequired();

  const body = await req.json().catch(() => ({}));
  const type = body.type as keyof typeof TABLE;
  const id = Number(body.id);
  if (!(type in TABLE) || !Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Bad report" }, { status: 400 });
  }

  const [exists] = await query(`SELECT 1 FROM ${TABLE[type]} WHERE id = $1`, [id]);
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const limited = await checkLimit("report", user.id);
  if (limited) return tooMany(limited);

  await query(
    `INSERT INTO reports (target_type, target_id, user_id, reason) VALUES ($1, $2, $3, $4)
     ON CONFLICT (target_type, target_id, user_id) DO NOTHING`,
    [type, id, user.id, text(body.reason, 300)],
  );

  // Enough distinct reporters (or one admin) hides it until an admin reviews it.
  const [{ n }] = await query<{ n: number }>(
    `SELECT COUNT(*)::INT AS n FROM reports
     WHERE target_type = $1 AND target_id = $2 AND resolved_at IS NULL`,
    [type, id],
  );
  const hidden = user.isAdmin || n >= REPORT_HIDE_THRESHOLD;
  if (hidden) await query(`UPDATE ${TABLE[type]} SET hidden = true WHERE id = $1`, [id]);

  return NextResponse.json({ ok: true, hidden });
}
