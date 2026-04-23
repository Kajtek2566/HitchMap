import React from "react";
import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { styles } from "@/features/map/styles";
import type { MenuSection, ThemeColors } from "@/features/map/types";

const MENU_ITEMS: { id: Exclude<MenuSection, "group">; label: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] }[] = [
  { id: "database", label: "Lokalna baza", icon: "database-outline" },
  { id: "maps", label: "Mapy offline", icon: "map-search-outline" },
  { id: "settings", label: "Ustawienia", icon: "cog-outline" },
];

type DrawerTabsProps = {
  menuSection: MenuSection;
  theme: ThemeColors;
  onMenuSectionChange: (value: MenuSection) => void;
};

export function DrawerTabs({ menuSection, theme, onMenuSectionChange }: DrawerTabsProps) {
  if (menuSection === "group") return null;

  return (
    <>
      {MENU_ITEMS.map((item) => (
        <Pressable
          key={item.id}
          style={[styles.drawerTab, { backgroundColor: menuSection === item.id ? theme.action : theme.bg, borderColor: theme.border }]}
          onPress={() => onMenuSectionChange(item.id)}
        >
          <View style={styles.drawerTabInner}>
            <MaterialCommunityIcons name={item.icon} size={18} color={menuSection === item.id ? "#ffffff" : theme.muted} />
            <Text style={[styles.drawerTabText, { color: menuSection === item.id ? "#ffffff" : theme.text }]}>{item.label}</Text>
          </View>
        </Pressable>
      ))}
    </>
  );
}
