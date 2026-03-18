# PROJECT MEMORY - GHIDURBAN

Last updated: 2026-03-11

## 1) Project purpose
- `GhidUrban` is a city guide app.
- User flow: cities -> categories -> place details.
- Focus is currently architecture-first, then data/backend evolution.

## 2) Tech stack
- Next.js App Router (`next` 16)
- TypeScript
- Tailwind CSS
- No database yet (data is currently local in code)

## 3) Current route structure
- `/` -> landing page
- `/orase` -> cities page
- `/orase/[slug]` -> city categories page
- `/orase/[slug]/[category]` -> places list page
- `/orase/[slug]/[category]/[placeId]` -> place details page
- `/orase/not-found` -> friendly 404 page for invalid routes in this section

## 4) Validation and 404 behavior
- Dynamic route params are validated against data.
- Invalid city slug -> `notFound()`
- Invalid category for city -> `notFound()`
- Invalid placeId for city/category -> `notFound()`

## 5) Data and domain model
- Main data file: `src/data/places.ts`
- Main type: `Place`
  - `id`, `name`, `image`, `address`, `rating`, `description`
  - `schedule`, `phone`, `website`, `mapsUrl`
- City/category typings and guards:
  - `CitySlug`, `CategorySlug`
  - `isCitySlug()`, `isCategorySlug()`
- Data currently includes all project cities with categories.
- Real curated entries exist, and repository auto-completes to 20 results per city/category when needed.

## 6) Shared app utilities/components
- `src/lib/slug.ts`
  - `slugToTitle()` with Romanian diacritics mapping for known slugs
- `src/components/Breadcrumb.tsx`
  - reusable breadcrumb
- `src/components/PlaceCard.tsx`
  - place card UI with image + caption under image
- `src/components/PlaceLists.tsx`
  - search + filter + 2-column cards on md+

## 7) Repository architecture (important)
- `src/lib/place-repository.ts` is the data access layer.
- Pages should use repository functions, not direct file indexing.
- Repository enforces a minimum of 20 places per city/category:
  - If real data has less than 20, synthetic placeholders are generated automatically.
  - This applies to both page rendering and API responses.
- Current repository functions:
  - `isValidCitySlug(slug)`
  - `isValidCategorySlug(city, category)`
  - `getCategoryCardsForCity(city)`
  - `getAllCitySlugs()`
  - `getPlacesByCategory(city, category)`
  - `getPlaceById(city, category, placeId)`

## 8) API layer (implemented)
- Response format standard:
  - `{ success, message, data }`
- Helper: `src/lib/api-response.ts`
- Internal server fetch helper: `src/lib/internal-api.ts`
- Endpoints:
  - `GET /api/cities`
  - `GET /api/categories?city_slug=...`
  - `GET /api/places?city_slug=...&category_slug=...`
  - `GET /api/place?city_slug=...&category_slug=...&place_id=...`
- Pages now consume API endpoints server-side (not repository directly).
- API smoke checks already validated:
  - `/api/cities`
  - `/api/categories?city_slug=baia-mare`
  - `/api/places?city_slug=baia-mare&category_slug=cafenele`
  - `/api/place?city_slug=baia-mare&category_slug=cafenele&place_id=narcoffee`

## 9) UI state
- City page: clean cards grid (larger/taller cards)
- Category page: search + list cards via `PlacesList`
- Place detail page: larger white information card, consistent with app style
- Radial layout was removed from city/category pages

## 10) User preferences to keep
- Keep communication concise
- Step-by-step when requested
- Mention task switch before coding
- Keep backend/API style with proper status codes and JSON shape
- Focus on architecture first

## 12) Repo hygiene
- `.gitignore` exists and now also excludes local IDE/AI artifacts:
  - `.cursor/`
  - `.vscode/`

## 11) Next recommended architecture steps
- Add API contract tests (success + 400 + 404 cases for each endpoint)
- Introduce a DB (later) behind repository/API with same contracts
- Add tests for repository + API route handlers
- Decide strategy for replacing auto-generated placeholder entries with fully curated real data over time

