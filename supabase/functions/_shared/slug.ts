export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60)
}

export async function ensureUniqueSlug(
  desiredRaw: string,
  collisionCheck: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(desiredRaw) || `articulo-${Date.now()}`
  let candidate = base
  let suffix = 2
  while (await collisionCheck(candidate)) {
    const room = 60 - String(suffix).length - 1
    candidate = `${base.substring(0, room)}-${suffix}`
    suffix++
    if (suffix > 50) {
      candidate = `${base.substring(0, 50)}-${Date.now()}`
      break
    }
  }
  return candidate
}
