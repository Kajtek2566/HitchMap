import { useCallback, useEffect, useMemo, useState } from "react";
import { Directory, File } from "expo-file-system";

import { OFFLINE_MAP_PACKS, enrichOfflineMapPack, filterOfflineMapPacks, type OfflineMapPack } from "@/lib/countryUtils";
import { getReadableErrorMessage, latToTileY, lonToTileX } from "@/lib/mapUtils";

type UseOfflineMapsParams = {
  tileDirectory: Directory;
  tileMetadataFile: File;
};

export function useOfflineMaps({ tileDirectory, tileMetadataFile }: UseOfflineMapsParams) {
  const [downloadedMapCodes, setDownloadedMapCodes] = useState<string[]>([]);
  const [offlineTilesEnabled, setOfflineTilesEnabled] = useState(true);
  const [offlineMapLoadingCode, setOfflineMapLoadingCode] = useState<string | null>(null);
  const [offlineMapMessage, setOfflineMapMessage] = useState<string | null>(null);
  const [offlineCountryQuery, setOfflineCountryQuery] = useState("");

  const filteredOfflineMapPacks = useMemo(() => {
    return filterOfflineMapPacks(OFFLINE_MAP_PACKS, offlineCountryQuery).map(enrichOfflineMapPack);
  }, [offlineCountryQuery]);

  const estimatedDownloadedSizeMb = useMemo(() => {
    return OFFLINE_MAP_PACKS
      .filter((pack) => downloadedMapCodes.includes(pack.code))
      .map(enrichOfflineMapPack)
      .reduce((sum, pack) => sum + pack.estimatedSizeMb, 0);
  }, [downloadedMapCodes]);

  const persistOfflineMapMetadata = useCallback((codes: string[]) => {
    tileDirectory.create({ idempotent: true, intermediates: true });
    if (!tileMetadataFile.exists) {
      tileMetadataFile.create({ intermediates: true, overwrite: true });
    }
    tileMetadataFile.write(JSON.stringify({ downloadedCodes: codes }));
    setDownloadedMapCodes(codes);
  }, [tileDirectory, tileMetadataFile]);

  const refreshOfflineMapMetadata = useCallback(() => {
    try {
      tileDirectory.create({ idempotent: true, intermediates: true });
      if (!tileMetadataFile.exists) {
        tileMetadataFile.create({ intermediates: true, overwrite: true });
        tileMetadataFile.write(JSON.stringify({ downloadedCodes: [] }));
        setDownloadedMapCodes([]);
        return;
      }

      const raw = tileMetadataFile.textSync();
      const parsed = JSON.parse(raw || "{}") as { downloadedCodes?: string[] };
      setDownloadedMapCodes(Array.isArray(parsed.downloadedCodes) ? parsed.downloadedCodes : []);
    } catch {
      setDownloadedMapCodes([]);
    }
  }, [tileDirectory, tileMetadataFile]);

  useEffect(() => {
    refreshOfflineMapMetadata();
  }, [refreshOfflineMapMetadata]);

  const downloadOfflineMapPack = useCallback(async (pack: OfflineMapPack) => {
    setOfflineMapLoadingCode(pack.code);
    setOfflineMapMessage(null);

    try {
      tileDirectory.create({ idempotent: true, intermediates: true });
      const uniqueTiles = new Set<string>();

      for (let zoom = pack.zoomMin; zoom <= pack.zoomMax; zoom += 1) {
        const minX = lonToTileX(pack.bounds.minLon, zoom);
        const maxX = lonToTileX(pack.bounds.maxLon, zoom);
        const minY = latToTileY(pack.bounds.maxLat, zoom);
        const maxY = latToTileY(pack.bounds.minLat, zoom);

        for (let x = minX; x <= maxX; x += 1) {
          const zoomDirectory = new Directory(tileDirectory, String(zoom), String(x));
          zoomDirectory.create({ idempotent: true, intermediates: true });

          for (let y = minY; y <= maxY; y += 1) {
            const tileFile = new File(zoomDirectory, `${y}.png`);
            uniqueTiles.add(`${zoom}/${x}/${y}`);
            if (tileFile.exists) continue;
            await File.downloadFileAsync(`https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`, tileFile, {
              idempotent: true,
            });
          }
        }
      }

      const nextCodes = downloadedMapCodes.includes(pack.code) ? downloadedMapCodes : [...downloadedMapCodes, pack.code];
      persistOfflineMapMetadata(nextCodes);
      setOfflineMapMessage(`Lekka mapa ${pack.label} pobrana. Kafelkow: ${uniqueTiles.size}.`);
      setOfflineTilesEnabled(true);
    } catch (error) {
      setOfflineMapMessage(getReadableErrorMessage(error, `Nie udalo sie pobrac mapy ${pack.label}.`));
    } finally {
      setOfflineMapLoadingCode(null);
    }
  }, [downloadedMapCodes, persistOfflineMapMetadata, tileDirectory]);

  return {
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
  };
}
