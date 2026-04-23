import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { styles } from "@/features/map/styles";
import type { SharedOfflineMapPack, ThemeColors } from "@/features/map/types";
import { getCountryDisplayLabel } from "@/lib/countryUtils";

type OfflineMapsSectionProps = {
  visible: boolean;
  theme: ThemeColors;
  offlineCountryQuery: string;
  onChangeOfflineCountryQuery: (value: string) => void;
  offlineTilesEnabled: boolean;
  onToggleOfflineTiles: () => void;
  downloadedMapCodes: string[];
  filteredOfflineMapPacks: SharedOfflineMapPack[];
  estimatedDownloadedSizeMb: number;
  offlineMapLoadingCode: string | null;
  onDownloadOfflineMapPack: (pack: SharedOfflineMapPack) => void;
  offlineMapMessage: string | null;
};

export function OfflineMapsSection({
  visible,
  theme,
  offlineCountryQuery,
  onChangeOfflineCountryQuery,
  offlineTilesEnabled,
  onToggleOfflineTiles,
  downloadedMapCodes,
  filteredOfflineMapPacks,
  estimatedDownloadedSizeMb,
  offlineMapLoadingCode,
  onDownloadOfflineMapPack,
  offlineMapMessage,
}: OfflineMapsSectionProps) {
  if (!visible) return null;

  const hasOfflineQuery = offlineCountryQuery.trim().length > 0;

  return (
    <View style={[styles.drawerCard, { backgroundColor: theme.card }]}>
      <Text style={[styles.sectionEyebrow, { color: theme.action }]}>Mapa na drogę</Text>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderTextBlock}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Mapy offline</Text>
          <Text style={[styles.sectionDescription, { color: theme.sub }]}>
            Pobierane są lekkie kafelki OSM, aby mapa kraju była pod ręką nawet wtedy, gdy droga prowadzi poza zasięg.
          </Text>
        </View>
        <View style={[styles.sectionIconWrap, { backgroundColor: theme.bg, borderColor: theme.border, borderWidth: 1 }]}>
          <MaterialCommunityIcons name="map-search-outline" size={22} color={theme.action} />
        </View>
      </View>
      <View style={styles.statPillRow}>
        <View style={[styles.statPill, { backgroundColor: theme.bg, borderColor: theme.border }]}>
          <Text style={[styles.statPillLabel, { color: theme.text }]}>Mapy w plecaku: {downloadedMapCodes.length}</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: theme.bg, borderColor: theme.border }]}>
          <Text style={[styles.statPillLabel, { color: theme.text }]}>Szac. cache: {estimatedDownloadedSizeMb.toFixed(1)} MB</Text>
        </View>
      </View>
      <TextInput
        value={offlineCountryQuery}
        onChangeText={onChangeOfflineCountryQuery}
        style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
        placeholder="Wpisz kraj, np. Polska"
        placeholderTextColor={theme.muted}
        autoCorrect={false}
        autoCapitalize="words"
      />
      <Pressable style={[styles.secondaryButton, { borderColor: theme.action }]} onPress={onToggleOfflineTiles}>
        <Text style={[styles.secondaryButtonText, { color: theme.action }]}>{offlineTilesEnabled ? "Ukryj lokalne mapy" : "Pokaż lokalne mapy"}</Text>
      </Pressable>
      <View style={[styles.formCard, { backgroundColor: theme.bg }]}>
        <Text style={[styles.smallText, { color: theme.sub }]}>
          Pobrane kraje: {downloadedMapCodes.length > 0 ? downloadedMapCodes.map((code) => getCountryDisplayLabel(code)).join(", ") : "brak"}
        </Text>
      </View>
      {!hasOfflineQuery ? (
        <Text style={[styles.smallText, { color: theme.sub }]}>Wpisz nazwę kraju, aby zobaczyć dostępne pakiety offline.</Text>
      ) : null}
      {hasOfflineQuery && filteredOfflineMapPacks.length === 0 ? (
        <Text style={[styles.smallText, { color: theme.sub }]}>Nie znaleziono kraju pasującego do wyszukiwania.</Text>
      ) : null}
      <View style={styles.listStack}>
        {filteredOfflineMapPacks.map((pack) => (
          <View key={pack.code} style={[styles.savedGroupCard, { backgroundColor: theme.bg, borderColor: theme.border }]}>
            <View style={styles.cardTopRow}>
              <View style={styles.sectionHeaderTextBlock}>
                <Text style={[styles.memberName, { color: theme.text }]}>{pack.label}</Text>
                <Text style={[styles.smallText, { color: theme.sub }]}>Lekki pakiet zoom {pack.zoomMin}-{pack.zoomMax}</Text>
                <Text style={[styles.smallText, { color: pack.isLargeDownload ? "#b45309" : theme.sub }]}>
                  Szacunkowo {pack.estimatedSizeLabel} / {pack.estimatedTileCount} kafelków{pack.isLargeDownload ? " - większy pakiet" : ""}
                </Text>
              </View>
              <View style={[styles.cardMetaPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.cardMetaText, { color: downloadedMapCodes.includes(pack.code) ? theme.action : theme.muted }]}>
                  {downloadedMapCodes.includes(pack.code) ? "Pobrano" : "Gotowe"}
                </Text>
              </View>
            </View>
            <Pressable
              style={[styles.primaryButton, { backgroundColor: theme.action }, offlineMapLoadingCode === pack.code ? styles.disabledButton : null]}
              onPress={() => onDownloadOfflineMapPack(pack)}
            >
              <Text style={styles.primaryButtonText}>
                {offlineMapLoadingCode === pack.code ? "Pobieranie..." : downloadedMapCodes.includes(pack.code) ? "Pobierz ponownie" : "Pobierz lekką mapę"}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
      {offlineMapMessage ? <Text style={[styles.smallText, { color: offlineMapMessage.startsWith("Lekka mapa") ? theme.action : "#ef4444" }]}>{offlineMapMessage}</Text> : null}
    </View>
  );
}
