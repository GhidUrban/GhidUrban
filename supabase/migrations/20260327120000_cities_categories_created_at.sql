-- Admin list ordering: newest first (see getAllCitiesForAdminFromSupabase / getCategoriesForAdminByCityFromSupabase).

alter table cities
    add column if not exists created_at timestamptz default now();

alter table categories
    add column if not exists created_at timestamptz default now();
