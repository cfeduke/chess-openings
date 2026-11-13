/**
 * Lowercases `text` and strips its accents, so that `Grünfeld`, `grunfeld` and `GRÜNFELD` all
 * compare equal. Letters with no ASCII reading are left as they are.
 */
export function foldText(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      // `ø` is a letter in its own right, so decomposition leaves it alone.
      .replace(/ø/g, 'o')
  );
}

/**
 * The words of `text`, folded: `King's Gambit: Bishop's Gambit` → `kings gambit bishops gambit`.
 * This is what ids are built from and what a search matches against.
 */
export function foldWords(text: string): string[] {
  return foldText(text)
    .replace(/'/g, '')
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}
