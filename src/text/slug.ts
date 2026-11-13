import { foldText, foldWords } from './fold.ts';

/**
 * A lowercase, dash-separated, ASCII-only form of `text`, safe to use in a URL.
 * Throws rather than silently drop a letter it does not know how to transliterate.
 */
export function slugify(text: string): string {
  const [unknown] = foldText(text).match(/(?![a-z])\p{L}/u) ?? [];
  if (unknown) {
    throw new Error(`cannot transliterate ${JSON.stringify(unknown)} in ${JSON.stringify(text)}`);
  }
  return foldWords(text).join('-');
}

/** Whether `text` has the shape `slugify` produces: lowercase words and numbers joined by dashes. */
export function isSlug(text: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(text);
}
