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
