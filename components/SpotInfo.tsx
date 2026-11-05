import { DAY_NAMES, WEEK_ORDER, formatDay, todayKey, type Hours } from "@/lib/hours";

export function OpenBadge({ open }: { open: boolean | null | undefined }) {
  if (open == null) return null;
  return <span className={`badge ${open ? "badge-open" : "badge-closed"}`}>{open ? "Open now" : "Closed"}</span>;
}

export function Amenities({
  spot,
}: {
  spot: { bookable: boolean; booking_url: string | null; food_nearby: boolean; accessible: boolean };
}) {
  const items: React.ReactNode[] = [];
  if (spot.accessible) items.push(<span key="a" className="amenity">♿ Accessible</span>);
  if (spot.food_nearby) items.push(<span key="f" className="amenity">☕ Food nearby</span>);
  if (spot.bookable)
    items.push(
      spot.booking_url ? (
        <a key="b" className="amenity amenity-link" href={spot.booking_url} target="_blank" rel="noreferrer">
          📅 Bookable rooms ↗
        </a>
      ) : (
        <span key="b" className="amenity">📅 Bookable rooms</span>
      ),
    );
  return items.length ? <div className="amenities">{items}</div> : null;
}

export function HoursTable({ hours }: { hours: Hours | null }) {
  if (!hours) return <p className="muted small">Hours not added yet.</p>;
  const today = todayKey();
  return (
    <table className="hours">
      <tbody>
        {WEEK_ORDER.map((d) => (
          <tr key={d} className={d === today ? "is-today" : ""}>
            <th scope="row">{DAY_NAMES[d]}</th>
            <td>{formatDay(hours[d])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
