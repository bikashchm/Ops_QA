import { defineConfig } from '@playwright/test';
import path from 'path';
import { ConfigManager } from './config/ConfigManager';
import {
  PROJECT_ROOT,
  buildProjects,
  buildReporters,
  getExpectTimeout,
  getTestTimeout,
  isHeadless,
  resolveFullyParallel,
  resolveRetries,
  resolveScreenshot,
  resolveTrace,
  resolveVideo,
  resolveWorkers,
} from './config/playwright.settings';

/**
 * Enterprise Playwright configuration — production & CI/CD optimized.
 *
 * Environment variables:
 *   TEST_ENV          qa | uat | stage | prod   (via ConfigManager)
 *   HEADED=true       force visible browser
 *   HEADLESS=true     force headless locally
 *   PLAYWRIGHT_WORKERS / RUN_WORKERS          parallel worker count
 *   RUN_MODE=sequential                       workers=1, no parallel tests
 *   PLAYWRIGHT_RETRIES / SUITE_RETRIES        retry failed tests
 *   TRACE=on|retain-on-failure|on-first-retry
 *   VIDEO=on|retain-on-failure
 *   SCREENSHOT=only-on-failure|on|off
 *   BROWSER=chromium|firefox|webkit           filter projects
 *   TEST_TIMEOUT_MS / EXPECT_TIMEOUT_MS
 */
export default defineConfig({
  testDir: path.join(PROJECT_ROOT, 'tests'),
  testMatch: [
    '**/*@(spec|test).?(c|m)[jt]s?(x)',
  ],
  testIgnore: [
    '**/createwellandpad.ts',
    '**/example.spec.ts',
    '**/examples/**',
  ],

  /* ── Execution ─────────────────────────────────────────────── */
  fullyParallel: resolveFullyParallel(),
  forbidOnly: !!process.env.CI,
  retries: resolveRetries(),
  workers: resolveWorkers(),
  timeout: getTestTimeout(),
  expect: {
    timeout: getExpectTimeout(),
  },

  /* ── Lifecycle hooks ───────────────────────────────────────── */
  globalSetup: path.join(PROJECT_ROOT, 'global-setup/global-setup.ts'),
  globalTeardown: path.join(PROJECT_ROOT, 'global-teardown/global-teardown.ts'),

  /* ── Reporting ───────────────────────────────────────────────── */
  reporter: buildReporters(),
  outputDir: path.join(PROJECT_ROOT, 'test-results'),

  /* ── Shared browser context defaults ───────────────────────── */
  use: {
    baseURL: ConfigManager.getBaseUrl(),
    headless: isHeadless(),
    viewport: { width: 1920, height: 1080 },
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    ignoreHTTPSErrors: true,
    screenshot: resolveScreenshot(),
    video: resolveVideo(),
    trace: resolveTrace(),
    launchOptions: {
      slowMo: process.env.SLOW_MO ? Number(process.env.SLOW_MO) : 0,
    },
  },

  /* ── Multi-browser projects ──────────────────────────────────── */
  projects: buildProjects(),

  metadata: {
    environment: ConfigManager.getEnvironmentName(),
    baseUrl: ConfigManager.getBaseUrl(),
    headless: isHeadless(),
    workers: resolveWorkers() ?? 'auto',
    retries: resolveRetries(),
    ci: !!process.env.CI,
  },
});
