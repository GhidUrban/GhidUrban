-- Run in Supabase SQL editor or via CLI. Extends cities/categories for admin metadata.

alter table cities
    add column if not exists image text,
    add column if not exists is_active boolean not null default true,
    add column if not exists sort_order integer not null default 0;

alter table categories
    add column if not exists image text,
    add column if not exists icon text,
    add column if not exists is_active boolean not null default true,
    add column if not exists sort_order integer not null default 0;
