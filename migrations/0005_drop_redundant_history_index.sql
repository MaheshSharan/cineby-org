-- Migration 0005: Drop redundant watch_history index
--
-- idx_history_user (user_id, watched_at) is fully covered by idx_history_profile_watched
-- (user_id, profile_id, watched_at). Every history save updates watched_at, so each extra index
-- costs one more D1 row written per save. No query filters by user alone and orders by watched_at.

DROP INDEX IF EXISTS idx_history_user;
