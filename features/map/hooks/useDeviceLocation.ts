import * as Location from "expo-location";
import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type MapView from "react-native-maps";

import type { PendingSpot } from "@/features/map/types";
import { getReadableErrorMessage } from "@/lib/mapUtils";

type UseDeviceLocationParams = {
  mapRef: RefObject<MapView | null>;
  setUiErrorMessage: (value: string | null) => void;
  updateVisibleRegionDebounced: (region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }) => void;
  onInitialRegionResolved: (region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }) => void;
};

export function useDeviceLocation({
  mapRef,
  setUiErrorMessage,
  updateVisibleRegionDebounced,
  onInitialRegionResolved,
}: UseDeviceLocationParams) {
  const [userLocation, setUserLocation] = useState<PendingSpot | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);

  const applyResolvedLocation = useCallback((coords: PendingSpot, shouldSyncViewport: boolean) => {
    const region = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      latitudeDelta: 0.0122,
      longitudeDelta: 0.0121,
    };

    setUserLocation(coords);

    if (shouldSyncViewport) {
      onInitialRegionResolved(region);
      updateVisibleRegionDebounced(region);
    }
  }, [onInitialRegionResolved, updateVisibleRegionDebounced]);

  const centerOnUserLocation = useCallback(async () => {
    try {
      const coords = userLocation ?? await (async () => {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          return { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
        }

        const location = await Location.getCurrentPositionAsync({});
        return { latitude: location.coords.latitude, longitude: location.coords.longitude };
      })();

      const region = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.0122,
        longitudeDelta: 0.0121,
      };

      setUserLocation(coords);
      mapRef.current?.animateToRegion(region, 700);
      updateVisibleRegionDebounced(region);
    } catch (error) {
      setUiErrorMessage(getReadableErrorMessage(error, "Nie udało się wycentrować mapy na Twojej lokalizacji."));
    }
  }, [mapRef, setUiErrorMessage, updateVisibleRegionDebounced, userLocation]);

  useEffect(() => {
    void (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          applyResolvedLocation(
            { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude },
            true,
          );
        }

        const location = await Location.getCurrentPositionAsync({});
        applyResolvedLocation(
          { latitude: location.coords.latitude, longitude: location.coords.longitude },
          !lastKnown,
        );

        locationWatchRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 25, timeInterval: 10000 },
          (position) => setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        );
      } catch (error) {
        setUiErrorMessage(getReadableErrorMessage(error, "Nie udało się pobrać lokalizacji urządzenia."));
      }
    })();

    return () => {
      locationWatchRef.current?.remove();
    };
  }, [applyResolvedLocation, setUiErrorMessage]);

  return {
    userLocation,
    centerOnUserLocation,
  };
}
