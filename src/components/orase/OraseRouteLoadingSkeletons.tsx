function Pulse({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-gray-200/75 ${className}`}
      aria-hidden
    />
  );
}

/** Breadcrumb + title + search — matches OraseFlowPageHeader (mb-5, muted trail). */
function PageIntroSkeleton({
  titleWidth = "max-w-xs",
  breadcrumbRowExtra = false,
}: {
  titleWidth?: string;
  /** City page: breadcrumb + pill row, then title, then search alone. */
  breadcrumbRowExtra?: boolean;
}) {
  const breadcrumbPulses = (
    <>
      <Pulse className="h-2.5 w-12 rounded-md" />
      <Pulse className="h-2.5 w-2.5 rounded-full opacity-50" />
      <Pulse className="h-2.5 w-16 rounded-md" />
      <Pulse className="h-2.5 w-2.5 rounded-full opacity-50" />
      <Pulse className="h-2.5 w-20 rounded-md" />
    </>
  );

  return (
    <header className="mb-5 min-w-0">
      <div className="flex min-h-[32px] min-w-0 items-center justify-between gap-3 opacity-70">
        <div className="flex min-w-0 flex-1 items-center overflow-hidden">
          <div className="flex flex-nowrap items-center gap-1.5">
            {breadcrumbPulses}
          </div>
        </div>
        {breadcrumbRowExtra ? (
          <Pulse className="h-9 w-[5.5rem] shrink-0 rounded-full" />
        ) : null}
      </div>
      <div
        className={
          breadcrumbRowExtra
            ? "mt-3 flex flex-col gap-2"
            : "mt-3 flex flex-col gap-1.5"
        }
      >
        <div className="flex justify-center">
          <Pulse className={`h-8 w-full ${titleWidth} rounded-lg sm:h-9`} />
        </div>
        <div className="flex justify-center">
          <Pulse className="h-10 w-full max-w-sm rounded-xl sm:max-w-md md:max-w-lg" />
        </div>
      </div>
    </header>
  );
}

export function OraseCitiesLoadingSkeleton() {
  return (
    <main className="min-h-screen bg-gray-100 py-4">
      <div className="mx-auto max-w-5xl px-4">
        <PageIntroSkeleton titleWidth="max-w-[220px]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100/60"
            >
              <Pulse className="h-36 w-full rounded-none rounded-t-2xl" />
              <div className="space-y-2 p-4">
                <Pulse className="h-4 w-3/4 max-w-[12rem]" />
                <Pulse className="h-3 w-1/2 max-w-[6rem]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export function OraseCityLoadingSkeleton() {
  return (
    <main className="min-h-screen bg-gray-100 py-4">
      <div className="mx-auto max-w-4xl px-4">
        <PageIntroSkeleton titleWidth="max-w-[200px]" breadcrumbRowExtra />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100/60"
            >
              <Pulse className="h-32 w-full rounded-none rounded-t-2xl" />
              <div className="space-y-2 p-3 sm:p-4">
                <Pulse className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export function OraseCategoryLoadingSkeleton() {
  return (
    <main className="min-h-screen bg-gray-100 py-4">
      <div className="mx-auto max-w-4xl px-4">
        <PageIntroSkeleton titleWidth="max-w-[180px]" />
        <section className="mt-0 border-b border-gray-200/70 pb-8 sm:pb-10">
          <Pulse className="mb-4 h-5 w-40 rounded-md" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100/60"
              >
                <Pulse className="h-36 w-full rounded-none rounded-t-2xl" />
                <div className="space-y-2 p-4">
                  <Pulse className="h-4 w-4/5" />
                  <Pulse className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </section>
        <div className="mt-8 sm:mt-10">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-100/60"
              >
                <Pulse className="h-36 w-full rounded-none rounded-t-2xl" />
                <div className="space-y-2 p-4">
                  <Pulse className="h-4 w-3/4" />
                  <Pulse className="h-3 w-full" />
                  <Pulse className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export function OrasePlaceLoadingSkeleton() {
  return (
    <main className="min-h-screen bg-gray-100 py-4">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Pulse className="h-3 w-12 rounded-md" />
          <Pulse className="h-3 w-3 rounded-full opacity-40" />
          <Pulse className="h-3 w-16 rounded-md" />
          <Pulse className="h-3 w-3 rounded-full opacity-40" />
          <Pulse className="h-3 w-20 rounded-md" />
          <Pulse className="h-3 w-3 rounded-full opacity-40" />
          <Pulse className="h-3 w-28 rounded-md" />
        </div>
        <article className="mt-6 rounded-2xl border border-gray-200/90 bg-white p-6 shadow-sm ring-1 ring-gray-100/80 md:p-8">
          <Pulse className="h-80 w-full rounded-2xl md:h-[26rem]" />
          <div className="mt-8 space-y-3">
            <Pulse className="h-4 w-full" />
            <Pulse className="h-4 w-full" />
            <Pulse className="h-4 w-2/3" />
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200/90 bg-gray-50/30 p-4 shadow-sm">
              <Pulse className="h-3 w-16" />
              <Pulse className="mt-3 h-4 w-full" />
              <Pulse className="mt-2 h-4 w-3/4" />
            </div>
            <div className="rounded-xl border border-gray-200/90 bg-gray-50/30 p-4 shadow-sm">
              <Pulse className="h-3 w-20" />
              <Pulse className="mt-3 h-16 w-full" />
            </div>
          </div>
        </article>
        <div className="mt-8 space-y-3">
          <Pulse className="h-5 w-48 rounded-md" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm"
              >
                <Pulse className="h-32 w-full rounded-none rounded-t-2xl" />
                <div className="space-y-2 p-4">
                  <Pulse className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
