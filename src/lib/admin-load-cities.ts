/** Load cities for admin selects from GET /api/admin/cities (same order as admin/cities table). */

export type AdminCitySelectRow = { slug: string; name: string };

export type AdminCitySelectOption = { value: string; label: string };

export async function fetchAdminCitiesForSelect(): Promise<AdminCitySelectRow[]> {
    const response = await fetch("/api/admin/cities", {
        credentials: "include",
        cache: "no-store",
    });
    const json = (await response.json()) as
        | { success: true; data?: { cities?: AdminCitySelectRow[] } }
        | { success: false };
    if (!response.ok || !json.success || !json.data?.cities) {
        return [];
    }
    return json.data.cities;
}

export function adminCitiesToSelectOptions(
    cities: AdminCitySelectRow[],
    emptyLabel = "Select city",
): AdminCitySelectOption[] {
    return [
        { value: "", label: emptyLabel },
        ...cities.map((c) => ({
            value: c.slug,
            label: c.name?.trim() || c.slug,
        })),
    ];
}
