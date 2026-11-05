import { query } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { idParam } from "@/lib/validate";

// GET /api/photos/:id  -> the image (hidden photos are visible to admins only)
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = idParam((await ctx.params).id);
  const [photo] = id
    ? await query<{ mime_type: string; data: Buffer; hidden: boolean }>(
        "SELECT mime_type, data, hidden FROM photos WHERE id = $1",
        [id],
      )
    : [];
  if (!photo || (photo.hidden && !(await currentUser())?.isAdmin)) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(photo.data), {
    headers: {
      "Content-Type": photo.mime_type,
      // Short cache so a photo hidden by moderation disappears quickly.
      "Cache-Control": photo.hidden ? "private, no-store" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
