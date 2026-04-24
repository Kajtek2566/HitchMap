import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type MapView from "react-native-maps";
import type { SQLiteDatabase } from "expo-sqlite";
import type { Region } from "react-native-maps";

import type { Spot } from "@/features/map/types";
import { getVisibleSpots, upsertSpots } from "@/lib/spotDb";
import { getRegionBounds } from "@/lib/mapUtils";

const VIEWPORT_DEBOUNCE_MS = 220;
const VIEWPORT_LOAD_PADDING_MULTIPLIER = 1.4;
const SQLITE_LOCK_RETRY_DELAY_MS = 140;
const SQLITE_LOCK_RETRY_ATTEMPTS = 3;
const ZOOM_RELOAD_EPSILON = 0.05;

type RegionBounds = {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
};

type UseMapViewportParams = {
  apiUrl: string;
  dbRef: React.MutableRefObject<SQLiteDatabase | null>;
  mapRef: RefObject<MapView | null>;
  initialRegion: Region;
  onViewportError: (error: unknown) => void;
  onViewportSuccess?: () => void;
};

const getBufferedRegionBounds = (region: Region): RegionBounds => {
  const baseBounds = getRegionBounds(region);
  const latPadding = region.latitudeDelta * VIEWPORT_LOAD_PADDING_MULTIPLIER;
  const lonPadding = region.longitudeDelta * VIEWPORT_LOAD_PADDING_MULTIPLIER;

  return {
    minLat: baseBounds.minLat - latPadding,
    maxLat: baseBounds.maxLat + latPadding,
    minLon: baseBounds.minLon - lonPadding,
    maxLon: baseBounds.maxLon + lonPadding,
  };
};

const expandBounds = (bounds: RegionBounds, multiplier: number): RegionBounds => {
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  const centerLon = (bounds.minLon + bounds.maxLon) / 2;
  const latHalfSpan = ((bounds.maxLat - bounds.minLat) / 2) * multiplier;
  const lonHalfSpan = ((bounds.maxLon - bounds.minLon) / 2) * multiplier;

  return {
    minLat: centerLat - latHalfSpan,
    maxLat: centerLat + latHalfSpan,
    minLon: centerLon - lonHalfSpan,
    maxLon: centerLon + lonHalfSpan,
  };
};

const containsRegionBounds = (outer: RegionBounds, inner: RegionBounds) =>
  inner.minLat >= outer.minLat &&
  inner.maxLat <= outer.maxLat &&
  inner.minLon >= outer.minLon &&
  inner.maxLon <= outer.maxLon;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isLockedDatabaseError = (error: unknown) =>
  error instanceof Error && error.message.toLowerCase().includes("database is locked");

const boundsToRegion = (bounds: RegionBounds): Region => ({
  latitude: (bounds.minLat + bounds.maxLat) / 2,
  longitude: (bounds.minLon + bounds.maxLon) / 2,
  latitudeDelta: Math.max(bounds.maxLat - bounds.minLat, 0.0001),
  longitudeDelta: Math.max(bounds.maxLon - bounds.minLon, 0.0001),
});

export function useMapViewport({
  apiUrl,
  dbRef,
  mapRef,
  initialRegion,
  onViewportError,
  onViewportSuccess,
}: UseMapViewportParams) {
  const [currentRegion, setCurrentRegion] = useState(initialRegion);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [currentZoom, setCurrentZoom] = useState<number | null>(null);
  const [viewportLoading, setViewportLoading] = useState(false);
  const [viewportStatusMessage, setViewportStatusMessage] = useState<string | null>(null);
  const [viewportDebugMessage, setViewportDebugMessage] = useState<string | null>(null);

  const loadedBoundsRef = useRef<RegionBounds | null>(null);
  const lastLoadedZoomRef = useRef<number | null>(null);
  const viewportTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRegionRequestRef = useRef(0);
  const spotsRef = useRef<Spot[]>([]);
  const currentZoomRef = useRef<number | null>(null);

  useEffect(() => {
    spotsRef.current = spots;
  }, [spots]);

  useEffect(() => {
    currentZoomRef.current = currentZoom;
  }, [currentZoom]);

  const fetchVisibleRegionFromApi = useCallback(
    async (bounds: RegionBounds) => {
      const params = new URLSearchParams({
        minLat: String(bounds.minLat),
        maxLat: String(bounds.maxLat),
        minLon: String(bounds.minLon),
        maxLon: String(bounds.maxLon),
      });

      const response = await fetch(`${apiUrl}/spots/visible?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Nie udalo sie pobrac punktow dla obszaru (${response.status}).`);
      }

      const payload = (await response.json()) as { spots?: Spot[] };
      return Array.isArray(payload.spots) ? payload.spots : [];
    },
    [apiUrl],
  );

  const fetchNearestSpotsFromApi = useCallback(
    async (region: Region) => {
      const params = new URLSearchParams({
        lat: String(region.latitude),
        lon: String(region.longitude),
        limit: "200",
      });

      const response = await fetch(`${apiUrl}/spots?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Nie udalo sie pobrac najblizszych punktow (${response.status}).`);
      }

      const payload = (await response.json()) as Spot[];
      return Array.isArray(payload) ? payload : [];
    },
    [apiUrl],
  );

  const resolveActualView = useCallback(
    async (fallbackRegion: Region) => {
      const map = mapRef.current;
      if (!map) {
        return { region: fallbackRegion, zoom: null as number | null };
      }

      try {
        const [boundaries, camera] = await Promise.all([
          map.getMapBoundaries(),
          map.getCamera().catch(() => null),
        ]);

        if (!boundaries?.northEast || !boundaries?.southWest) {
          return { region: fallbackRegion, zoom: camera?.zoom ?? null };
        }

        return {
          region: boundsToRegion({
          minLat: boundaries.southWest.latitude,
          maxLat: boundaries.northEast.latitude,
          minLon: boundaries.southWest.longitude,
          maxLon: boundaries.northEast.longitude,
          }),
          zoom: camera?.zoom ?? null,
        };
      } catch {
        return { region: fallbackRegion, zoom: null as number | null };
      }
    },
    [mapRef],
  );

  const loadVisibleRegionFromDb = useCallback(
    async (region: Region, providedDb?: SQLiteDatabase | null, zoomOverride?: number | null) => {
      const database = providedDb ?? dbRef.current;
      if (!database) return;

      setViewportLoading(true);
      setViewportStatusMessage("Ladowanie pinezek dla nowego obszaru...");

      try {
        const loadedBounds = getBufferedRegionBounds(region);
        let visible: Spot[] | null = null;
        let visibleSource = "local";

        for (let attempt = 0; attempt <= SQLITE_LOCK_RETRY_ATTEMPTS; attempt += 1) {
          try {
            visible = await getVisibleSpots(database, loadedBounds);
            break;
          } catch (error) {
            if (!isLockedDatabaseError(error) || attempt === SQLITE_LOCK_RETRY_ATTEMPTS) {
              throw error;
            }

            await delay(SQLITE_LOCK_RETRY_DELAY_MS * (attempt + 1));
          }
        }

        if (!visible) {
          return;
        }

        if (visible.length === 0) {
          let remoteVisible = await fetchVisibleRegionFromApi(loadedBounds);
          if (remoteVisible.length > 0) {
            visibleSource = "area";
          }

          if (remoteVisible.length === 0) {
            remoteVisible = await fetchVisibleRegionFromApi(expandBounds(loadedBounds, 2.5));
            if (remoteVisible.length > 0) {
              visibleSource = "expanded";
            }
          }

          if (remoteVisible.length === 0) {
            remoteVisible = await fetchNearestSpotsFromApi(region);
            if (remoteVisible.length > 0) {
              visibleSource = "nearest";
            }
          }

          if (remoteVisible.length > 0) {
            await upsertSpots(database, remoteVisible);
            visible = remoteVisible;
          }
        }

        loadedBoundsRef.current = loadedBounds;
        lastLoadedZoomRef.current = currentZoomRef.current;

        const shouldKeepExistingSpots = visible.length === 0 && spotsRef.current.length > 0;
        const finalVisible = shouldKeepExistingSpots ? spotsRef.current : visible;
        const finalSource = shouldKeepExistingSpots ? `${visibleSource}-keep` : visibleSource;
        const effectiveZoom = zoomOverride ?? currentZoomRef.current;
        const zoomLabel = effectiveZoom !== null ? effectiveZoom.toFixed(2) : "?";

        setSpots(finalVisible);
        setViewportDebugMessage(
          `Srodek: ${region.latitude.toFixed(4)}, ${region.longitude.toFixed(4)} | d: ${region.latitudeDelta.toFixed(3)} / ${region.longitudeDelta.toFixed(3)} | zoom: ${zoomLabel} | zrodlo: ${finalSource} | punkty: ${finalVisible.length}`,
        );
        setViewportStatusMessage(
          visible.length === 0
            ? shouldKeepExistingSpots
              ? "Brak punktow w scislym obszarze, zostawiam poprzednie pinezki."
              : "Brak punktow w tym obszarze."
            : null,
        );
        onViewportSuccess?.();
      } catch (error) {
        setViewportStatusMessage(null);
        onViewportError(error);
      } finally {
        setViewportLoading(false);
      }
    },
    [dbRef, fetchNearestSpotsFromApi, fetchVisibleRegionFromApi, onViewportError, onViewportSuccess],
  );

  const updateVisibleRegionDebounced = useCallback(
    (eventRegion: Region) => {
      if (viewportTimeoutRef.current) clearTimeout(viewportTimeoutRef.current);
      const requestId = latestRegionRequestRef.current + 1;
      latestRegionRequestRef.current = requestId;

      viewportTimeoutRef.current = setTimeout(() => {
        void (async () => {
          const actualView = await resolveActualView(eventRegion);
          const actualRegion = actualView.region;
          const previousZoom = lastLoadedZoomRef.current;
          const loadedBounds = loadedBoundsRef.current;
          const actualBounds = getRegionBounds(actualRegion);
          const zoomChanged =
            actualView.zoom === null ||
            previousZoom === null ||
            Math.abs(actualView.zoom - previousZoom) >= ZOOM_RELOAD_EPSILON;
          const movedOutsideLoadedBounds =
            !loadedBounds || !containsRegionBounds(loadedBounds, actualBounds);
          const shouldReload = zoomChanged || movedOutsideLoadedBounds;
          let debugSource = zoomChanged
            ? "reload-zoom"
            : movedOutsideLoadedBounds
              ? "reload-pan"
              : "cached-pan";

          if (shouldReload) {
            await loadVisibleRegionFromDb(actualRegion, undefined, actualView.zoom);
          }

          if (latestRegionRequestRef.current === requestId) {
            setCurrentRegion(actualRegion);
            setCurrentZoom(actualView.zoom);
            setViewportDebugMessage((current) => {
              const pointsMatch = current?.match(/\| punkty: (\d+)/);
              const pointsLabel = pointsMatch?.[1] ?? String(spotsRef.current.length);
              const zoomLabel = actualView.zoom !== null ? actualView.zoom.toFixed(2) : "?";
              return `Srodek: ${actualRegion.latitude.toFixed(4)}, ${actualRegion.longitude.toFixed(4)} | d: ${actualRegion.latitudeDelta.toFixed(3)} / ${actualRegion.longitudeDelta.toFixed(3)} | zoom: ${zoomLabel} | zrodlo: ${debugSource} | punkty: ${pointsLabel}`;
            });
          }
        })();
      }, VIEWPORT_DEBOUNCE_MS);
    },
    [loadVisibleRegionFromDb, resolveActualView],
  );

  useEffect(() => {
    return () => {
      if (viewportTimeoutRef.current) clearTimeout(viewportTimeoutRef.current);
    };
  }, []);

  return {
    currentRegion,
    currentZoom,
    setCurrentRegion,
    spots,
    viewportLoading,
    viewportStatusMessage,
    viewportDebugMessage,
    loadVisibleRegionFromDb,
    updateVisibleRegionDebounced,
  };
}
