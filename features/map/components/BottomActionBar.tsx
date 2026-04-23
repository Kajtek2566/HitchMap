import React from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { styles } from "@/features/map/styles";
import type { ThemeColors } from "@/features/map/types";

type BottomActionBarProps = {
  bottomInset: number;
  theme: ThemeColors;
  menuOpen: boolean;
  groupMenuOpen: boolean;
  addingSpot: boolean;
  onPressMenu: () => void;
  onPressGroups: () => void;
  onPressAddSpot: () => void;
};

export function BottomActionBar({
  bottomInset,
  theme,
  menuOpen,
  groupMenuOpen,
  addingSpot,
  onPressMenu,
  onPressGroups,
  onPressAddSpot,
}: BottomActionBarProps) {
  return (
    <View style={[styles.bottomBar, { left: 16, right: 16, bottom: bottomInset + 16, backgroundColor: theme.bg, borderColor: theme.border }]}>
      <Pressable
        style={[styles.bottomBarButton, { borderColor: theme.border, backgroundColor: menuOpen ? theme.action : "transparent" }]}
        onPress={onPressMenu}
      >
        <MaterialCommunityIcons name="tune-variant" size={18} color={menuOpen ? "#ffffff" : theme.muted} />
        <Text style={[styles.bottomBarButtonText, { color: menuOpen ? "#ffffff" : theme.text }]}>Menu</Text>
        <Text style={[styles.bottomBarButtonLabel, { color: menuOpen ? "rgba(255,255,255,0.82)" : theme.muted }]}>Zaplecze</Text>
      </Pressable>
      <Pressable
        style={[styles.bottomBarButton, { borderColor: theme.border, backgroundColor: groupMenuOpen ? theme.action : "transparent" }]}
        onPress={onPressGroups}
      >
        <MaterialCommunityIcons name="account-group-outline" size={18} color={groupMenuOpen ? "#ffffff" : theme.muted} />
        <Text style={[styles.bottomBarButtonText, { color: groupMenuOpen ? "#ffffff" : theme.text }]}>Grupy</Text>
        <Text style={[styles.bottomBarButtonLabel, { color: groupMenuOpen ? "rgba(255,255,255,0.82)" : theme.muted }]}>Załoga</Text>
      </Pressable>
      <Pressable
        style={[
          styles.bottomBarButton,
          styles.bottomBarButtonPrimary,
          { borderColor: addingSpot ? theme.actionStrong : theme.action, backgroundColor: addingSpot ? theme.actionStrong : theme.action },
        ]}
        onPress={onPressAddSpot}
      >
        <MaterialCommunityIcons name={addingSpot ? "close-circle-outline" : "plus-circle"} size={20} color="#ffffff" />
        <Text style={[styles.bottomBarButtonText, { color: "#ffffff" }]}>{addingSpot ? "Anuluj" : "Dodaj punkt"}</Text>
        <Text style={[styles.bottomBarButtonLabel, { color: "rgba(255,255,255,0.82)" }]}>{addingSpot ? "Zamknij tryb" : "Nowy ślad"}</Text>
      </Pressable>
    </View>
  );
}
