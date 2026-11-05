import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { checkLimit, tooMany } from "@/lib/limits";
import { currentUser, signInRequired } from "@/lib/session";
import { listSpots, parseFilters } from "@/lib/spots";
import { parseSpotInput } from "@/lib/validate";

// GET /api/spots?maxNoise=2&minWifi=4&openNow=1&accessible=1&q=library&sort=best
export async function GET(req: NextRequest) {
  const spots = await listSpots(parseFilters(req.nextUrl.searchParams));
  return NextResponse.json(spots);
}

// POST /api/spots  { name, building?, description?, lat, lng, hours?, bookable?, booking_url?, food_nearby?, accessible? }
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return signInRequired();

  const input = parseSpotInput(await req.json().catch(() => ({})));
  if (typeof input === "string") return NextResponse.json({ error: input }, { status: 400 });

  const limited = await checkLimit("spot", user.id);
  if (limited) return tooMany(limited);

  const [row] = await query<{ id: number }>(
    `INSERT INTO spots (name, building, description, lat, lng, hours, bookable, booking_url,
                        food_nearby, accessible, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
    [
      input.name, input.building, input.description, input.lat, input.lng,
      input.hours ? JSON.stringify(input.hours) : null,
      input.bookable, input.booking_url, input.food_nearby, input.accessible, user.id,
    ],
  );
  return NextResponse.json(row, { status: 201 });
}
