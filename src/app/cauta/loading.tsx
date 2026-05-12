export default function CautaLoading() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 px-4 py-10">
            <span
                className="h-9 w-9 animate-spin rounded-full border-2 border-gray-300 border-t-[#0B2A3C]"
                aria-hidden
            />
            <p className="mt-4 text-sm text-gray-500">Se încarcă căutarea…</p>
        </main>
    );
}
