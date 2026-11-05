"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import SpotMap from "@/components/SpotMap";

export default function NewSpotPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [building, setBuilding] = useState("");
  const [description, setDescription] = useState("");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function locateMe() {
    if (!navigator.geolocation) return setError("Your browser can't share location.");
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setError("Couldn't get your location. Click the map instead."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Give the spot a name.");
    if (!pos) return setError("Click the map (or use your location) to place the spot.");
    setBusy(true);
    setError("");
    const res = await fetch("/api/spots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, building, description, ...pos }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setError(body.error ?? "Could not save the spot.");
    }
    router.push(`/spots/${body.id}`);
  }

  return (
    <div className="new-spot">
      <form className="card form" onSubmit={submit}>
        <h1>Add a study spot</h1>
        <label className="field">
          <span>Name</span>
          <input required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 3rd floor window tables" />
        </label>
        <label className="field">
          <span>Building</span>
          <input maxLength={120} value={building} onChange={(e) => setBuilding(e.target.value)} />
        </label>
        <label className="field">
          <span>What's it like?</span>
          <textarea rows={3} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="field">
          <span>Location</span>
          <p className="muted small">
            {pos ? `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}` : "Click the map to drop a pin."}
          </p>
          <button type="button" className="btn" onClick={locateMe}>
            Use my location
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Create spot"}
        </button>
      </form>
      <div className="new-map">
        <SpotMap spots={[]} onMapClick={setPos} picked={pos} />
      </div>
    </div>
  );
}
