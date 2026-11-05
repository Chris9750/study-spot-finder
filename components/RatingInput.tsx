"use client";

import { METRICS, type MetricKey } from "@/lib/labels";

export function RatingInput({
  metric,
  value,
  onChange,
}: {
  metric: MetricKey;
  value: number;
  onChange: (v: number) => void;
}) {
  const m = METRICS[metric];
  return (
    <fieldset className="rating">
      <legend>{m.label}</legend>
      <div className="rating-options" role="radiogroup">
        {m.words.map((w, i) => (
          <button
            key={w}
            type="button"
            role="radio"
            aria-checked={value === i + 1}
            className={value === i + 1 ? "is-on" : ""}
            onClick={() => onChange(i + 1)}
          >
            {w}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
