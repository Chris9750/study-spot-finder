import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { checkLimit, tooMany } from "@/lib/limits";
import { currentUser, signInRequired } from "@/lib/session";
import { idParam, rating, text } from "@/lib/validate";

// POST /api/spots/:id/reviews  { noise, wifi, outlets, busyness, comment?, anonymous? }
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return signInRequired();

  const spotId = idParam((await ctx.params).id);
  const body = await req.json().catch(() => ({}));
  const noise = rating(body.noise);
  const wifi = rating(body.wifi);
  const outlets = rating(body.outlets);
  const busyness = rating(body.busyness);

  if (!spotId) return NextResponse.json({ error: "Bad spot id" }, { status: 400 });
  if (!noise || !wifi || !outlets || !busyness) {
    return NextResponse.json({ error: "Rate all four categories from 1 to 5." }, { status: 400 });
  }

  const [exists] = await query("SELECT 1 FROM spots WHERE id = $1", [spotId]);
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const limited = await checkLimit("review", user.id, spotId);
  if (limited) return tooMany(limited);

  // Ratings are always tied to the account; the name shown is optional.
  const author = body.anonymous === true ? null : user.name.slice(0, 60);
  const [row] = await query<{ id: number }>(
    `INSERT INTO reviews (spot_id, user_id, noise, wifi, outlets, busyness, comment, author_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [spotId, user.id, noise, wifi, outlets, busyness, text(body.comment, 1000), author],
  );
  return NextResponse.json(row, { status: 201 });
}
