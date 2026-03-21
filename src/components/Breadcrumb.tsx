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
    <nav className="ml-3 flex max-w-[calc(100vw-1.5rem)] items-center gap-2 overflow-x-auto rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200 backdrop-blur sm:ml-4 sm:px-4 sm:text-base">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={index} className="flex shrink-0 items-center gap-2">
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-gray-900 transition">
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900">{item.label}</span>
            )}

            {!isLast && <span className="opacity-40">/</span>}
          </span>
        );
      })}
    </nav>
  );
}