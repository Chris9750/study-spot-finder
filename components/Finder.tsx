"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import SpotMap from "./SpotMap";
import { Meter } from "./Meter";
import type { SortKey, SpotSummary } from "@/lib/types";

type Filters = {
  q: string;
  maxNoise: number;
  minWifi: number;
  minOutlets: number;
  maxBusy: number;
  sort: SortKey;
};

const DEFAULTS: Filters = { q: "", maxNoise: 0, minWifi: 0, minOutlets: 0, maxBusy: 0, sort: "best" };

const QUICK: { label: string; patch: Partial<Filters> }[] = [
  { label: "Silent study", patch: { maxNoise: 2 } },
  { label: "Need to charge", patch: { minOutlets: 4 } },
  { label: "Video calls", patch: { minWifi: 4 } },
  { label: "Seats free now", patch: { maxBusy: 3 } },
];

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  options: [number, string][];
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {options.map(([v, t]) => (
          <option key={v} value={v}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function Finder({ initial }: { initial: SpotSummary[] }) {
  const [filters, setFilters] = useState<Filters>(DEFAULTS);
  const [spots, setSpots] = useState<SpotSummary[]>(initial);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const first = useRef(true);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) if (v) p.set(k, String(v));
    return p.toString();
  }, [filters]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/spots?${queryString}`, { signal: ctrl.signal });
        if (res.ok) setSpots(await res.json());
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [queryString]);

  const select = (id: number) => {
    setSelectedId(id);
    listRef.current
      ?.querySelector(`[data-spot="${id}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const active = JSON.stringify(filters) !== JSON.stringify(DEFAULTS);

  return (
    <div className="finder">
      <section className="panel">
        <div className="filters">
          <input
            className="search"
            type="search"
            placeholder="Search spots or buildings"
            value={filters.q}
            onChange={(e) => set({ q: e.target.value })}
          />
          <div className="chips">
            {QUICK.map((q) => (
              <button key={q.label} type="button" className="chip" onClick={() => set(q.patch)}>
                {q.label}
              </button>
            ))}
            {active && (
              <button type="button" className="chip chip-clear" onClick={() => setFilters(DEFAULTS)}>
                Clear
              </button>
            )}
          </div>
          <div className="filter-grid">
            <Select
              label="Noise"
              value={filters.maxNoise}
              onChange={(v) => set({ maxNoise: v })}
              options={[[0, "Any"], [1, "Silent"], [2, "Quiet or less"], [3, "Murmur or less"]]}
            />
            <Select
              label="Wi-Fi"
              value={filters.minWifi}
              onChange={(v) => set({ minWifi: v })}
              options={[[0, "Any"], [3, "Okay+"], [4, "Good+"], [5, "Excellent"]]}
            />
            <Select
              label="Outlets"
              value={filters.minOutlets}
              onChange={(v) => set({ minOutlets: v })}
              options={[[0, "Any"], [3, "Some+"], [4, "Plenty+"]]}
            />
            <Select
              label="Busy"
              value={filters.maxBusy}
              onChange={(v) => set({ maxBusy: v })}
              options={[[0, "Any"], [2, "Light or less"], [3, "Moderate or less"]]}
            />
            <label className="field field-wide">
              <span>Sort by</span>
              <select value={filters.sort} onChange={(e) => set({ sort: e.target.value as SortKey })}>
                <option value="best">Best overall</option>
                <option value="quiet">Quietest</option>
                <option value="wifi">Best Wi-Fi</option>
                <option value="outlets">Most outlets</option>
                <option value="empty">Least busy</option>
                <option value="newest">Newest</option>
              </select>
            </label>
          </div>
        </div>

        <p className="result-count" aria-live="polite">
          {loading ? "Updating…" : `${spots.length} spot${spots.length === 1 ? "" : "s"}`}
        </p>

        <ol className="spot-list" ref={listRef}>
          {spots.map((s) => (
            <li
              key={s.id}
              data-spot={s.id}
              className={`spot-card${s.id === selectedId ? " is-selected" : ""}`}
              onMouseEnter={() => setSelectedId(s.id)}
            >
              <Link href={`/spots/${s.id}`} className="spot-link">
                {s.cover_photo_id ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="thumb" src={`/api/photos/${s.cover_photo_id}`} alt="" loading="lazy" />
                ) : (
                  <div className="thumb thumb-empty" aria-hidden>
                    {s.name.slice(0, 1)}
                  </div>
                )}
                <div className="spot-body">
                  <h3>{s.name}</h3>
                  <p className="muted">
                    {s.building ?? "Campus"} · {s.review_count} rating{s.review_count === 1 ? "" : "s"}
                  </p>
                  <div className="meters">
                    <Meter metric="noise" value={s.avg_noise} />
                    <Meter metric="wifi" value={s.avg_wifi} />
                    <Meter metric="outlets" value={s.avg_outlets} />
                    <Meter metric="busyness" value={s.busy_now ?? s.avg_busyness} live={s.busy_now != null} />
                  </div>
                </div>
              </Link>
            </li>
          ))}
          {!spots.length && !loading && (
            <li className="empty">No spots match. Loosen a filter or add a new spot.</li>
          )}
        </ol>
      </section>

      <section className="map-wrap" aria-label="Map of study spots">
        <SpotMap spots={spots} selectedId={selectedId} onSelect={select} />
      </section>
    </div>
  );
}
