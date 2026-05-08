-- Initial schema for GhidUrban (documentation-only; tables were created in Supabase dashboard).
-- This migration captures the full base schema before any ALTER migrations were applied.

create table if not exists cities (
    slug text primary key,
    name text not null
);

create table if not exists categories (
    city_slug text not null references cities(slug),
    category_slug text not null,
    category_name text not null,
    primary key (city_slug, category_slug)
);

create table if not exists places (
    place_id text not null,
    city_slug text not null,
    category_slug text not null,
    name text not null,
    description text,
    address text,
    schedule text,
    image text,
    rating double precision,
    phone text,
    website text,
    maps_url text,
    status text not null default 'available',
    featured boolean not null default false,
    featured_until timestamptz,
    external_source text,
    external_place_id text,
    google_place_id text,
    google_match_status text,
    google_match_score double precision,
    google_maps_uri text,
    google_photo_uri text,
    google_photo_name text,
    primary key (place_id, city_slug, category_slug),
    foreign key (city_slug, category_slug) references categories(city_slug, category_slug)
);

-- Columns added by later migrations (listed here for completeness):
--
-- cities:
--   image text                        (20250324120000)
--   is_active boolean default true    (20250324120000)
--   sort_order integer default 0      (20250324120000)
--   latitude double precision         (20260327140000)
--   longitude double precision        (20260327140000)
--   created_at timestamptz            (20260327120000)
--
-- categories:
--   image text                        (20250324120000)
--   icon text                         (20250324120000)
--   is_active boolean default true    (20250324120000)
--   sort_order integer default 0      (20250324120000)
--   created_at timestamptz            (20260327120000)
--
-- places:
--   latitude double precision         (20250325100000)
--   longitude double precision        (20250325100000)
--   plan_type text default 'free'     (20260324120000)
--   plan_expires_at timestamptz       (20260324120000)
--   google_hours_raw jsonb            (20260408120000)
--   google_hours_text text            (20260408120000)
