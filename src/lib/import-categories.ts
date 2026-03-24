export type OsmTagFilter = {
    key: string;
    value: string;
};

/** One category → one or more [key=value] queries (union in Overpass). */
export const IMPORT_CATEGORY_OSM_FILTERS: Record<string, OsmTagFilter[]> = {
    restaurante: [{ key: "amenity", value: "restaurant" }],
    cafenele: [{ key: "amenity", value: "cafe" }],
    natura: [{ key: "amenity", value: "park" }],
    cultural: [{ key: "amenity", value: "museum" }],
    institutii: [{ key: "amenity", value: "public_building" }],
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
