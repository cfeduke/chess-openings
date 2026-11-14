/** A month given as `2026-10`, as it is said: `October 2026`. */
export function monthInWords(month: string): string {
  const [year = 0, monthOfYear = 1] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthOfYear - 1)).toLocaleDateString('en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
