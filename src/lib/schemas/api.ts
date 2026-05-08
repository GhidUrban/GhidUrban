import { z } from "zod";

const slug = z.string().trim().min(1);

export const citySlugQuery = z.object({
    city_slug: slug,
});

export const categoryQuery = z.object({
    city_slug: slug,
    category_slug: slug,
});

export const placeQuery = z.object({
    city_slug: slug,
    category_slug: slug,
    place_id: slug,
});

const sortValues = ["rating_desc", "rating_asc", "name_asc", "name_desc"] as const;

export const placesQuery = z.object({
    city_slug: slug,
    category_slug: slug,
    search: z.string().optional(),
    sort: z.enum(sortValues).optional(),
});

export const recommendationsQuery = z.object({
    city_slug: slug.optional(),
    category_slug: slug.optional(),
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    radius_km: z.coerce.number().min(0.1).max(100).optional(),
    exclude_place_id: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const submissionBody = z.object({
    city_slug: slug,
    category_slug: slug,
    name: z.string().trim().min(1),
    address: z.string().optional().default(""),
    website: z.string().optional().default(""),
    phone: z.string().trim().min(1),
    description: z.string().optional().default(""),
    maps_url: z.string().optional().default(""),
    image: z.string().optional().default(""),
    submitter_name: z.string().trim().min(1),
    submitter_email: z.string().trim().email(),
});

export function parseSearchParams<T extends z.ZodTypeAny>(
    schema: T,
    searchParams: URLSearchParams,
): z.infer<T> {
    const obj: Record<string, string> = {};
    searchParams.forEach((value, key) => {
        obj[key] = value;
    });
    return schema.parse(obj);
}
