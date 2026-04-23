import { useCallback, useEffect, useRef, useState } from "react";

import type { ActiveGroup, GroupPanelMode, MenuSection, PendingSpot } from "@/features/map/types";
import { getReadableErrorMessage } from "@/lib/mapUtils";

const parseJsonSafely = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
};

type UseGroupManagementParams = {
  apiUrl: string;
  userId: string;
  menuOpen: boolean;
  menuSection: MenuSection;
  userLocation: PendingSpot | null;
};

export function useGroupManagement({
  apiUrl,
  userId,
  menuOpen,
  menuSection,
  userLocation,
}: UseGroupManagementParams) {
  const [groupName, setGroupName] = useState("");
  const [groupJoinCode, setGroupJoinCode] = useState("");
  const [groupPanelMode, setGroupPanelMode] = useState<GroupPanelMode>("create");
  const [groupRosterVisible, setGroupRosterVisible] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [renameGroupName, setRenameGroupName] = useState("");
  const [renameGroupDirty, setRenameGroupDirty] = useState(false);
  const [renamingGroup, setRenamingGroup] = useState(false);
  const [removingMemberUserId, setRemovingMemberUserId] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<ActiveGroup | null>(null);
  const [myGroups, setMyGroups] = useState<ActiveGroup[]>([]);
  const [myGroupsLoading, setMyGroupsLoading] = useState(false);
  const [groupLocationStatus, setGroupLocationStatus] = useState<string | null>(null);
  const lastSentLocationKeyRef = useRef<string | null>(null);

  const clearActiveGroupState = useCallback(() => {
    setActiveGroup(null);
    setGroupRosterVisible(false);
    setGroupLocationStatus(null);
    lastSentLocationKeyRef.current = null;
  }, []);

  const fetchMyGroups = useCallback(async () => {
    setMyGroupsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/groups?userId=${encodeURIComponent(userId)}`);
      const payload = await parseJsonSafely(response);
      if (!response.ok || !Array.isArray(payload)) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "Nie udalo sie pobrac Twoich grup.");
      }

      setMyGroups(payload as ActiveGroup[]);
      setGroupError(null);
    } catch (error) {
      setGroupError(getReadableErrorMessage(error, "Nie udalo sie pobrac Twoich grup."));
    } finally {
      setMyGroupsLoading(false);
    }
  }, [apiUrl, userId]);

  const fetchGroupState = useCallback(async (code: string) => {
    const response = await fetch(`${apiUrl}/groups/${code}?userId=${encodeURIComponent(userId)}`);
    const payload = await parseJsonSafely(response);

    if (!response.ok) {
      if (response.status === 404) {
        clearActiveGroupState();
        await fetchMyGroups();
        return;
      }

      throw new Error(typeof payload?.error === "string" ? payload.error : "Nie udalo sie pobrac grupy.");
    }

    setActiveGroup(payload as ActiveGroup);
  }, [apiUrl, clearActiveGroupState, fetchMyGroups, userId]);

  const createGroup = useCallback(async () => {
    setGroupLoading(true);
    setGroupError(null);
    try {
      const response = await fetch(`${apiUrl}/groups/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, displayName: groupName.trim() || "Ty", avatarUri: null }),
      });
      const data = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Nie udalo sie utworzyc grupy.");
      }

      setActiveGroup(data as ActiveGroup);
      await fetchMyGroups();
    } catch (error) {
      setGroupError(getReadableErrorMessage(error, "Nie udalo sie utworzyc grupy."));
    } finally {
      setGroupLoading(false);
    }
  }, [apiUrl, fetchMyGroups, groupName, userId]);

  const joinGroup = useCallback(async () => {
    setGroupLoading(true);
    setGroupError(null);
    try {
      const response = await fetch(`${apiUrl}/groups/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: groupJoinCode.trim().toUpperCase(),
          userId,
          displayName: groupName.trim() || undefined,
          avatarUri: null,
        }),
      });
      const data = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Nie udalo sie dolaczyc.");
      }

      setActiveGroup(data as ActiveGroup);
      await fetchMyGroups();
    } catch (error) {
      setGroupError(getReadableErrorMessage(error, "Nie udalo sie dolaczyc."));
    } finally {
      setGroupLoading(false);
    }
  }, [apiUrl, fetchMyGroups, groupJoinCode, groupName, userId]);

  const leaveActiveGroup = useCallback(async () => {
    if (!activeGroup) return;

    try {
      await fetch(`${apiUrl}/groups/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: activeGroup.code, userId }),
      });
      await fetchMyGroups();
    } finally {
      clearActiveGroupState();
    }
  }, [activeGroup, apiUrl, clearActiveGroupState, fetchMyGroups, userId]);

  const renameActiveGroup = useCallback(async () => {
    if (!activeGroup) return;

    setRenamingGroup(true);
    setGroupError(null);
    try {
      const response = await fetch(`${apiUrl}/groups/rename`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: activeGroup.code,
          userId,
          name: renameGroupName.trim(),
        }),
      });
      const data = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Nie udalo sie zmienic nazwy grupy.");
      }

      setActiveGroup(data as ActiveGroup);
      setRenameGroupName((data && typeof data.name === "string" ? data.name : renameGroupName).trim());
      setRenameGroupDirty(false);
      await fetchMyGroups();
    } catch (error) {
      setGroupError(getReadableErrorMessage(error, "Nie udalo sie zmienic nazwy grupy."));
    } finally {
      setRenamingGroup(false);
    }
  }, [activeGroup, apiUrl, fetchMyGroups, renameGroupName, userId]);

  const removeGroupMember = useCallback(async (memberUserId: string) => {
    if (!activeGroup) return;

    setRemovingMemberUserId(memberUserId);
    setGroupError(null);
    try {
      const response = await fetch(`${apiUrl}/groups/remove-member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: activeGroup.code,
          userId,
          memberUserId,
        }),
      });
      const data = await parseJsonSafely(response);
      if (!response.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Nie udalo sie usunac czlonka grupy.");
      }

      setActiveGroup(data as ActiveGroup);
      await fetchMyGroups();
    } catch (error) {
      setGroupError(getReadableErrorMessage(error, "Nie udalo sie usunac czlonka grupy."));
    } finally {
      setRemovingMemberUserId(null);
    }
  }, [activeGroup, apiUrl, fetchMyGroups, userId]);

  useEffect(() => {
    if (!activeGroup) {
      setGroupLocationStatus(null);
      lastSentLocationKeyRef.current = null;
      return;
    }

    if (!userLocation) {
      setGroupLocationStatus("Czekam na dostep do Twojej lokalizacji.");
      return;
    }

    const locationKey = [
      activeGroup.code,
      userLocation.latitude.toFixed(5),
      userLocation.longitude.toFixed(5),
    ].join(":");

    if (lastSentLocationKeyRef.current === locationKey) {
      return;
    }

    let cancelled = false;

    void (async () => {
      setGroupLocationStatus("Wysylam Twoja pozycje do grupy...");

      try {
        const response = await fetch(`${apiUrl}/groups/location`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: activeGroup.code,
            userId,
            lat: userLocation.latitude,
            lon: userLocation.longitude,
          }),
        });
        const payload = await parseJsonSafely(response);

        if (!response.ok) {
          if (response.status === 404) {
            clearActiveGroupState();
            await fetchMyGroups();
            throw new Error("Nie nalezysz juz do tej grupy.");
          }

          throw new Error(typeof payload?.error === "string" ? payload.error : "Nie udalo sie wyslac lokalizacji do grupy.");
        }

        lastSentLocationKeyRef.current = locationKey;
        await fetchGroupState(activeGroup.code);

        if (!cancelled) {
          setGroupLocationStatus(
            `Pozycja wyslana: ${userLocation.latitude.toFixed(4)}, ${userLocation.longitude.toFixed(4)}.`,
          );
        }
      } catch (error) {
        console.warn("[group/location] Nie udalo sie wyslac pozycji do grupy.", error);
        if (!cancelled) {
          setGroupLocationStatus(getReadableErrorMessage(error, "Nie udalo sie wyslac pozycji do grupy."));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeGroup, apiUrl, clearActiveGroupState, fetchGroupState, fetchMyGroups, userId, userLocation]);

  useEffect(() => {
    if (!activeGroup) return;

    void fetchGroupState(activeGroup.code);
    const intervalId = setInterval(() => void fetchGroupState(activeGroup.code).catch(() => undefined), 8000);
    return () => clearInterval(intervalId);
  }, [activeGroup?.code, fetchGroupState]);

  useEffect(() => {
    if (!activeGroup) {
      setRenameGroupName("");
      setRenameGroupDirty(false);
      return;
    }

    if (!renameGroupDirty) {
      setRenameGroupName(activeGroup.name);
    }
  }, [activeGroup, renameGroupDirty]);

  useEffect(() => {
    if (!menuOpen || menuSection !== "group") return;
    void fetchMyGroups();
  }, [fetchMyGroups, menuOpen, menuSection]);

  return {
    groupName,
    setGroupName,
    groupJoinCode,
    setGroupJoinCode,
    groupPanelMode,
    setGroupPanelMode,
    groupRosterVisible,
    setGroupRosterVisible,
    groupError,
    groupLoading,
    renameGroupName,
    setRenameGroupName: (value: string) => {
      setRenameGroupDirty(true);
      setRenameGroupName(value);
    },
    renamingGroup,
    removingMemberUserId,
    activeGroup,
    setActiveGroup,
    myGroups,
    myGroupsLoading,
    groupLocationStatus,
    createGroup,
    joinGroup,
    leaveActiveGroup,
    renameActiveGroup,
    removeGroupMember,
  };
}
