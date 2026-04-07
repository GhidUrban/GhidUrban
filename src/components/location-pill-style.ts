export type LocationPillSize = "compact" | "subtle";

const LOCATION_PILL_SHARED =
  "inline-flex min-w-[11.5rem] items-center justify-center gap-1.5 rounded-full border text-xs font-medium outline-none transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2EC4B6]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

const LOCATION_PILL_COMPACT_SIZE = "min-h-9 px-3 py-1.5";
const LOCATION_PILL_SUBTLE_SIZE = "min-h-7 px-3 py-1.5";

export function locationPillBaseClass(size: LocationPillSize = "compact"): string {
  return `${LOCATION_PILL_SHARED} ${
    size === "subtle" ? LOCATION_PILL_SUBTLE_SIZE : LOCATION_PILL_COMPACT_SIZE
  }`;
}

export const LOCATION_PILL_IDLE =
  "border-black/10 bg-white text-[#0B2A3C] hover:border-black/20 hover:bg-gray-50";

export const LOCATION_PILL_ACTIVE =
  "border-[#2EC4B6]/20 bg-[#2EC4B6]/10 text-[#0B2A3C] hover:border-[#2EC4B6]/30 hover:bg-[#2EC4B6]/14";

export const LOCATION_PILL_LOADING =
  "border-black/10 bg-white text-gray-500";

export const LOCATION_PILL_SUBTLE_IDLE =
  "border-black/8 bg-white/95 text-[#0B2A3C] hover:border-black/15 hover:bg-gray-50/90";

export const LOCATION_PILL_SUBTLE_ACTIVE =
  "border-[#2EC4B6]/16 bg-[#2EC4B6]/8 text-[#0B2A3C] hover:border-[#2EC4B6]/24 hover:bg-[#2EC4B6]/12";

export function locationPillToneClass(
  isActive: boolean,
  busy: boolean,
  size: LocationPillSize = "compact",
): string {
  if (busy) return LOCATION_PILL_LOADING;
  if (isActive) {
    return size === "subtle" ? LOCATION_PILL_SUBTLE_ACTIVE : LOCATION_PILL_ACTIVE;
  }
  return size === "subtle" ? LOCATION_PILL_SUBTLE_IDLE : LOCATION_PILL_IDLE;
}

export const LOCATION_PILL_DOT = "h-1.5 w-1.5 rounded-full bg-[#2EC4B6]";
