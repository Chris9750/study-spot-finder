import type { Hours } from "./hours";

export type SpotSummary = {
  id: number;
  name: string;
  building: string | null;
  description: string | null;
  lat: number;
  lng: number;
  hours: Hours | null;
  bookable: boolean;
  booking_url: string | null;
  food_nearby: boolean;
  accessible: boolean;
  review_count: number;
  avg_noise: number | null;
  avg_wifi: number | null;
  avg_outlets: number | null;
  avg_busyness: number | null;
  busy_now: number | null;
  photo_count: number;
  cover_photo_id: number | null;
  open_now?: boolean | null;
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
  width: number | null;
  height: number | null;
  created_at: string;
};

export type HourBucket = { hour: number; avg: number | null; n: number };

export type SortKey = "best" | "quiet" | "wifi" | "outlets" | "empty" | "newest";

export type SpotFilters = {
  maxNoise?: number;
  minWifi?: number;
  minOutlets?: number;
  maxBusy?: number;
  openNow?: boolean;
  accessible?: boolean;
  bookable?: boolean;
  food?: boolean;
  q?: string;
  sort?: SortKey;
};
