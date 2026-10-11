-- Migration 0004: Watchlist Performance Composite Index

CREATE INDEX IF NOT EXISTS idx_watchlist_user_profile_added ON watchlist(user_id, profile_id, added_at DESC);
