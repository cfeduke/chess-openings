# Chess Openings

An interactive website for learning chess openings by watching them.

Pick an opening from a catalog organised the way the
[Encyclopaedia of Chess Openings](https://en.wikipedia.org/wiki/Encyclopaedia_of_Chess_Openings)
(ECO) organises them, and the board plays it through. Each move is shown in three beats: the
piece that is about to move is **highlighted**, an **arrow** is drawn to where it is going, and
then it **moves** — while a cursor follows along in the list of moves beside the board.

All 3,865 named lines of [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings)
are there.

## Using it

- **Browse** — the catalog has the five ECO volumes as tabs (A Flank, B Semi-Open, C Open and
  French, D Closed and Semi-Closed, E Indian). Each volume is divided into groups of codes, such as
  `B90–B99 Sicilian Defense: Najdorf`, shown with the moves that define them. Open a group to see
  its opening families and their lines.
- **Search** — by name (`grunfeld exchange`; accents and case do not matter), by ECO code (`C89`),
  or by moves (`1. e4 c5 2. Nf3 d6`, or just `e4 c5 nf3 d6`). Terms combine: `e4 c5 naj`.
- **Watch** — choosing a line plays it. The bar along the bottom has restart, step back,
  play/pause, step forward and jump to end; a slider for the **delay between moves** (0.3–5 s,
  1.5 s to begin with); and buttons to flip the board and switch the sound off.
- **Step through a family** — the arrows beside an opening's name go to the previous and next
  line of its family.
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

| Where           | What                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `data/lichess/` | The upstream TSV files, pinned to a commit                                                     |
| `scripts/`      | Build-time: parse the TSVs, replay every line with chess.js, write `public/openings.json`      |
| `src/eco/`      | The ECO taxonomy: five volumes, 86 hand-curated groups of codes with their defining moves      |
| `src/catalog/`  | Volume → group → family → line tree, search, and the openings offered to a first-time visitor  |
| `src/chess/`    | A small board model: enough to play a known-legal line and say what each move did              |
| `src/board/`    | The board on screen: pieces, highlight, arrow, slides — and its piece sets and board themes    |
| `src/playback/` | The player: the schedule of a move's three beats and the play/pause/step/seek state            |
| `src/audio/`    | Sound effects, synthesised with the Web Audio API — there are no audio files                   |
| `src/ui/`       | Catalog, opening header, move list, transport bar, keyboard shortcuts, screen-reader announcer |
| `src/app.ts`    | Wires it all together; the address (`#/<opening id>`) is the source of truth for what is shown |
| `tests/e2e/`    | Playwright specs that drive the built site                                                     |

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

**To add a theme pack** — pieces and a board made for each other — make a directory
`src/board/pieces/<id>/` holding

- twelve SVGs named by colour then piece — `wk wq wr wb wn wp` and `bk bq br bb bn bp` (`n` is the
  knight) — each on a square canvas with a `viewBox`, since an image is stretched to fill its
  square; and
- a `LICENSE.md` saying where the artwork comes from and under what terms it is used,

then add one `pack(id, name, colours)` entry to
[`src/board/appearance.ts`](src/board/appearance.ts). The five colours are the light and dark
squares, the translucent tints for the last move and for the piece about to move, and the arrow.
The dropdown lists the appearances in the order they are declared, the default first. The pieces
are found by their naming; the tests fail for a set with a piece or its licence missing, and for
a directory no appearance uses.

Pieces and boards are separate things, though, and an appearance can pair any two: a piece set is
`pieceSet(id, credit)` ([`src/board/piece-sets.ts`](src/board/piece-sets.ts)), a board theme is
an id and five colours ([`src/board/board-themes.ts`](src/board/board-themes.ts)), and the
Classic appearance is declared that way.

## Opening data

The openings are the five TSV files from
[lichess-org/chess-openings](https://github.com/lichess-org/chess-openings), vendored under
`data/lichess/` and pinned to the upstream commit recorded in `data/lichess/SOURCE.json`.

`npm run data` (run automatically before `dev` and `build`) replays every line with
[chess.js](https://github.com/jhlywa/chess.js) and writes `public/openings.json`. Each opening gets
its ECO code, its name, its moves in both SAN and UCI (so the browser can animate a line without a
rules engine), and a unique id. Upstream repeats a name once per transposition: the shortest line
keeps the plain slug of the name and the others add a fingerprint of their own moves, so ids — and
links to them — survive data updates. The build fails if a row is malformed or a move is illegal.

To pick up new upstream data: `npm run data:update` (optionally with a branch, tag or commit),
then `npm run verify`.

## Credits

- **Opening names and lines** — [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings),
  released into the public domain (CC0).
- **Chess pieces** — drawn by Colin M.L. Burnett, from Wikimedia Commons, used under the BSD
  3-Clause License; see [`src/board/pieces/cburnett/LICENSE.md`](src/board/pieces/cburnett/LICENSE.md).
  This is the Classic appearance.
- **The Walnut & Gold, Midnight & Cyan, Sage & Sand and Slate & Ivory pieces** — original artwork
  supplied as theme packs, each with its board colours, and dedicated to the public domain (CC0
  1.0); see the `LICENSE.md` in `src/board/pieces/walnut-gold/`, `midnight-cyan/`, `sage-sand/`
  and `slate-ivory/`.
