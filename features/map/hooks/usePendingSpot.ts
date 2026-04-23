import * as Location from "expo-location";
import { useCallback, useState } from "react";

import type { PendingSpot } from "@/features/map/types";

type UsePendingSpotParams = {
  onExitSelection: () => void;
};

export function usePendingSpot({ onExitSelection }: UsePendingSpotParams) {
  const [addingSpot, setAddingSpot] = useState(false);
  const [pendingSpot, setPendingSpot] = useState<PendingSpot | null>(null);
  const [pendingCountry, setPendingCountry] = useState<string | null>(null);

  const resetAddMode = useCallback(() => {
    setAddingSpot(false);
    setPendingSpot(null);
    setPendingCountry(null);
  }, []);

  const startAddingSpot = useCallback(() => {
    onExitSelection();
    setAddingSpot(true);
  }, [onExitSelection]);

  const handleMapPress = useCallback((coordinate: PendingSpot) => {
    setPendingSpot(coordinate);
    setPendingCountry(null);

    void Location.reverseGeocodeAsync(coordinate)
      .then((results) => {
        const country = results[0]?.isoCountryCode ?? results[0]?.country?.slice(0, 2)?.toUpperCase() ?? null;
        setPendingCountry(country);
      })
      .catch(() => setPendingCountry(null));
  }, []);

  return {
    addingSpot,
    pendingSpot,
    pendingCountry,
    setPendingCountry,
    resetAddMode,
    startAddingSpot,
    handleMapPress,
  };
}
