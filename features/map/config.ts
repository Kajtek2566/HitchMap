import Constants from "expo-constants";
import { Directory, File, Paths } from "expo-file-system";
import type { Region } from "react-native-maps";

export const DEFAULT_REGION: Region = {
  latitude: 50.0647,
  longitude: 19.945,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

export const MARKER_VIEW_MAX_DELTA = 0.22;
export const MAX_VISIBLE_POINT_MARKERS = 200;
export const FULL_SYNC_PAGE_SIZE = 1000;

export const TILE_DIRECTORY = new Directory(Paths.document, "light-map-tiles");
export const TILE_METADATA_FILE = new File(TILE_DIRECTORY, "packs.json");
export const OSM_TILE_TEMPLATE = `${TILE_DIRECTORY.uri}/{z}/{x}/{y}.png`;

export const API_URL = (() => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host) return `http://${host}:3000`;

  return "http://10.0.2.2:3000";
})();
