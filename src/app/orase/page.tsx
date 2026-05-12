import type { Metadata } from "next";
import { OraseCitySearchGrid } from "@/components/OraseCitySearchGrid";
import { OraseFlowPageHeader } from "@/components/OraseFlowPageHeader";
import { fetchPublicCitiesFromApi } from "@/lib/fetch-public-cities-api";
import type { PublicCityApiRow } from "@/lib/cities-api";

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
    let cities: PublicCityApiRow[] = [];
    try {
        cities = await fetchPublicCitiesFromApi();
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
