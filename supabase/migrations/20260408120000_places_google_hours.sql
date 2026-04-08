-- Opening hours from Google Place Details (script: sync-google-hours-city.ts)
alter table public.places
  add column if not exists google_hours_raw jsonb null,
  add column if not exists google_hours_text text null;
