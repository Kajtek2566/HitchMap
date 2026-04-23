import { Alert } from "react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { SQLiteDatabase } from "expo-sqlite";
import type { Region } from "react-native-maps";

import type { Spot } from "@/features/map/types";
import {
  deleteSpotsByCountries,
  getCountryCounts,
  getExcludedCountries,
  getLastSyncAt,
  getLastSyncId,
  getSpotCount,
  replaceAllSpots,
  setExcludedCountries,
  setLastSyncAt,
  setLastSyncId,
  upsertSpots,
} from "@/lib/spotDb";
import { filterCountryStats, getCountryCode, getCountrySelectionKey, type CountryCount } from "@/lib/countryUtils";
import { getReadableErrorMessage, isNewerId } from "@/lib/mapUtils";

type SyncPayload = {
  spots?: Spot[];
  lastSyncId?: string | null;
  total?: number | null;
  hasMore?: boolean;
  syncedAt?: string;
};

type UseLocalSyncParams = {
  apiUrl: string;
  currentRegion: Region;
  dbRef: MutableRefObject<SQLiteDatabase | null>;
  fullSyncPageSize: number;
  loadVisibleRegionFromDb: (region: Region, providedDb?: SQLiteDatabase | null) => Promise<void>;
  setErrorMessage: (value: string | null) => void;
};

const nowMs = () => Date.now();
const SYNC_PROGRESS_REPORT_STEP = 10000;

export function useLocalSync({
  apiUrl,
  currentRegion,
  dbRef,
  fullSyncPageSize,
  loadVisibleRegionFromDb,
  setErrorMessage,
}: UseLocalSyncParams) {
  const syncInFlightRef = useRef(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Lokalna baza gotowa.");
  const [syncProgressCurrent, setSyncProgressCurrent] = useState<number | null>(null);
  const [syncProgressTotal, setSyncProgressTotal] = useState<number | null>(null);
  const [localSpotCount, setLocalSpotCount] = useState(0);
  const [lastSyncAtValue, setLastSyncAtValue] = useState<string | null>(null);
  const [localCountryStats, setLocalCountryStats] = useState<CountryCount[]>([]);
  const [localCountryQuery, setLocalCountryQuery] = useState("");
  const [selectedLocalCountryKeys, setSelectedLocalCountryKeys] = useState<string[]>([]);
  const [excludedLocalCountryKeys, setExcludedLocalCountryKeys] = useState<string[]>([]);
  const [pruningLocalDb, setPruningLocalDb] = useState(false);
  const [localDbAdvancedOpen, setLocalDbAdvancedOpen] = useState(false);

  const filteredLocalCountryStats = useMemo(
    () => filterCountryStats(localCountryStats, localCountryQuery),
    [localCountryQuery, localCountryStats],
  );
  const persistedSelectedLocalCountryKeys = useMemo(() => {
    const excludedSet = new Set(excludedLocalCountryKeys);
    return localCountryStats
      .map((item) => getCountrySelectionKey(item.country))
      .filter((key) => !excludedSet.has(key));
  }, [excludedLocalCountryKeys, localCountryStats]);

  const refreshLocalStats = useCallback(async (providedDb?: SQLiteDatabase | null) => {
    const database = providedDb ?? dbRef.current;
    if (!database) return;

    const [count, lastSyncAt, countryStats, excludedCountries] = await Promise.all([
      getSpotCount(database),
      getLastSyncAt(database),
      getCountryCounts(database),
      getExcludedCountries(database),
    ]);

    setLocalSpotCount(count);
    setLastSyncAtValue(lastSyncAt);
    setLocalCountryStats(countryStats);
    setExcludedLocalCountryKeys(excludedCountries.map((country) => getCountrySelectionKey(country)));
  }, [dbRef]);

  const syncLocalDatabase = useCallback(async (mode: "auto" | "full" = "auto", providedDb?: SQLiteDatabase | null) => {
    const database = providedDb ?? dbRef.current;
    if (!database || syncInFlightRef.current) return;

    syncInFlightRef.current = true;
    setSyncing(true);
    setErrorMessage(null);
    setSyncProgressCurrent(null);
    setSyncProgressTotal(null);

    try {
      const currentLastSyncId = mode === "full" ? null : await getLastSyncId(database);
      const excludedCountries = await getExcludedCountries(database);
      const existingCount = await getSpotCount(database);
      const useFullSync = mode === "full" || existingCount === 0 || !currentLastSyncId;
      const filterExcludedSpots = (items: Spot[]) =>
        excludedCountries.length === 0
          ? items
          : items.filter((spot) => {
              const countryCode = getCountryCode(spot.country);
              return !countryCode || !excludedCountries.includes(countryCode);
            });

      if (useFullSync) {
        let afterId: string | null = null;
        let totalInserted = 0;
        let totalExpected: number | null = null;
        let syncedAt = new Date().toISOString();
        let isFirstPage = true;
        let lastReportedInserted = 0;

        setSyncStatus("Pobieranie wpisów...");

        while (true) {
          const pageStartedAt = nowMs();
          const pageUrl = `${apiUrl}/sync/full?limit=${fullSyncPageSize}${afterId ? `&afterId=${encodeURIComponent(afterId)}` : ""}`;
          const fetchStartedAt = nowMs();
          const response = await fetch(pageUrl);
          const fetchFinishedAt = nowMs();
          const payload = (await response.json()) as SyncPayload;

          if (!response.ok || !Array.isArray(payload.spots)) {
            throw new Error(
              typeof (payload as { error?: string }).error === "string"
                ? (payload as { error?: string }).error
                : "Synchronizacja nie powiodła się.",
            );
          }

          if (typeof payload.total === "number") {
            totalExpected = payload.total;
            setSyncProgressTotal(payload.total);
          }

          syncedAt = payload.syncedAt ?? syncedAt;
          const filteredSpots = filterExcludedSpots(payload.spots);
          const writeStartedAt = nowMs();

          if (isFirstPage) {
            await replaceAllSpots(database, filteredSpots);
            isFirstPage = false;
          } else {
            await upsertSpots(database, filteredSpots);
          }

          const writeFinishedAt = nowMs();
          totalInserted += filteredSpots.length;
          afterId = payload.lastSyncId ?? afterId;

          const shouldReportProgress =
            lastReportedInserted === 0 ||
            totalInserted - lastReportedInserted >= SYNC_PROGRESS_REPORT_STEP ||
            !payload.hasMore;

          if (shouldReportProgress) {
            setSyncProgressCurrent(totalInserted);
            lastReportedInserted = totalInserted;
          }

          console.log(
            `[sync/full] fetched=${filteredSpots.length} fetchMs=${fetchFinishedAt - fetchStartedAt} writeMs=${writeFinishedAt - writeStartedAt} totalPageMs=${writeFinishedAt - pageStartedAt} progress=${totalInserted}/${totalExpected ?? "?"}`,
          );

          if (!payload.hasMore || payload.spots.length === 0 || !afterId) {
            await Promise.all([
              setLastSyncId(database, afterId),
              setLastSyncAt(database, syncedAt),
            ]);
            setSyncStatus("Synchronizacja zakończona.");
            setSyncProgressCurrent(totalInserted);
            break;
          }
        }
      } else {
        const pageStartedAt = nowMs();
        const fetchStartedAt = nowMs();
        const response = await fetch(`${apiUrl}/sync/changes?sinceId=${encodeURIComponent(currentLastSyncId)}`);
        const fetchFinishedAt = nowMs();
        const payload = (await response.json()) as SyncPayload;

        if (!response.ok || !Array.isArray(payload.spots)) {
          throw new Error(
            typeof (payload as { error?: string }).error === "string"
              ? (payload as { error?: string }).error
              : "Synchronizacja nie powiodła się.",
          );
        }

        const filteredSpots = filterExcludedSpots(payload.spots);
        setSyncStatus("Pobieranie wpisów...");
        setSyncProgressCurrent(0);
        setSyncProgressTotal(filteredSpots.length);

        const writeStartedAt = nowMs();
        await upsertSpots(database, filteredSpots);
        const writeFinishedAt = nowMs();

        const nextLastSyncId = payload.lastSyncId ?? currentLastSyncId ?? null;
        await Promise.all([
          setLastSyncId(database, nextLastSyncId),
          setLastSyncAt(database, payload.syncedAt ?? new Date().toISOString()),
        ]);

        console.log(
          `[sync/changes] fetched=${filteredSpots.length} fetchMs=${fetchFinishedAt - fetchStartedAt} writeMs=${writeFinishedAt - writeStartedAt} totalPageMs=${writeFinishedAt - pageStartedAt}`,
        );

        setSyncStatus(filteredSpots.length > 0 ? "Synchronizacja zakończona." : "Lokalna baza jest już aktualna.");
        setSyncProgressCurrent(filteredSpots.length);
      }

      await refreshLocalStats(database);
      await loadVisibleRegionFromDb(currentRegion, database);
    } catch (error) {
      console.warn("[sync] Synchronizacja lokalnej bazy nie powiodła się.", error);
      setErrorMessage(getReadableErrorMessage(error, "Nie udało się zsynchronizować lokalnej bazy."));
      setSyncStatus("Pokazuję dane zapisane lokalnie.");
      await refreshLocalStats(database);
      await loadVisibleRegionFromDb(currentRegion, database);
    } finally {
      syncInFlightRef.current = false;
      setSyncing(false);
    }
  }, [apiUrl, currentRegion, dbRef, fullSyncPageSize, loadVisibleRegionFromDb, refreshLocalStats, setErrorMessage]);

  const persistSpotLocally = useCallback(async (spot: Spot) => {
    const database = dbRef.current;
    if (!database) return;

    await upsertSpots(database, [spot]);

    const previousLastSyncId = await getLastSyncId(database);
    const nextLastSyncId = isNewerId(spot.id, previousLastSyncId) ? spot.id : previousLastSyncId;

    await Promise.all([
      setLastSyncId(database, nextLastSyncId),
      setLastSyncAt(database, new Date().toISOString()),
    ]);

    await refreshLocalStats(database);
    await loadVisibleRegionFromDb(currentRegion, database);
  }, [currentRegion, dbRef, loadVisibleRegionFromDb, refreshLocalStats]);

  const pruneLocalDatabase = useCallback(async () => {
    const database = dbRef.current;
    if (!database) return;

    const countriesToDelete = localCountryStats
      .filter((item) => !selectedLocalCountryKeys.includes(getCountrySelectionKey(item.country)))
      .map((item) => item.country);

    if (countriesToDelete.length === 0) {
      setSyncStatus("Brak krajów do usunięcia z lokalnej bazy.");
      return;
    }

    setPruningLocalDb(true);
    setErrorMessage(null);

    try {
      await deleteSpotsByCountries(database, countriesToDelete);
      const nextExcludedCountries = Array.from(
        new Set([
          ...excludedLocalCountryKeys
            .map((key) => (key === "__NO_COUNTRY__" ? null : key))
            .filter((country): country is string => country !== null),
          ...countriesToDelete
            .map((country) => getCountryCode(country))
            .filter((country): country is string => country !== null),
        ]),
      );
      await setExcludedCountries(database, nextExcludedCountries);
      await Promise.all([
        refreshLocalStats(database),
        loadVisibleRegionFromDb(currentRegion, database),
      ]);
      setSyncStatus(`Usunięto rekordy z ${countriesToDelete.length} krajów z lokalnej bazy.`);
    } catch (error) {
      setErrorMessage(getReadableErrorMessage(error, "Nie udało się usunąć wybranych krajów z lokalnej bazy."));
    } finally {
      setPruningLocalDb(false);
    }
  }, [currentRegion, dbRef, excludedLocalCountryKeys, loadVisibleRegionFromDb, localCountryStats, refreshLocalStats, selectedLocalCountryKeys, setErrorMessage]);

  const confirmPruneLocalDatabase = useCallback(() => {
    const countriesToDelete = localCountryStats.filter(
      (item) => !selectedLocalCountryKeys.includes(getCountrySelectionKey(item.country)),
    );
    const deleteCount = countriesToDelete.reduce((sum, item) => sum + item.count, 0);

    if (deleteCount === 0) {
      setSyncStatus("Brak rekordów do usunięcia z lokalnej bazy.");
      return;
    }

    Alert.alert(
      "Potwierdź usunięcie",
      `Czy na pewno chcesz usunąć ${deleteCount} wpisów z lokalnej bazy?`,
      [
        { text: "Anuluj", style: "cancel" },
        { text: "Usuń", style: "destructive", onPress: () => void pruneLocalDatabase() },
      ],
    );
  }, [localCountryStats, pruneLocalDatabase, selectedLocalCountryKeys]);

  return {
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
  };
}
