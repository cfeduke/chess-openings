# Chess Openings

An interactive website for learning chess openings by watching them.

Pick an opening from a catalog organised the way the
[Encyclopaedia of Chess Openings](https://en.wikipedia.org/wiki/Encyclopaedia_of_Chess_Openings)
(ECO) organises them, and the board plays it through. Each move is shown in three beats: the
piece that is about to move is **highlighted**, an **arrow** is drawn to where it is going, and
then it **moves** — while a cursor follows along in the list of moves beside the board.

All 3,865 named lines of [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings)
are there, and so are the 2,600-odd positions that Wikibooks'
[Chess Opening Theory](https://en.wikibooks.org/wiki/Chess_Opening_Theory) has a page for.

## Using it

- **Browse** — the catalog holds two collections, chosen at its top. **ECO** has the five volumes
  of the encyclopaedia as tabs (A Flank, B Semi-Open, C Open and French, D Closed and Semi-Closed,
  E Indian). Each volume is divided into groups of codes, such as
  `B90–B99 Sicilian Defense: Najdorf`, shown with the moves that define them. Open a group to see
  its opening families and their lines. **Wikibooks** is laid out as the book is, by moves: a tab
  for 1. e4, one for 1. d4 and one for every other first move, each divided into the parts of the
  book that follow from one position, such as `Ruy López / Spanish game — 1. e4 e5 2. Nf3 Nc6
  3. Bb5`.
- **Search** — by name (`grunfeld exchange`; accents and case do not matter), by ECO code (`C89`),
  or by moves (`1. e4 c5 2. Nf3 d6`, or just `e4 c5 nf3 d6`). Terms combine: `e4 c5 naj`. A
  search looks in the collection on show; while there is one, each collection's tab says how
  many of its lines match, and choosing the other shows those.
- **Watch** — choosing a line plays it. The bar along the bottom has restart, step back,
  play/pause, step forward and jump to end; a slider for the **delay between moves** (0.3–5 s,
  1.5 s to begin with); and buttons to flip the board and switch the sound off.
- **Step through a family** — the arrows beside an opening's name go to the previous and next
  line of its family.
- **Read on** — a line of the Wikibook links to its page there, which is where the theory is.
- **Share** — the address names the opening on the board, so links, bookmarks and the back button
  all work.

| Key     | Does                          |
| ------- | ----------------------------- |
| `Space` | Play / pause                  |
| `←` `→` | Step back / forward one move  |
| `Home`  | Back to the start of the line |
| `End`   | Jump to the end of the line   |

The delay and the sound setting are remembered between visits. The site follows the system's light
or dark colour scheme and its reduced-motion setting, works on a phone, and announces each move to
screen readers.

## Running it

Requires Node.js 22.18 or newer.

```sh
npm install
npm run dev      # development server with hot reload
npm start        # production build, served locally
```

`npm run build` leaves a static site in `dist/` that any web server can host. There is no backend:
the opening data is prepared at build time and fetched by the page as one JSON file.

## How it is put together

TypeScript, built with Vite, with no UI framework and no runtime dependencies.

| Where            | What                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| `data/`          | The vendored opening data, a directory to a source: `lichess/` and `wikibooks/`                |
| `scripts/`       | Build-time: parse the data, replay every line with chess.js, write `public/openings.json`      |
| `src/eco/`       | The ECO taxonomy: five volumes, 86 hand-curated groups of codes with their defining moves      |
| `src/wikibooks/` | How the Wikibook's lines are laid out: by first move, then by the tree of the book's pages     |
| `src/catalog/`   | Collection → section → group → family → line tree, search, the openings offered to a newcomer  |
| `src/chess/`     | A small board model: enough to play a known-legal line and say what each move did              |
| `src/board/`     | The board on screen: pieces, highlight, arrow, slides — and its piece sets and board themes    |
| `src/playback/`  | The player: the schedule of a move's three beats and the play/pause/step/seek state            |
| `src/audio/`     | Sound effects, synthesised with the Web Audio API — there are no audio files                   |
| `src/ui/`        | Catalog, opening header, move list, transport bar, keyboard shortcuts, screen-reader announcer |
| `src/app.ts`     | Wires it all together; the address (`#/<opening id>`) is the source of truth for what is shown |
| `tests/e2e/`     | Playwright specs that drive the built site                                                     |

## Development workflow

Work is tracked in [GitHub Issues](https://github.com/cfeduke/chess-openings/issues).
Every change follows the same loop:

1. **Ticket** — pick or file an issue.
2. **Red** — on a branch named `<issue>-<slug>`, write the tests that describe the behaviour and
   watch them fail. Commit them (`test: …`).
3. **Green** — write the code that makes them pass. Commit it (`feat: …` / `fix: …`).
4. **Simplify** — run the `/simplify` skill over the branch diff and commit the cleanups
   (`refactor: …`).
5. **Verify** — `npm run verify` must pass.
6. **Pull request** — open a PR whose description says `Closes #<issue>` and merge it.

### Verification is local

There is no hosted CI (no GitHub Actions). `npm run verify` is the whole pipeline:

| Step              | Command             | What it checks                                                   |
| ----------------- | ------------------- | ---------------------------------------------------------------- |
| Lint + format     | `npm run lint`      | Biome                                                            |
| Types             | `npm run typecheck` | `tsc`, strict                                                    |
| Unit tests        | `npm test`          | Vitest, in two projects (below)                                  |
| Integration tests | `npm run test:e2e`  | Playwright builds the site, then drives Chromium against `dist/` |

`npm install` points git at `.githooks/`, whose `pre-push` hook runs `npm run verify` on a clean
working tree, so only commits that pass the full pipeline reach the remote.

The browser tests need Chromium once: `npx playwright install chromium`.

### Three tiers of tests

- **`*.test.ts`** run in Node; a file opts into a simulated DOM (happy-dom) with a docblock. Fast,
  and right for logic. The whole real dataset is exercised here: every line is replayed and checked
  against chess.js, and the hand-written ECO table is checked against the lines lichess files under
  each range.
- **`*.browser.test.ts`** run in real Chromium (Vitest browser mode). A simulated DOM cannot see a
  stylesheet, so anything about where things end up on screen is specified here — as are the sound
  effects, which are rendered by the browser's audio engine and measured.
- **`tests/e2e/*.spec.ts`** drive the production build with Playwright: whole journeys, layouts at
  phone, tablet and desktop sizes, and automated accessibility checks (axe).

## Appearances

The dropdown at the right-hand end of the control bar chooses the board's **appearance**: a piece
set paired with a board theme. The stylesheet names no artwork and no colour; the board view hands
it whichever appearance is in use, and the choice is remembered between visits.

### Installing a theme pack

A theme pack is a zip named after its two colours, holding pieces and a board made for each
other. `walnut_gold.zip` is "Walnut & Gold", and its id here is `walnut-gold`.

| In the zip                 | What it is                                                 |
| -------------------------- | ---------------------------------------------------------- |
| `src/board/pieces/`        | The twelve pieces, `wk.svg` … `bp.svg`, and a `LICENSE.md` |
| `board.css`                | The board's five colours, as `--board-*` variables         |
| `README.md`, `preview.png` | The pack's notes and a picture of it; neither is used      |

**Do not follow the install steps in the pack's own README.** They date from when the site had
one look: they overwrite the pieces in `src/board/pieces/` and merge the pack's colours into
`src/board/board.css`, which no longer holds any.

1. **Say what the dropdown will offer.** A pack is a change like any other, so it starts with an
   issue, a branch and a failing test ([Development workflow](#development-workflow)): add the
   pack's name to the options expected in
   [`tests/e2e/player-ui.spec.ts`](tests/e2e/player-ui.spec.ts), and commit that.

2. **Put the pieces and their licence in a directory of their own**, named by the id:

   ```sh
   unzip -j walnut_gold.zip 'src/board/pieces/*' -d src/board/pieces/walnut-gold
   ```

3. **Declare it** by adding an entry to `APPEARANCES` in
   [`src/board/appearance.ts`](src/board/appearance.ts), with the five values that
   `unzip -p walnut_gold.zip board.css` prints:

   ```ts
   pack('walnut-gold', 'Walnut & Gold', {
     light: '#f1e0be', // --board-light
     dark: '#956a4a', // --board-dark
     'last-move': 'rgb(204 167 78 / 0.49)', // --board-last-move
     highlight: 'rgb(255 211 93 / 0.72)', // --board-highlight
     arrow: 'rgb(32 116 115 / 0.92)', // --board-arrow
   }),
   ```

   The dropdown lists the appearances in the order they are declared, after Classic, which stays
   first as the default.

4. **Check it.** `npm run format` tidies the licence file. `npm run verify` fails if a piece or
   the licence is missing, if a directory of pieces is not used by any appearance, if the id or
   the name is already taken, or if the dropdown does not offer what step 1 said it would. Then
   `npm run dev`, choose it from the dropdown, and look.

### Artwork from elsewhere

A piece set that did not come as a pack goes in a directory of its own just the same, holding

- twelve SVGs named by colour then piece — `wk wq wr wb wn wp` and `bk bq br bb bn bp` (`n` is the
  knight) — each on a square canvas with a `viewBox`, since an image is stretched to fill its
  square; and
- a `LICENSE.md` saying where the artwork comes from and under what terms it is used.

`pack()` is a shorthand for pieces and a board that share a name and whose artwork is in the
public domain. Pieces and boards are separate things, though, and an appearance can pair any two:
a piece set is `pieceSet(id, credit)` ([`src/board/piece-sets.ts`](src/board/piece-sets.ts)),
where the credit finishes the sentence "Chess pieces …" under the catalog; a board theme is an id
and five colours ([`src/board/board-themes.ts`](src/board/board-themes.ts)). The Classic
appearance is declared that way.

## Opening data

The openings come from two sources, each vendored in a directory of `data/`.
`npm run data` (run automatically before `dev` and `build`) replays every line of both with
[chess.js](https://github.com/jhlywa/chess.js) and writes `public/openings.json`. Each opening gets
its ECO code, its name, its moves in both SAN and UCI (so the browser can animate a line without a
rules engine), and a unique id. The build fails if a row is malformed or a move is illegal.

### The encyclopaedia, from lichess

The five TSV files of
[lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) are under
`data/lichess/`, pinned to the upstream commit recorded in `data/lichess/SOURCE.json`.

Upstream repeats a name once per transposition: the shortest line keeps the plain slug of the name
as its id and the others add a fingerprint of their own moves, so ids — and links to them — survive
data updates.

To pick up new upstream data: `npm run data:update` (optionally with a branch, tag or commit),
then `npm run verify`.

### Chess Opening Theory, from Wikibooks

[Chess Opening Theory](https://en.wikibooks.org/wiki/Chess_Opening_Theory) has a page for each
position it discusses, titled by the moves that reach it — `Chess Opening Theory/1. e4/1...e5` —
and most pages say which opening the position belongs to. `data/wikibooks/pages.tsv` has a row for
each: the page's id on the wiki, the revision that was read, that name, and the moves.
`data/wikibooks/SOURCE.json` records the day the book was read, and
[`data/wikibooks/LICENSE.md`](data/wikibooks/LICENSE.md) the terms the data is under. None of the
book's prose is vendored; a line links to its page instead.

To read the book again: `npm run data:update:wikibooks`, then `npm run verify`. It asks the
MediaWiki API for every page, some fifty at a time and no faster than one request a second, and
takes a few minutes. It lists the pages it leaves out: the book's indexes and manuals, which are
not lines, and any page whose title is not a legal game. Being a wiki, the book changes under
you: read the diff of `pages.tsv` before committing it.

What the build makes of a row:

- **Its id** is `wikibooks-<page id>`. A page keeps its id when it is renamed, so links survive.
- **Its name** is the page's own or, if the page gives none, that of the nearest page above it in
  the book that does: a page says which opening its position belongs to, so many lines share a
  name and are told apart by their moves.
- **Its ECO code** is not the book's: it is the code of the last position on the line that lichess
  has a name for, however the line reached it — which is how a game is given its opening.

### Collections

`openings.json` is a list of **collections**: bodies of openings from one source each, laid out
each in its own way. There are two: the encyclopaedia, `eco`, which is the lichess lines filed
under the five ECO volumes, and `wikibooks`, which is the Wikibook's lines filed by their moves.

A collection is declared in two places, under one id:

- **The build** has a loader for it, listed in
  [`scripts/openings/dataset.ts`](scripts/openings/dataset.ts), that gives it its openings and
  its source: what the source is called, where it is, which revision was used and the SPDX
  identifier of its licence. The credits under the catalog are written from that. The
  encyclopaedia's loader is [`scripts/openings/lichess.ts`](scripts/openings/lichess.ts) and the
  Wikibook's is [`scripts/openings/wikibooks.ts`](scripts/openings/wikibooks.ts).
- **The site** ([`src/catalog/arrangements.ts`](src/catalog/arrangements.ts)) gives it an
  _arrangement_: what its tab says, what its sections are called, and a function that files
  every opening under section → group → family → line. The encyclopaedia's sections are the
  volumes and its groups are runs of ECO codes. The Wikibook's
  ([`src/wikibooks/arrangement.ts`](src/wikibooks/arrangement.ts)) has no codes: its sections are
  first moves and its groups are pieces of the book's tree of pages — a page and what follows
  from it, cut wherever a piece would hold more than 120 lines. An arrangement can also say where
  a line can be read about, which puts a link above the board.

The catalog lists the collections in the order the dataset has them and opens on the first. As
soon as there is more than one, a row of tabs above the section tabs chooses between them.

Each collection is searched on its own, because what makes one line more general than another
depends on how the collection names its lines, and the arrangement says which way it is
(`namesNest`). A lichess name grows with the line — `Family: Variation, Subvariation` — so the
shortest name comes first. The book gives one name to every position of an opening, so there
the shortest line comes first, and matches that share a name have the moves that tell them
apart added to it.

## Credits

- **Opening names and lines** — [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings),
  released into the public domain (CC0).
- **The Wikibooks collection** — names and lines from
  [Chess Opening Theory](https://en.wikibooks.org/wiki/Chess_Opening_Theory) by Wikibooks
  contributors, used under the
  [Creative Commons Attribution-ShareAlike 4.0 License](https://creativecommons.org/licenses/by-sa/4.0/).
  What was taken and what was changed is set out in
  [`data/wikibooks/LICENSE.md`](data/wikibooks/LICENSE.md); the data derived from the book,
  `data/wikibooks/pages.tsv`, is offered under the same licence.
- **Chess pieces** — drawn by Colin M.L. Burnett, from Wikimedia Commons, used under the BSD
  3-Clause License; see [`src/board/pieces/cburnett/LICENSE.md`](src/board/pieces/cburnett/LICENSE.md).
  This is the Classic appearance.
- **The pieces of every other appearance** — original artwork supplied as
  [theme packs](#installing-a-theme-pack), each with its board colours, and dedicated to the
  public domain (CC0 1.0); see the `LICENSE.md` beside each set in `src/board/pieces/`.
