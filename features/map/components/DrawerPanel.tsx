import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { DatabaseSection } from "@/features/map/components/drawer/DatabaseSection";
import { DrawerTabs } from "@/features/map/components/drawer/DrawerTabs";
import { GroupSection } from "@/features/map/components/drawer/GroupSection";
import { OfflineMapsSection } from "@/features/map/components/drawer/OfflineMapsSection";
import { SettingsSection } from "@/features/map/components/drawer/SettingsSection";
import { styles } from "@/features/map/styles";
import type {
  ActiveGroup,
  GroupPanelMode,
  MenuSection,
  SharedCountryCount,
  SharedOfflineMapPack,
  ThemeColors,
  ThemeMode,
} from "@/features/map/types";

type DrawerPanelProps = {
  visible: boolean;
  topInset: number;
  theme: ThemeColors;
  themeMode: ThemeMode;
  menuSection: MenuSection;
  onMenuSectionChange: (value: MenuSection) => void;
  onClose: () => void;
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
  onRemoveGroupMember: (memberUserId: string) => void;
  myGroupsLoading: boolean;
  myGroups: ActiveGroup[];
  onSelectGroup: (group: ActiveGroup) => void;
  onFocusGroupMemberLocation: (member: ActiveGroup["members"][number]) => void;
  groupError: string | null;
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
  onToggleThemeMode: () => void;
};

export function DrawerPanel({
  visible,
  topInset,
  theme,
  themeMode,
  menuSection,
  onMenuSectionChange,
  onClose,
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
  onRemoveGroupMember,
  myGroupsLoading,
  myGroups,
  onSelectGroup,
  onFocusGroupMemberLocation,
  groupError,
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
  onToggleThemeMode,
}: DrawerPanelProps) {
  if (!visible) return null;

  return (
    <>
      <Pressable style={[styles.overlay, { backgroundColor: theme.overlay }]} onPress={onClose} />
      <View style={[styles.drawer, { backgroundColor: theme.drawer, paddingTop: topInset + 16 }]}>
        {menuSection === "group" ? null : (
          <>
            <Text style={[styles.drawerTitle, { color: theme.text }]}>Menu</Text>
            <Text style={[styles.drawerSubtitle, { color: theme.sub }]}>Offline, baza lokalna i ustawienia mapy w jednym miejscu.</Text>
          </>
        )}
        <DrawerTabs menuSection={menuSection} theme={theme} onMenuSectionChange={onMenuSectionChange} />
        <ScrollView contentContainerStyle={styles.drawerContent}>
          <GroupSection
            visible={menuSection === "group"}
            theme={theme}
            activeGroup={activeGroup}
            groupLocationStatus={groupLocationStatus}
            groupPanelMode={groupPanelMode}
            onGroupPanelModeChange={onGroupPanelModeChange}
            groupRosterVisible={groupRosterVisible}
            onToggleGroupRoster={onToggleGroupRoster}
            onLeaveGroup={onLeaveGroup}
            groupName={groupName}
            onChangeGroupName={onChangeGroupName}
            groupJoinCode={groupJoinCode}
            onChangeGroupJoinCode={onChangeGroupJoinCode}
            groupLoading={groupLoading}
            renameGroupName={renameGroupName}
            onChangeRenameGroupName={onChangeRenameGroupName}
            renamingGroup={renamingGroup}
            removingMemberUserId={removingMemberUserId}
            onCreateGroup={onCreateGroup}
            onJoinGroup={onJoinGroup}
            onRenameGroup={onRenameGroup}
            onRemoveMember={onRemoveGroupMember}
            myGroupsLoading={myGroupsLoading}
            myGroups={myGroups}
            onSelectGroup={onSelectGroup}
            onFocusMemberLocation={onFocusGroupMemberLocation}
            groupError={groupError}
          />
          <DatabaseSection
            visible={menuSection === "database"}
            theme={theme}
            localSpotCount={localSpotCount}
            lastSyncAtValue={lastSyncAtValue}
            syncStatus={syncStatus}
            syncProgressCurrent={syncProgressCurrent}
            syncProgressTotal={syncProgressTotal}
            syncing={syncing}
            onSyncAuto={onSyncAuto}
            onSyncFull={onSyncFull}
            localDbAdvancedOpen={localDbAdvancedOpen}
            onToggleLocalDbAdvanced={onToggleLocalDbAdvanced}
            localCountryQuery={localCountryQuery}
            onChangeLocalCountryQuery={onChangeLocalCountryQuery}
            filteredLocalCountryStats={filteredLocalCountryStats}
            selectedLocalCountryKeys={selectedLocalCountryKeys}
            onToggleLocalCountry={onToggleLocalCountry}
            onClearSelectedLocalCountries={onClearSelectedLocalCountries}
            pruningLocalDb={pruningLocalDb}
            onConfirmPruneLocalDatabase={onConfirmPruneLocalDatabase}
          />
          <OfflineMapsSection
            visible={menuSection === "maps"}
            theme={theme}
            offlineCountryQuery={offlineCountryQuery}
            onChangeOfflineCountryQuery={onChangeOfflineCountryQuery}
            offlineTilesEnabled={offlineTilesEnabled}
            onToggleOfflineTiles={onToggleOfflineTiles}
            downloadedMapCodes={downloadedMapCodes}
            filteredOfflineMapPacks={filteredOfflineMapPacks}
            estimatedDownloadedSizeMb={estimatedDownloadedSizeMb}
            offlineMapLoadingCode={offlineMapLoadingCode}
            onDownloadOfflineMapPack={onDownloadOfflineMapPack}
            offlineMapMessage={offlineMapMessage}
          />
          <SettingsSection
            visible={menuSection === "settings"}
            theme={theme}
            themeMode={themeMode}
            onToggleThemeMode={onToggleThemeMode}
          />
        </ScrollView>
      </View>
    </>
  );
}
