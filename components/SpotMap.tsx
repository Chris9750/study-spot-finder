"use client";

import { APIProvider, AdvancedMarker, Map, Pin, type MapMouseEvent } from "@vis.gl/react-google-maps";
import type { SpotSummary } from "@/lib/types";
import { goodness } from "@/lib/labels";

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";
export const CAMPUS = {
  lat: Number(process.env.NEXT_PUBLIC_CAMPUS_LAT ?? 44.2253),
  lng: Number(process.env.NEXT_PUBLIC_CAMPUS_LNG ?? -76.4951),
};

// Colour each pin by how quiet + empty it is right now.
function pinColor(s: SpotSummary) {
  if (!s.review_count) return "#8a8f98";
  const score =
    (goodness("noise", s.avg_noise) + goodness("busyness", s.busy_now ?? s.avg_busyness)) / 2;
  return score >= 0.66 ? "#2f8f5b" : score >= 0.4 ? "#d29a1f" : "#c4513a";
}

export function MapUnavailable() {
  return (
    <div className="map-missing">
      <strong>Map unavailable</strong>
      <span>
        Add <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to <code>.env.local</code> and restart the
        dev server.
      </span>
    </div>
  );
}

type Props = {
  spots: Pick<SpotSummary, "id" | "name" | "lat" | "lng" | "review_count" | "avg_noise" | "avg_busyness" | "busy_now">[];
  selectedId?: number | null;
  onSelect?: (id: number) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  onMapClick?: (pos: { lat: number; lng: number }) => void;
  picked?: { lat: number; lng: number } | null;
};

export default function SpotMap({ spots, selectedId, onSelect, center, zoom = 16, onMapClick, picked }: Props) {
  if (!KEY) return <MapUnavailable />;

  return (
    <APIProvider apiKey={KEY}>
      <Map
        mapId={MAP_ID}
        defaultCenter={center ?? CAMPUS}
        defaultZoom={zoom}
        gestureHandling="greedy"
        disableDefaultUI={false}
        clickableIcons={false}
        streetViewControl={false}
        mapTypeControl={false}
        onClick={(e: MapMouseEvent) => {
          const ll = e.detail.latLng;
          if (ll && onMapClick) onMapClick({ lat: ll.lat, lng: ll.lng });
        }}
        style={{ width: "100%", height: "100%" }}
      >
        {spots.map((s) => (
          <AdvancedMarker
            key={s.id}
            position={{ lat: s.lat, lng: s.lng }}
            title={s.name}
            zIndex={s.id === selectedId ? 10 : 1}
            onClick={() => onSelect?.(s.id)}
          >
            <Pin
              background={pinColor(s as SpotSummary)}
              borderColor={s.id === selectedId ? "#111" : "#ffffff"}
              glyphColor="#ffffff"
              scale={s.id === selectedId ? 1.3 : 1}
            />
          </AdvancedMarker>
        ))}
        {picked && (
          <AdvancedMarker position={picked} title="New spot">
            <Pin background="#3b5bdb" borderColor="#ffffff" glyphColor="#ffffff" scale={1.2} />
          </AdvancedMarker>
        )}
      </Map>
    </APIProvider>
  );
}
