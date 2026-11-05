import Link from "next/link";
import { notFound } from "next/navigation";
import { Meter } from "@/components/Meter";
import PhotoUpload from "@/components/PhotoUpload";
import ReviewForm from "@/components/ReviewForm";
import SpotMap from "@/components/SpotMap";
import { timeAgo, word } from "@/lib/labels";
import { getSpot } from "@/lib/spots";
import { idParam } from "@/lib/validate";

export const dynamic = "force-dynamic";

export default async function SpotPage({ params }: { params: Promise<{ id: string }> }) {
  const id = idParam((await params).id);
  const data = id ? await getSpot(id) : null;
  if (!data) notFound();
  const { spot, reviews, photos } = data;

  return (
    <div className="detail">
      <Link href="/" className="back">
        ← All spots
      </Link>

      <div className="detail-grid">
        <div className="detail-main">
          <header className="detail-head">
            <h1>{spot.name}</h1>
            <p className="muted">
              {spot.building ?? "Campus"} · {spot.review_count} rating{spot.review_count === 1 ? "" : "s"}
            </p>
            {spot.description && <p>{spot.description}</p>}
          </header>

          <section className="card">
            <div className="meters meters-lg">
              <Meter metric="noise" value={spot.avg_noise} />
              <Meter metric="wifi" value={spot.avg_wifi} />
              <Meter metric="outlets" value={spot.avg_outlets} />
              <Meter metric="busyness" value={spot.busy_now ?? spot.avg_busyness} live={spot.busy_now != null} />
            </div>
            {spot.busy_now != null && spot.avg_busyness != null && (
              <p className="muted small">
                Right now: {word("busyness", spot.busy_now)} · usually {word("busyness", spot.avg_busyness)}
              </p>
            )}
          </section>

          <section>
            <h2>Photos</h2>
            {photos.length ? (
              <div className="photos">
                {photos.map((p) => (
                  <figure key={p.id}>
                    <a href={`/api/photos/${p.id}`} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/photos/${p.id}`} alt={p.caption ?? spot.name} loading="lazy" />
                    </a>
                    {p.caption && <figcaption>{p.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            ) : (
              <p className="muted">No photos yet. Be the first.</p>
            )}
          </section>

          <section>
            <h2>Recent ratings</h2>
            {reviews.length ? (
              <ul className="reviews">
                {reviews.map((r) => (
                  <li key={r.id} className="review">
                    <div className="review-head">
                      <strong>{r.author_name ?? "Anonymous"}</strong>
                      <span className="muted small">{timeAgo(r.created_at)}</span>
                    </div>
                    <div className="tags">
                      <span className="tag">{word("noise", r.noise)}</span>
                      <span className="tag">Wi-Fi: {word("wifi", r.wifi)}</span>
                      <span className="tag">Outlets: {word("outlets", r.outlets)}</span>
                      <span className="tag">{word("busyness", r.busyness)}</span>
                    </div>
                    {r.comment && <p>{r.comment}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No ratings yet.</p>
            )}
          </section>
        </div>

        <aside className="detail-side">
          <div className="mini-map">
            <SpotMap spots={[spot]} selectedId={spot.id} center={{ lat: spot.lat, lng: spot.lng }} zoom={18} />
          </div>
          <a
            className="btn"
            href={`https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}&travelmode=walking`}
            target="_blank"
            rel="noreferrer"
          >
            Walking directions
          </a>
          <ReviewForm spotId={spot.id} />
          <PhotoUpload spotId={spot.id} />
        </aside>
      </div>
    </div>
  );
}
