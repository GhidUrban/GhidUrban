-- Traceability when a submission is approved or reviewed.

alter table public.place_submissions
    add column if not exists approved_place_id text,
    add column if not exists reviewed_at timestamptz;
