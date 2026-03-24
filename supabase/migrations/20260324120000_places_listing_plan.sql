alter table places
    add column if not exists plan_type text not null default 'free',
    add column if not exists plan_expires_at timestamptz null;

alter table places
    add constraint places_plan_type_check
    check (plan_type in ('free', 'promoted', 'featured'));
