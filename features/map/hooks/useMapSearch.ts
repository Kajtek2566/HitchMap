import * as Location from "expo-location";
import type { RefObject } from "react";
import { useCallback, useState } from "react";
import type MapView from "react-native-maps";

import { stripPolishDiacritics } from "@/lib/countryUtils";
import { getReadableErrorMessage } from "@/lib/mapUtils";

type UseMapSearchParams = {
  mapRef: RefObject<MapView | null>;
  updateVisibleRegionDebounced: (region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }) => void;
};

export function useMapSearch({ mapRef, updateVisibleRegionDebounced }: UseMapSearchParams) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);

  const searchPlace = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchMessage("Wpisz miasto albo kraj.");
      return;
    }

    setSearchLoading(true);
    setSearchMessage(null);
    try {
      const fallbackQuery = stripPolishDiacritics(query);
      const results = await Location.geocodeAsync(query);
      const fallbackResults = results.length === 0 && fallbackQuery !== query
        ? await Location.geocodeAsync(fallbackQuery)
        : [];
      const finalResults = results.length > 0 ? results : fallbackResults;
      const usedFallback = results.length === 0 && fallbackResults.length > 0;
      const hit = finalResults[0];
      if (!hit) {
        setSearchMessage("Nie znaleziono takiego miejsca.");
        return;
      }

      const region = {
        latitude: hit.latitude,
        longitude: hit.longitude,
        latitudeDelta: 0.18,
        longitudeDelta: 0.18,
      };

      mapRef.current?.animateToRegion(region, 700);
      updateVisibleRegionDebounced(region);
      setSearchMessage(`Przeniesiono do: ${usedFallback ? fallbackQuery : query}`);
    } catch (error) {
      setSearchMessage(getReadableErrorMessage(error, "Nie udało się wyszukać miejsca."));
    } finally {
      setSearchLoading(false);
    }
  }, [mapRef, searchQuery, updateVisibleRegionDebounced]);

  return {
    searchQuery,
    setSearchQuery,
    searchLoading,
    searchMessage,
    searchPlace,
  };
}
