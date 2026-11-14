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

- **Start with what is played** — the catalog opens at **Top**: the twenty opening families
  played most on lichess, in order, each with its moves, the share of games that reach it and
  White's score. The list can be ranked again for the players of one rating band, which changes
  it a good deal: under 1200 the Scandinavian and the Italian lead, at 2400 and over 1. Nf3 and
  the Sicilian. The first eight are also offered above the board while nothing is chosen.
- **Browse** — the catalog holds two collections, chosen at its top. **ECO** has the five volumes
  of the encyclopaedia as tabs (A Flank, B Semi-Open, C Open and French, D Closed and Semi-Closed,
  E Indian), after the tab of the most played. Each volume is divided into groups of codes, such as
  `B90–B99 Sicilian Defense: Najdorf`, shown with the moves that define them. Open a group to see
  its opening families and their lines. **Wikibooks** is laid out as the book is, by moves: a tab
  for 1. e4, one for 1. d4 and one for every other first move, each divided into the parts of the
  book that follow from one position, such as `Ruy López / Spanish game — 1. e4 e5 2. Nf3 Nc6
  3. Bb5`.
- **Search** — by name (`grunfeld exchange`; accents and case do not matter), by ECO code (`C89`),
  or by moves (`1. e4 c5 2. Nf3 d6`, or just `e4 c5 nf3 d6`). Terms combine: `e4 c5 naj`. A
  search looks in the collection on show; while there is one, each collection's tab says how
  many of its lines match, and choosing the other shows those.
- **See what is played** — every line, browsed or found, has a small meter of how often it is
  reached in a month of games on lichess. Its five bars are factors of ten: one for 1 game in
  100,000, all five for 1 game in 10. Rest the pointer on it for the figure (`9.2% of games`,
  `1 game in 50,000`); a screen reader hears it as part of the line's name.
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

| Where             | What                                                                                           |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `data/`           | The vendored data, a directory to a source: `lichess/`, `wikibooks/` and `lichess-games/`      |
| `scripts/`        | Build-time: parse the data, replay every line with chess.js, write what the site is sent       |
| `scripts/games/`  | Counting a month of lichess's games for the catalog's positions, on every core                 |
| `src/eco/`        | The ECO taxonomy: five volumes, 86 hand-curated groups of codes with their defining moves      |
| `src/wikibooks/`  | How the Wikibook's lines are laid out: by first move, then by the tree of the book's pages     |
| `src/catalog/`    | Collection → section → group → family → line tree, and search                                  |
| `src/statistics/` | What the games say of an opening, and how often it is played on a scale of factors of ten      |
| `src/chess/`      | A small board model: enough to play a known-legal line and say what each move did              |
| `src/board/`      | The board on screen: pieces, highlight, arrow, slides — and its piece sets and board themes    |
| `src/playback/`   | The player: the schedule of a move's three beats and the play/pause/step/seek state            |
| `src/audio/`      | Sound effects, synthesised with the Web Audio API — there are no audio files                   |
| `src/ui/`         | Catalog, opening header, move list, transport bar, keyboard shortcuts, screen-reader announcer |
| `src/app.ts`      | Wires it all together; the address (`#/<opening id>`) is the source of truth for what is shown |
| `tests/e2e/`      | Playwright specs that drive the built site                                                     |

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

The openings come from two sources, each vendored in a directory of `data/`; a third directory
holds what lichess's games say of how they are played.
`npm run data` (run automatically before `dev` and `build`) replays every line of both with
[chess.js](https://github.com/jhlywa/chess.js) and writes `public/openings.json`. Each opening gets
its ECO code, its name, its moves in both SAN and UCI (so the browser can animate a line without a
rules engine), and a unique id. The build fails if a row is malformed or a move is illegal.

It also writes `public/statistics.json`, from the tallies of lichess's games:
[what the site shows of them](#what-the-site-shows-of-them) says what is in it. Neither file is
committed, and neither build step touches the network.

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

### How the openings are played, from the lichess database

[The lichess database](https://database.lichess.org/) is every rated game played on lichess, a
month to a file, released under CC0: October 2026 is 95 million games. `data/lichess-games/`
holds what one month of them has to say about the positions the catalog's lines end in — how
often each is reached, how it scores, who plays it, and what is played next.
`data/lichess-games/SOURCE.json` records which month that is, how many games it held and how
many were counted.

**What a game counts for.** Every position that a line of either collection ends in is a
position of interest, and so is the one every game begins in. A game counts once for each of
them that it passes through, however it got there: by the position — the board, the side to
move, the castling rights — not by the moves, and not by the name lichess gives the game. So a
Najdorf game is also a Sicilian game; a game that reaches the Queen's Gambit by 1. Nf3 counts for
it; and a line of the Wikibook has numbers though lichess has no name for it. Games are read as
deep as the catalog's longest line goes, which `SOURCE.json` records as `depth`, in moves of
either side. (The `Opening` tag of a game
will not do instead: it names only the deepest named line the game reached, so the Sicilian's
games are spread over its variations, and its names are not always the ones vendored here.)

**How the games are kept apart.** By speed — bullet (with ultrabullet), blitz, rapid, classical —
and by strength, going by the mean of the two players' ratings: under 1200, 1200–1599,
1600–1999, 2000–2399, 2400 and over. The ratings are lichess's own, which are not FIDE's and run
higher.

**What is written.**

- `positions.tsv` — a row for each position of interest, in the order of the catalog, the
  starting position first: its `id`, which is its place in the file; the `position`, as the first
  three fields of its FEN; and the ten `moves` most played from it with the number of games each
  was played in, whatever their speed and strength. A position no game reached is listed with no
  moves.
- `tallies.tsv` — a row for each position, speed and band in which there were games: how many
  White won (`white`), how many were drawn (`draws`) and how many Black won (`black`); what the
  two ratings said White would score, added up over the games (`expected`), which is what an
  opening's actual score is to be held against; how long the games were, added up, in moves of
  either side (`plies`); and how many were over within twenty moves (`short`). The rows for the
  starting position are the totals: every game that is counted counts for it.

**What is left out**, and counted as left out in `SOURCE.json`: correspondence games; games
without a result; games in which a player has no rating; games abandoned before they began, or
in which no move was made; games with a bot; and games that cannot be read, for a move no piece
can make or a speed there is no telling.

**To count another month:** `npm run data:update:games` for the newest there is, or
`npm run data:update:games 2026-10` for one in particular, then `npm run verify`. The month is
read as it arrives — 31 GB that become some 220 GB of PGN, none of which is kept — sixteen
megabytes at a time and four of those at once, and a part that fails or stalls is asked for
again. How long it takes is how long the download takes: on a 16-core laptop the counting keeps
up with anything the database sends. October 2026 came at 7 MB/s the one time it was read to the
end this way, which took an hour and a quarter; it has since come at close to 20, which would
take half an hour. A file that has been downloaded already can be given in place of the month,
under the name lichess gave it (`lichess_db_standard_rated_2026-10.pgn.zst`), and is counted in
ten minutes.

The tallies are for the positions the catalog had when they were counted. After new lines are
vendored, or a collection is added, the new positions have no numbers until a month is counted
again.

How it is done quickly enough: lichess compresses its files with pzstd, which starts a new zstd
frame for every 32 MB of PGN, so [`scripts/games/frames.ts`](scripts/games/frames.ts) cuts the file into
frames as it arrives and [`scripts/games/pool.ts`](scripts/games/pool.ts) hands them to a thread
for each core to decompress and count. And the games are played through without a rules engine:
they are known to be legal, so [`scripts/games/play.ts`](scripts/games/play.ts) finds the piece
a move names by looking back from the square it goes to, which in a trial was some forty times
quicker than replaying with chess.js. It is tested against chess.js, move for move.

#### What the site shows of them

`npm run data` writes `public/statistics.json` (135 KB, 60 KB compressed) with what it takes to
say how much each line is played and how it scores:

- for each position, over every speed and strength together, White's wins, the draws, Black's
  wins and what the ratings said White would score — the starting position first, whose numbers
  are the totals;
- for each collection, which position each of its openings ends in, in the order of
  `openings.json`. Lines that end in the same position share its numbers. A line that was not
  in the catalog when the month was counted has no position, and so no numbers: that is not the
  same as no game having reached it;
- which month was counted and how many of its games, for the credit under the catalog;
- for [the list of the most played](#the-most-played), the encyclopaedia's families that are
  ranked, each as its main line with its wins, draws and losses in each rating band, and the
  totals of each band.

The split by speed and strength, the lengths of the games and the moves played next are five
times the size and stay behind.

The page asks for the file when it asks for the openings, and waits for it for nothing: the
catalog is drawn as soon as the openings are there, and the numbers are put on when they come.
If they do not come, or cannot be read, the site does without them and says nothing.
[`src/statistics/`](src/statistics/) turns the counts into what is said of an opening — the
games that reached it, that as a share of all games, White's score, the share drawn, and
White's score less what the ratings predicted — and, for the meter on each line of the catalog,
into a step for each factor of ten. The scale has to be of that kind: the lines run from 58% of
all games (1. e4) to none, the median line of the encyclopaedia is reached by one game in
50,000, and only 59 of its 3,865 by one in a hundred. Only the share is shown so far; White's
score over all games is 51.7% against the 50.0% the ratings predict, so a line's score means
something only against that, and a score over a few hundred games means nothing at all.

#### The most played

The page the catalog opens at ranks the opening families of the encyclopaedia by the share of
games that reach the family's **main line**: the line named for the family alone (`Sicilian
Defense`, not `Sicilian Defense: Najdorf Variation`), and the shortest of them where
transpositions repeat the name. 126 of the 141 families have one; the other fifteen (Colle
System, Torre Attack, King's Gambit Declined…) are not ranked. The Wikibook's lines are named
for the opening a page belongs to, which many lines share, so it has no such list.

**Ways in are left out.** Counted by position, the top of the raw ranking is not openings anyone
sets out to learn: 1. e4 ("King's Pawn Game", 58% of games), 1. d4 (26%), 1. e4 e5 2. Nf3
("King's Knight Opening", 13%). Nearly all of their games go on to be something else. So a
family is left out when more than half of the games that reach its main line go on to reach the
main line of another family. "Go on to" is counted as: the other families whose main line passes
through this one's position, and of those only the first on each road — the ones that do not
pass through another of them — so that a game is not counted again for every family it goes on
through. On October 2026 that leaves out eight: King's Pawn Game, Queen's Pawn Game, King's
Knight Opening, Queen's Gambit, Center Game, Three Knights Opening, Danish Gambit and Benko
Gambit. The rule is [`rankableFamilies`](scripts/games/most-played.ts), a function of the
catalog and the tallies with no list of names in it; it is applied when the data is built, to
all the games together, so that the families are the same whichever band they are ranked for.

**What the figures are.** A family's share is the share of games it is _reached in_. A game
that reaches one family's main line may reach another's, so the shares do not add up to
anything. Ranked for a rating band, a family's share is of that band's games, and White's score
is in that band's games. The ratings are lichess's, and four games in five are bullet and blitz.

Without `statistics.json` there is no such page and nothing is offered above the board: the
catalog opens at Volume A, as it did before there were numbers.

## Credits

- **Opening names and lines** — [lichess-org/chess-openings](https://github.com/lichess-org/chess-openings),
  released into the public domain (CC0).
- **How the openings are played** — counted from the
  [lichess.org open database](https://database.lichess.org/) of rated games, released into the
  public domain (CC0).
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
