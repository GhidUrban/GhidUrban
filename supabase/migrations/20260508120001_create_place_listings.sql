-- place_listings: monetization, featured status, external source info.

create table if not exists public.place_listings (
    place_id       text not null,
    city_slug      text not null,
    category_slug  text not null,
    plan_type      text not null default 'free',
    plan_expires_at timestamptz,
    featured       boolean not null default false,
    featured_until timestamptz,
    external_source    text,
    external_place_id  text,
    updated_at     timestamptz default now(),
    primary key (place_id, city_slug, category_slug),
    foreign key (place_id, city_slug, category_slug)
        references public.places(place_id, city_slug, category_slug)
        on delete cascade,
    constraint place_listings_plan_type_check
        check (plan_type in ('free', 'promoted', 'featured'))
);

create trigger place_listings_set_updated_at
    before update on public.place_listings
    for each row execute function public.set_updated_at();
