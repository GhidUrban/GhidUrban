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
    <nav className="absolute left-6 top-14 flex items-center gap-3 rounded-full bg-white/90 px-5 py-3 text-base font-semibold text-gray-700 shadow-md ring-1 ring-gray-200 backdrop-blur">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={index} className="flex items-center gap-3">
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