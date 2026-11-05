import { NextResponse } from "next/server";
import { getSpot } from "@/lib/spots";
import { idParam } from "@/lib/validate";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = idParam((await ctx.params).id);
  const data = id ? await getSpot(id) : null;
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
