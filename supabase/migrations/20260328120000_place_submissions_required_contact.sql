-- Require submitter contact fields (backfill legacy nulls/empty first).

update public.place_submissions
set submitter_name = '[necunoscut]'
where submitter_name is null or trim(submitter_name) = '';

update public.place_submissions
set submitter_email = 'necunoscut@invalid.local'
where submitter_email is null or trim(submitter_email) = '';

update public.place_submissions
set phone = '—'
where phone is null or trim(phone) = '';

alter table public.place_submissions
    alter column submitter_name set not null,
    alter column submitter_email set not null,
    alter column phone set not null;
