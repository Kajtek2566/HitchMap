import React from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Circle, LocalTile, Marker } from "react-native-maps";

import { DEFAULT_REGION, OSM_TILE_TEMPLATE } from "@/features/map/config";
import { styles } from "@/features/map/styles";
import { DARK_MAP_STYLE } from "@/features/map/theme";
import type { ActiveGroup, PendingSpot, ThemeMode } from "@/features/map/types";
import { formatLocationFreshness, getSpotColor } from "@/lib/mapUtils";

const GROUP_MEMBER_STALE_AFTER_MS = 5 * 60 * 1000;

type FarViewSpot = {
  id: string | number;
  lat: number;
  lon: number;
  rating: number | null;
};

type MapCanvasProps = {
  mapRef: React.RefObject<MapView | null>;
  themeMode: ThemeMode;
  addingSpot: boolean;
  pendingSpot: PendingSpot | null;
  userLocation: PendingSpot | null;
  locationPermissionGranted: boolean;
  offlineTilesEnabled: boolean;
  downloadedMapCodes: string[];
  activeGroup: ActiveGroup | null;
  showDensityOverlay: boolean;
  farViewSpots: FarViewSpot[];
  overlayCircleRadius: number;
  pointMarkers: React.ReactNode;
  onRegionChangeComplete: (region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }) => void;
  onSelectPendingSpot: (spot: PendingSpot) => void;
  onClearSelection: () => void;
};

export function MapCanvas({
  mapRef,
  themeMode,
  addingSpot,
  pendingSpot,
  userLocation,
  locationPermissionGranted,
  offlineTilesEnabled,
  downloadedMapCodes,
  activeGroup,
  showDensityOverlay,
  farViewSpots,
  overlayCircleRadius,
  pointMarkers,
  onRegionChangeComplete,
  onSelectPendingSpot,
  onClearSelection,
}: MapCanvasProps) {
  const now = Date.now();

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      customMapStyle={themeMode === "dark" ? DARK_MAP_STYLE : []}
      initialRegion={DEFAULT_REGION}
      showsUserLocation={locationPermissionGranted}
      showsMyLocationButton={false}
      onRegionChangeComplete={onRegionChangeComplete}
      onPress={(event) => {
        if (addingSpot) {
          onSelectPendingSpot(event.nativeEvent.coordinate);
          return;
        }

        onClearSelection();
      }}
    >
      {userLocation ? (
        <Marker
          coordinate={userLocation}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
          title="Twoja lokalizacja"
        >
          <View
            style={{
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: "#2563eb",
              borderWidth: 3,
              borderColor: "#bfdbfe",
            }}
          />
        </Marker>
      ) : null}
      {pendingSpot ? <Marker coordinate={pendingSpot} pinColor="#2563eb" title="Nowy punkt" /> : null}
      {offlineTilesEnabled && downloadedMapCodes.length > 0 ? (
        <LocalTile pathTemplate={OSM_TILE_TEMPLATE} tileSize={256} zIndex={0} />
      ) : null}
      {activeGroup?.members
        .filter((member) => !member.isCurrentUser && member.lat !== null && member.lon !== null)
        .map((member) => {
          const isStale = now - member.updatedAt >= GROUP_MEMBER_STALE_AFTER_MS;
          const markerColor = isStale
            ? (themeMode === "dark" ? "#6b7280" : "#9ca3af")
            : "#7c3aed";
          const freshnessLabel = formatLocationFreshness(member.updatedAt);

          return (
            <Marker
              key={member.userId}
              coordinate={{ latitude: member.lat!, longitude: member.lon! }}
              title={member.displayName}
              tracksViewChanges={false}
              description={
                isStale
                  ? `Ostatnio dostepny: ${freshnessLabel}`
                  : `Grupa ${activeGroup.code} | ${freshnessLabel}`
              }
            >
              <View style={[styles.groupMemberMarker, { backgroundColor: markerColor }]}>
                <Text style={styles.groupMemberMarkerText}>{member.displayName.slice(0, 1).toUpperCase()}</Text>
              </View>
            </Marker>
          );
        })}
      {showDensityOverlay ? (
        farViewSpots.map((spot) => (
          <Circle
            key={`far-${spot.id}`}
            center={{ latitude: spot.lat, longitude: spot.lon }}
            radius={overlayCircleRadius}
            fillColor={`${getSpotColor(spot.rating)}26`}
            strokeColor={`${getSpotColor(spot.rating)}b3`}
            strokeWidth={1}
          />
        ))
      ) : pointMarkers}
    </MapView>
  );
}
