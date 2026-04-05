import type { Metadata } from "next";
import { OraseCitySearchGrid } from "@/components/OraseCitySearchGrid";
import { OraseFlowPageHeader } from "@/components/OraseFlowPageHeader";
import { getPublicCitiesFromSupabase } from "@/lib/place-repository";

type CitiesApiResponseData = {
    count: number;
    cities: Array<{
        city_slug: string;
        city_name: string;
    }>;
};

export const metadata: Metadata = {
    title: "Orașe | GhidUrban",
    description:
        "Alege un oraș și explorează categorii de locuri recomandate din România.",
    openGraph: {
        title: "Orașe | GhidUrban",
        description:
            "Alege un oraș și explorează categorii de locuri recomandate din România.",
        locale: "ro_RO",
        siteName: "GhidUrban",
        type: "website",
    },
};

export default async function OrasePage() {
    let cities: CitiesApiResponseData["cities"] = [];
    try {
        const rows = await getPublicCitiesFromSupabase();
        cities = rows.map((c) => ({
            city_slug: c.slug,
            city_name: c.name,
        }));
    } catch {
        cities = [];
    }

    if (cities.length === 0) {
        return (
            <main className="relative min-h-screen bg-gray-100 py-4">
                <div className="mx-auto max-w-4xl px-4">
                    <p className="text-center text-sm text-gray-600">Nu s-au putut incarca orasele</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-100 py-4">
            <div className="mx-auto max-w-5xl px-4">
                <OraseFlowPageHeader
                    items={[{ label: "Acasă", href: "/" }, { label: "Orașe" }]}
                    title="Alege un oraș"
                />

                <OraseCitySearchGrid cities={cities} />
            </div>
        </main>
    );
}
