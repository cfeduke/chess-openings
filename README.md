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
