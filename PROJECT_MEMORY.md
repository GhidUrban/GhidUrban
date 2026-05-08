# PROJECT MEMORY - GHIDURBAN

Last updated: 2026-05-01

## 1) Project purpose
- `GhidUrban` is a city guide web app for Romania.
- User flow: homepage (search + cities) -> city categories -> places list -> place detail.
- Additional flows: global search (`/cauta`), user place submissions (`/adauga-locatie`).
- Admin panel at `/admin` for managing cities, categories, places, submissions, and Google imports.

## 2) Tech stack
- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase (PostgreSQL) — production database
- `jose` — Edge-compatible JWT verification in middleware
- `bcrypt` — admin password hashing
- `jsonwebtoken` — JWT generation for admin auth

## 3) Database (Supabase)
- Tables: `cities`, `categories`, `places`, `place_submissions`
- Schema lives in `supabase/migrations/` (ALTER-only migrations; base CREATE TABLE was done in Supabase dashboard)
- Initial schema documented in `supabase/migrations/00000000000000_initial_schema.sql`
- Supabase client: `src/lib/supabase/client.ts`
- Data access layer: `src/lib/repositories/` (city, category, place, admin, recommendation)

## 4) Current route structure
- `/` -> homepage with search bar + popular cities grid
- `/orase` -> all cities page
- `/orase/[slug]` -> city categories page
- `/orase/[slug]/[category]` -> places list page
- `/orase/[slug]/[category]/[placeId]` -> place details page
- `/orase/not-found` -> friendly 404 for invalid orase routes
- `/cauta` -> global search across cities, categories, places
- `/adauga-locatie` -> user submission form for new places
- `/admin` -> admin dashboard (login, cities, categories, places, submissions, imports)

## 5) Auth and security
- Admin login via `/api/admin/login` — sets `admin_token` httpOnly cookie (JWT, 2h expiry).
- Next.js middleware (`src/middleware.ts`) protects all `/api/admin/*` routes (except login/logout).
- JWT verified with `jose` on Edge; `jsonwebtoken` used for token generation in Node routes.
- Admin credentials from env: `ADMIN_USERNAME`, `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH`.

## 6) API layer
- Response format: `{ success, message, data }` via `src/lib/api-response.ts`
- Internal server fetch helper: `src/lib/internal-api.ts`
- Naming convention: UI uses `slug`/`category`/`placeId`, API uses `city_slug`/`category_slug`/`place_id`

### Public endpoints
- `GET /api/cities`
- `GET /api/categories?city_slug=...`
- `GET /api/places?city_slug=...&category_slug=...` (optional: `search`, `sort`)
- `GET /api/place?city_slug=...&category_slug=...&place_id=...`
- `GET /api/recommendations?city_slug=...&category_slug=...` (nearby/similar)
- `POST /api/submissions` (user-submitted places)

### Admin endpoints (middleware-protected)
- `POST /api/admin/login`, `POST /api/admin/logout`
- `GET/POST/PUT/DELETE /api/admin/places`
- `GET/PATCH /api/admin/cities`, `GET/PATCH /api/admin/categories`
- `GET/PATCH /api/admin/submissions`
- `POST /api/admin/upload-place-image`
- `POST /api/admin/import/search`, `POST /api/admin/import/commit`
- `POST /api/admin/import/google/search`, `GET /api/admin/import/google-coverage`
- `GET/PATCH /api/admin/places/google-match-review`
- `POST /api/admin/places/autofill-from-maps`

## 7) Validation and 404 behavior
- Dynamic route params validated against DB data.
- Next.js 16: `params` is `Promise`, use `await params`.
- Invalid city/category/place -> `notFound()`.
- API input validated with `zod` schemas in `src/lib/schemas/`.

## 8) Data model (Place type)
- `id`, `name`, `image`, `address`, `rating`, `description`
- `schedule`, `phone`, `website`, `mapsUrl`
- `featured`, `featured_until`, `activeFeatured`, `activePromoted`, `listingTierRank`
- `latitude`, `longitude`
- `google_match_status`, `google_photo_uri`, `google_hours_raw`
- Listing plans: `free`, `promoted`, `featured` (with expiry)

## 9) Key components
- `AppHeader` — sticky header with brand, search icon, "Adaugă locație" CTA
- `HomeSearchBar` — prominent search on homepage
- `Breadcrumb` — reusable breadcrumb trail
- `PlaceCard` / `PublicPlaceCard` — place cards with image
- `CategoryPlacesSection` — search + filter + grid for category pages
- `OraseCitySearchGrid` / `OraseCategorySearchGrid` — filterable grids
- `SimilarPlacesSection` / `NearbyRecommendationsSection` — related content
- `GlobalSearchClient` — client-side fuzzy search UI at `/cauta`

## 10) Scripts
- `npm run sync:google:city` — sync places from Google for a city
- `npm run sync:google:hours` — sync opening hours from Google
- `npm run backfill:coords` — backfill place coordinates

## 11) User preferences to keep
- Keep communication concise
- Step-by-step when requested
- Mention task switch before coding
- Keep backend/API style with proper status codes and JSON shape
- Use snake_case for DB fields
- Use class-based Model.init style where applicable

## 12) Repo hygiene
- `.gitignore` excludes `.cursor/`, `.vscode/`, `.next/`, `node_modules/`
- `.env.example` lists all required env vars (no secrets)
- No tests yet (recommended next step)
- No CI/CD yet
