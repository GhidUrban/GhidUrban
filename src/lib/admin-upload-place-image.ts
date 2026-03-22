export type UploadPlaceImageResult =
    | { ok: true; publicUrl: string }
    | { ok: false; message: string };

export async function uploadPlaceImageFile(params: {
    file: File;
    city_slug: string;
    category_slug: string;
    place_id: string;
}): Promise<UploadPlaceImageResult> {
    const fd = new FormData();
    fd.append("file", params.file);
    fd.append("city_slug", params.city_slug);
    fd.append("category_slug", params.category_slug);
    fd.append("place_id", params.place_id);

    try {
        const res = await fetch("/api/admin/upload-place-image", {
            method: "POST",
            body: fd,
            credentials: "include",
        });
        const json = (await res.json()) as {
            success?: boolean;
            message?: string;
            data?: { publicUrl?: string } | null;
        };

        if (!res.ok || !json.success || !json.data?.publicUrl) {
            return { ok: false, message: json.message || "Upload failed" };
        }

        return { ok: true, publicUrl: json.data.publicUrl };
    } catch {
        return { ok: false, message: "Upload failed" };
    }
}
