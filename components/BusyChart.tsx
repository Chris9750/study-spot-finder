import { formatHour } from "@/lib/hours";
import { word } from "@/lib/labels";
import type { HourBucket } from "@/lib/types";

const FIRST = 7;  // chart shows 7 AM ...
const LAST = 23;  // ... to 11 PM
const MIN_RATINGS = 8;

function range(a: number, b: number) {
  return `${formatHour(a)}–${formatHour((b + 1) % 24)}`.replace(/ (AM|PM)–(\d+) \1/, "–$2 $1");
}

/** e.g. "Usually packed 11 AM–2 PM" from the busiest run of consecutive hours. */
export function busySummary(buckets: HourBucket[]): string | null {
  const total = buckets.reduce((s, b) => s + b.n, 0);
  if (total < MIN_RATINGS) return null;

  const rated = buckets.filter((b) => b.avg != null && b.n > 0);
  const peak = Math.max(...rated.map((b) => b.avg!));
  const quietest = rated.reduce((a, b) => (b.avg! < a.avg! ? b : a));

  if (peak < 3.5) return `Usually ${word("busyness", peak).toLowerCase()} all day. Quietest around ${formatHour(quietest.hour)}.`;

  // Longest run of hours at or above "busy" (3.5), with gaps of unrated hours allowed.
  const threshold = Math.max(3.5, peak - 0.75);
  let best: [number, number] | null = null;
  let start: number | null = null;
  for (let h = 0; h <= 24; h++) {
    const b = buckets[h];
    const hot = b && b.avg != null && b.avg >= threshold;
    const gap = b && b.avg == null && start != null;
    if (hot && start == null) start = h;
    if (!hot && !gap && start != null) {
      let end = h - 1;
      while (buckets[end].avg == null) end--;
      if (!best || end - start > best[1] - best[0]) best = [start, end];
      start = null;
    }
  }
  const label = peak >= 4.5 ? "packed" : "busy";
  return best
    ? `Usually ${label} ${range(best[0], best[1])}. Quietest around ${formatHour(quietest.hour)}.`
    : null;
}

export default function BusyChart({ buckets, nowHour }: { buckets: HourBucket[]; nowHour: number }) {
  const total = buckets.reduce((s, b) => s + b.n, 0);
  const summary = busySummary(buckets);
  const shown = buckets.filter((b) => b.hour >= FIRST && b.hour <= LAST);

  return (
    <section className="card busy">
      <h2>Busy by hour</h2>
      {total < MIN_RATINGS ? (
        <p className="muted">Not enough ratings yet to show a pattern ({total} so far).</p>
      ) : (
        <>
          {summary && <p className="busy-summary">{summary}</p>}
          <div className="busy-chart" role="img" aria-label={`Average busyness by hour. ${summary ?? ""}`}>
            {shown.map((b) => {
              const h = b.avg == null ? 0 : ((b.avg - 1) / 4) * 100;
              const tip = b.avg == null
                ? `${formatHour(b.hour)}: no ratings`
                : `${formatHour(b.hour)}: ${word("busyness", b.avg)} (${b.avg.toFixed(1)}/5, ${b.n} rating${b.n === 1 ? "" : "s"})`;
              return (
                <div key={b.hour} className={`busy-col${b.hour === nowHour ? " is-now" : ""}`} data-tip={tip} tabIndex={0}>
                  <div className="busy-bar-area">
                    {b.avg != null ? (
                      <div className="busy-bar" style={{ height: `${Math.max(4, h)}%` }} />
                    ) : (
                      <div className="busy-bar busy-bar-empty" />
                    )}
                  </div>
                  <span className="busy-x">{b.hour % 3 === 0 ? formatHour(b.hour).replace(" ", "") : ""}</span>
                </div>
              );
            })}
          </div>
          <div className="busy-legend muted small">
            <span>Bar height = average “busy” rating (empty → packed), last 90 days</span>
            <span><span className="now-swatch" /> now</span>
          </div>
          <details className="busy-table">
            <summary className="small">View as table</summary>
            <table>
              <thead><tr><th>Hour</th><th>Typical</th><th>Avg</th><th>Ratings</th></tr></thead>
              <tbody>
                {shown.filter((b) => b.n).map((b) => (
                  <tr key={b.hour}>
                    <td>{formatHour(b.hour)}</td>
                    <td>{word("busyness", b.avg)}</td>
                    <td>{b.avg!.toFixed(1)}</td>
                    <td>{b.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </section>
  );
}
