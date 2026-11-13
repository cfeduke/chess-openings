# Working in this repository

The workflow in [README.md](README.md#development-workflow) is mandatory, not advisory:

- Every change starts from a GitHub issue on `origin` and lands through a pull request that
  closes it.
- Test-driven: commit the failing tests (`test: …`) before the code that satisfies them.
- Run the `/simplify` skill on the branch diff before opening each pull request.
- There is no hosted CI and none should be added. `npm run verify` is the pipeline; the
  `pre-push` hook enforces it.

Conventions:

- Imports use explicit `.ts` extensions (scripts run directly under Node's type stripping).
- Unit tests live next to the code as `*.test.ts`. A simulated DOM (happy-dom) cannot tell you where
  something ends up on screen, so anything that depends on the stylesheet — placement, transitions,
  what is visible — is tested in `*.browser.test.ts`, which Vitest runs in real Chromium.
- Integration tests live in `tests/e2e/` and run against the production build.
