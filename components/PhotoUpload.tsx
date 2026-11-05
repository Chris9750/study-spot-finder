"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export default function PhotoUpload({ spotId }: { spotId: number }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return setError("Choose a photo first.");
    if (file.size > 5 * 1024 * 1024) return setError("Photos must be under 5 MB.");

    const fd = new FormData();
    fd.append("photo", file);
    fd.append("caption", caption);
    setBusy(true);
    setError("");
    const res = await fetch(`/api/spots/${spotId}/photos`, { method: "POST", body: fd });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Upload failed.");
      return;
    }
    if (fileRef.current) fileRef.current.value = "";
    setCaption("");
    router.refresh();
  }

  return (
    <form className="card form" onSubmit={submit}>
      <h2>Add a photo</h2>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
      <label className="field">
        <span>Caption (optional)</span>
        <input maxLength={200} value={caption} onChange={(e) => setCaption(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy}>
        {busy ? "Uploading…" : "Upload photo"}
      </button>
    </form>
  );
}
