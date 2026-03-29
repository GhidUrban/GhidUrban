-- City center for import / Google autofill (single source of truth; legacy fallback in app code).

alter table cities
    add column if not exists latitude double precision,
    add column if not exists longitude double precision;

-- One-time backfill for known city centers (only where coords still null).
update cities set latitude = 47.6597, longitude = 23.5810 where slug = 'baia-mare' and latitude is null and longitude is null;
update cities set latitude = 46.7712, longitude = 23.6236 where slug = 'cluj-napoca' and latitude is null and longitude is null;
update cities set latitude = 44.4268, longitude = 26.1025 where slug = 'bucuresti' and latitude is null and longitude is null;
update cities set latitude = 45.6579, longitude = 25.6012 where slug = 'brasov' and latitude is null and longitude is null;
update cities set latitude = 45.7489, longitude = 21.2087 where slug = 'timisoara' and latitude is null and longitude is null;
update cities set latitude = 47.0465, longitude = 21.9189 where slug = 'oradea' and latitude is null and longitude is null;
