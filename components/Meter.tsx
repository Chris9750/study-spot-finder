import { METRICS, type MetricKey, goodness, word } from "@/lib/labels";

export function Meter({
  metric,
  value,
  live,
}: {
  metric: MetricKey;
  value: number | null;
  live?: boolean;
}) {
  const g = goodness(metric, value);
  const tone = value == null ? "none" : g >= 0.66 ? "good" : g >= 0.33 ? "mid" : "bad";
  return (
    <div className="meter" data-tone={tone}>
      <span className="meter-label">
        {METRICS[metric].label}
        {live && <span className="live-dot" title="Based on ratings from the last 2 hours" />}
      </span>
      <span className="meter-track" aria-hidden>
        <span className="meter-fill" style={{ width: `${Math.max(6, g * 100)}%` }} />
      </span>
      <span className="meter-word">{word(metric, value)}</span>
    </div>
  );
}
