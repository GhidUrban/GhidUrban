export function isActiveFeatured(place: {
    featured: boolean | null | undefined;
    featured_until: string | null | undefined;
}): boolean {
    if (!place.featured) {
        return false;
    }
    const until = place.featured_until;
    if (until == null || until === "") {
        return true;
    }
    const end = new Date(until);
    if (Number.isNaN(end.getTime())) {
        return false;
    }
    return end.getTime() > Date.now();
}
