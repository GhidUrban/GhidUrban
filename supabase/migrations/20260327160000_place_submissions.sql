-- User-submitted places awaiting admin review (not in `places` until approved).

create table if not exists place_submissions (
    id uuid primary key default gen_random_uuid(),
    city_slug text not null,
    category_slug text not null,
    name text not null,
    address text,
    website text,
    phone text,
    description text,
    maps_url text,
    image text,
    submitter_name text,
    submitter_email text,
    status text not null default 'pending',
    admin_note text,
    created_at timestamptz not null default now(),
    constraint place_submissions_status_check check (
        status in ('pending', 'approved', 'rejected')
    )
);
