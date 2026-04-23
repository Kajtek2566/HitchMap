import React from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { styles } from "@/features/map/styles";
import type { ThemeColors, ThemeMode } from "@/features/map/types";

type SettingsSectionProps = {
  visible: boolean;
  theme: ThemeColors;
  themeMode: ThemeMode;
  onToggleThemeMode: () => void;
};

export function SettingsSection({ visible, theme, themeMode, onToggleThemeMode }: SettingsSectionProps) {
  if (!visible) return null;

  return (
    <View style={[styles.drawerCard, { backgroundColor: theme.card }]}>
      <Text style={[styles.sectionEyebrow, { color: theme.action }]}>Klimat podróży</Text>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderTextBlock}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Ustawienia</Text>
          <Text style={[styles.sectionDescription, { color: theme.sub }]}>
            Dopasuj wygląd mapy do jasnego dnia w trasie albo spokojnego planowania kolejnego odcinka po zmroku.
          </Text>
        </View>
        <View style={[styles.sectionIconWrap, { backgroundColor: theme.bg, borderColor: theme.border, borderWidth: 1 }]}>
          <MaterialCommunityIcons name={themeMode === "dark" ? "weather-sunny" : "weather-night"} size={22} color={theme.action} />
        </View>
      </View>
      <View style={styles.statPillRow}>
        <View style={[styles.statPill, { backgroundColor: theme.bg, borderColor: theme.border }]}>
          <Text style={[styles.statPillLabel, { color: theme.text }]}>Motyw: {themeMode === "dark" ? "ciemny" : "jasny"}</Text>
        </View>
      </View>
      <Pressable style={[styles.secondaryButton, { borderColor: theme.action }]} onPress={onToggleThemeMode}>
        <Text style={[styles.secondaryButtonText, { color: theme.action }]}>{themeMode === "dark" ? "Włącz tryb jasny" : "Włącz tryb ciemny"}</Text>
      </Pressable>
    </View>
  );
}
