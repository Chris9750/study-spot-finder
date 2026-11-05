"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RatingInput } from "./RatingInput";

const EMPTY = { noise: 0, wifi: 0, outlets: 0, busyness: 0 };

export default function ReviewForm({ spotId, userName }: { spotId: number; userName: string | null }) {
  const router = useRouter();
  const [r, setR] = useState(EMPTY);
  const [comment, setComment] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState("");

  if (!userName) {
    return (
      <div className="card form">
        <h2>Rate it right now</h2>
        <p className="muted small">Sign in with your school account to rate spots and add photos.</p>
        <Link className="btn btn-primary" href={`/signin?next=/spots/${spotId}`}>
          Sign in to rate
        </Link>
      </div>
    );
  }

  const complete = r.noise && r.wifi && r.outlets && r.busyness;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    if (!complete) return setError("Rate all four categories.");
    setStatus("saving");
    setError("");
    const res = await fetch(`/api/spots/${spotId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...r, comment, anonymous }),
    });
    if (!res.ok) {
      setStatus("idle");
      setError((await res.json().catch(() => ({}))).error ?? "Could not save your rating.");
      return;
    }
    setR(EMPTY);
    setComment("");
    setStatus("done");
    router.refresh();
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h2>Rate it right now</h2>
      <p className="muted small">Your “busy” rating shows as live for the next 2 hours. One rating per spot per hour.</p>
      {(["noise", "wifi", "outlets", "busyness"] as const).map((m) => (
        <RatingInput key={m} metric={m} value={r[m]} onChange={(v) => setR({ ...r, [m]: v })} />
      ))}
      <label className="field">
        <span>Comment (optional)</span>
        <textarea rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
      <label className="check">
        <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
        Post without showing my name ({userName})
      </label>
      {error && <p className="error">{error}</p>}
      {status === "done" && <p className="success">Thanks — your rating is in.</p>}
      <button className="btn btn-primary" disabled={status === "saving"}>
        {status === "saving" ? "Saving…" : "Submit rating"}
      </button>
    </form>
  );
}
