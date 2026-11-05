import { NextResponse } from "next/server";
import sharp, { type OutputInfo } from "sharp";
import { query } from "@/lib/db";
import { checkLimit, tooMany } from "@/lib/limits";
import { currentUser, signInRequired } from "@/lib/session";
import { MAX_PHOTO_BYTES, PHOTO_TYPES, idParam, text } from "@/lib/validate";

const MAX_EDGE = 1600; // px, longest side after resizing

// POST /api/spots/:id/photos  multipart/form-data: photo (file), caption?
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return signInRequired();

  const spotId = idParam((await ctx.params).id);
  if (!spotId) return NextResponse.json({ error: "Bad spot id" }, { status: 400 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });
  }
  if (!PHOTO_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Photos must be JPEG, PNG, WebP, AVIF or GIF." }, { status: 400 });
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return NextResponse.json({ error: "Photos must be under 12 MB." }, { status: 400 });
  }

  const [exists] = await query("SELECT 1 FROM spots WHERE id = $1", [spotId]);
  if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const limited = await checkLimit("photo", user.id);
  if (limited) return tooMany(limited);

  // Resize, fix phone rotation and re-encode as WebP. Re-encoding also drops
  // EXIF metadata, including any GPS location embedded by the camera.
  let out: { data: Buffer; info: OutputInfo };
  try {
    out = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 60_000_000 })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    return NextResponse.json({ error: "That file doesn't look like a valid image." }, { status: 400 });
  }

  const [row] = await query<{ id: number }>(
    `INSERT INTO photos (spot_id, user_id, caption, mime_type, data, width, height)
     VALUES ($1, $2, $3, 'image/webp', $4, $5, $6) RETURNING id`,
    [spotId, user.id, text(form?.get("caption"), 200), out.data, out.info.width, out.info.height],
  );
  return NextResponse.json(row, { status: 201 });
}
