import Image from "next/image";
import Link from "next/link";
import { getImageByCategory } from "@/lib/image";
import { slugToTitle } from "@/lib/slug";

export type OraseCategoryRow = {
  category_slug: string;
  category_name: string;
};

export function OraseCategorySearchGrid({
  citySlug,
  categories,
}: {
  citySlug: string;
  categories: OraseCategoryRow[];
}) {
  return (
    <div className="grid grid-cols-2 gap-5 md:grid-cols-3 md:gap-6">
      {categories.map((category) => {
        const categoryTitle =
          category.category_name?.trim() || slugToTitle(category.category_slug);
        return (
          <Link
            key={category.category_slug}
            href={`/orase/${citySlug}/${category.category_slug}`}
            aria-label={`${categoryTitle}, vezi locurile`}
            className="group flex h-full min-h-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm outline-none ring-1 ring-black/[0.03] transition-all duration-200 ease-out hover:-translate-y-px hover:border-black/20 hover:shadow-md hover:ring-black/[0.05] focus-visible:ring-2 focus-visible:ring-gray-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-100 active:scale-[0.99] active:border-black/20 active:shadow-md active:ring-black/[0.05]"
          >
            <div className="relative shrink-0 overflow-hidden rounded-t-2xl">
              <Image
                src={getImageByCategory(category.category_slug)}
                alt={categoryTitle}
                width={600}
                height={400}
                className="h-44 w-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.01] group-active:scale-[1.01] md:h-48"
              />
            </div>
            <div className="flex flex-1 flex-col justify-center px-4 py-5 text-center">
              <span className="text-sm font-semibold text-gray-900">{categoryTitle}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
