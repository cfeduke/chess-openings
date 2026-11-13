/**
 * A lowercase, dash-separated, ASCII-only form of `text`, safe to use in a URL.
 * Throws rather than silently drop a letter it does not know how to transliterate.
 */
export function slugify(text: string): string {
  const ascii = text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    // `ø` is a letter in its own right, so decomposition leaves it alone.
    .replace(/ø/g, 'o');

  const [unknown] = ascii.match(/(?![a-z])\p{L}/u) ?? [];
  if (unknown) {
    throw new Error(`cannot transliterate ${JSON.stringify(unknown)} in ${JSON.stringify(text)}`);
  }

  return ascii
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
