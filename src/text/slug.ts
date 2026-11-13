// Letters that Unicode decomposition (NFD) leaves intact but that have an obvious ASCII reading.
const UNDECOMPOSABLE: Record<string, string> = { ø: 'o', Ø: 'O' };

function foldDiacritics(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[øØ]/g, (letter) => UNDECOMPOSABLE[letter] ?? letter);
}

/** A lowercase, dash-separated, ASCII-only form of `text`, safe to use in a URL. */
export function slugify(text: string): string {
  return foldDiacritics(text)
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
