import type { Region } from "react-native-maps";

export type SpotLike = {
  id: string;
  lat: number;
  lon: number;
  rating: number | null;
  country: string | null;
  comment: string | null;
  created_at: string | null;
};

export type MarkerGroup<T extends SpotLike> = {
  id: string;
  latitude: number;
  longitude: number;
  spots: T[];
  primarySpot: T;
};

export const getSpotColor = (rating: number | null) => {
  if (rating === null) return "#64748b";
  if (rating >= 5) return "#16a34a";
  if (rating >= 4) return "#65a30d";
  if (rating >= 3) return "#eab308";
  if (rating >= 2) return "#f97316";
  return "#dc2626";
};

export const formatSpotDate = (value: string | null | undefined) => {
  if (!value) return "Brak daty";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

export const buildMarkerGroups = <T extends SpotLike>(spots: T[]): MarkerGroup<T>[] => {
  const map = new Map<string, T[]>();
  for (const spot of spots) {
    const key = `${spot.lat}:${spot.lon}`;
    const existing = map.get(key);
    if (existing) existing.push(spot);
    else map.set(key, [spot]);
  }

  return Array.from(map.entries()).map(([id, group]) => {
    const sorted = [...group].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : Number.NEGATIVE_INFINITY;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : Number.NEGATIVE_INFINITY;
      if (aTime !== bTime) return bTime - aTime;
      return (b.rating ?? -1) - (a.rating ?? -1);
    });

    return { id, latitude: sorted[0].lat, longitude: sorted[0].lon, spots: sorted, primarySpot: sorted[0] };
  });
};

export const getRegionBounds = (region: Region) => {
  const latPad = region.latitudeDelta * 0.35;
  const lonPad = region.longitudeDelta * 0.35;

  return {
    minLat: region.latitude - region.latitudeDelta / 2 - latPad,
    maxLat: region.latitude + region.latitudeDelta / 2 + latPad,
    minLon: region.longitude - region.longitudeDelta / 2 - lonPad,
    maxLon: region.longitude + region.longitudeDelta / 2 + lonPad,
  };
};

export const getFarViewPointLimit = (latitudeDelta: number) => {
  if (latitudeDelta > 40) return 250;
  if (latitudeDelta > 20) return 400;
  if (latitudeDelta > 10) return 650;
  if (latitudeDelta > 4) return 900;
  if (latitudeDelta > 1.5) return 1400;
  return 2200;
};

const sampleFarViewSpots = <T extends SpotLike>(spots: T[], limit: number) => {
  if (spots.length <= limit) {
    return spots;
  }
  const latValues = spots.map((spot) => spot.lat);
  const lonValues = spots.map((spot) => spot.lon);
  const minLat = Math.min(...latValues);
  const maxLat = Math.max(...latValues);
  const minLon = Math.min(...lonValues);
  const maxLon = Math.max(...lonValues);
  const latSpan = Math.max(maxLat - minLat, 0.000001);
  const lonSpan = Math.max(maxLon - minLon, 0.000001);
  const gridSize = Math.max(1, Math.ceil(Math.sqrt(limit)));
  const cellMap = new Map<string, T>();

  const getSpotPriority = (spot: T) => {
    const createdAt = spot.created_at ? new Date(spot.created_at).getTime() : Number.NEGATIVE_INFINITY;
    return {
      rating: spot.rating ?? -1,
      createdAt,
    };
  };

  const compareSpotsStable = (a: T, b: T) => {
    if (a.lat !== b.lat) return a.lat - b.lat;
    if (a.lon !== b.lon) return a.lon - b.lon;

    const aPriority = getSpotPriority(a);
    const bPriority = getSpotPriority(b);

    if (aPriority.rating !== bPriority.rating) return bPriority.rating - aPriority.rating;
    if (aPriority.createdAt !== bPriority.createdAt) return bPriority.createdAt - aPriority.createdAt;

    return String(a.id).localeCompare(String(b.id));
  };

  for (const spot of spots) {
    const latIndex = Math.min(
      gridSize - 1,
      Math.floor(((spot.lat - minLat) / latSpan) * gridSize),
    );
    const lonIndex = Math.min(
      gridSize - 1,
      Math.floor(((spot.lon - minLon) / lonSpan) * gridSize),
    );
    const key = `${latIndex}:${lonIndex}`;
    const existing = cellMap.get(key);

    if (!existing) {
      cellMap.set(key, spot);
      continue;
    }

    const currentPriority = getSpotPriority(spot);
    const existingPriority = getSpotPriority(existing);

    if (
      currentPriority.rating > existingPriority.rating ||
      (currentPriority.rating === existingPriority.rating && currentPriority.createdAt > existingPriority.createdAt)
    ) {
      cellMap.set(key, spot);
    }
  }

  const sampled = Array.from(cellMap.values()).sort(compareSpotsStable);
  if (sampled.length <= limit) {
    return sampled;
  }

  const step = sampled.length / limit;
  const trimmed: T[] = [];

  for (let index = 0; index < limit; index += 1) {
    const sourceIndex = Math.min(sampled.length - 1, Math.floor(index * step));
    trimmed.push(sampled[sourceIndex]);
  }

  return trimmed;
};

export const buildFarViewSpots = <T extends SpotLike>(spots: T[], region: Region) => {
  const limit = getFarViewPointLimit(region.latitudeDelta);
  const regionBounds = getRegionBounds(region);
  const visibleSpots = spots.filter((spot) =>
    spot.lat >= regionBounds.minLat &&
    spot.lat <= regionBounds.maxLat &&
    spot.lon >= regionBounds.minLon &&
    spot.lon <= regionBounds.maxLon,
  );

  if (visibleSpots.length > 0) {
    return sampleFarViewSpots(visibleSpots, limit);
  }

  return sampleFarViewSpots(spots, limit);
};

export const isNewerId = (candidate: string | null, current: string | null) => {
  if (!candidate) return false;
  if (!current) return true;

  try {
    return BigInt(candidate) > BigInt(current);
  } catch {
    return candidate > current;
  }
};

export const getReadableErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof TypeError && error.message === "Network request failed") {
    return "Nie udalo sie polaczyc z backendem. Sprawdz, czy serwer dziala i czy telefon widzi adres API.";
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
};

export const formatLocationFreshness = (updatedAt: number) => {
  const diffMs = Math.max(0, Date.now() - updatedAt);
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return "przed chwila";
  if (diffMinutes < 60) return `${diffMinutes} min temu`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h temu`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} d temu`;
};

export const lonToTileX = (lon: number, zoom: number) =>
  Math.floor(((lon + 180) / 360) * 2 ** zoom);

export const latToTileY = (lat: number, zoom: number) => {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom,
  );
};
