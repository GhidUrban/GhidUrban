// Romanian diacritics → ASCII, then slug (same rules as admin + API create).
const RO_CHAR_TO_ASCII: Record<string, string> = {
  ă: "a",
  â: "a",
  î: "i",
  ș: "s",
  ş: "s",
  ț: "t",
  ţ: "t",
  Ă: "a",
  Â: "a",
  Î: "i",
  Ș: "s",
  Ş: "s",
  Ț: "t",
  Ţ: "t",
};

export function placeIdSlugFromName(rawName: string): string {
  let normalized = "";
  for (const ch of rawName) {
    normalized += RO_CHAR_TO_ASCII[ch] ?? ch;
  }
  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const SLUG_LABELS: Record<string, string> = {
  "bucuresti": "București",
  "timisoara": "Timișoara",
  "brasov": "Brașov",
  "targu-mures": "Târgu Mureș",
  "iasi": "Iași",
  "institutii": "Instituții",
};

export function slugToTitle(slug: string): string {
  const normalizedSlug = slug.toLowerCase().trim();

  if (SLUG_LABELS[normalizedSlug]) {
    return SLUG_LABELS[normalizedSlug];
  }

  return normalizedSlug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
