-- Initial global uniqueness on google_place_id (superseded for this product: same venue may
-- appear in multiple categories in the same city). Migration 20260410120000 drops this index
-- and adds composite uniqueness on (google_place_id, city_slug, category_slug).
-- Run duplicate cleanup first if this fails, e.g.:
--   SELECT google_place_id, count(*) FROM places
--   WHERE google_place_id IS NOT NULL AND btrim(google_place_id) <> ''
--   GROUP BY 1 HAVING count(*) > 1;

create unique index if not exists places_google_place_id_unique
  on public.places (google_place_id)
  where google_place_id is not null and btrim(google_place_id) <> '';
