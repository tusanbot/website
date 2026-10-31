/**
 * Shared blog slug validation. Keep this independent of any database adapter so
 * the same input contract applies while Supabase is primary and after cutover.
 */
export const MAX_BLOG_SLUG_LENGTH = 191;

export function normalizeBlogSlug(value: unknown): string {
  return typeof value === "string" ? value.trim().normalize("NFC") : "";
}

export function validateBlogSlug(value: unknown): { slug: string; error?: string } {
  const slug = normalizeBlogSlug(value);
  if (!slug) return { slug, error: "اسلاگ مقاله الزامی است." };
  if (slug.length > MAX_BLOG_SLUG_LENGTH) {
    return { slug, error: `طول اسلاگ نباید بیشتر از ${MAX_BLOG_SLUG_LENGTH} نویسه باشد.` };
  }
  if (/[\\/?#]/.test(slug)) {
    return { slug, error: "اسلاگ نباید شامل /، \\, ? یا # باشد." };
  }
  return { slug };
}
