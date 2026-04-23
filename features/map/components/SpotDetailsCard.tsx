import React from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { RatingSelector } from "@/features/map/components/RatingSelector";
import { styles } from "@/features/map/styles";
import type { MarkerGroupSpot, ReviewForm, ThemeColors } from "@/features/map/types";
import { formatSpotDate } from "@/lib/mapUtils";

type SpotDetailsCardProps = {
  visible: boolean;
  bottomInset: number;
  theme: ThemeColors;
  selectedMarker: MarkerGroupSpot | null;
  reviewFormVisible: boolean;
  onToggleReviewForm: () => void;
  reviewForm: ReviewForm;
  onChangeReviewForm: React.Dispatch<React.SetStateAction<ReviewForm>>;
  reviewError: string | null;
  submittingReview: boolean;
  onSubmitReview: () => void;
};

export function SpotDetailsCard({
  visible,
  bottomInset,
  theme,
  selectedMarker,
  reviewFormVisible,
  onToggleReviewForm,
  reviewForm,
  onChangeReviewForm,
  reviewError,
  submittingReview,
  onSubmitReview,
}: SpotDetailsCardProps) {
  if (!visible || !selectedMarker) return null;

  return (
    <View style={[styles.detailsCard, { backgroundColor: theme.bg, bottom: bottomInset + 88 }]}>
      <View style={styles.cardTopRow}>
        <View style={styles.sectionHeaderTextBlock}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{selectedMarker.primarySpot.country || "Szczegóły punktu"}</Text>
          <Text style={[styles.heroValue, { color: theme.sub }]}>Ślady podróżnych w tej lokalizacji: {selectedMarker.spots.length}</Text>
        </View>
        <View style={[styles.cardMetaPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardMetaText, { color: theme.action }]}>PUNKT</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollGap}>
        <View style={styles.statPillRow}>
          <View style={[styles.statPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.drawerTabInner}>
              <MaterialCommunityIcons name="sort-calendar-descending" size={14} color={theme.action} />
              <Text style={[styles.statPillLabel, { color: theme.text }]}>Najświeższe i najlepiej ocenione ślady</Text>
            </View>
          </View>
        </View>
        <Pressable style={[styles.primaryButton, { backgroundColor: theme.action }]} onPress={onToggleReviewForm}>
          <Text style={styles.primaryButtonText}>{reviewFormVisible ? "Ukryj formularz opinii" : "Dodaj opinię"}</Text>
        </Pressable>
        {reviewFormVisible ? (
          <View style={[styles.formCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Dodaj własny ślad</Text>
            <Text style={[styles.label, { color: theme.muted }]}>Ocena 1-5</Text>
            <RatingSelector theme={theme} form={reviewForm} onChange={onChangeReviewForm} prefix="review" />
            <Text style={[styles.label, { color: theme.muted }]}>Komentarz</Text>
            <TextInput
              value={reviewForm.comment}
              onChangeText={(value) => onChangeReviewForm((current) => ({ ...current, comment: value }))}
              style={[styles.input, styles.textarea, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
              multiline={true}
              textAlignVertical="top"
              placeholder="Napisz, jak wyglądało to miejsce na Twojej trasie"
              placeholderTextColor={theme.muted}
            />
            {reviewError ? <Text style={styles.errorText}>{reviewError}</Text> : null}
            <Pressable
              style={[styles.primaryButton, { backgroundColor: theme.action }, submittingReview ? styles.disabledButton : null]}
              onPress={onSubmitReview}
            >
              <Text style={styles.primaryButtonText}>{submittingReview ? "Zapisywanie..." : "Zapisz opinię"}</Text>
            </Pressable>
          </View>
        ) : null}
        {selectedMarker.spots.map((spot, index) => (
          <View key={String(spot.id)} style={[styles.formCard, { backgroundColor: theme.card }]}>
            <View style={styles.cardTopRow}>
              <View style={[styles.cardMetaPill, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                <Text style={[styles.cardMetaText, { color: theme.action }]}>WPIS {index + 1}</Text>
              </View>
            </View>
            {spot.rating !== null ? (
              <>
                <Text style={[styles.label, { color: theme.muted }]}>Ocena</Text>
                <Text style={[styles.value, { color: theme.text }]}>{spot.rating}</Text>
              </>
            ) : null}
            {spot.created_at ? (
              <>
                <Text style={[styles.label, { color: theme.muted }]}>Data dodania</Text>
                <Text style={[styles.value, { color: theme.text }]}>{formatSpotDate(spot.created_at)}</Text>
              </>
            ) : null}
            {spot.comment ? (
              <>
                <Text style={[styles.label, { color: theme.muted }]}>Komentarz</Text>
                <Text style={[styles.value, { color: theme.text }]}>{spot.comment}</Text>
              </>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
