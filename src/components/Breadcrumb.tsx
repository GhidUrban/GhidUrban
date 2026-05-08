import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  muted?: boolean;
};

function ChevronSeparator({ muted }: { muted?: boolean }) {
  return (
    <span
      className={`mx-1 inline-flex shrink-0 sm:mx-1.5 ${muted ? "text-gray-300/50" : "text-gray-300/70"}`}
      aria-hidden
    >
      <svg
        className="h-2.5 w-2.5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 18l6-6-6-6" />
      </svg>
    </span>
  );
}

function lastSegmentClass(muted: boolean | undefined): string {
  // py-0.5 matches middle links so the row height stays even when the last item truncates
  const base =
    "block min-w-0 max-w-full truncate py-0.5 text-left font-normal leading-5 tracking-tight";
  if (muted) {
    return `${base} text-gray-500/80`;
  }
  return `${base} text-gray-600`;
}

function middleLinkClass(muted: boolean | undefined): string {
  return muted
    ? "shrink-0 rounded-md px-1 py-0.5 leading-5 text-gray-400 transition-colors duration-200 ease-out hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 active:opacity-80"
    : "shrink-0 rounded-md px-1.5 py-0.5 leading-5 text-gray-600 transition-colors duration-200 ease-out hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 active:opacity-80";
}

function middleTextClass(muted: boolean | undefined): string {
  return muted
    ? "shrink-0 py-0.5 leading-5 text-gray-400"
    : "shrink-0 py-0.5 leading-5 text-gray-600";
}

export default function Breadcrumb({ items, muted }: BreadcrumbProps) {
  if (items.length === 0) {
    return null;
  }

  const lastIndex = items.length - 1;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex min-w-0 w-full max-w-full flex-nowrap items-center overflow-hidden whitespace-nowrap leading-5 ${muted ? "min-h-0 text-xs" : "min-h-5 text-xs sm:min-h-6 sm:text-sm"}`}
    >
      {items.map((item, index) => {
        const isLast = index === lastIndex;

        if (isLast) {
          const title = item.label;
          if (item.href) {
            return (
              <Link
                key={index}
                href={item.href}
                title={title}
                className={`min-w-0 flex-1 ${lastSegmentClass(muted)}`}
              >
                {item.label}
              </Link>
            );
          }
          return (
            <span
              key={index}
              title={title}
              className={`min-w-0 flex-1 ${lastSegmentClass(muted)}`}
            >
              {item.label}
            </span>
          );
        }

        return (
          <span key={index} className="inline-flex shrink-0 items-center">
            {item.href ? (
              <Link href={item.href} className={middleLinkClass(muted)}>
                {item.label}
              </Link>
            ) : (
              <span className={middleTextClass(muted)}>{item.label}</span>
            )}
            <ChevronSeparator muted={muted} />
          </span>
        );
      })}
    </nav>
  );
}
