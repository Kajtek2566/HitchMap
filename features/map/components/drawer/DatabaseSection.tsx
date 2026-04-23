import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { styles } from "@/features/map/styles";
import type { SharedCountryCount, ThemeColors } from "@/features/map/types";
import { getCountryDisplayLabel, getCountrySelectionKey } from "@/lib/countryUtils";
import { formatSpotDate } from "@/lib/mapUtils";

type DatabaseSectionProps = {
  visible: boolean;
  theme: ThemeColors;
  localSpotCount: number;
  lastSyncAtValue: string | null;
  syncStatus: string;
  syncProgressCurrent: number | null;
  syncProgressTotal: number | null;
  syncing: boolean;
  onSyncAuto: () => void;
  onSyncFull: () => void;
  localDbAdvancedOpen: boolean;
  onToggleLocalDbAdvanced: () => void;
  localCountryQuery: string;
  onChangeLocalCountryQuery: (value: string) => void;
  filteredLocalCountryStats: SharedCountryCount[];
  selectedLocalCountryKeys: string[];
  onToggleLocalCountry: (selectionKey: string) => void;
  onClearSelectedLocalCountries: () => void;
  pruningLocalDb: boolean;
  onConfirmPruneLocalDatabase: () => void;
};

const formatProgressValue = (value: number | null) =>
  typeof value === "number" ? new Intl.NumberFormat("pl-PL").format(value) : "?";

export function DatabaseSection({
  visible,
  theme,
  localSpotCount,
  lastSyncAtValue,
  syncStatus,
  syncProgressCurrent,
  syncProgressTotal,
  syncing,
  onSyncAuto,
  onSyncFull,
  localDbAdvancedOpen,
  onToggleLocalDbAdvanced,
  localCountryQuery,
  onChangeLocalCountryQuery,
  filteredLocalCountryStats,
  selectedLocalCountryKeys,
  onToggleLocalCountry,
  onClearSelectedLocalCountries,
  pruningLocalDb,
  onConfirmPruneLocalDatabase,
}: DatabaseSectionProps) {
  if (!visible) return null;

  const progressLabel =
    syncing && (syncProgressCurrent !== null || syncProgressTotal !== null)
      ? `${formatProgressValue(syncProgressCurrent)} / ${formatProgressValue(syncProgressTotal)}`
      : null;

  return (
    <View style={[styles.drawerCard, { backgroundColor: theme.card }]}>
      <Text style={[styles.sectionEyebrow, { color: theme.action }]}>Zaplecze wyprawy</Text>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderTextBlock}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Lokalna baza</Text>
          <Text style={[styles.sectionDescription, { color: theme.sub }]}>
            Punkty zapisują się lokalnie, dzięki czemu mapa szybciej reaguje i nadal wspiera Cię wtedy, gdy zasięg zostaje daleko za Tobą.
          </Text>
        </View>
        <View style={[styles.sectionIconWrap, { backgroundColor: theme.bg, borderColor: theme.border, borderWidth: 1 }]}>
          <MaterialCommunityIcons name="database-outline" size={22} color={theme.action} />
        </View>
      </View>

      <View style={styles.statPillRow}>
        <View style={[styles.statPill, { backgroundColor: theme.bg, borderColor: theme.border }]}>
          <Text style={[styles.statPillLabel, { color: theme.text }]}>Wpisy lokalnie: {new Intl.NumberFormat("pl-PL").format(localSpotCount)}</Text>
        </View>
        <View style={[styles.statPill, { backgroundColor: theme.bg, borderColor: theme.border }]}>
          <Text style={[styles.statPillLabel, { color: theme.text }]}>Status: {syncStatus}</Text>
        </View>
      </View>

      {progressLabel ? (
        <View style={[styles.formCard, { backgroundColor: theme.bg }]}>
          <Text style={[styles.smallText, { color: theme.sub }]}>Postęp synchronizacji: {progressLabel}</Text>
        </View>
      ) : null}

      <View style={[styles.formCard, { backgroundColor: theme.bg }]}>
        <Text style={[styles.smallText, { color: theme.sub }]}>Ostatnia synchronizacja: {lastSyncAtValue ? formatSpotDate(lastSyncAtValue) : "brak"}</Text>
      </View>

      <Pressable style={[styles.primaryButton, { backgroundColor: theme.action }, syncing ? styles.disabledButton : null]} onPress={onSyncAuto}>
        <Text style={styles.primaryButtonText}>{syncing ? "Synchronizowanie..." : "Synchronizuj teraz"}</Text>
      </Pressable>

      <Pressable style={[styles.secondaryButton, { borderColor: theme.action }, syncing ? styles.disabledButton : null]} onPress={onSyncFull}>
        <Text style={[styles.secondaryButtonText, { color: theme.action }]}>Wymuś pełną synchronizację</Text>
      </Pressable>

      <Pressable style={[styles.secondaryButton, { borderColor: theme.action }]} onPress={onToggleLocalDbAdvanced}>
        <Text style={[styles.secondaryButtonText, { color: theme.action }]}>{localDbAdvancedOpen ? "Ukryj zaawansowane" : "Zaawansowane"}</Text>
      </Pressable>

      {localDbAdvancedOpen ? (
        <>
          <View style={[styles.sectionDivider, { backgroundColor: theme.border }]} />
          <Text style={[styles.smallText, { color: theme.sub }]}>
            Odznacz kraje, których nie chcesz przechowywać lokalnie, aby zwolnić pamięć urządzenia.
          </Text>
          <TextInput
            value={localCountryQuery}
            onChangeText={onChangeLocalCountryQuery}
            style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
            placeholder="Szukaj kraju w lokalnej bazie"
            placeholderTextColor={theme.muted}
            autoCorrect={false}
            autoCapitalize="words"
          />
          <View style={styles.inlineActionRow}>
            <Pressable style={[styles.inlineActionButton, styles.secondaryButton, { borderColor: theme.action }]} onPress={onClearSelectedLocalCountries}>
              <Text style={[styles.secondaryButtonText, { color: theme.action }]}>Odznacz wszystkie</Text>
            </Pressable>
            <Pressable
              style={[styles.inlineActionButton, styles.primaryButton, { backgroundColor: "#dc2626" }, pruningLocalDb ? styles.disabledButton : null]}
              onPress={onConfirmPruneLocalDatabase}
            >
              <Text style={styles.primaryButtonText}>{pruningLocalDb ? "Usuwanie..." : "Zachowaj"}</Text>
            </Pressable>
          </View>
          {filteredLocalCountryStats.length === 0 ? (
            <Text style={[styles.smallText, { color: theme.sub }]}>Brak krajów pasujących do wyszukiwania.</Text>
          ) : (
            <View style={styles.listStack}>
              {filteredLocalCountryStats.map((item) => {
                const selectionKey = getCountrySelectionKey(item.country);
                const selected = selectedLocalCountryKeys.includes(selectionKey);

                return (
                  <Pressable
                    key={selectionKey}
                    style={[styles.countrySelectionRow, { backgroundColor: theme.bg, borderColor: theme.border }]}
                    onPress={() => onToggleLocalCountry(selectionKey)}
                  >
                    <View style={[styles.countryTick, { borderColor: selected ? theme.action : theme.border, backgroundColor: selected ? theme.action : "transparent" }]}>
                      {selected ? <Text style={[styles.countryTickText, { color: "#ffffff" }]}>✓</Text> : null}
                    </View>
                    <View style={styles.countrySelectionTextBlock}>
                      <Text style={[styles.memberName, { color: theme.text }]}>{getCountryDisplayLabel(item.country)}</Text>
                      <Text style={[styles.smallText, { color: theme.sub }]}>{item.count} rekordów</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      ) : null}
    </View>
  );
}
