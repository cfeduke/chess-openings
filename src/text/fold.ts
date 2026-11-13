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
