-- Campus Study Spot Finder schema (PostgreSQL 14+)

CREATE TABLE IF NOT EXISTS spots (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  building    TEXT,
  description TEXT,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
CREATE INDEX IF NOT EXISTS reviews_spot_idx ON reviews (spot_id, created_at DESC);

-- Photos are stored in the database so the app works on any host
-- (no writable disk needed). Swap for S3/Cloudinary later if you like.
CREATE TABLE IF NOT EXISTS photos (
  id          SERIAL PRIMARY KEY,
  spot_id     INTEGER NOT NULL REFERENCES spots(id) ON DELETE CASCADE,
  caption     TEXT,
  mime_type   TEXT NOT NULL,
  data        BYTEA NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS photos_spot_idx ON photos (spot_id, created_at DESC);

-- Aggregated scores per spot. "busy_now" only uses reviews from the last
-- 2 hours, so it reflects how crowded a spot is right now.
CREATE OR REPLACE VIEW spot_stats AS
SELECT
  s.id,
  s.name,
  s.building,
  s.description,
  s.lat,
  s.lng,
  s.created_at,
  COUNT(r.id)::INT                                AS review_count,
  ROUND(AVG(r.noise)::NUMERIC, 1)::FLOAT          AS avg_noise,
  ROUND(AVG(r.wifi)::NUMERIC, 1)::FLOAT           AS avg_wifi,
  ROUND(AVG(r.outlets)::NUMERIC, 1)::FLOAT        AS avg_outlets,
  ROUND(AVG(r.busyness)::NUMERIC, 1)::FLOAT       AS avg_busyness,
  ROUND(AVG(r.busyness) FILTER (
    WHERE r.created_at > now() - INTERVAL '2 hours'
  )::NUMERIC, 1)::FLOAT                           AS busy_now,
  (SELECT COUNT(*)::INT FROM photos p WHERE p.spot_id = s.id) AS photo_count,
  (SELECT p.id FROM photos p WHERE p.spot_id = s.id
     ORDER BY p.created_at DESC LIMIT 1)          AS cover_photo_id
FROM spots s
LEFT JOIN reviews r ON r.spot_id = s.id
GROUP BY s.id;
