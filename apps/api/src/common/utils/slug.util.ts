import { slugify } from '@kmg/shared';

export { slugify };

/**
 * Generate a slug that does not collide with existing rows.
 *
 * ```ts
 * const slug = await uniqueSlug(input.slug ?? input.title, (s) =>
 *   this.prisma.job.count({ where: { slug: s, NOT: { id } } }).then((c) => c > 0));
 * ```
 */
export async function uniqueSlug(
  source: string,
  exists: (slug: string) => Promise<boolean>,
  maxAttempts = 50,
): Promise<string> {
  const base = slugify(source) || 'item';
  let candidate = base;
  for (let i = 2; i <= maxAttempts; i += 1) {
    if (!(await exists(candidate))) return candidate;
    candidate = `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
}
