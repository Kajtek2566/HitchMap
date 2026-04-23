import type { CountryCount, OfflineMapPackEstimate } from "@/lib/countryUtils";
import type { MarkerGroup } from "@/lib/mapUtils";
import type { SpotRecord } from "@/lib/spotDb";

export type Spot = SpotRecord;
export type ReviewForm = { rating: string; comment: string };
export type PendingSpot = { latitude: number; longitude: number };
export type ThemeMode = "light" | "dark";
export type MenuSection = "group" | "database" | "maps" | "settings";
export type GroupPanelMode = "create" | "join" | "list";
export type GroupMember = {
  userId: string;
  displayName: string;
  avatarUri: string | null;
  lat: number | null;
  lon: number | null;
  updatedAt: number;
  isCurrentUser: boolean;
};
export type ActiveGroup = { code: string; name: string; ownerId: string; members: GroupMember[] };
export type ThemeColors = {
  bg: string;
  card: string;
  text: string;
  sub: string;
  muted: string;
  border: string;
  action: string;
  actionStrong: string;
  input: string;
  overlay: string;
  drawer: string;
};
export type MarkerGroupSpot = MarkerGroup<SpotRecord>;
export type SharedCountryCount = CountryCount;
export type SharedOfflineMapPack = OfflineMapPackEstimate;
