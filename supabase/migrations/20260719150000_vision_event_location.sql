alter table public.vision_events
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists location_recorded_at timestamptz;
