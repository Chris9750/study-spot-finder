"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import SpotMap from "./SpotMap";
import { DAY_NAMES, WEEK_ORDER, type Day, type Hours } from "@/lib/hours";

export type SpotFormValues = {
  name: string;
  building: string;
  description: string;
  lat: number | null;
  lng: number | null;
  hours: Hours | null;
  bookable: boolean;
  booking_url: string;
  food_nearby: boolean;
  accessible: boolean;
};

type DayRow = { mode: "open" | "closed" | "24h"; open: string; close: string };
type HourRows = Record<Day, DayRow>;

function toRows(h: Hours | null): HourRows {
  return Object.fromEntries(
    WEEK_ORDER.map((d) => {
      const v = h?.[d];
      if (v === null) return [d, { mode: "closed", open: "08:00", close: "22:00" }];
      if (v && v.open === "00:00" && v.close === "24:00") return [d, { mode: "24h", open: "08:00", close: "22:00" }];
      return [d, { mode: "open", open: v?.open ?? "08:00", close: v?.close === "24:00" ? "00:00" : v?.close ?? "22:00" }];
    }),
  ) as HourRows;
}

function fromRows(rows: HourRows): Hours {
  return Object.fromEntries(
    WEEK_ORDER.map((d) => {
      const r = rows[d];
      if (r.mode === "closed") return [d, null];
      if (r.mode === "24h") return [d, { open: "00:00", close: "24:00" }];
      return [d, { open: r.open, close: r.close === "00:00" ? "24:00" : r.close }];
    }),
  ) as Hours;
}

export default function SpotForm({
  mode,
  spotId,
  initial,
}: {
  mode: "create" | "edit";
  spotId?: number;
  initial?: SpotFormValues;
}) {
  const router = useRouter();
  const [v, setV] = useState<SpotFormValues>(
    initial ?? {
      name: "", building: "", description: "", lat: null, lng: null, hours: null,
      bookable: false, booking_url: "", food_nearby: false, accessible: false,
    },
  );
  const [knowHours, setKnowHours] = useState(!!initial?.hours);
  const [rows, setRows] = useState<HourRows>(toRows(initial?.hours ?? null));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (patch: Partial<SpotFormValues>) => setV((x) => ({ ...x, ...patch }));
  const setRow = (d: Day, patch: Partial<DayRow>) => setRows((r) => ({ ...r, [d]: { ...r[d], ...patch } }));
  const pos = v.lat != null && v.lng != null ? { lat: v.lat, lng: v.lng } : null;

  function copyMonToWeekdays() {
    setRows((r) => ({ ...r, tue: r.mon, wed: r.mon, thu: r.mon, fri: r.mon }));
  }

  function locateMe() {
    if (!navigator.geolocation) return setError("Your browser can't share location.");
    navigator.geolocation.getCurrentPosition(
      (p) => set({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setError("Couldn't get your location. Click the map instead."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!v.name.trim()) return setError("Give the spot a name.");
    if (!pos) return setError("Click the map (or use your location) to place the spot.");
    setBusy(true);
    setError("");
    const res = await fetch(mode === "create" ? "/api/spots" : `/api/spots/${spotId}`, {
      method: mode === "create" ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...v, hours: knowHours ? fromRows(rows) : null }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setError(body.error ?? "Could not save the spot.");
    }
    router.push(`/spots/${body.id}`);
    router.refresh();
  }

  return (
    <div className="new-spot">
      <form className="card form" onSubmit={submit}>
        <h1>{mode === "create" ? "Add a study spot" : "Edit spot details"}</h1>
        <label className="field">
          <span>Name</span>
          <input required maxLength={120} value={v.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. 3rd floor window tables" />
        </label>
        <label className="field">
          <span>Building</span>
          <input maxLength={120} value={v.building} onChange={(e) => set({ building: e.target.value })} />
        </label>
        <label className="field">
          <span>What&apos;s it like?</span>
          <textarea rows={3} maxLength={1000} value={v.description} onChange={(e) => set({ description: e.target.value })} />
        </label>

        <div className="field">
          <span>Location</span>
          <p className="muted small">
            {pos ? `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : "Click the map to drop a pin."}
          </p>
          <button type="button" className="btn" onClick={locateMe}>Use my location</button>
        </div>

        <fieldset className="group">
          <legend>Amenities</legend>
          <label className="check">
            <input type="checkbox" checked={v.accessible} onChange={(e) => set({ accessible: e.target.checked })} />
            Wheelchair accessible
          </label>
          <label className="check">
            <input type="checkbox" checked={v.food_nearby} onChange={(e) => set({ food_nearby: e.target.checked })} />
            Food or coffee nearby
          </label>
          <label className="check">
            <input type="checkbox" checked={v.bookable} onChange={(e) => set({ bookable: e.target.checked })} />
            Has bookable study rooms
          </label>
          {v.bookable && (
            <input type="url" placeholder="Booking link (https://…)" value={v.booking_url} onChange={(e) => set({ booking_url: e.target.value })} />
          )}
        </fieldset>

        <fieldset className="group">
          <legend>Opening hours</legend>
          <label className="check">
            <input type="checkbox" checked={knowHours} onChange={(e) => setKnowHours(e.target.checked)} />
            I know the hours
          </label>
          {knowHours && (
            <>
              <div className="hours-edit">
                {WEEK_ORDER.map((d) => (
                  <div key={d} className="hours-row">
                    <span>{DAY_NAMES[d].slice(0, 3)}</span>
                    <select value={rows[d].mode} onChange={(e) => setRow(d, { mode: e.target.value as DayRow["mode"] })} aria-label={`${DAY_NAMES[d]} status`}>
                      <option value="open">Open</option>
                      <option value="24h">24 hours</option>
                      <option value="closed">Closed</option>
                    </select>
                    {rows[d].mode === "open" && (
                      <>
                        <input type="time" value={rows[d].open} onChange={(e) => setRow(d, { open: e.target.value })} aria-label={`${DAY_NAMES[d]} opens`} required />
                        <input type="time" value={rows[d].close} onChange={(e) => setRow(d, { close: e.target.value })} aria-label={`${DAY_NAMES[d]} closes`} required />
                      </>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" className="link-btn" onClick={copyMonToWeekdays}>Copy Monday to Tue–Fri</button>
              <p className="muted small">Closing before opening (e.g. 8 AM–2 AM) means it closes after midnight.</p>
            </>
          )}
        </fieldset>

        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : mode === "create" ? "Create spot" : "Save changes"}
        </button>
      </form>
      <div className="new-map">
        <SpotMap
          spots={[]}
          onMapClick={(p) => set(p)}
          picked={pos}
          center={pos ?? undefined}
          zoom={pos ? 18 : 16}
        />
      </div>
    </div>
  );
}
