import type { ReactNode } from "react";
import Breadcrumb from "@/components/Breadcrumb";
import { PlacesSearchForm } from "@/components/PlacesSearchForm";

export type OraseFlowBreadcrumbItem = {
  label: string;
  href?: string;
};

type OraseFlowPageHeaderProps = {
  items: OraseFlowBreadcrumbItem[];
  title: string;
  titleClassName?: string;
  /** City page: pill beside breadcrumb (search stays on its own row below). */
  breadcrumbRowExtra?: ReactNode;
};

/**
 * Shared header for /orase flow: muted breadcrumb, title as anchor, search.
 */
export function OraseFlowPageHeader({
  items,
  title,
  titleClassName,
  breadcrumbRowExtra,
}: OraseFlowPageHeaderProps) {
  const titleSearchGap = breadcrumbRowExtra ? "gap-2" : "gap-1.5";

  return (
    <header className="mb-5 min-w-0">
      <div className="flex min-h-[32px] min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center">
          <Breadcrumb items={items} muted />
        </div>
        {breadcrumbRowExtra ? (
          <div className="m-0 flex shrink-0 items-center p-0">
            {breadcrumbRowExtra}
          </div>
        ) : null}
      </div>

      <div className={`mt-3 flex flex-col ${titleSearchGap}`}>
        <h1
          className={`mx-auto w-full max-w-3xl text-center text-2xl font-semibold tracking-tight text-pretty leading-tight text-gray-900 sm:text-3xl${titleClassName ? ` ${titleClassName}` : ""}`}
        >
          {title}
        </h1>
        <div>
          <PlacesSearchForm />
        </div>
      </div>
    </header>
  );
}
