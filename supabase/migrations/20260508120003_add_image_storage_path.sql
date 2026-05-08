-- Prep for Supabase Storage: canonical image field (replaces google_photo_uri for display).
alter table public.places
    add column if not exists image_storage_path text;
