-- Coordinates for distance-based recommendations (nullable until populated).

alter table places
    add column if not exists latitude double precision,
    add column if not exists longitude double precision;
