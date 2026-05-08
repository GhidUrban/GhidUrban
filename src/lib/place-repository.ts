/**
 * Barrel re-export — all repository functions are now split into focused modules
 * under `src/lib/repositories/`. This file preserves backward compatibility for
 * existing imports from `@/lib/place-repository`.
 */
export * from "./repositories";
export { isActiveFeatured } from "@/lib/is-active-featured";
