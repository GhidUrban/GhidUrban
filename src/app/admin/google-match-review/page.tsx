import { Suspense } from "react";

import GoogleMatchReviewClient from "./GoogleMatchReviewClient";

export const dynamic = "force-dynamic";

export default function AdminGoogleMatchReviewPage() {
    return (
        <Suspense fallback={<p className="p-6 text-sm text-gray-600">Se încarcă…</p>}>
            <GoogleMatchReviewClient />
        </Suspense>
    );
}
