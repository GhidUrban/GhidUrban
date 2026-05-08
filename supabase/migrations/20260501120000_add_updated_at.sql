-- Track last modification time on core tables.

alter table public.cities
    add column if not exists updated_at timestamptz default now();

alter table public.categories
    add column if not exists updated_at timestamptz default now();

alter table public.places
    add column if not exists updated_at timestamptz default now();

alter table public.place_submissions
    add column if not exists updated_at timestamptz default now();

-- Auto-update updated_at on row modification.
create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger cities_set_updated_at
    before update on public.cities
    for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
    before update on public.categories
    for each row execute function public.set_updated_at();

create trigger places_set_updated_at
    before update on public.places
    for each row execute function public.set_updated_at();

create trigger place_submissions_set_updated_at
    before update on public.place_submissions
    for each row execute function public.set_updated_at();
