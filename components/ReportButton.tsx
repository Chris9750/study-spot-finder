"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ReportButton({
  type,
  id,
  signedIn,
}: {
  type: "photo" | "review";
  id: number;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");

  async function report() {
    if (!signedIn) {
      router.push(`/signin?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    const reason = window.prompt(
      `What's wrong with this ${type === "photo" ? "photo" : "comment"}? (optional)`,
    );
    if (reason === null) return; // cancelled
    setState("sending");
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, reason }),
    });
    if (!res.ok) {
      setState("idle");
      alert((await res.json().catch(() => ({}))).error ?? "Couldn't send the report.");
      return;
    }
    setState("done");
    if ((await res.json()).hidden) router.refresh();
  }

  return (
    <button
      type="button"
      className="link-btn"
      onClick={report}
      disabled={state !== "idle"}
      title="Report as inappropriate"
    >
      {state === "done" ? "Reported" : state === "sending" ? "Reporting…" : "Report"}
    </button>
  );
}
