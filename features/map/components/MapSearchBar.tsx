import React from "react";
import { Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { styles } from "@/features/map/styles";
import type { ThemeColors } from "@/features/map/types";

type MapSearchBarProps = {
  topInset: number;
  theme: ThemeColors;
  searchQuery: string;
  onChangeSearchQuery: (value: string) => void;
  onSubmit: () => void;
  searchLoading: boolean;
  viewportLoading: boolean;
  viewportStatusMessage: string | null;
  errorMessage: string | null;
};

export function MapSearchBar({
  topInset,
  theme,
  searchQuery,
  onChangeSearchQuery,
  onSubmit,
  searchLoading,
  viewportLoading,
  viewportStatusMessage,
  errorMessage,
}: MapSearchBarProps) {
  const feedbackMessage = errorMessage ?? viewportStatusMessage;
  const feedbackColor = errorMessage ? "#ef4444" : theme.sub;

  return (
    <>
      <View style={[styles.searchCard, { top: topInset + 12, backgroundColor: theme.bg, borderColor: theme.border }]}>
        <Text style={[styles.searchLabel, { color: theme.muted }]}>Kierunek podrozy</Text>
        <View style={styles.searchInputRow}>
          <View style={[styles.searchInputIconWrap, { backgroundColor: theme.action }]}>
            <MaterialCommunityIcons name={searchLoading ? "progress-clock" : "map-search-outline"} size={18} color="#ffffff" />
          </View>
          <TextInput
            value={searchQuery}
            onChangeText={onChangeSearchQuery}
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={searchLoading ? "Szukam miejsca na trasie..." : "Dokad ruszamy? Wpisz miasto lub kraj"}
            placeholderTextColor={theme.muted}
            onSubmitEditing={onSubmit}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="words"
            editable={!searchLoading}
          />
        </View>
      </View>
      {feedbackMessage ? (
        <View style={[styles.searchFeedback, { top: topInset + 88, backgroundColor: theme.bg }]}>
          <Text style={[styles.smallText, { color: feedbackColor }]}>
            {viewportLoading && !errorMessage ? "Ladowanie pinezek..." : feedbackMessage}
          </Text>
        </View>
      ) : null}
    </>
  );
}
