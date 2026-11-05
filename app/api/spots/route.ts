import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { listSpots, parseFilters } from "@/lib/spots";
import { coord, text } from "@/lib/validate";

// GET /api/spots?maxNoise=2&minWifi=4&minOutlets=3&maxBusy=3&q=library&sort=best
export async function GET(req: NextRequest) {
  const spots = await listSpots(parseFilters(req.nextUrl.searchParams));
  return NextResponse.json(spots);
}

// POST /api/spots  { name, building?, description?, lat, lng }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = text(body.name, 120);
  const lat = coord(body.lat, 90);
  const lng = coord(body.lng, 180);
  if (!name || lat === null || lng === null) {
    return NextResponse.json({ error: "Name and a map location are required." }, { status: 400 });
  }
  const [row] = await query<{ id: number }>(
    `INSERT INTO spots (name, building, description, lat, lng)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [name, text(body.building, 120), text(body.description, 1000), lat, lng],
  );
  return NextResponse.json(row, { status: 201 });
}
