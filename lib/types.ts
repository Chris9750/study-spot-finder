export type SpotSummary = {
  id: number;
  name: string;
  building: string | null;
  description: string | null;
  lat: number;
  lng: number;
  review_count: number;
  avg_noise: number | null;
  avg_wifi: number | null;
  avg_outlets: number | null;
  avg_busyness: number | null;
  busy_now: number | null;
  photo_count: number;
  cover_photo_id: number | null;
};

export type Review = {
  id: number;
  spot_id: number;
  noise: number;
  wifi: number;
  outlets: number;
  busyness: number;
  comment: string | null;
  author_name: string | null;
  created_at: string;
};

export type Photo = {
  id: number;
  caption: string | null;
  created_at: string;
};

export type SortKey = "best" | "quiet" | "wifi" | "outlets" | "empty" | "newest";

export type SpotFilters = {
  maxNoise?: number;
  minWifi?: number;
  minOutlets?: number;
  maxBusy?: number;
  q?: string;
  sort?: SortKey;
};
