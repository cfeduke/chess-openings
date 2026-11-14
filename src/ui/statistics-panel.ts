import './statistics-panel.css';
import { numberedMove } from '../chess/san.ts';
import type { Opening } from '../data/opening.ts';
import { el } from '../dom.ts';
import type { GamesSource } from '../statistics/data.ts';
import {
  againstRatings,
  ENOUGH_GAMES,
  type OpeningDetail,
  type Split,
  scoreOf,
} from '../statistics/detail.ts';
import { percent, percentage, shareInWords } from '../statistics/popularity.ts';
import type { LineNumbers } from '../statistics/statistics.ts';
import { monthInWords } from '../text/month.ts';

/** What the panel is told of the opening on the board. */
export interface PanelSubject {
  /** What the games that reached it say of it, at a glance. */
  numbers: LineNumbers;
  /** The same of all the games counted. */
  total: LineNumbers;
  /** Which games those are. */
  source: GamesSource;
  /** How many moves the line has, counting each side's: the move played next is the one after. */
  plies: number;
  /** Fetches the rest of what there is to say. Not there if there is no more to be had. */
  detail?: () => Promise<OpeningDetail>;
  /** The line of the catalog that ends in the position at `place`, if there is one. */
  leadsTo(place: number): { opening: Opening; name: string } | undefined;
}

const games = (count: number) => `${count.toLocaleString('en')} ${count === 1 ? 'game' : 'games'}`;

let panels = 0;

/**
 * The numbers of the opening on the board, in a panel that is shut until it is asked for. What
 * came with the page is shown at once; the rest is fetched when the panel is first open on an
 * opening, and not before.
 */
export function createStatisticsPanel({ onSelect }: { onSelect(opening: Opening): void }): {
  element: HTMLElement;
  /** Shows the numbers of an opening; with `null`, the panel is put away. */
  show(subject: PanelSubject | null): void;
} {
  const id = `stats-${++panels}`;
  let subject: PanelSubject | null = null;
  let open = false;
  /** The rest of the numbers of `subject`: come, coming, failed to come, or not yet asked for. */
  let detail: OpeningDetail | 'fetching' | 'failed' | undefined;

  const toggle = el(
    'button',
    {
      type: 'button',
      class: 'stats__toggle',
      id: `${id}-title`,
      'aria-expanded': 'false',
      'aria-controls': `${id}-body`,
    },
    'Statistics',
  );
  const body = el('div', { class: 'stats__body', id: `${id}-body`, hidden: '' });
  const element = el(
    'section',
    { class: 'stats', 'aria-labelledby': toggle.id, hidden: '' },
    el('h2', { class: 'stats__heading' }, toggle),
    body,
  );

  const heading = (text: string) =>
    el(
      'h3',
      { class: 'stats__title', id: `${id}-${text.toLowerCase().replaceAll(' ', '-')}` },
      text,
    );

  /** Which games the numbers are of: `1,000,000 … counted on lichess in October 2026`. */
  const counted = ({ source }: PanelSubject, what = '') =>
    `${source.games.toLocaleString('en')}${what} counted on lichess in ${monthInWords(source.month)}`;

  const howOften = (shown: PanelSubject) => {
    const { numbers } = shown;
    const said =
      numbers.games === 0
        ? `None of the ${counted(shown, ' games')} reached this position.`
        : `${games(numbers.games)} reached this position: ` +
          `${shareInWords(numbers.share)} of the ${counted(shown)}.`;
    return [heading('How often'), el('p', { class: 'stats__often' }, said)];
  };

  const howItGoes = ({ numbers, total }: PanelSubject) => {
    const score = scoreOf(numbers);
    const results = [
      ['white', 'White wins', numbers.white],
      ['draws', 'Draws', numbers.draws],
      ['black', 'Black wins', numbers.black],
    ] as const;
    const bar = el(
      'div',
      { class: 'stats__bar', 'aria-hidden': 'true' },
      ...results.map(([side, , count]) =>
        el('span', { class: `stats__part stats__part--${side}`, style: `flex-grow: ${count}` }),
      ),
    );
    // A share of a few games is no better than a score of them: they are counted instead.
    const outcomes = el(
      'ul',
      { class: 'stats__outcomes' },
      ...results.map(([side, label, count]) =>
        el(
          'li',
          { class: `stats__outcome stats__outcome--${side}` },
          `${label} ${score === undefined ? count.toLocaleString('en') : percent(count / numbers.games)}`,
        ),
      ),
    );
    const scored = el(
      'p',
      { class: 'stats__score' },
      score === undefined
        ? 'Too few games to say how the opening scores.'
        : `White scores ${percent(score)}.`,
    );
    const ratings = againstRatings(numbers, total);
    return [
      heading('How it goes'),
      bar,
      outcomes,
      scored,
      ...(ratings ? [el('p', { class: 'stats__ratings' }, ratings)] : []),
    ];
  };

  /** A table of the games of each band, or each speed: its share of them, and White's score. */
  const split = (title: string, column: string, rows: Split[]) => {
    const titled = heading(title);
    const most = Math.max(...rows.map(({ share }) => share));
    const score = (row: Split) => {
      if (row.games === 0) return 'no games';
      const shown = scoreOf(row);
      return shown === undefined ? 'too few games' : percent(shown);
    };
    const table = el(
      'table',
      { class: 'stats__table', 'aria-labelledby': titled.id },
      el(
        'thead',
        {},
        el(
          'tr',
          {},
          ...[column, 'Reached in', 'White scores'].map((text) => el('th', { scope: 'col' }, text)),
        ),
      ),
      el(
        'tbody',
        {},
        ...rows.map((row) =>
          el(
            'tr',
            {},
            el('th', { scope: 'row' }, row.name),
            el(
              'td',
              {},
              percentage(row.share),
              el('span', {
                class: 'stats__share-bar',
                'aria-hidden': 'true',
                style: `width: ${most ? Number(((row.share / most) * 100).toFixed(1)) : 0}%`,
              }),
            ),
            el('td', {}, score(row)),
          ),
        ),
      ),
    );
    return [titled, table];
  };

  const whatNext = ({ plies, leadsTo }: PanelSubject, { moves, others }: OpeningDetail) => {
    const titled = heading('What is played next');
    const item = (move: string, share: number, way?: ReturnType<PanelSubject['leadsTo']>) => {
      const row = el(
        'li',
        {},
        el('span', { class: 'stats__move' }, move),
        el('span', { class: 'stats__move-share' }, percentage(share)),
      );
      if (way) {
        const button = el('button', { type: 'button', class: 'stats__way' }, way.name);
        button.addEventListener('click', () => onSelect(way.opening));
        row.append(button);
      }
      return row;
    };
    const list = el(
      'ol',
      { class: 'stats__moves', 'aria-labelledby': titled.id },
      ...moves.map(({ san, share, to }) => item(numberedMove(san, plies), share, leadsTo(to))),
      ...(others.games > 0 ? [item('Other moves', others.share)] : []),
    );
    return [titled, list];
  };

  const howLong = ({ meanMoves, short }: OpeningDetail) =>
    meanMoves === undefined || short === undefined
      ? []
      : [
          heading('How long'),
          el(
            'p',
            { class: 'stats__length' },
            `The games last ${meanMoves} moves on average, ` +
              `and ${percentage(short)} of them are over within twenty.`,
          ),
        ];

  const about = (shown: PanelSubject) =>
    el(
      'details',
      { class: 'stats__about' },
      el('summary', {}, 'What these numbers are'),
      el(
        'p',
        {},
        `One month of rated games on lichess: the ${counted(shown)}. The strengths are ` +
          'lichess’s ratings, not FIDE’s, and four games in five are bullet and blitz. A game ' +
          'counts for every position it passes through, however it got there, so a game of a ' +
          'variation is also a game of its opening. Games with a bot, by correspondence or ' +
          'abandoned before they began are left out. A score is given only where at least ' +
          `${ENOUGH_GAMES.toLocaleString('en')} games carry it.`,
      ),
    );

  /** Asks for the rest of the numbers of the opening on show, and draws again when they come. */
  const fetchDetail = () => {
    const asked = subject;
    if (!asked?.detail || detail !== undefined) return;
    detail = 'fetching';
    asked
      .detail()
      .then(
        (came) => came,
        () => 'failed' as const,
      )
      .then((came) => {
        // The board may have moved on to another opening while this one's numbers were coming.
        if (asked !== subject) return;
        detail = came;
        draw();
      });
  };

  /** What is said of the rest of the numbers: the numbers, or how the fetching of them stands. */
  const rest = (shown: PanelSubject): HTMLElement[] => {
    if (!shown.detail) return [];
    if (detail === 'failed') {
      const retry = el('button', { type: 'button', class: 'stats__retry' }, 'Try again');
      retry.addEventListener('click', () => {
        detail = undefined;
        draw();
      });
      return [
        el(
          'p',
          { class: 'stats__notice', role: 'alert' },
          'The rest of the numbers could not be fetched.',
        ),
        retry,
      ];
    }
    if (detail === undefined || detail === 'fetching') {
      fetchDetail();
      return [
        el('p', { class: 'stats__notice', role: 'status' }, 'Fetching the rest of the numbers…'),
      ];
    }
    return [
      ...split('Who plays it', 'Rating', detail.bands),
      ...split('At what speed', 'Speed', detail.speeds),
      ...whatNext(shown, detail),
      ...howLong(detail),
    ];
  };

  const draw = () => {
    element.hidden = !subject;
    toggle.setAttribute('aria-expanded', String(open));
    body.hidden = !open;
    if (!subject || !open) return;

    body.replaceChildren(
      ...howOften(subject),
      ...(subject.numbers.games > 0 ? [...howItGoes(subject), ...rest(subject)] : []),
      about(subject),
    );
  };

  toggle.addEventListener('click', () => {
    open = !open;
    draw();
  });

  return {
    element,
    show(shown) {
      subject = shown;
      detail = undefined;
      // What is there is of the opening before: it is not to be seen again when the panel opens.
      body.replaceChildren();
      draw();
    },
  };
}
