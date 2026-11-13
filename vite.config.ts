import { playwright } from '@vitest/browser-playwright';
import { configDefaults, defineConfig } from 'vitest/config';

// Playwright owns `*.spec.ts` (tests/e2e). Vitest owns `*.test.ts`, in two projects:
//
// - `unit` runs in Node. A file opts into a simulated DOM with a
//   `// @vitest-environment happy-dom` docblock.
// - `browser` runs `*.browser.test.ts` in real Chromium, for what a simulated DOM cannot
//   answer: where things end up on screen once the stylesheet has had its say.
const BROWSER_TESTS = '**/*.browser.test.ts';

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['**/*.test.ts'],
          exclude: [...configDefaults.exclude, BROWSER_TESTS],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: [BROWSER_TESTS],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
            screenshotFailures: false,
          },
        },
      },
    ],
  },
});
