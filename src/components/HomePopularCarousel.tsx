import { getPopularPlacesFromSupabase } from "@/lib/place-repository";
import { HomePlacesCarousel } from "./HomePlacesCarousel";

const POPULAR_CATEGORIES = ["restaurante", "cafenele", "cazare"];
const POPULAR_LIMIT = 20;

export async function HomePopularCarousel() {
  let places: Awaited<ReturnType<typeof getPopularPlacesFromSupabase>> = [];
  try {
    places = await getPopularPlacesFromSupabase(POPULAR_CATEGORIES, POPULAR_LIMIT);
  } catch {
    places = [];
  }

  return <HomePlacesCarousel popularPlaces={places} />;
}
