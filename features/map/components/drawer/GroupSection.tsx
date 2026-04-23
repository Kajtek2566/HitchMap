import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { styles } from "@/features/map/styles";
import type { ActiveGroup, GroupPanelMode, ThemeColors } from "@/features/map/types";
import { formatLocationFreshness } from "@/lib/mapUtils";

const GROUP_MODES: { id: GroupPanelMode; label: string }[] = [
  { id: "create", label: "Utworz" },
  { id: "join", label: "Dolacz" },
  { id: "list", label: "Twoje grupy" },
];

type GroupSectionProps = {
  visible: boolean;
  theme: ThemeColors;
  activeGroup: ActiveGroup | null;
  groupLocationStatus: string | null;
  groupPanelMode: GroupPanelMode;
  onGroupPanelModeChange: (value: GroupPanelMode) => void;
  groupRosterVisible: boolean;
  onToggleGroupRoster: () => void;
  onLeaveGroup: () => void;
  groupName: string;
  onChangeGroupName: (value: string) => void;
  groupJoinCode: string;
  onChangeGroupJoinCode: (value: string) => void;
  groupLoading: boolean;
  renameGroupName: string;
  onChangeRenameGroupName: (value: string) => void;
  renamingGroup: boolean;
  removingMemberUserId: string | null;
  onCreateGroup: () => void;
  onJoinGroup: () => void;
  onRenameGroup: () => void;
  onRemoveMember: (memberUserId: string) => void;
  myGroupsLoading: boolean;
  myGroups: ActiveGroup[];
  onSelectGroup: (group: ActiveGroup) => void;
  onFocusMemberLocation: (member: ActiveGroup["members"][number]) => void;
  groupError: string | null;
};

export function GroupSection({
  visible,
  theme,
  activeGroup,
  groupLocationStatus,
  groupPanelMode,
  onGroupPanelModeChange,
  groupRosterVisible,
  onToggleGroupRoster,
  onLeaveGroup,
  groupName,
  onChangeGroupName,
  groupJoinCode,
  onChangeGroupJoinCode,
  groupLoading,
  renameGroupName,
  onChangeRenameGroupName,
  renamingGroup,
  removingMemberUserId,
  onCreateGroup,
  onJoinGroup,
  onRenameGroup,
  onRemoveMember,
  myGroupsLoading,
  myGroups,
  onSelectGroup,
  onFocusMemberLocation,
  groupError,
}: GroupSectionProps) {
  if (!visible) return null;

  const membersWithLocation = activeGroup?.members.filter((member) => member.lat !== null && member.lon !== null).length ?? 0;
  const currentUserMember = activeGroup?.members.find((member) => member.isCurrentUser) ?? null;
  const canManageMembers = activeGroup?.ownerId === currentUserMember?.userId;

  return (
    <View style={[styles.drawerCard, { backgroundColor: theme.card }]}>
      <Text style={[styles.sectionEyebrow, { color: theme.action }]}>Podroz w ekipie</Text>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderTextBlock}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Grupy i pozycje</Text>
          <Text style={[styles.sectionDescription, { color: theme.sub }]}>
            Zbierz swoja zaloge, ruszajcie razem w droge i miejcie podglad, gdzie aktualnie jest reszta ekipy.
          </Text>
        </View>
        <View style={[styles.sectionIconWrap, { backgroundColor: theme.bg, borderColor: theme.border, borderWidth: 1 }]}>
          <MaterialCommunityIcons name="account-group-outline" size={22} color={theme.action} />
        </View>
      </View>

      <View style={styles.groupModeRow}>
        {GROUP_MODES.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.groupModeButton, { backgroundColor: groupPanelMode === item.id ? theme.action : theme.bg, borderColor: theme.border }]}
            onPress={() => onGroupPanelModeChange(item.id)}
          >
            <Text style={[styles.groupModeButtonText, { color: groupPanelMode === item.id ? "#ffffff" : theme.text }]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {activeGroup ? (
        <>
          <View style={[styles.formCard, { backgroundColor: theme.bg }]}>
            <View style={styles.cardTopRow}>
              <View style={styles.sectionHeaderTextBlock}>
                <Text style={[styles.groupCode, { color: theme.action }]}>Aktywna zaloga</Text>
                <Text style={[styles.heroValue, { color: theme.text }]}>{activeGroup.name}</Text>
                <Text style={[styles.smallText, { color: theme.sub }]}>Kod: {activeGroup.code}</Text>
              </View>
              <View style={[styles.cardMetaPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.cardMetaText, { color: theme.action }]}>LIVE</Text>
              </View>
            </View>
            <Text style={[styles.sectionDescription, { color: theme.sub }]}>
              Lokalizacje czlonkow odswiezaja sie na mapie, wiec latwiej zlapac wspolny rytm podrozy i spotkac sie po drodze.
            </Text>
            <Text style={[styles.smallText, { color: theme.sub }]}>
              Pozycje w grupie: {membersWithLocation}/{activeGroup.members.length}
            </Text>
            <Text style={[styles.smallText, { color: theme.sub }]}>
              Twoja pozycja: {currentUserMember?.lat !== null && currentUserMember?.lon !== null ? "widoczna w grupie" : "jeszcze nie wyslana"}
            </Text>
            {groupLocationStatus ? <Text style={[styles.smallText, { color: theme.sub }]}>{groupLocationStatus}</Text> : null}
          </View>

          {canManageMembers ? (
            <>
              <TextInput
                value={renameGroupName}
                onChangeText={onChangeRenameGroupName}
                style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
                placeholder="Nowa nazwa grupy"
                placeholderTextColor={theme.muted}
                maxLength={40}
              />
              <Pressable
                style={[styles.secondaryButton, { borderColor: theme.action }, renamingGroup ? styles.disabledButton : null]}
                onPress={onRenameGroup}
              >
                <Text style={[styles.secondaryButtonText, { color: theme.action }]}>
                  {renamingGroup ? "Zapisywanie..." : "Zmien nazwe grupy"}
                </Text>
              </Pressable>
            </>
          ) : null}

          <Pressable style={[styles.secondaryButton, { borderColor: theme.action }]} onPress={onToggleGroupRoster}>
            <Text style={[styles.secondaryButtonText, { color: theme.action }]}>
              {groupRosterVisible ? "Ukryj zaloge" : "Pokaz zaloge"}
            </Text>
          </Pressable>

          {groupRosterVisible
            ? activeGroup.members.map((member) => (
                <View key={member.userId} style={[styles.memberRow, { borderBottomColor: theme.border }]}>
                  <Pressable
                    style={[styles.memberIdentity, { flex: 1 }]}
                    disabled={member.lat === null || member.lon === null}
                    onPress={() => onFocusMemberLocation(member)}
                  >
                    <View style={[styles.avatarPlaceholder, { borderColor: theme.border }]}>
                      <Text style={[styles.avatarPlaceholderText, { color: theme.muted }]}>
                        {member.displayName.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberTextBlock}>
                      <Text style={[styles.memberName, { color: theme.text }]}>
                        {member.displayName}
                        {member.isCurrentUser ? " (Ty)" : ""}
                      </Text>
                      <Text style={[styles.smallText, { color: theme.sub }]}>
                        {member.lat !== null ? `${member.lat.toFixed(4)}, ${member.lon!.toFixed(4)}` : "Brak pozycji"}
                      </Text>
                      <Text style={[styles.smallText, { color: theme.sub }]}>
                        Aktualizacja: {formatLocationFreshness(member.updatedAt)}
                      </Text>
                    </View>
                  </Pressable>
                  {canManageMembers && !member.isCurrentUser ? (
                    <Pressable
                      style={[styles.secondaryButton, { borderColor: "#ef4444", paddingHorizontal: 12, paddingVertical: 10 }]}
                      onPress={() => onRemoveMember(member.userId)}
                    >
                      <Text style={[styles.secondaryButtonText, { color: "#ef4444" }]}>
                        {removingMemberUserId === member.userId ? "Usuwanie..." : "Usun"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ))
            : null}

          <Pressable style={[styles.secondaryButton, { borderColor: "#ef4444" }]} onPress={onLeaveGroup}>
            <Text style={[styles.secondaryButtonText, { color: "#ef4444" }]}>Opusc zaloge</Text>
          </Pressable>
        </>
      ) : null}

      {groupPanelMode === "create" || groupPanelMode === "join" ? (
        <TextInput
          value={groupName}
          onChangeText={onChangeGroupName}
          style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
          placeholder="Twoj nick"
          placeholderTextColor={theme.muted}
        />
      ) : null}

      {groupPanelMode === "create" ? (
        <Pressable style={[styles.primaryButton, { backgroundColor: theme.action }, groupLoading ? styles.disabledButton : null]} onPress={onCreateGroup}>
          <Text style={styles.primaryButtonText}>{groupLoading ? "Tworzenie..." : "Stworz zaloge"}</Text>
        </Pressable>
      ) : null}

      {groupPanelMode === "join" ? (
        <>
          <TextInput
            value={groupJoinCode}
            onChangeText={onChangeGroupJoinCode}
            autoCapitalize="characters"
            style={[styles.input, { backgroundColor: theme.input, borderColor: theme.border, color: theme.text }]}
            placeholder="Kod grupy"
            placeholderTextColor={theme.muted}
          />
          <Pressable style={[styles.primaryButton, { backgroundColor: theme.action }, groupLoading ? styles.disabledButton : null]} onPress={onJoinGroup}>
            <Text style={styles.primaryButtonText}>{groupLoading ? "Dolaczanie..." : "Dolacz do zalogi"}</Text>
          </Pressable>
        </>
      ) : null}

      {groupPanelMode === "list"
        ? myGroupsLoading
          ? <Text style={[styles.smallText, { color: theme.sub }]}>Ladowanie grup...</Text>
          : myGroups.length > 0
            ? myGroups.map((group) => (
                <Pressable
                  key={group.code}
                  style={[styles.savedGroupCard, { backgroundColor: theme.bg, borderColor: theme.border }]}
                  onPress={() => onSelectGroup(group)}
                >
                  <Text style={[styles.memberName, { color: theme.text }]}>{group.name}</Text>
                  <Text style={[styles.smallText, { color: theme.sub }]}>Kod: {group.code}</Text>
                  <Text style={[styles.smallText, { color: theme.sub }]}>Czlonkowie: {group.members.length}</Text>
                </Pressable>
              ))
            : <Text style={[styles.smallText, { color: theme.sub }]}>Nie nalezysz teraz do zadnej grupy.</Text>
        : null}

      {groupError ? <Text style={styles.errorText}>{groupError}</Text> : null}
    </View>
  );
}
