import * as SQLite from "expo-sqlite";

export type SpotRecord = {
  id: string;
  lat: number;
  lon: number;
  rating: number | null;
  country: string | null;
  comment: string | null;
  created_at: string | null;
};

type MetaRow = { value: string };
type CountRow = { count: number };
type CountryCountRow = { country: string | null; count: number };

const DB_NAME = "spots-cache.db";
const SPOT_COLUMN_COUNT = 7;
const SQLITE_PARAMETER_LIMIT = 900;
const SPOT_BATCH_SIZE = Math.floor(SQLITE_PARAMETER_LIMIT / SPOT_COLUMN_COUNT);
const META_LAST_SYNC_ID = "last_sync_id";
const META_LAST_SYNC_AT = "last_sync_at";
const META_EXCLUDED_COUNTRIES = "excluded_countries";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const chunkSpots = (spots: SpotRecord[]) => {
  const chunks: SpotRecord[][] = [];

  for (let index = 0; index < spots.length; index += SPOT_BATCH_SIZE) {
    chunks.push(spots.slice(index, index + SPOT_BATCH_SIZE));
  }

  return chunks;
};

const buildSpotParams = (spots: SpotRecord[]) =>
  spots.flatMap((spot) => [
    String(spot.id),
    spot.lat,
    spot.lon,
    spot.rating,
    spot.country,
    spot.comment,
    spot.created_at,
  ]);

const buildSpotValuesClause = (spots: SpotRecord[]) =>
  spots
    .map((_, index) => {
      const offset = index * SPOT_COLUMN_COUNT;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
    })
    .join(", ");

export const openSpotDatabase = async () => {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS spots (
          id TEXT PRIMARY KEY NOT NULL,
          lat REAL NOT NULL,
          lon REAL NOT NULL,
          rating INTEGER,
          country TEXT,
          comment TEXT,
          created_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_spots_lat_lon ON spots(lat, lon);
        CREATE INDEX IF NOT EXISTS idx_spots_created_at ON spots(created_at);
        CREATE TABLE IF NOT EXISTS app_meta (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT
        );
      `);
      return db;
    })();
  }

  return dbPromise;
};

export const getMetaValue = async (db: SQLite.SQLiteDatabase, key: string) => {
  const row = await db.getFirstAsync<MetaRow>(
    "SELECT value FROM app_meta WHERE key = ? LIMIT 1",
    [key],
  );
  return row?.value ?? null;
};

export const setMetaValue = async (
  db: SQLite.SQLiteDatabase,
  key: string,
  value: string | null,
) => {
  await db.runAsync(
    `
      INSERT INTO app_meta (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    [key, value],
  );
};

export const getLastSyncId = async (db: SQLite.SQLiteDatabase) =>
  getMetaValue(db, META_LAST_SYNC_ID);

export const setLastSyncId = async (
  db: SQLite.SQLiteDatabase,
  lastSyncId: string | null,
) => {
  await setMetaValue(db, META_LAST_SYNC_ID, lastSyncId);
};

export const getLastSyncAt = async (db: SQLite.SQLiteDatabase) =>
  getMetaValue(db, META_LAST_SYNC_AT);

export const setLastSyncAt = async (
  db: SQLite.SQLiteDatabase,
  timestamp: string | null,
) => {
  await setMetaValue(db, META_LAST_SYNC_AT, timestamp);
};

export const getExcludedCountries = async (db: SQLite.SQLiteDatabase) => {
  const raw = await getMetaValue(db, META_EXCLUDED_COUNTRIES);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim().toUpperCase());
  } catch {
    return [];
  }
};

export const setExcludedCountries = async (
  db: SQLite.SQLiteDatabase,
  countries: string[],
) => {
  const normalized = Array.from(
    new Set(
      countries
        .map((country) => country.trim().toUpperCase())
        .filter((country) => country.length > 0),
    ),
  );
  await setMetaValue(db, META_EXCLUDED_COUNTRIES, JSON.stringify(normalized));
};

export const getSpotCount = async (db: SQLite.SQLiteDatabase) => {
  const row = await db.getFirstAsync<CountRow>(
    "SELECT COUNT(*) AS count FROM spots",
  );
  return Number(row?.count ?? 0);
};

export const getCountryCounts = async (db: SQLite.SQLiteDatabase) => {
  const rows = await db.getAllAsync<CountryCountRow>(
    `
      SELECT country, COUNT(*) AS count
      FROM spots
      GROUP BY country
      ORDER BY
        CASE WHEN country IS NULL OR TRIM(country) = '' THEN 1 ELSE 0 END,
        country COLLATE NOCASE ASC
    `,
  );

  return rows.map((row) => ({
    country: row.country && row.country.trim().length > 0 ? row.country : null,
    count: Number(row.count ?? 0),
  }));
};

export const deleteSpotsByCountries = async (
  db: SQLite.SQLiteDatabase,
  countries: Array<string | null>,
) => {
  if (countries.length === 0) return;

  const namedCountries = countries.filter((country): country is string => country !== null);
  const shouldDeleteNull = countries.some((country) => country === null);

  await db.withExclusiveTransactionAsync(async (txn) => {
    if (namedCountries.length > 0) {
      const placeholders = namedCountries.map(() => "?").join(", ");
      await txn.runAsync(
        `DELETE FROM spots WHERE country IN (${placeholders})`,
        namedCountries,
      );
    }

    if (shouldDeleteNull) {
      await txn.runAsync(
        "DELETE FROM spots WHERE country IS NULL OR TRIM(country) = ''",
      );
    }
  });
};

export const upsertSpots = async (
  db: SQLite.SQLiteDatabase,
  spots: SpotRecord[],
) => {
  if (spots.length === 0) {
    return;
  }

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const chunk of chunkSpots(spots)) {
      const params = buildSpotParams(chunk);
      const valuesClause = buildSpotValuesClause(chunk);

      await txn.runAsync(
        `
          INSERT INTO spots (id, lat, lon, rating, country, comment, created_at)
          VALUES ${valuesClause}
          ON CONFLICT(id) DO UPDATE SET
            lat = excluded.lat,
            lon = excluded.lon,
            rating = excluded.rating,
            country = excluded.country,
            comment = excluded.comment,
            created_at = excluded.created_at
        `,
        params,
      );
    }
  });
};

export const replaceAllSpots = async (
  db: SQLite.SQLiteDatabase,
  spots: SpotRecord[],
) => {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync("DELETE FROM spots");

    for (const chunk of chunkSpots(spots)) {
      const params = buildSpotParams(chunk);
      const valuesClause = buildSpotValuesClause(chunk);

      await txn.runAsync(
        `
          INSERT INTO spots (id, lat, lon, rating, country, comment, created_at)
          VALUES ${valuesClause}
        `,
        params,
      );
    }
  });
};

export const getVisibleSpots = async (
  db: SQLite.SQLiteDatabase,
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  },
) =>
  db.getAllAsync<SpotRecord>(
    `
      SELECT id, lat, lon, rating, country, comment, created_at
      FROM spots
      WHERE lat BETWEEN ? AND ?
        AND lon BETWEEN ? AND ?
      ORDER BY
        CASE WHEN created_at IS NULL THEN 1 ELSE 0 END,
        datetime(created_at) DESC,
        rating DESC,
        id DESC
    `,
    [bounds.minLat, bounds.maxLat, bounds.minLon, bounds.maxLon],
  );
