/**
 * URL slug helpers shared by forum / news / admin create paths.
 */

/** Lowercase slug: non-alphanumerics → hyphens, trim edge hyphens. */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
