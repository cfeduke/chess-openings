import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests are `*.test.ts`; Playwright owns `*.spec.ts`. Tests run in Node unless a file
    // opts into a DOM with a `// @vitest-environment happy-dom` docblock.
    include: ['**/*.test.ts'],
  },
});
