import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { checkLimit, tooMany } from "@/lib/limits";
import { currentUser, signInRequired } from "@/lib/session";
import { getSpot } from "@/lib/spots";
import { idParam, parseSpotInput } from "@/lib/validate";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const id = idParam((await ctx.params).id);
  const data = id ? await getSpot(id) : null;
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

// PATCH /api/spots/:id — any signed-in student can correct details, hours and amenities.
export async function PATCH(req: Request, ctx: Ctx) {
  const user = await currentUser();
  if (!user) return signInRequired();
  const id = idParam((await ctx.params).id);
  if (!id) return NextResponse.json({ error: "Bad spot id" }, { status: 400 });

  const input = parseSpotInput(await req.json().catch(() => ({})));
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });

  if (!user.isAdmin) {
    const limited = await checkLimit("edit", user.id);
    if (limited) return tooMany(limited);
  }

  const rows = await query<{ id: number }>(
    `UPDATE spots SET name = $2, building = $3, description = $4, lat = $5, lng = $6, hours = $7,
       bookable = $8, booking_url = $9, food_nearby = $10, accessible = $11,
       updated_by = $12, updated_at = now()
     WHERE id = $1 RETURNING id`,
    [
      id, input.name, input.building, input.description, input.lat, input.lng,
      input.hours ? JSON.stringify(input.hours) : null,
      input.bookable, input.booking_url, input.food_nearby, input.accessible, user.id,
    ],
  );
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}
