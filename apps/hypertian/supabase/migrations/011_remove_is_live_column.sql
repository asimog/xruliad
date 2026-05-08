-- Remove is_live column from streams table
-- Liveness is now calculated from last_heartbeat

alter table if exists streams
  drop column if exists is_live;

-- Also clean up any indexes that reference is_live
-- (no explicit index on is_live was created, but let's be safe)
drop index if exists streams_is_live_idx;