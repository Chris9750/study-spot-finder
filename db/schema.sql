-- Campus Study Spot Finder schema (PostgreSQL 14+)
--
-- Safe to re-run: it creates what is missing and upgrades an older database
-- in place (no data is lost).  psql -d studyspots -f db/schema.sql

SET client_min_messages = warning;

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,
  image       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spots (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  building    TEXT,
  description TEXT,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hours & amenities.
-- hours: {"mon": {"open": "08:00", "close": "22:00"}, "tue": null, ...}
--   null for a day = closed that day; missing hours = unknown.
--   close <= open means it closes after midnight; "00:00"-"24:00" = open 24h.
ALTER TABLE spots ADD COLUMN IF NOT EXISTS hours       JSONB;
ALTER TABLE spots ADD COLUMN IF NOT EXISTS bookable    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE spots ADD COLUMN IF NOT EXISTS booking_url TEXT;
ALTER TABLE spots ADD COLUMN IF NOT EXISTS food_nearby BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE spots ADD COLUMN IF NOT EXISTS accessible  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE spots ADD COLUMN IF NOT EXISTS created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE spots ADD COLUMN IF NOT EXISTS updated_by  INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE spots ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ;

-- Every rating is 1-5.
--   noise:    1 = silent,       5 = loud
--   wifi:     1 = unusable,     5 = excellent
--   outlets:  1 = none,         5 = at every seat
--   busyness: 1 = empty,        5 = packed
CREATE TABLE IF NOT EXISTS reviews (
  id          SERIAL PRIMARY KEY,
  spot_id     INTEGER NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  noise       SMALLINT NOT NULL CHECK (noise BETWEEN 1 AND 5),
  wifi        SMALLINT NOT NULL CHECK (wifi BETWEEN 1 AND 5),
  outlets     SMALLINT NOT NULL CHECK (outlets BETWEEN 1 AND 5),
  busyness    SMALLINT NOT NULL CHECK (busyness BETWEEN 1 AND 5),
  comment     TEXT,
  author_name TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS hidden  BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS reviews_spot_idx ON reviews (spot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_user_idx ON reviews (user_id, created_at DESC);

-- Photos are stored in the database (resized to WebP on upload) so the app
-- works on any host without a writable disk.
CREATE TABLE IF NOT EXISTS photos (
  id          SERIAL PRIMARY KEY,
  spot_id     INTEGER NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  caption     TEXT,
  mime_type   TEXT NOT NULL,
  data        BYTEA NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE photos ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS hidden  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS width   INTEGER;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS height  INTEGER;
CREATE INDEX IF NOT EXISTS photos_spot_idx ON photos (spot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS photos_user_idx ON photos (user_id, created_at DESC);

-- Reports on photos and comments. Each user can report an item once.
-- Enough open reports auto-hide the item until an admin reviews it.
CREATE TABLE IF NOT EXISTS reports (
  id           SERIAL PRIMARY KEY,
  target_type  TEXT NOT NULL CHECK (target_type IN ('photo', 'review')),
  target_id    INTEGER NOT NULL,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at  TIMESTAMPTZ,
  UNIQUE (target_type, target_id, user_id)
);
CREATE INDEX IF NOT EXISTS reports_open_idx ON reports (target_type, target_id) WHERE resolved_at IS NULL;

-- Aggregated scores per spot (hidden ratings/photos excluded). "busy_now"
-- only uses ratings from the last 2 hours, so it reflects crowding right now.
DROP VIEW IF EXISTS spot_stats;
CREATE VIEW spot_stats AS
SELECT
  s.id,
  s.name,
  s.building,
  s.description,
  s.lat,
  s.lng,
  s.hours,
  s.bookable,
  s.booking_url,
  s.food_nearby,
  s.accessible,
  s.created_at,
  COUNT(r.id)::INT                                AS review_count,
  ROUND(AVG(r.noise)::NUMERIC, 1)::FLOAT          AS avg_noise,
  ROUND(AVG(r.wifi)::NUMERIC, 1)::FLOAT           AS avg_wifi,
  ROUND(AVG(r.outlets)::NUMERIC, 1)::FLOAT        AS avg_outlets,
  ROUND(AVG(r.busyness)::NUMERIC, 1)::FLOAT       AS avg_busyness,
  ROUND(AVG(r.busyness) FILTER (
    WHERE r.created_at > now() - INTERVAL '2 hours'
  )::NUMERIC, 1)::FLOAT                           AS busy_now,
  (SELECT COUNT(*)::INT FROM photos p WHERE p.spot_id = s.id AND NOT p.hidden) AS photo_count,
  (SELECT p.id FROM photos p WHERE p.spot_id = s.id AND NOT p.hidden
     ORDER BY p.created_at DESC LIMIT 1)          AS cover_photo_id
FROM spots s
LEFT JOIN reviews r ON r.spot_id = s.id AND NOT r.hidden
GROUP BY s.id;
