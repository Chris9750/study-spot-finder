"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RatingInput } from "./RatingInput";

const EMPTY = { noise: 0, wifi: 0, outlets: 0, busyness: 0 };

export default function ReviewForm({ spotId }: { spotId: number }) {
  const router = useRouter();
  const [r, setR] = useState(EMPTY);
  const [comment, setComment] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState("");

  const complete = r.noise && r.wifi && r.outlets && r.busyness;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete) return setError("Rate all four categories.");
    setStatus("saving");
    setError("");
    const res = await fetch(`/api/spots/${spotId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...r, comment, author_name: author }),
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
      <p className="muted small">Your “busy” rating shows as live for the next 2 hours.</p>
      {(["noise", "wifi", "outlets", "busyness"] as const).map((m) => (
        <RatingInput key={m} metric={m} value={r[m]} onChange={(v) => setR({ ...r, [m]: v })} />
      ))}
      <label className="field">
        <span>Comment (optional)</span>
        <textarea rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
      <label className="field">
        <span>Name (optional)</span>
        <input maxLength={60} value={author} onChange={(e) => setAuthor(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      {status === "done" && <p className="success">Thanks — your rating is in.</p>}
      <button className="btn btn-primary" disabled={status === "saving"}>
        {status === "saving" ? "Saving…" : "Submit rating"}
      </button>
    </form>
  );
}
