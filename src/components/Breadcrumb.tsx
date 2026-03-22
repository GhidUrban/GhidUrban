import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
};

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={index} className="flex shrink-0 items-center gap-2">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="rounded-sm text-gray-500 transition-colors duration-200 ease-out hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 active:opacity-80"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-gray-700">{item.label}</span>
            )}

            {!isLast && (
              <span className="select-none text-gray-500" aria-hidden>
                /
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
