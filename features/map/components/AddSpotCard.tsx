import React from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { RatingSelector } from "@/features/map/components/RatingSelector";
import { styles } from "@/features/map/styles";
import type { PendingSpot, ReviewForm, ThemeColors } from "@/features/map/types";

type AddSpotCardProps = {
  visible: boolean;
  bottomInset: number;
  theme: ThemeColors;
  pendingSpot: PendingSpot | null;
  pendingCountry: string | null;
  newSpotForm: ReviewForm;
  onChangeNewSpotForm: React.Dispatch<React.SetStateAction<ReviewForm>>;
  newSpotError: string | null;
  submittingNewSpot: boolean;
  onSubmit: () => void;
};

export function AddSpotCard({
  visible,
  bottomInset,
  theme,
  pendingSpot,
  pendingCountry,
  newSpotForm,
  onChangeNewSpotForm,
  newSpotError,
  submittingNewSpot,
  onSubmit,
}: AddSpotCardProps) {
  if (!visible) return null;

  return (
    <View style={[styles.detailsCard, { backgroundColor: theme.bg, bottom: bottomInset + 88 }]}>
      <View style={styles.cardTopRow}>
        <View style={styles.sectionHeaderTextBlock}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Nowy punkt</Text>
          <Text style={[styles.heroValue, { color: theme.sub }]}>
            {pendingSpot ? `${pendingSpot.latitude.toFixed(5)}, ${pendingSpot.longitude.toFixed(5)}` : "Wskaż miejsce na mapie."}
          </Text>
        </View>
        <View style={[styles.cardMetaPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardMetaText, { color: theme.action }]}>DODAJ</Text>
        </View>
      </View>
      {pendingSpot ? (
        <View style={styles.statPillRow}>
          <View style={[styles.statPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.drawerTabInner}>
              <MaterialCommunityIcons name="map-marker-outline" size={14} color={theme.action} />
              <Text style={[styles.statPillLabel, { color: theme.text }]}>Kraj: {pendingCountry ?? "wykrywanie..."}</Text>
            </View>
          </View>
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.scrollGap}>
        <View style={[styles.formCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Zostaw ślad na trasie</Text>
          <Text style={[styles.smallText, { color: theme.sub }]}>
            Dodaj ocenę i krótką wskazówkę, aby kolejna osoba wiedziała, czego spodziewać się po tym miejscu.
          </Text>
          <Text style={[styles.label, { color: theme.muted }]}>Ocena 1-5</Text>
          <RatingSelector theme={theme} form={newSpotForm} onChange={onChangeNewSpotForm} prefix="new" />
          <Text style={[styles.label, { color: theme.muted }]}>Komentarz</Text>
          <TextInput
            value={newSpotForm.comment}
            onChangeText={(value) => onChangeNewSpotForm((current) => ({ ...current, comment: value }))}
            style={[styles.input, styles.textarea, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
            multiline={true}
            textAlignVertical="top"
            placeholder="Opisz miejsce, ruch albo coś wartego uwagi"
            placeholderTextColor={theme.muted}
          />
          {newSpotError ? <Text style={styles.errorText}>{newSpotError}</Text> : null}
          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.action }, submittingNewSpot || !pendingSpot ? styles.disabledButton : null]}
            onPress={onSubmit}
          >
            <Text style={styles.primaryButtonText}>{submittingNewSpot ? "Zapisywanie..." : "Zostaw ślad"}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
