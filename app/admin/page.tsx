import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { query } from "@/lib/db";
import { timeAgo } from "@/lib/labels";
import { REPORT_HIDE_THRESHOLD } from "@/lib/limits";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type Item = {
  target_type: "photo" | "review";
  target_id: number;
  reports: number;
  reasons: string[] | null;
  last_report: string;
  hidden: boolean;
  spot_id: number;
  spot_name: string;
  comment: string | null;
  caption: string | null;
  author: string | null;
};

const TABLE = { photo: "photos", review: "reviews" } as const;

async function requireAdmin() {
  const user = await currentUser();
  if (!user?.isAdmin) notFound();
  return user;
}

async function moderate(formData: FormData) {
  "use server";
  await requireAdmin();
  const type = formData.get("type") as keyof typeof TABLE;
  const id = Number(formData.get("id"));
  const action = formData.get("action");
  if (!(type in TABLE) || !Number.isInteger(id)) return;

  if (action === "delete") {
    await query(`DELETE FROM ${TABLE[type]} WHERE id = $1`, [id]);
  } else {
    await query(`UPDATE ${TABLE[type]} SET hidden = $2 WHERE id = $1`, [id, action === "hide"]);
  }
  await query(
    "UPDATE reports SET resolved_at = now() WHERE target_type = $1 AND target_id = $2 AND resolved_at IS NULL",
    [type, id],
  );
  revalidatePath("/admin");
}

export default async function AdminPage() {
  await requireAdmin();

  const items = await query<Item>(`
    SELECT r.target_type, r.target_id,
           COUNT(*)::INT AS reports,
           ARRAY_REMOVE(ARRAY_AGG(r.reason ORDER BY r.created_at DESC), NULL) AS reasons,
           MAX(r.created_at) AS last_report,
           COALESCE(p.hidden, v.hidden) AS hidden,
           s.id AS spot_id, s.name AS spot_name,
           v.comment, p.caption,
           COALESCE(pu.email, vu.email, v.author_name) AS author
    FROM reports r
    LEFT JOIN photos p  ON r.target_type = 'photo'  AND p.id = r.target_id
    LEFT JOIN reviews v ON r.target_type = 'review' AND v.id = r.target_id
    LEFT JOIN users pu ON pu.id = p.user_id
    LEFT JOIN users vu ON vu.id = v.user_id
    JOIN spots s ON s.id = COALESCE(p.spot_id, v.spot_id)
    WHERE r.resolved_at IS NULL
    GROUP BY r.target_type, r.target_id, p.hidden, v.hidden, s.id, s.name,
             v.comment, p.caption, pu.email, vu.email, v.author_name
    ORDER BY COALESCE(p.hidden, v.hidden) DESC, MAX(r.created_at) DESC
    LIMIT 200`);

  return (
    <div className="detail">
      <Link href="/" className="back">← All spots</Link>
      <h1>Moderation</h1>
      <p className="muted">
        Items reported by {REPORT_HIDE_THRESHOLD}+ people are hidden automatically until you decide.
      </p>

      {!items.length && <p className="card">Nothing to review. 🎉</p>}

      <ul className="mod-list">
        {items.map((it) => (
          <li key={`${it.target_type}-${it.target_id}`} className="card mod-item">
            <div className="mod-preview">
              {it.target_type === "photo" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/photos/${it.target_id}`} alt={it.caption ?? "Reported photo"} />
              ) : (
                <blockquote>{it.comment ?? <em className="muted">(rating with no comment)</em>}</blockquote>
              )}
            </div>
            <div className="mod-body">
              <p>
                <strong>{it.target_type === "photo" ? "Photo" : "Comment"}</strong> on{" "}
                <Link href={`/spots/${it.spot_id}`}>{it.spot_name}</Link>
                {it.hidden && <span className="tag tag-warn">Hidden</span>}
              </p>
              <p className="muted small">
                {it.reports} report{it.reports === 1 ? "" : "s"} · last {timeAgo(String(it.last_report))}
                {it.author && <> · by {it.author}</>}
              </p>
              {!!it.reasons?.length && (
                <ul className="reasons">
                  {it.reasons.slice(0, 5).map((r, i) => <li key={i}>“{r}”</li>)}
                </ul>
              )}
              <form action={moderate} className="mod-actions">
                <input type="hidden" name="type" value={it.target_type} />
                <input type="hidden" name="id" value={it.target_id} />
                <button className="btn" name="action" value="keep">Keep (dismiss)</button>
                <button className="btn" name="action" value="hide">Hide</button>
                <button className="btn btn-danger" name="action" value="delete">Delete</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
