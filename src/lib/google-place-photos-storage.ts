import type { SupabaseClient } from "@supabase/supabase-js";

const PLACES_V1 = "https://places.googleapis.com/v1";

function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}

function placeResourceName(googlePlaceId: string): string {
    const t = googlePlaceId.trim();
    if (t.startsWith("places/")) return t;
    return `places/${t}`;
}

async function fetchPhotoNamesFromDetails(
    apiKey: string,
    resourceName: string,
    max: number,
): Promise<string[]> {
    const res = await fetch(`${PLACES_V1}/${resourceName}`, {
        headers: {
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "photos",
        },
    });
    if (!res.ok) {
        const txt = await res.text();
        console.warn("google-place-photos: details", res.status, txt.slice(0, 160));
        return [];
    }
    const json = (await res.json()) as { photos?: { name?: string }[] };
    return (json.photos ?? [])
        .map((p) => p.name?.trim())
        .filter((n): n is string => Boolean(n))
        .slice(0, max);
}

async function fetchPhotoMediaBytes(apiKey: string, photoName: string): Promise<Buffer | null> {
    const u = `${PLACES_V1}/${photoName}/media?maxHeightPx=1200`;
    const maxAttempts = 4;
    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const res = await fetch(u, { headers: { "X-Goog-Api-Key": apiKey }, redirect: "follow" });
            if (!res.ok) {
                if ((res.status >= 500 || res.status === 429) && attempt < maxAttempts) {
                    await sleep(450 * attempt);
                    continue;
                }
                return null;
            }
            const buf = Buffer.from(await res.arrayBuffer());
            return buf.length > 0 ? buf : null;
        } catch (e) {
            lastErr = e;
            if (attempt < maxAttempts) {
                console.warn("google-place-photos: media retry", attempt, photoName.slice(0, 48));
                await sleep(550 * attempt);
                continue;
            }
        }
    }
    console.warn("google-place-photos: media failed", lastErr);
    return null;
}

export type UploadGooglePlacePhotosResult = {
    count: number;
    /** API a returnat nume de poze, dar nu s-a reușit nicio încărcare în Storage. */
    failed_after_names: boolean;
};

/** Descarcă până la maxPhotos de la Google Places API → Supabase Storage; cover + place_photos. */
export async function uploadGooglePhotosForPlace(
    sb: SupabaseClient,
    opts: {
        apiKey: string;
        city_slug: string;
        category_slug: string;
        place_id: string;
        external_place_id: string;
        maxPhotos: number;
        photoDelayMs: number;
        storageBucket?: string;
    },
): Promise<UploadGooglePlacePhotosResult> {
    const {
        apiKey,
        city_slug,
        category_slug,
        place_id,
        external_place_id,
        maxPhotos,
        photoDelayMs,
        storageBucket = process.env.SUPABASE_PLACE_IMAGES_BUCKET?.trim() || "places",
    } = opts;

    const gidRaw = external_place_id?.trim() ?? "";
    const g = gidRaw.startsWith("places/") ? gidRaw : gidRaw ? `places/${gidRaw}` : "";
    if (!g || maxPhotos <= 0) {
        return { count: 0, failed_after_names: false };
    }

    const photoNames = await fetchPhotoNamesFromDetails(apiKey, placeResourceName(g), maxPhotos);
    if (photoNames.length === 0) {
        return { count: 0, failed_after_names: false };
    }

    const publicUrls: string[] = [];
    for (let i = 0; i < photoNames.length; i++) {
        const bytes = await fetchPhotoMediaBytes(apiKey, photoNames[i]!);
        if (!bytes) continue;
        const objectPath = `${city_slug}/${category_slug}/${place_id}_${i}.jpg`;
        const { error: upErr } = await sb.storage.from(storageBucket).upload(objectPath, bytes, {
            contentType: "image/jpeg",
            upsert: true,
        });
        if (upErr) {
            console.warn("google-place-photos: storage upload", objectPath, upErr.message);
            continue;
        }
        const { data: pub } = sb.storage.from(storageBucket).getPublicUrl(objectPath);
        publicUrls.push(pub.publicUrl);
        if (photoDelayMs > 0) await sleep(photoDelayMs);
    }

    if (publicUrls.length === 0) {
        return { count: 0, failed_after_names: true };
    }

    const { error: placeErr } = await sb.from("places").update({ image_storage_path: publicUrls[0]! }).match({
        place_id,
        city_slug,
        category_slug,
    });
    if (placeErr) {
        console.warn("google-place-photos: places update", placeErr.message);
        return { count: 0, failed_after_names: true };
    }

    await sb
        .from("place_photos")
        .delete()
        .eq("place_id", place_id)
        .eq("city_slug", city_slug)
        .eq("category_slug", category_slug);

    const photoInserts = publicUrls.map((storage_path, sort_order) => ({
        place_id,
        city_slug,
        category_slug,
        sort_order,
        storage_path,
    }));
    const { error: pErr } = await sb.from("place_photos").insert(photoInserts);
    if (pErr?.code === "42P01" || pErr?.message?.includes("place_photos")) {
        console.warn("google-place-photos: place_photos missing, cover only");
    } else if (pErr) {
        console.warn("google-place-photos: place_photos", pErr.message);
    }

    const { error: gErr } = await sb
        .from("place_google_data")
        .update({ google_photo_name: photoNames[0] ?? null })
        .match({ place_id, city_slug, category_slug });
    if (gErr) {
        console.warn("google-place-photos: place_google_data", gErr.message);
    }

    return { count: publicUrls.length, failed_after_names: false };
}
