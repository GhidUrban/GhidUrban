/**
 * Reședințe de județ (RO) + București (municipiul capitală; reședință de referință pentru Ilfov).
 * WGS84 — centre aproximative pentru seed / bias geografic.
 */

export type RoMajorCitySeed = {
    slug: string;
    name: string;
    latitude: number;
    longitude: number;
};

export const RO_MAJOR_CITIES: RoMajorCitySeed[] = [
    { slug: "alba-iulia", name: "Alba Iulia", latitude: 46.0733, longitude: 23.5801 },
    { slug: "alexandria", name: "Alexandria", latitude: 43.9686, longitude: 25.3325 },
    { slug: "arad", name: "Arad", latitude: 46.1866, longitude: 21.3123 },
    { slug: "bacau", name: "Bacău", latitude: 46.5672, longitude: 26.9138 },
    { slug: "baia-mare", name: "Baia Mare", latitude: 47.6567, longitude: 23.585 },
    { slug: "bistrita", name: "Bistrița", latitude: 47.1333, longitude: 24.4903 },
    { slug: "botosani", name: "Botoșani", latitude: 47.7486, longitude: 26.6695 },
    { slug: "braila", name: "Brăila", latitude: 45.2692, longitude: 27.9575 },
    { slug: "brasov", name: "Brașov", latitude: 45.6427, longitude: 25.5887 },
    { slug: "bucuresti", name: "București", latitude: 44.4268, longitude: 26.1025 },
    { slug: "buzau", name: "Buzău", latitude: 45.1517, longitude: 26.8186 },
    { slug: "calarasi", name: "Călărași", latitude: 44.2056, longitude: 27.3136 },
    { slug: "cluj-napoca", name: "Cluj-Napoca", latitude: 46.7712, longitude: 23.6236 },
    { slug: "constanta", name: "Constanța", latitude: 44.1733, longitude: 28.6383 },
    { slug: "craiova", name: "Craiova", latitude: 44.3268, longitude: 23.8175 },
    { slug: "deva", name: "Deva", latitude: 45.8667, longitude: 22.9 },
    { slug: "drobeta-turnu-severin", name: "Drobeta-Turnu Severin", latitude: 44.6369, longitude: 22.6597 },
    { slug: "focsani", name: "Focșani", latitude: 45.6967, longitude: 27.1833 },
    { slug: "galati", name: "Galați", latitude: 45.4353, longitude: 28.008 },
    { slug: "giurgiu", name: "Giurgiu", latitude: 43.9037, longitude: 25.9699 },
    { slug: "iasi", name: "Iași", latitude: 47.1585, longitude: 27.6014 },
    { slug: "miercurea-ciuc", name: "Miercurea Ciuc", latitude: 46.361, longitude: 25.8017 },
    { slug: "oradea", name: "Oradea", latitude: 47.0722, longitude: 21.9212 },
    { slug: "piatra-neamt", name: "Piatra Neamț", latitude: 46.94, longitude: 26.3767 },
    { slug: "pitesti", name: "Pitești", latitude: 44.8569, longitude: 24.8692 },
    { slug: "ploiesti", name: "Ploiești", latitude: 44.9462, longitude: 26.0267 },
    { slug: "ramnicu-valcea", name: "Râmnicu Vâlcea", latitude: 45.0997, longitude: 24.3604 },
    { slug: "resita", name: "Reșița", latitude: 45.3008, longitude: 21.8897 },
    { slug: "satu-mare", name: "Satu Mare", latitude: 47.8017, longitude: 22.8573 },
    { slug: "sfantu-gheorghe", name: "Sfântu Gheorghe", latitude: 45.8636, longitude: 25.7874 },
    { slug: "sibiu", name: "Sibiu", latitude: 45.7983, longitude: 24.1256 },
    { slug: "slatina", name: "Slatina", latitude: 44.43, longitude: 24.3711 },
    { slug: "slobozia", name: "Slobozia", latitude: 44.5647, longitude: 27.3633 },
    { slug: "suceava", name: "Suceava", latitude: 47.6635, longitude: 26.2556 },
    { slug: "targoviste", name: "Târgoviște", latitude: 44.9258, longitude: 25.4567 },
    { slug: "targu-jiu", name: "Târgu Jiu", latitude: 45.0363, longitude: 23.2742 },
    { slug: "targu-mures", name: "Târgu Mureș", latitude: 46.5442, longitude: 24.5579 },
    { slug: "timisoara", name: "Timișoara", latitude: 45.7489, longitude: 21.2087 },
    { slug: "tulcea", name: "Tulcea", latitude: 45.1667, longitude: 28.8 },
    { slug: "vaslui", name: "Vaslui", latitude: 46.6403, longitude: 27.7275 },
    { slug: "zalau", name: "Zalău", latitude: 47.1911, longitude: 23.057 },
];

/** Same 7 categories as city-repository + google-import. */
export const SEED_STANDARD_CATEGORIES: { category_slug: string; category_name: string }[] = [
    { category_slug: "cafenele", category_name: "Cafenele" },
    { category_slug: "restaurante", category_name: "Restaurante" },
    { category_slug: "natura", category_name: "Natura" },
    { category_slug: "cultural", category_name: "Cultural" },
    { category_slug: "institutii", category_name: "Institutii" },
    { category_slug: "cazare", category_name: "Cazare" },
    { category_slug: "evenimente", category_name: "Evenimente" },
];
