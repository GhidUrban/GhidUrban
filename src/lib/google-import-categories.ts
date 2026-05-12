/**
 * Map GhidUrban category_slug → Google Places API (New) search strategy.
 * Nearby = places:searchNearby (includedTypes + circle).
 * Text = places:searchText (textQuery + locationBias).
 */

export const GOOGLE_IMPORT_SUPPORTED_CATEGORIES = [
    "cafenele",
    "restaurante",
    "cultural",
    "natura",
    "institutii",
    "evenimente",
    "cazare",
] as const;

export type GoogleImportSupportedCategory = (typeof GOOGLE_IMPORT_SUPPORTED_CATEGORIES)[number];

export type GoogleImportStrategy = "nearby" | "text";

export type GoogleImportCategoryConfig = {
    strategy: GoogleImportStrategy;
    /** Nearby: Google place types (Table A / supported primary types). */
    nearbyTypes?: string[];
    /** Text: keywords joined into one query (plus city + Romania in code). */
    textKeywords?: string[];
    /** Search radius in meters (circle for Nearby or bias for Text). */
    radiusM: number;
};

/** Explicit mapping — easy to tweak without touching search logic. */
export const GOOGLE_IMPORT_CATEGORY_MAP: Record<
    GoogleImportSupportedCategory,
    GoogleImportCategoryConfig
> = {
    cafenele: {
        strategy: "nearby",
        nearbyTypes: ["cafe", "coffee_shop"],
        textKeywords: ["cafenea", "coffee shop", "ceainarie", "patiserie cafea"],
        radiusM: 15_000,
    },
    restaurante: {
        strategy: "nearby",
        nearbyTypes: ["restaurant"],
        textKeywords: ["restaurant", "bistro", "brasserie", "trattoria"],
        radiusM: 15_000,
    },
    cultural: {
        strategy: "nearby",
        nearbyTypes: ["museum", "art_gallery", "performing_arts_theater"],
        textKeywords: [
            "muzeu", "galerie de arta", "teatru", "opera",
            "palat", "biblioteca", "monument", "casa memoriala",
            "catedrala", "centru cultural",
        ],
        radiusM: 15_000,
    },
    natura: {
        strategy: "text",
        textKeywords: [
            "public park",
            "botanical garden",
            "nature reserve",
            "forest",
            "lake",
            "river",
            "hiking trail",
            "green space",
        ],
        radiusM: 20_000,
    },
    institutii: {
        strategy: "nearby",
        nearbyTypes: [
            "city_hall",
            "courthouse",
            "hospital",
            "local_government_office",
            "embassy",
        ],
        textKeywords: ["primarie", "spital", "tribunal", "prefectura", "politie"],
        radiusM: 12_000,
    },
    evenimente: {
        strategy: "text",
        textKeywords: [
            "arena",
            "event venue",
            "concert hall",
            "stadium",
            "convention center",
            "festival",
        ],
        radiusM: 15_000,
    },
    cazare: {
        strategy: "nearby",
        nearbyTypes: ["lodging"],
        textKeywords: [
            "hotel",
            "guesthouse",
            "apartment hotel",
            "boutique hotel",
            "bed and breakfast",
            "pension",
        ],
        radiusM: 20_000,
    },
};

export function isGoogleImportCategory(
    slug: string,
): slug is GoogleImportSupportedCategory {
    return (GOOGLE_IMPORT_SUPPORTED_CATEGORIES as readonly string[]).includes(slug);
}
