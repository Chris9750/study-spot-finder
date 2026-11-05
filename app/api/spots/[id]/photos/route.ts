import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { MAX_PHOTO_BYTES, PHOTO_TYPES, idParam, text } from "@/lib/validate";

// POST /api/spots/:id/photos  multipart/form-data: photo (file), caption?
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const spotId = idParam((await ctx.params).id);
  if (!spotId) return NextResponse.json({ error: "Bad spot id" }, { status: 400 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });
  }
  if (!PHOTO_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Photos must be JPEG, PNG, WebP or GIF." }, { status: 400 });
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "Photos must be under 5 MB." }, { status: 400 });
  }

  const [exists] = await query("SELECT 1 FROM spots WHERE id = $1", [spotId]);
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = Buffer.from(await file.arrayBuffer());
  const [row] = await query<{ id: number }>(
    `INSERT INTO photos (spot_id, caption, mime_type, data)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [spotId, text(form?.get("caption"), 200), file.type, data],
  );
  return NextResponse.json(row, { status: 201 });
}
