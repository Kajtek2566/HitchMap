"use strict";

const GROUP_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const generateGroupCode = () => {
  let code = "";

  for (let index = 0; index < 6; index += 1) {
    code += GROUP_CODE_ALPHABET[Math.floor(Math.random() * GROUP_CODE_ALPHABET.length)];
  }

  return code;
};

const serializeGroupRows = (rows, currentUserId) => {
  if (rows.length === 0) {
    return null;
  }

  const group = {
    code: rows[0].code,
    name: rows[0].name,
    ownerId: rows[0].owner_id,
    members: rows
      .filter((row) => row.member_user_id)
      .map((row) => ({
        userId: row.member_user_id,
        displayName: row.member_display_name,
        avatarUri: row.member_avatar_uri,
        lat: row.member_lat,
        lon: row.member_lon,
        updatedAt: Date.parse(row.member_updated_at),
        isCurrentUser: row.member_user_id === currentUserId,
      })),
  };

  if (currentUserId && !group.members.some((member) => member.userId === currentUserId)) {
    return null;
  }

  return group;
};

class PostgresGroupStore {
  constructor(pool) {
    this.pool = pool;
  }

  async createGroup({ userId, displayName, avatarUri }) {
    const normalizedUserId = String(userId);
    const normalizedDisplayName =
      typeof displayName === "string" && displayName.trim().length > 0
        ? displayName.trim()
        : "Ty";
    const normalizedAvatarUri =
      typeof avatarUri === "string" && avatarUri.trim().length > 0
        ? avatarUri.trim()
        : null;

    return this.#withTransaction(async (client) => {
      let code = generateGroupCode();

      while (true) {
        const existing = await client.query(
          "SELECT 1 FROM travel_groups WHERE code = $1 LIMIT 1",
          [code],
        );

        if (existing.rowCount === 0) {
          break;
        }

        code = generateGroupCode();
      }

      await client.query(
        `
          INSERT INTO travel_groups (code, name, owner_id)
          VALUES ($1, $2, $3)
        `,
        [code, `Grupa ${code}`, normalizedUserId],
      );

      await client.query(
        `
          INSERT INTO travel_group_members (group_code, user_id, display_name, avatar_uri, lat, lon)
          VALUES ($1, $2, $3, $4, NULL, NULL)
        `,
        [code, normalizedUserId, normalizedDisplayName, normalizedAvatarUri],
      );

      return this.#getGroupWithClient(client, code, normalizedUserId);
    });
  }

  async joinGroup({ code, userId, displayName, avatarUri }) {
    const normalizedCode = String(code).trim().toUpperCase();
    const normalizedUserId = String(userId);

    return this.#withTransaction(async (client) => {
      const groupExists = await client.query(
        "SELECT code FROM travel_groups WHERE code = $1 LIMIT 1",
        [normalizedCode],
      );

      if (groupExists.rowCount === 0) {
        return null;
      }

      const existingMember = await client.query(
        `
          SELECT display_name, avatar_uri, lat, lon
          FROM travel_group_members
          WHERE group_code = $1 AND user_id = $2
          LIMIT 1
        `,
        [normalizedCode, normalizedUserId],
      );

      const fallbackDisplayName =
        existingMember.rows[0]?.display_name ?? `Uzytkownik ${await this.#countMembersWithClient(client, normalizedCode) + 1}`;
      const normalizedDisplayName =
        typeof displayName === "string" && displayName.trim().length > 0
          ? displayName.trim()
          : fallbackDisplayName;
      const normalizedAvatarUri =
        typeof avatarUri === "string" && avatarUri.trim().length > 0
          ? avatarUri.trim()
          : existingMember.rows[0]?.avatar_uri ?? null;

      await client.query(
        `
          INSERT INTO travel_group_members (group_code, user_id, display_name, avatar_uri, lat, lon, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          ON CONFLICT (group_code, user_id) DO UPDATE
          SET
            display_name = EXCLUDED.display_name,
            avatar_uri = EXCLUDED.avatar_uri,
            lat = COALESCE(travel_group_members.lat, EXCLUDED.lat),
            lon = COALESCE(travel_group_members.lon, EXCLUDED.lon),
            updated_at = NOW()
        `,
        [
          normalizedCode,
          normalizedUserId,
          normalizedDisplayName,
          normalizedAvatarUri,
          existingMember.rows[0]?.lat ?? null,
          existingMember.rows[0]?.lon ?? null,
        ],
      );

      return this.#getGroupWithClient(client, normalizedCode, normalizedUserId);
    });
  }

  async updateLocation({ code, userId, lat, lon }) {
    const normalizedCode = String(code).trim().toUpperCase();
    const normalizedUserId = String(userId);

    return this.#withTransaction(async (client) => {
      const groupExists = await client.query(
        "SELECT code FROM travel_groups WHERE code = $1 LIMIT 1",
        [normalizedCode],
      );
      if (groupExists.rowCount === 0) {
        return null;
      }

      const result = await client.query(
        `
          UPDATE travel_group_members
          SET lat = $3, lon = $4, updated_at = NOW()
          WHERE group_code = $1 AND user_id = $2
          RETURNING user_id
        `,
        [normalizedCode, normalizedUserId, lat, lon],
      );

      if (result.rowCount === 0) {
        return "not-member";
      }

      return this.#getGroupWithClient(client, normalizedCode, null);
    });
  }

  async leaveGroup({ code, userId }) {
    const normalizedCode = String(code).trim().toUpperCase();
    const normalizedUserId = String(userId);

    return this.#withTransaction(async (client) => {
      const groupBeforeDelete = await this.#getGroupWithClient(client, normalizedCode, normalizedUserId);
      if (!groupBeforeDelete) {
        return null;
      }

      await client.query(
        "DELETE FROM travel_group_members WHERE group_code = $1 AND user_id = $2",
        [normalizedCode, normalizedUserId],
      );

      const remainingMembers = await client.query(
        `
          SELECT user_id
          FROM travel_group_members
          WHERE group_code = $1
          ORDER BY updated_at ASC, user_id ASC
        `,
        [normalizedCode],
      );

      if (remainingMembers.rowCount === 0) {
        await client.query("DELETE FROM travel_groups WHERE code = $1", [normalizedCode]);
        return { code: normalizedCode, members: [] };
      }

      if (groupBeforeDelete.ownerId === normalizedUserId) {
        await client.query(
          "UPDATE travel_groups SET owner_id = $2 WHERE code = $1",
          [normalizedCode, remainingMembers.rows[0].user_id],
        );
      }

      return this.#getGroupWithClient(client, normalizedCode, normalizedUserId);
    });
  }

  async renameGroup({ code, userId, name }) {
    const normalizedCode = String(code).trim().toUpperCase();
    const normalizedUserId = String(userId);

    return this.#withTransaction(async (client) => {
      const result = await client.query(
        `
          UPDATE travel_groups
          SET name = $3
          WHERE code = $1 AND owner_id = $2
          RETURNING code
        `,
        [normalizedCode, normalizedUserId, name],
      );

      if (result.rowCount === 0) {
        const group = await this.#getGroupWithClient(client, normalizedCode, normalizedUserId);
        return group ? "forbidden" : null;
      }

      return this.#getGroupWithClient(client, normalizedCode, normalizedUserId);
    });
  }

  async removeMember({ code, ownerUserId, memberUserId }) {
    const normalizedCode = String(code).trim().toUpperCase();
    const normalizedOwnerUserId = String(ownerUserId);
    const normalizedMemberUserId = String(memberUserId);

    return this.#withTransaction(async (client) => {
      const group = await this.#getGroupWithClient(client, normalizedCode, normalizedOwnerUserId);
      if (!group) {
        return null;
      }

      if (group.ownerId !== normalizedOwnerUserId) {
        return "forbidden";
      }

      if (normalizedMemberUserId === normalizedOwnerUserId) {
        return "owner";
      }

      const result = await client.query(
        "DELETE FROM travel_group_members WHERE group_code = $1 AND user_id = $2 RETURNING user_id",
        [normalizedCode, normalizedMemberUserId],
      );

      if (result.rowCount === 0) {
        return "not-member";
      }

      return this.#getGroupWithClient(client, normalizedCode, normalizedOwnerUserId);
    });
  }

  async listUserGroups(userId) {
    const result = await this.pool.query(
      `
        SELECT
          g.code,
          g.name,
          g.owner_id,
          m.user_id AS member_user_id,
          m.display_name AS member_display_name,
          m.avatar_uri AS member_avatar_uri,
          m.lat AS member_lat,
          m.lon AS member_lon,
          m.updated_at AS member_updated_at
        FROM travel_groups g
        INNER JOIN travel_group_members self
          ON self.group_code = g.code
        LEFT JOIN travel_group_members m
          ON m.group_code = g.code
        WHERE self.user_id = $1
        ORDER BY g.created_at DESC, m.updated_at ASC, m.user_id ASC
      `,
      [String(userId)],
    );

    const groupedRows = new Map();
    for (const row of result.rows) {
      const existing = groupedRows.get(row.code);
      if (existing) {
        existing.push(row);
      } else {
        groupedRows.set(row.code, [row]);
      }
    }

    return Array.from(groupedRows.values()).map((rows) => serializeGroupRows(rows, String(userId)));
  }

  async getGroup(code, currentUserId) {
    return this.#getGroupWithClient(this.pool, String(code).trim().toUpperCase(), currentUserId ?? null);
  }

  async hasGroup(code) {
    const result = await this.pool.query(
      "SELECT 1 FROM travel_groups WHERE code = $1 LIMIT 1",
      [String(code).trim().toUpperCase()],
    );

    return result.rowCount > 0;
  }

  async #countMembersWithClient(client, code) {
    const result = await client.query(
      "SELECT COUNT(*)::int AS total FROM travel_group_members WHERE group_code = $1",
      [code],
    );

    return result.rows[0]?.total ?? 0;
  }

  async #getGroupWithClient(client, code, currentUserId) {
    const result = await client.query(
      `
        SELECT
          g.code,
          g.name,
          g.owner_id,
          m.user_id AS member_user_id,
          m.display_name AS member_display_name,
          m.avatar_uri AS member_avatar_uri,
          m.lat AS member_lat,
          m.lon AS member_lon,
          m.updated_at AS member_updated_at
        FROM travel_groups g
        LEFT JOIN travel_group_members m
          ON m.group_code = g.code
        WHERE g.code = $1
        ORDER BY m.updated_at ASC, m.user_id ASC
      `,
      [code],
    );

    return serializeGroupRows(result.rows, currentUserId);
  }

  async #withTransaction(run) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      const result = await run(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

class InMemoryGroupStore {
  constructor() {
    this.groups = new Map();
  }

  async createGroup({ userId, displayName, avatarUri }) {
    let code = generateGroupCode();
    while (this.groups.has(code)) {
      code = generateGroupCode();
    }

    this.groups.set(code, {
      code,
      name: `Grupa ${code}`,
      ownerId: String(userId),
      members: new Map([
        [
          String(userId),
          {
            userId: String(userId),
            displayName: typeof displayName === "string" && displayName.trim().length > 0 ? displayName.trim() : "Ty",
            avatarUri: typeof avatarUri === "string" && avatarUri.trim().length > 0 ? avatarUri.trim() : null,
            lat: null,
            lon: null,
            updatedAt: Date.now(),
          },
        ],
      ]),
      createdAt: Date.now(),
    });

    return this.getGroup(code, String(userId));
  }

  async joinGroup({ code, userId, displayName, avatarUri }) {
    const normalizedCode = String(code).trim().toUpperCase();
    const group = this.groups.get(normalizedCode);
    if (!group) return null;

    const existingMember = group.members.get(String(userId));
    group.members.set(String(userId), {
      userId: String(userId),
      displayName:
        typeof displayName === "string" && displayName.trim().length > 0
          ? displayName.trim()
          : existingMember?.displayName ?? `Uzytkownik ${group.members.size + 1}`,
      avatarUri:
        typeof avatarUri === "string" && avatarUri.trim().length > 0
          ? avatarUri.trim()
          : existingMember?.avatarUri ?? null,
      lat: existingMember?.lat ?? null,
      lon: existingMember?.lon ?? null,
      updatedAt: Date.now(),
    });

    return this.getGroup(normalizedCode, String(userId));
  }

  async updateLocation({ code, userId, lat, lon }) {
    const group = this.groups.get(String(code).trim().toUpperCase());
    const member = group?.members.get(String(userId));
    if (!group) return null;
    if (!member) return "not-member";

    group.members.set(String(userId), { ...member, lat, lon, updatedAt: Date.now() });
    return this.getGroup(group.code, String(userId));
  }

  async leaveGroup({ code, userId }) {
    const normalizedCode = String(code).trim().toUpperCase();
    const group = this.groups.get(normalizedCode);
    if (!group) return null;

    group.members.delete(String(userId));
    if (group.members.size === 0) {
      this.groups.delete(normalizedCode);
      return { code: normalizedCode, members: [] };
    }

    if (group.ownerId === String(userId)) {
      group.ownerId = group.members.keys().next().value ?? null;
    }

    return this.#serializeGroup(group, null);
  }

  async renameGroup({ code, userId, name }) {
    const group = this.groups.get(String(code).trim().toUpperCase());
    if (!group) return null;
    if (group.ownerId !== String(userId)) return "forbidden";

    group.name = name;
    return this.getGroup(group.code, String(userId));
  }

  async removeMember({ code, ownerUserId, memberUserId }) {
    const group = this.groups.get(String(code).trim().toUpperCase());
    if (!group) return null;
    if (group.ownerId !== String(ownerUserId)) return "forbidden";
    if (String(memberUserId) === String(ownerUserId)) return "owner";
    if (!group.members.has(String(memberUserId))) return "not-member";

    group.members.delete(String(memberUserId));
    return this.getGroup(group.code, String(ownerUserId));
  }

  async listUserGroups(userId) {
    return Array.from(this.groups.values())
      .filter((group) => group.members.has(String(userId)))
      .map((group) => this.#serializeGroup(group, String(userId)));
  }

  async getGroup(code, currentUserId) {
    const group = this.groups.get(String(code).trim().toUpperCase());
    if (!group) return null;
    if (currentUserId && !group.members.has(String(currentUserId))) return null;
    return this.#serializeGroup(group, currentUserId);
  }

  async hasGroup(code) {
    return this.groups.has(String(code).trim().toUpperCase());
  }

  #serializeGroup(group, currentUserId) {
    return {
      code: group.code,
      name: group.name,
      ownerId: group.ownerId,
      members: Array.from(group.members.values()).map((member) => ({
        ...member,
        isCurrentUser: member.userId === currentUserId,
      })),
    };
  }
}

module.exports = {
  InMemoryGroupStore,
  PostgresGroupStore,
};
