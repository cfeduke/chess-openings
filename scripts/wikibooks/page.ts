/**
 * Reading a page of the Wikibook: which line it is the page of, and what it calls its position.
 * The book is written by many hands over many years, so neither is always there to be read.
 */
import { moveNumber } from '../../src/chess/san.ts';
import { BOOK } from '../../src/wikibooks/book.ts';

/** A step of a title: `1. e4` for White's move, `1...e5` for Black's. */
const STEP = /^(\d+)(\.\.\.|\.)\s*(\S+)$/;

/**
 * The moves of the line a page is about, as its title writes them — or null if the title is not
 * a line: `Chess Opening Theory/1. e4/1...e5` is, `Chess Opening Theory/Local manual of style`
 * is not. Says nothing about whether the moves are legal.
 */
export function movesOfTitle(title: string): string[] | null {
  const prefix = `${BOOK}/`;
  if (!title.startsWith(prefix)) return null;

  const moves: string[] = [];
  for (const [ply, step] of title.slice(prefix.length).split('/').entries()) {
    const [, number, dots, move] = STEP.exec(step) ?? [];
    const inTurn = Number(number) === moveNumber(ply) && (dots === '...') === (ply % 2 === 1);
    if (!move || !inTurn) return null;
    moves.push(move);
  }
  return moves;
}

/** The template that heads a page, with the position's name and its place in the book. */
const POSITION_TEMPLATE = /\{\{\s*Chess Opening\s+Theory\/Position\s*(?=\||\}\})/i;

/** The parameters of the template that starts at `start`, split at the pipes that are its own. */
function parametersFrom(wikitext: string, start: number): string[] {
  // What comes before the first pipe is the template's own name.
  const parts = [''];
  let depth = 0;
  for (const [token] of wikitext.slice(start).matchAll(/\{\{|\[\[|\}\}|\]\]|./gs)) {
    if (token === '{{' || token === '[[') depth++;
    if (token === '}}' || token === ']]') depth--;
    if (depth === 0) break;

    if (token === '|' && depth === 1) parts.push('');
    else parts[parts.length - 1] += token;
  }
  return parts.slice(1);
}

const tidy = (text: string) => text.replace(/\s+/g, ' ').trim();

/** Wiki markup, which a plain name has none of. */
const MARKUP = /[[\]{}<>|=]|''/;

/** The name the template gives: its `name`, or else its first unnamed parameter. */
function nameInTemplate(wikitext: string): string {
  const template = POSITION_TEMPLATE.exec(wikitext);
  if (!template) return '';

  const named = new Map<string, string>();
  const unnamed: string[] = [];
  for (const parameter of parametersFrom(wikitext, template.index)) {
    const equals = parameter.indexOf('=');
    if (equals === -1) unnamed.push(parameter);
    else named.set(parameter.slice(0, equals).trim(), parameter.slice(equals + 1));
  }

  const name = tidy(named.get('name') ?? unnamed[0] ?? '');
  // Some pages put the move there instead.
  return MARKUP.test(name) || /^\d/.test(name) ? '' : name;
}

/** The first heading of a page: `== 3. Bb5 · Ruy López ==`. */
const HEADING = /^(=+)(.*?)\1\s*$/m;

/** What comes between a move and a name in a heading. */
const MOVE_THEN_NAME = /^(.*?)\s*(?:[·—–]|\s-\s)\s*(.*)$/;

/** Headings that are about the page rather than the position. */
const NOT_NAMES = new Set(['theory table', 'notes', 'references', 'see also', 'external links']);

/**
 * The name in the first heading: all of it, or what follows the move it starts with. A heading
 * with a move anywhere else in it, or a verdict on one, is taken to be a remark and not a name.
 */
function nameInHeading(wikitext: string): string {
  const [, , heading = ''] = HEADING.exec(wikitext) ?? [];
  const [, before = '', after = ''] = MOVE_THEN_NAME.exec(heading) ?? [];
  const name = tidy(/\d/.test(before) ? after : heading);
  return MARKUP.test(name) || /[\d?!]/.test(name) || NOT_NAMES.has(name.toLowerCase()) ? '' : name;
}

/**
 * What a page calls its position — the opening it belongs to — or the empty string if it does
 * not say. The template that heads most pages is believed before a heading is.
 */
export function nameOfPage(wikitext: string): string {
  return nameInTemplate(wikitext) || nameInHeading(wikitext);
}
