import { supabase } from "@/lib/supabase/client";
import {
    adminListSortRank,
    isSafeCitySlug,
    type AdminCategoryRow,
    type CategoryCard,
    type UpdateCategoryInput,
} from "./types";

const CATEGORY_CARDS: CategoryCard[] = [
    { name: "Restaurante", slug: "restaurante", icon: "" },
    { name: "Cafenele", slug: "cafenele", icon: "" },
    { name: "Instituții", slug: "institutii", icon: "" },
    { name: "Cultural", slug: "cultural", icon: "" },
    { name: "Natură", slug: "natura", icon: "" },
    { name: "Evenimente", slug: "evenimente", icon: "" },
    { name: "Cazare", slug: "cazare", icon: "" },
];

export function getCategoryCardsForCity(): CategoryCard[] {
    return CATEGORY_CARDS;
}

export async function categoryExistsInSupabase(
    citySlug: string,
    categorySlug: string,
): Promise<boolean> {
    const city = citySlug?.trim();
    const category = categorySlug?.trim();
    if (!city || !category) return false;

    const { data, error } = await supabase
        .from("categories")
        .select("category_slug")
        .eq("city_slug", city)
        .eq("category_slug", category)
        .limit(1);
    if (error) {
        console.error("Supabase category lookup error:", error);
        throw new Error("Failed to verify category");
    }
    return (data?.length ?? 0) > 0;
}

export async function isValidCategorySlug(city: string, category: string): Promise<boolean> {
    return categoryExistsInSupabase(city, category);
}

export async function getCategoriesByCityFromSupabase(citySlug: string) {
    const { data, error } = await supabase
        .from("categories")
        .select("category_slug, category_name")
        .eq("city_slug", citySlug.trim());

    if (error) {
        console.error("Supabase categories error:", error);
        throw new Error("Failed to fetch categories");
    }
    return data ?? [];
}

export async function getCategoriesForAdminByCityFromSupabase(
    city_slug: string,
): Promise<AdminCategoryRow[]> {
    const { data, error } = await supabase
        .from("categories")
        .select("city_slug, category_slug, category_name, image, icon, is_active, sort_order")
        .eq("city_slug", city_slug);

    if (error) throw error;

    const rows = (data ?? []) as AdminCategoryRow[];
    return [...rows].sort((a, b) => {
        const d = adminListSortRank(a.sort_order) - adminListSortRank(b.sort_order);
        if (d !== 0) return d;
        return a.category_name.localeCompare(b.category_name, "ro", { sensitivity: "base" });
    });
}

export async function updateCategoryInSupabase(
    city_slug: string,
    category_slug: string,
    updates: UpdateCategoryInput,
): Promise<{ category_slug: string }> {
    const c = city_slug?.trim();
    const oldCat = category_slug?.trim();
    if (!c || !oldCat) throw new Error("Lipsește orașul sau categoria.");

    let newCatSlug =
        updates.category_slug_new !== undefined && updates.category_slug_new !== null
            ? updates.category_slug_new.trim()
            : oldCat;
    if (!newCatSlug || !isSafeCitySlug(newCatSlug)) {
        throw new Error("Slug categorie invalid. Folosiți litere mici, cifre și cratime.");
    }

    if (newCatSlug !== oldCat) {
        const { data: conflict, error: conflictErr } = await supabase
            .from("categories").select("category_slug").eq("city_slug", c).eq("category_slug", newCatSlug).limit(1);
        if (conflictErr) throw new Error("Nu s-a putut verifica slug-ul categoriei.");
        if ((conflict?.length ?? 0) > 0) throw new Error("Există deja o categorie cu acest slug în acest oraș.");

        const { error: placesErr } = await supabase
            .from("places").update({ category_slug: newCatSlug }).eq("city_slug", c).eq("category_slug", oldCat);
        if (placesErr) throw new Error("Nu s-au putut actualiza locurile pentru noul slug de categorie.");
    }

    const row: Record<string, unknown> = {};
    if (updates.category_name !== undefined) {
        const n = updates.category_name?.trim();
        if (!n) throw new Error("Numele categoriei nu poate fi gol.");
        row.category_name = n;
    }
    if (updates.image !== undefined) {
        row.image = updates.image === null || updates.image === "" ? null : String(updates.image).trim();
    }
    if (updates.icon !== undefined) {
        row.icon = updates.icon === null || updates.icon === "" ? null : String(updates.icon).trim();
    }
    if (updates.is_active !== undefined) row.is_active = Boolean(updates.is_active);
    if (updates.sort_order !== undefined) {
        const so = Number(updates.sort_order);
        if (!Number.isFinite(so) || !Number.isInteger(so)) throw new Error("sort_order trebuie să fie număr întreg.");
        row.sort_order = so;
    }
    if (newCatSlug !== oldCat) row.category_slug = newCatSlug;
    if (Object.keys(row).length === 0) return { category_slug: newCatSlug };

    const { error } = await supabase
        .from("categories").update(row).eq("city_slug", c).eq("category_slug", oldCat);
    if (error) throw new Error("Nu s-a putut actualiza categoria.");
    return { category_slug: newCatSlug };
}
