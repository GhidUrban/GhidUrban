import { isActiveFeatured } from "@/lib/is-active-featured";

export type ListingPlanType = "free" | "promoted" | "featured";

export function normalizeListingPlanType(raw: string | null | undefined): ListingPlanType {
    const v = (raw ?? "free").toLowerCase().trim();
    if (v === "promoted" || v === "featured") {
        return v;
    }
    return "free";
}

/**
 * Active plan: null/empty expiry → stays active until changed.
 * Future expiry → active; past expiry → inactive (treated as free).
 */
export function isListingPlanActive(plan_expires_at: string | null | undefined): boolean {
    if (plan_expires_at == null || plan_expires_at === "") {
        return true;
    }
    const end = new Date(plan_expires_at);
    if (Number.isNaN(end.getTime())) {
        return false;
    }
    return end.getTime() > Date.now();
}

type ListingRow = {
    featured: boolean | null | undefined;
    featured_until: string | null | undefined;
    plan_type?: string | null;
    plan_expires_at?: string | null;
};

export type ResolvedListing = {
    activeFeatured: boolean;
    activePromoted: boolean;
    /** 0 normal, 1 promoted, 2 featured — for ordering */
    listingTierRank: number;
};

export function resolveListing(row: ListingRow): ResolvedListing {
    const legacyFeatured = isActiveFeatured({
        featured: row.featured,
        featured_until: row.featured_until,
    });

    const planType = normalizeListingPlanType(row.plan_type);
    const planLive = isListingPlanActive(row.plan_expires_at);

    let tierFromPlan = 0;
    if (planLive) {
        if (planType === "featured") {
            tierFromPlan = 2;
        } else if (planType === "promoted") {
            tierFromPlan = 1;
        }
    }

    const listingTierRank = Math.max(tierFromPlan, legacyFeatured ? 2 : 0);

    const activeFeatured = legacyFeatured || (planLive && planType === "featured");

    const activePromoted = planLive && planType === "promoted" && !activeFeatured;

    return { activeFeatured, activePromoted, listingTierRank };
}
