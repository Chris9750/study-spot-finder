import { query } from "@/lib/db";
import { idParam } from "@/lib/validate";

// GET /api/photos/:id  -> the raw image
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = idParam((await ctx.params).id);
  const [photo] = id
    ? await query<{ mime_type: string; data: Buffer }>(
        "SELECT mime_type, data FROM photos WHERE id = $1",
        [id],
      )
    : [];
  if (!photo) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mime_type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
