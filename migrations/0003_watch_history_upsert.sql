-- Migration 0003: Watch History Unique Index and Composite Index for Atomic UPSERT

-- Deduplicate any existing entries prior to creating the unique index
DELETE FROM watch_history
WHERE id NOT IN (
  SELECT MAX(id)
  FROM watch_history
  GROUP BY profile_id, media_type, media_id
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_watch_history_profile_media ON watch_history(profile_id, media_type, media_id);
CREATE INDEX IF NOT EXISTS idx_history_profile_watched ON watch_history(user_id, profile_id, watched_at DESC);
