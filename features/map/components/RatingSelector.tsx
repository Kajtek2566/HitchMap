import React from "react";
import { Pressable, Text, View } from "react-native";

import { styles } from "@/features/map/styles";
import type { ReviewForm, ThemeColors } from "@/features/map/types";
import { getSpotColor } from "@/lib/mapUtils";

const REVIEW_OPTIONS = [1, 2, 3, 4, 5];

type RatingSelectorProps = {
  theme: ThemeColors;
  form: ReviewForm;
  onChange: React.Dispatch<React.SetStateAction<ReviewForm>>;
  prefix: string;
};

export function RatingSelector({ theme, form, onChange, prefix }: RatingSelectorProps) {
  return (
    <View style={styles.ratingRow}>
      {REVIEW_OPTIONS.map((option) => {
        const selected = form.rating === String(option);

        return (
          <Pressable
            key={`${prefix}-${option}`}
            style={[
              styles.ratingCircle,
              { borderColor: getSpotColor(option), backgroundColor: selected ? getSpotColor(option) : "transparent" },
            ]}
            onPress={() => onChange((current) => ({ ...current, rating: String(option) }))}
          >
            <Text style={[styles.ratingText, { color: selected ? "#ffffff" : theme.text }]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
