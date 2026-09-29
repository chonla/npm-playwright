import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // expected-steps-reporter fails the run when a test's `expected-step` annotations don't match its real step titles.
  reporter: [['list'], ['./tests/expected-steps-reporter.ts']],
});
