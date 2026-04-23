CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS hitchhiking_points (
  id BIGINT PRIMARY KEY,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  rating INTEGER,
  country TEXT,
  comment TEXT,
  reviewed TEXT DEFAULT '0',
  banned TEXT DEFAULT '0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  location GEOGRAPHY(Point, 4326)
);

CREATE INDEX IF NOT EXISTS idx_hitchhiking_points_country
  ON hitchhiking_points (country);

CREATE INDEX IF NOT EXISTS idx_hitchhiking_points_created_at
  ON hitchhiking_points (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hitchhiking_points_location
  ON hitchhiking_points
  USING GIST (location);

CREATE TABLE IF NOT EXISTS travel_groups (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS travel_group_members (
  group_code TEXT NOT NULL REFERENCES travel_groups(code) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_uri TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_code, user_id)
);

CREATE INDEX IF NOT EXISTS idx_travel_group_members_user
  ON travel_group_members (user_id);

CREATE INDEX IF NOT EXISTS idx_travel_group_members_group_updated
  ON travel_group_members (group_code, updated_at);
