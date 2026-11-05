// Human words for the 1-5 scales. "good" says which end of the scale is desirable.
export const METRICS = {
  noise: {
    label: "Noise",
    good: "low",
    words: ["Silent", "Quiet", "Murmur", "Chatty", "Loud"],
  },
  wifi: {
    label: "Wi-Fi",
    good: "high",
    words: ["Unusable", "Spotty", "Okay", "Good", "Excellent"],
  },
  outlets: {
    label: "Outlets",
    good: "high",
    words: ["None", "Rare", "Some", "Plenty", "Every seat"],
  },
  busyness: {
    label: "Busy",
    good: "low",
    words: ["Empty", "Light", "Moderate", "Busy", "Packed"],
  },
} as const;

export type MetricKey = keyof typeof METRICS;

export function word(metric: MetricKey, value: number | null): string {
  if (value == null) return "No data";
  return METRICS[metric].words[Math.min(4, Math.max(0, Math.round(value) - 1))];
}

// 0..1 where 1 is always "good", so bars read the same way for every metric.
export function goodness(metric: MetricKey, value: number | null): number {
  if (value == null) return 0;
  const n = (value - 1) / 4;
  return METRICS[metric].good === "high" ? n : 1 - n;
}

export function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString();
}
