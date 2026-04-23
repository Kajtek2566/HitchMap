import { useCallback, useEffect, useMemo, useState } from "react";

import type { MarkerGroupSpot } from "@/features/map/types";

type UseMarkerSelectionParams = {
  markerGroups: MarkerGroupSpot[];
};

export function useMarkerSelection({ markerGroups }: UseMarkerSelectionParams) {
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectedMarkerSnapshot, setSelectedMarkerSnapshot] = useState<MarkerGroupSpot | null>(null);
  const [reviewFormVisible, setReviewFormVisible] = useState(false);

  const selectedMarker = useMemo(
    () => markerGroups.find((item) => item.id === selectedMarkerId) ?? null,
    [markerGroups, selectedMarkerId],
  );
  const visibleSelectedMarker = selectedMarker ?? selectedMarkerSnapshot;

  const clearSelectedMarker = useCallback(() => {
    setSelectedMarkerId(null);
    setSelectedMarkerSnapshot(null);
    setReviewFormVisible(false);
  }, []);

  const selectMarker = useCallback((marker: MarkerGroupSpot) => {
    setSelectedMarkerId(marker.id);
    setSelectedMarkerSnapshot(marker);
    setReviewFormVisible(false);
  }, []);

  useEffect(() => {
    if (selectedMarker) {
      setSelectedMarkerSnapshot(selectedMarker);
    }
  }, [selectedMarker]);

  return {
    reviewFormVisible,
    setReviewFormVisible,
    clearSelectedMarker,
    selectMarker,
    visibleSelectedMarker,
  };
}
