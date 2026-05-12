export type PublicCityApiRow = {
    city_slug: string;
    city_name: string;
    /** From Supabase `cities.image` — public URL or null */
    city_image: string | null;
};

export type CitiesListApiData = {
    count: number;
    cities: PublicCityApiRow[];
};
