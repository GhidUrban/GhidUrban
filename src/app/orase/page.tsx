import type { Metadata } from "next";
import { OraseCitySearchGrid } from "@/components/OraseCitySearchGrid";
import { OraseFlowPageHeader } from "@/components/OraseFlowPageHeader";
import { PageShell } from "@/components/ui/PageShell";
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
            <PageShell width="normal">
                <p className="text-center text-sm text-gray-600">Nu s-au putut incarca orasele</p>
            </PageShell>
        );
    }

    return (
        <PageShell width="wide">
            <OraseFlowPageHeader
                items={[{ label: "Acasă", href: "/" }, { label: "Orașe" }]}
                title="Alege un oraș"
            />

            <OraseCitySearchGrid cities={cities} />
        </PageShell>
    );
}
