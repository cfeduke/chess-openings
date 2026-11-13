# Chess Openings

An interactive website for learning chess openings by watching them.

Pick an opening from a catalog organised by the
[Encyclopaedia of Chess Openings](https://en.wikipedia.org/wiki/Encyclopaedia_of_Chess_Openings)
(ECO) and the board plays it through move by move.

Opening data comes from
[lichess-org/chess-openings](https://github.com/lichess-org/chess-openings) (CC0).

## Running it

Requires Node.js 22.18 or newer.

```sh
npm install
npm run dev      # development server with hot reload
npm start        # production build, served locally
```

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
| Unit tests        | `npm test`          | Vitest (`*.test.ts`; DOM tests opt into happy-dom)               |
| Integration tests | `npm run test:e2e`  | Playwright builds the site, then drives Chromium against `dist/` |

`npm install` points git at `.githooks/`, whose `pre-push` hook runs `npm run verify` on a clean
working tree, so only commits that pass the full pipeline reach the remote.

The first run of the integration tests needs a browser: `npx playwright install chromium`.

## Opening data

The openings are the five TSV files from
[lichess-org/chess-openings](https://github.com/lichess-org/chess-openings), vendored under
`data/lichess/` and pinned to the upstream commit recorded in `data/lichess/SOURCE.json`. The data
is in the public domain (CC0).

`npm run data` (run automatically before `dev` and `build`) replays every line with
[chess.js](https://github.com/jhlywa/chess.js) and writes `public/openings.json`. Each opening gets
its ECO code, its name, its moves in both SAN and UCI (so the browser can animate a line without a
rules engine), and a unique id. Upstream repeats a name once per transposition: the shortest line
keeps the plain slug of the name and the others add a fingerprint of their own moves, so ids — and
links to them — survive data updates. The build fails if a row is malformed or a move is illegal.

To pick up new upstream data: `npm run data:update` (optionally with a branch, tag or commit),
then `npm run verify`.
