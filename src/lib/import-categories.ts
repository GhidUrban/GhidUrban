export type OsmTagFilter = {
    key: string;
    /** Ignored when `anyValue` is true (use empty string). */
    value: string;
    /** Match any value for `key`, e.g. historic=* in Overpass as ["historic"]. */
    anyValue?: boolean;
};

/**
 * One category → multiple OSM tag rules, unioned in a single Overpass query.
 */
export const IMPORT_CATEGORY_OSM_FILTERS: Record<string, OsmTagFilter[]> = {
    restaurante: [{ key: "amenity", value: "restaurant" }],
    cafenele: [{ key: "amenity", value: "cafe" }],
    farmacii: [{ key: "amenity", value: "pharmacy" }],
    supermarketuri: [{ key: "shop", value: "supermarket" }],

    natura: [
        { key: "leisure", value: "park" },
        { key: "natural", value: "peak" },
        { key: "natural", value: "water" },
        { key: "tourism", value: "viewpoint" },
    ],
    cultural: [
        { key: "tourism", value: "museum" },
        { key: "amenity", value: "theatre" },
        { key: "amenity", value: "library" },
        { key: "historic", value: "", anyValue: true },
        { key: "tourism", value: "artwork" },
    ],
    institutii: [
        { key: "amenity", value: "townhall" },
        { key: "amenity", value: "courthouse" },
        { key: "office", value: "government" },
        { key: "amenity", value: "police" },
        { key: "amenity", value: "post_office" },
    ],

    cazare: [
        { key: "tourism", value: "hotel" },
        { key: "tourism", value: "guest_house" },
    ],
    baruri: [
        { key: "amenity", value: "bar" },
        { key: "amenity", value: "pub" },
    ],
    spitale: [
        { key: "amenity", value: "hospital" },
        { key: "amenity", value: "clinic" },
    ],
    fitness: [{ key: "leisure", value: "fitness_centre" }],
    "locuri-de-joaca": [{ key: "leisure", value: "playground" }],
    cinematografe: [{ key: "amenity", value: "cinema" }],
};

/**
 * Overpass QL lines (node/way) for one filter, inside a union group.
 */
export function overpassLinesForFilter(
    filter: OsmTagFilter,
    radiusM: number,
    lat: number,
    lon: number,
): string[] {
    const k = filter.key.replace(/"/g, '\\"');
    if (filter.anyValue) {
        return [
            `        node["${k}"](around:${radiusM},${lat},${lon});`,
            `        way["${k}"](around:${radiusM},${lat},${lon});`,
        ];
    }
    const v = filter.value.replace(/"/g, '\\"');
    return [
        `        node["${k}"="${v}"](around:${radiusM},${lat},${lon});`,
        `        way["${k}"="${v}"](around:${radiusM},${lat},${lon});`,
    ];
}
