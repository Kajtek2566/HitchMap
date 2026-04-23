import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import type { SQLiteDatabase } from "expo-sqlite";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  API_URL,
  DEFAULT_REGION,
  FULL_SYNC_PAGE_SIZE,
  MARKER_VIEW_MAX_DELTA,
  TILE_DIRECTORY,
  TILE_METADATA_FILE,
} from "@/features/map/config";
import { getSpotMarkerImage } from "@/features/map/markers";
import { AddSpotCard } from "@/features/map/components/AddSpotCard";
import { BottomActionBar } from "@/features/map/components/BottomActionBar";
import { DrawerPanel } from "@/features/map/components/DrawerPanel";
import { MapCanvas } from "@/features/map/components/MapCanvas";
import { MapSearchBar } from "@/features/map/components/MapSearchBar";
import { SpotDetailsCard } from "@/features/map/components/SpotDetailsCard";
import { useDeviceLocation } from "@/features/map/hooks/useDeviceLocation";
import { useGroupManagement } from "@/features/map/hooks/useGroupManagement";
import { useLocalSync } from "@/features/map/hooks/useLocalSync";
import { useMapSearch } from "@/features/map/hooks/useMapSearch";
import { useMapViewport } from "@/features/map/hooks/useMapViewport";
import { useMarkerSelection } from "@/features/map/hooks/useMarkerSelection";
import { useOfflineMaps } from "@/features/map/hooks/useOfflineMaps";
import { usePendingSpot } from "@/features/map/hooks/usePendingSpot";
import { useSpotSubmission } from "@/features/map/hooks/useSpotSubmission";
import { styles } from "@/features/map/styles";
import { THEMES } from "@/features/map/theme";
import type { ActiveGroup, MenuSection, ThemeMode } from "@/features/map/types";
import { openSpotDatabase } from "@/lib/spotDb";
import {
  buildFarViewSpots,
  buildMarkerGroups,
  getReadableErrorMessage,
} from "@/lib/mapUtils";

const isLockedDatabaseMessage = (value: string | null) =>
  typeof value === "string" && value.toLowerCase().includes("database is locked");

const OVERLAY_ENTER_ZOOM = 11.2;
const OVERLAY_EXIT_ZOOM = 12.0;

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const userIdRef = useRef(`user-${Math.random().toString(36).slice(2, 10)}`);
  const mapRef = useRef<MapView | null>(null);
  const dbRef = useRef<SQLiteDatabase | null>(null);
  const initializedRef = useRef(false);

  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSection, setMenuSection] = useState<MenuSection>("group");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setUiErrorMessage = useCallback((value: string | null) => {
    if (isLockedDatabaseMessage(value)) {
      setErrorMessage(null);
      return;
    }

    setErrorMessage(value);
  }, []);

  const {
    currentRegion,
    currentZoom,
    setCurrentRegion,
    spots,
    viewportLoading,
    viewportStatusMessage,
    loadVisibleRegionFromDb,
    updateVisibleRegionDebounced,
  } = useMapViewport({
    apiUrl: API_URL,
    dbRef,
    mapRef,
    initialRegion: DEFAULT_REGION,
    onViewportError: (error) => {
      console.warn("Nie udało się odświeżyć punktów dla aktualnego widoku mapy.", error);
    },
    onViewportSuccess: () => {
      setUiErrorMessage(null);
    },
  });
  const showDensityOverlayRef = useRef(false);

  const markerGroups = useMemo(() => buildMarkerGroups(spots), [spots]);
  const {
    reviewFormVisible,
    setReviewFormVisible,
    clearSelectedMarker,
    selectMarker,
    visibleSelectedMarker,
  } = useMarkerSelection({ markerGroups });
  const {
    addingSpot,
    pendingSpot,
    pendingCountry,
    resetAddMode,
    startAddingSpot,
    handleMapPress,
  } = usePendingSpot({
    onExitSelection: clearSelectedMarker,
  });

  const theme = THEMES[themeMode];
  const showDensityOverlay = (() => {
    const current = showDensityOverlayRef.current;
    const fallbackDelta = Math.max(currentRegion.latitudeDelta, currentRegion.longitudeDelta);
    const next = currentZoom === null
      ? (current ? fallbackDelta > MARKER_VIEW_MAX_DELTA * 0.6 : fallbackDelta > MARKER_VIEW_MAX_DELTA)
      : (current ? currentZoom < OVERLAY_EXIT_ZOOM : currentZoom < OVERLAY_ENTER_ZOOM);
    showDensityOverlayRef.current = next;
    return next;
  })();

  const farViewSpots = useMemo(
    () => (showDensityOverlay ? buildFarViewSpots(spots, currentRegion) : []),
    [currentRegion, showDensityOverlay, spots],
  );
  const overlayCircleRadius = useMemo(() => {
    if (currentRegion.latitudeDelta > 20) return 2200;
    if (currentRegion.latitudeDelta > 8) return 1400;
    if (currentRegion.latitudeDelta > 3) return 900;
    if (currentRegion.latitudeDelta > 1) return 500;
    if (currentRegion.latitudeDelta > 0.25) return 220;
    return 120;
  }, [currentRegion.latitudeDelta]);

  const pointMarkers = useMemo(() => markerGroups.map((item) => (
    <Marker
      key={item.id}
      coordinate={{ latitude: item.latitude, longitude: item.longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      icon={getSpotMarkerImage(item.primarySpot.rating)}
      title={item.primarySpot.country || "Punkt autostopowy"}
      description={item.spots.length > 1 ? `Wpisy w tej lokalizacji: ${item.spots.length}` : undefined}
      onPress={() => {
        selectMarker(item);
        resetAddMode();
      }}
    />
  )), [markerGroups, resetAddMode, selectMarker]);

  const {
    syncing,
    syncStatus,
    setSyncStatus,
    syncProgressCurrent,
    syncProgressTotal,
    localSpotCount,
    lastSyncAtValue,
    localCountryQuery,
    setLocalCountryQuery,
    filteredLocalCountryStats,
    persistedSelectedLocalCountryKeys,
    selectedLocalCountryKeys,
    setSelectedLocalCountryKeys,
    pruningLocalDb,
    localDbAdvancedOpen,
    setLocalDbAdvancedOpen,
    refreshLocalStats,
    syncLocalDatabase,
    persistSpotLocally,
    confirmPruneLocalDatabase,
  } = useLocalSync({
    apiUrl: API_URL,
    currentRegion,
    dbRef,
    fullSyncPageSize: FULL_SYNC_PAGE_SIZE,
    loadVisibleRegionFromDb,
    setErrorMessage: setUiErrorMessage,
  });

  const {
    downloadedMapCodes,
    offlineTilesEnabled,
    setOfflineTilesEnabled,
    offlineMapLoadingCode,
    offlineMapMessage,
    offlineCountryQuery,
    setOfflineCountryQuery,
    filteredOfflineMapPacks,
    estimatedDownloadedSizeMb,
    downloadOfflineMapPack,
  } = useOfflineMaps({
    tileDirectory: TILE_DIRECTORY,
    tileMetadataFile: TILE_METADATA_FILE,
  });

  const {
    reviewForm,
    setReviewForm,
    reviewError,
    submittingReview,
    newSpotForm,
    setNewSpotForm,
    newSpotError,
    submittingNewSpot,
    resetNewSpotForm,
    resetReviewForm,
    submitNewSpot,
    submitReview,
  } = useSpotSubmission({
    apiUrl: API_URL,
    persistSpotLocally,
    setSyncStatus,
  });

  const {
    searchQuery,
    setSearchQuery,
    searchLoading,
    searchPlace,
  } = useMapSearch({
    mapRef,
    updateVisibleRegionDebounced,
  });

  const {
    userLocation,
    centerOnUserLocation,
  } = useDeviceLocation({
    mapRef,
    setUiErrorMessage,
    updateVisibleRegionDebounced,
    onInitialRegionResolved: setCurrentRegion,
  });

  const {
    groupName,
    setGroupName,
    groupJoinCode,
    setGroupJoinCode,
    groupPanelMode,
    setGroupPanelMode,
    groupRosterVisible,
    setGroupRosterVisible,
    groupError,
    groupLoading,
    renameGroupName,
    setRenameGroupName,
    renamingGroup,
    removingMemberUserId,
    activeGroup,
    setActiveGroup,
    myGroups,
    myGroupsLoading,
    groupLocationStatus,
    createGroup,
    joinGroup,
    leaveActiveGroup,
    renameActiveGroup,
    removeGroupMember,
  } = useGroupManagement({
    apiUrl: API_URL,
    userId: userIdRef.current,
    menuOpen,
    menuSection,
    userLocation,
  });

  const focusGroupMemberLocation = useCallback((member: ActiveGroup["members"][number]) => {
    if (member.lat === null || member.lon === null) {
      return;
    }

    const region = {
      latitude: member.lat,
      longitude: member.lon,
      latitudeDelta: 0.0122,
      longitudeDelta: 0.0121,
    };

    setMenuOpen(false);
    mapRef.current?.animateToRegion(region, 700);
    updateVisibleRegionDebounced(region);
  }, [updateVisibleRegionDebounced]);

  const resetMapNorth = useCallback(() => {
    mapRef.current?.animateCamera(
      {
        center: {
          latitude: currentRegion.latitude,
          longitude: currentRegion.longitude,
        },
        heading: 0,
        pitch: 0,
      },
      { duration: 450 },
    );
  }, [currentRegion.latitude, currentRegion.longitude]);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    void (async () => {
      try {
        const database = await openSpotDatabase();
        dbRef.current = database;
        await refreshLocalStats(database);
        await loadVisibleRegionFromDb(DEFAULT_REGION, database);
        await syncLocalDatabase("auto", database);
      } catch (error) {
        setUiErrorMessage(getReadableErrorMessage(error, "Nie udało się uruchomić lokalnej bazy SQLite."));
        setSyncStatus("SQLite niedostępne.");
      }
    })();
  }, [loadVisibleRegionFromDb, refreshLocalStats, setSyncStatus, setUiErrorMessage, syncLocalDatabase]);

  useEffect(() => {
    if (menuOpen && menuSection === "database") return;
    setSelectedLocalCountryKeys(persistedSelectedLocalCountryKeys);
  }, [menuOpen, menuSection, persistedSelectedLocalCountryKeys, setSelectedLocalCountryKeys]);

  return (
    <View style={styles.container}>
      <MapCanvas
        mapRef={mapRef}
        themeMode={themeMode}
        addingSpot={addingSpot}
        pendingSpot={pendingSpot}
        offlineTilesEnabled={offlineTilesEnabled}
        downloadedMapCodes={downloadedMapCodes}
        activeGroup={activeGroup}
        showDensityOverlay={showDensityOverlay}
        farViewSpots={farViewSpots}
        overlayCircleRadius={overlayCircleRadius}
        pointMarkers={pointMarkers}
        onRegionChangeComplete={updateVisibleRegionDebounced}
        onSelectPendingSpot={handleMapPress}
        onClearSelection={clearSelectedMarker}
      />

      <MapSearchBar
        topInset={insets.top}
        theme={theme}
        searchQuery={searchQuery}
        onChangeSearchQuery={setSearchQuery}
        onSubmit={() => void searchPlace()}
        searchLoading={searchLoading}
        viewportLoading={viewportLoading}
        viewportStatusMessage={viewportStatusMessage}
        errorMessage={errorMessage}
      />

      <View style={[styles.mapUtilityRow, { top: insets.top + 108 }]}>
        <Pressable
          style={[
            styles.myLocationButton,
            {
              backgroundColor: theme.bg,
              borderColor: theme.border,
            },
          ]}
          onPress={() => void centerOnUserLocation()}
        >
          <MaterialCommunityIcons name="crosshairs-gps" size={22} color={theme.action} />
        </Pressable>
        <Pressable
          style={[
            styles.myLocationButton,
            {
              backgroundColor: theme.bg,
              borderColor: theme.border,
            },
          ]}
          onPress={resetMapNorth}
        >
          <MaterialCommunityIcons name="compass-outline" size={22} color={theme.action} />
        </Pressable>
      </View>

      <BottomActionBar
        bottomInset={insets.bottom}
        theme={theme}
        menuOpen={menuOpen && menuSection !== "group"}
        groupMenuOpen={menuOpen && menuSection === "group"}
        addingSpot={addingSpot}
        onPressMenu={() => {
          setMenuSection("database");
          setMenuOpen((current) => !current || menuSection === "group");
        }}
        onPressGroups={() => {
          setMenuSection("group");
          setMenuOpen(true);
        }}
        onPressAddSpot={() => {
          if (addingSpot) {
            resetAddMode();
            return;
          }

          setMenuOpen(false);
          startAddingSpot();
        }}
      />
      <DrawerPanel
        visible={menuOpen}
        topInset={insets.top}
        theme={theme}
        themeMode={themeMode}
        menuSection={menuSection}
        onMenuSectionChange={setMenuSection}
        onClose={() => setMenuOpen(false)}
        activeGroup={activeGroup}
        groupLocationStatus={groupLocationStatus}
        groupPanelMode={groupPanelMode}
        onGroupPanelModeChange={setGroupPanelMode}
        groupRosterVisible={groupRosterVisible}
        onToggleGroupRoster={() => setGroupRosterVisible((current) => !current)}
        onLeaveGroup={() => void leaveActiveGroup()}
        groupName={groupName}
        onChangeGroupName={setGroupName}
        groupJoinCode={groupJoinCode}
        onChangeGroupJoinCode={setGroupJoinCode}
        groupLoading={groupLoading}
        renameGroupName={renameGroupName}
        onChangeRenameGroupName={setRenameGroupName}
        renamingGroup={renamingGroup}
        removingMemberUserId={removingMemberUserId}
        onCreateGroup={() => void createGroup()}
        onJoinGroup={() => void joinGroup()}
        onRenameGroup={() => void renameActiveGroup()}
        onRemoveGroupMember={(memberUserId) => void removeGroupMember(memberUserId)}
        myGroupsLoading={myGroupsLoading}
        myGroups={myGroups}
        onSelectGroup={setActiveGroup}
        onFocusGroupMemberLocation={focusGroupMemberLocation}
        groupError={groupError}
        localSpotCount={localSpotCount}
        lastSyncAtValue={lastSyncAtValue}
        syncStatus={syncStatus}
        syncProgressCurrent={syncProgressCurrent}
        syncProgressTotal={syncProgressTotal}
        syncing={syncing}
        onSyncAuto={() => void syncLocalDatabase("auto")}
        onSyncFull={() => void syncLocalDatabase("full")}
        localDbAdvancedOpen={localDbAdvancedOpen}
        onToggleLocalDbAdvanced={() => setLocalDbAdvancedOpen((current) => !current)}
        localCountryQuery={localCountryQuery}
        onChangeLocalCountryQuery={setLocalCountryQuery}
        filteredLocalCountryStats={filteredLocalCountryStats}
        selectedLocalCountryKeys={selectedLocalCountryKeys}
        onToggleLocalCountry={(selectionKey) =>
          setSelectedLocalCountryKeys((current) =>
            current.includes(selectionKey) ? current.filter((key) => key !== selectionKey) : [...current, selectionKey],
          )
        }
        onClearSelectedLocalCountries={() => setSelectedLocalCountryKeys([])}
        pruningLocalDb={pruningLocalDb}
        onConfirmPruneLocalDatabase={() => void confirmPruneLocalDatabase()}
        offlineCountryQuery={offlineCountryQuery}
        onChangeOfflineCountryQuery={setOfflineCountryQuery}
        offlineTilesEnabled={offlineTilesEnabled}
        onToggleOfflineTiles={() => setOfflineTilesEnabled((current) => !current)}
        downloadedMapCodes={downloadedMapCodes}
        filteredOfflineMapPacks={filteredOfflineMapPacks}
        estimatedDownloadedSizeMb={estimatedDownloadedSizeMb}
        offlineMapLoadingCode={offlineMapLoadingCode}
        onDownloadOfflineMapPack={(pack) => void downloadOfflineMapPack(pack)}
        offlineMapMessage={offlineMapMessage}
        onToggleThemeMode={() => setThemeMode((current) => (current === "light" ? "dark" : "light"))}
      />
      <AddSpotCard
        visible={addingSpot}
        bottomInset={insets.bottom}
        theme={theme}
        pendingSpot={pendingSpot}
        pendingCountry={pendingCountry}
        newSpotForm={newSpotForm}
        onChangeNewSpotForm={setNewSpotForm}
        newSpotError={newSpotError}
        submittingNewSpot={submittingNewSpot}
        onSubmit={() => submitNewSpot(pendingSpot, pendingCountry, () => {
          resetAddMode();
          resetNewSpotForm();
        })}
      />

      <SpotDetailsCard
        visible={Boolean(visibleSelectedMarker) && !addingSpot}
        bottomInset={insets.bottom}
        theme={theme}
        selectedMarker={visibleSelectedMarker}
        reviewFormVisible={reviewFormVisible}
        onToggleReviewForm={() => setReviewFormVisible((current) => !current)}
        reviewForm={reviewForm}
        onChangeReviewForm={setReviewForm}
        reviewError={reviewError}
        submittingReview={submittingReview}
        onSubmitReview={() => submitReview(visibleSelectedMarker, () => {
          resetReviewForm();
          setReviewFormVisible(false);
        })}
      />
    </View>
  );
}
