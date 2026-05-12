import type { CitiesListApiData, PublicCityApiRow } from "@/lib/cities-api";
import { apiGet } from "@/lib/internal-api";

export async function fetchPublicCitiesFromApi(): Promise<PublicCityApiRow[]> {
    const result = await apiGet<CitiesListApiData>("/api/cities", {});
    if (!result.success || !result.data?.cities) return [];
    return result.data.cities;
}
