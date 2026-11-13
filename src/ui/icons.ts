/** The interface's icons: simple shapes on a 24 × 24 grid, drawn in the current text colour. */

const svg = (attributes: string, body: string) =>
  `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" ${attributes}>${body}</svg>`;

const path = (d: string) => `<path d="${d}"/>`;

const filled = (shape: string) => svg('fill="currentColor"', path(shape));

const LINES =
  'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
const stroked = (...lines: string[]) => svg(LINES, lines.map(path).join(''));

/** A loudspeaker with `lines` beside it: sound waves, or a cross. */
const speaker = (...lines: string[]) =>
  svg(
    'fill="currentColor"',
    `${path('M4 9.5h3.5l4.5-4v13l-4.5-4H4z')}<g ${LINES}>${lines.map(path).join('')}</g>`,
  );

export const ICONS = {
  play: filled('M8 5l11 7-11 7z'),
  pause: filled('M7 5h3.5v14H7zM13.5 5H17v14h-3.5z'),
  replay: stroked('M5.2 13.5a7 7 0 1 0 1.6-6.4', 'M4.5 4.2v4.2h4.2'),
  restart: filled('M5.5 5H8v14H5.5zM19 5v14l-9.5-7z'),
  end: filled('M16 5h2.5v14H16zM5 5l9.5 7L5 19z'),
  back: stroked('M14.5 6l-6 6 6 6'),
  forward: stroked('M9.5 6l6 6-6 6'),
  flip: stroked('M8 20V5', 'M4.8 8.2 8 5l3.2 3.2', 'M16 4v15', 'M12.8 15.8 16 19l3.2-3.2'),
  soundOn: speaker('M15.2 9.3a4 4 0 0 1 0 5.4', 'M17.8 6.8a7.6 7.6 0 0 1 0 10.4'),
  soundOff: speaker('M15.5 9.5l5 5', 'M20.5 9.5l-5 5'),
  /** A little chequered board. */
  appearance: svg(
    'fill="currentColor"',
    `${path('M4 4h8v8H4zM12 12h8v8h-8z')}<rect x="4" y="4" width="16" height="16" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8"/>`,
  ),
} as const;

export type IconName = keyof typeof ICONS;
