-- English backdrop that carries the title text, shown when a Continue watching card is hovered.
-- Nullable and additive: code that does not know the column keeps working, so apply this before deploying.
ALTER TABLE watch_history ADD COLUMN title_backdrop_path TEXT;
