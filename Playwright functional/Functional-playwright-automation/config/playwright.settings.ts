import os from 'os';
import path from 'path';
import type { PlaywrightTestConfig } from '@playwright/test';
import { devices } from '@playwright/test';
import { ConfigManager } from './ConfigManager';

export const PROJECT_ROOT = path.resolve(__dirname, '..');
export const REPORTS_DIR = path.join(PROJECT_ROOT, 'reports');
export const SCREENSHOTS_DIR = path.join(PROJECT_ROOT, 'screenshots');
export const VIDEOS_DIR = path.join(PROJECT_ROOT, 'videos');

const CPU_COUNT = os.cpus().length;

/** Headed when local dev; headless in CI unless HEADED=true */
export function isHeadless(): boolean {
  if (process.env.HEADED === 'true') return false;
  if (process.env.HEADLESS === 'true') return true;
  if (process.env.HEADLESS === 'false') return false;
  return !!process.env.CI;
}

/** CI: 2–4 workers (half CPUs, capped); local: Playwright auto (~50% cores) */
export function resolveWorkers(): number | undefined {
  const explicit = process.env.PLAYWRIGHT_WORKERS ?? process.env.RUN_WORKERS;
  if (explicit) {
    const parsed = Number(explicit);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }
  if (process.env.RUN_MODE === 'sequential') return 1;
  if (process.env.CI) {
    return Math.min(4, Math.max(2, Math.floor(CPU_COUNT / 2)));
  }
  return undefined;
}

/** CI: 2 retries; local: 0; override via PLAYWRIGHT_RETRIES or SUITE_RETRIES */
export function resolveRetries(): number {
  const explicit = process.env.PLAYWRIGHT_RETRIES ?? process.env.SUITE_RETRIES;
  if (explicit) {
    const parsed = Number(explicit);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return process.env.CI ? 2 : 0;
}

export function resolveFullyParallel(): boolean {
  if (process.env.RUN_MODE === 'sequential') return false;
  return process.env.FULLY_PARALLEL !== 'false';
}

export function resolveTrace(): 'on' | 'off' | 'retain-on-failure' | 'on-first-retry' | 'retry-with-trace' {
  const mode = process.env.TRACE?.toLowerCase();
  if (mode === 'on' || mode === 'off' || mode === 'retain-on-failure' || mode === 'on-first-retry') {
    return mode;
  }
  return process.env.CI ? 'on-first-retry' : 'retain-on-failure';
}

export function resolveVideo(): 'on' | 'off' | 'retain-on-failure' | 'on-first-retry' | 'retry-with-video' {
  const mode = process.env.VIDEO?.toLowerCase();
  if (mode === 'on' || mode === 'off' || mode === 'retain-on-failure' || mode === 'on-first-retry') {
    return mode;
  }
  return 'retain-on-failure';
}

export function resolveScreenshot(): 'on' | 'off' | 'only-on-failure' {
  const mode = process.env.SCREENSHOT?.toLowerCase();
  if (mode === 'on' || mode === 'off' || mode === 'only-on-failure') {
    return mode;
  }
  return 'only-on-failure';
}

export function buildReporters(): PlaywrightTestConfig['reporter'] {
  const enterpriseReporter = path.resolve(PROJECT_ROOT, 'reporters/EnterpriseReportReporter.ts');
  const customLogger = path.resolve(PROJECT_ROOT, 'logger/PlaywrightLogReporter.ts');
  const allureResultsDir = path.join(REPORTS_DIR, 'allure-results');

  const reporters: PlaywrightTestConfig['reporter'] = [
    ['list'],
    [customLogger],
    [enterpriseReporter],
    ['html', { outputFolder: path.join(PROJECT_ROOT, 'playwright-report'), open: 'never' }],
    ['junit', { outputFile: path.join(REPORTS_DIR, 'junit-results.xml') }],
    ['json', { outputFile: path.join(REPORTS_DIR, 'results.json') }],
    [
      'allure-playwright',
      {
        resultsDir: allureResultsDir,
        detail: true,
        suiteTitle: true,
        environmentInfo: {
          TEST_ENV: ConfigManager.getEnvironmentName(),
          BASE_URL: ConfigManager.getBaseUrl(),
          CI: String(!!process.env.CI),
          BROWSER: process.env.BROWSER ?? 'all',
        },
      },
    ],
  ];

  if (process.env.CI) {
    reporters.push(['github']);
  }

  return reporters;
}

export function buildProjects(): PlaywrightTestConfig['projects'] {
  const appConfig = ConfigManager.get();

  // viewport: null (maximized window) is incompatible with deviceScaleFactor from devices preset
  const chromiumDevice = { ...devices['Desktop Chrome'] };
  delete (chromiumDevice as { deviceScaleFactor?: number }).deviceScaleFactor;

  const allProjects: NonNullable<PlaywrightTestConfig['projects']> = [
    {
      name: 'chromium',
      use: {
        ...chromiumDevice,
        browserName: 'chromium',
        baseURL: appConfig.baseUrl,
        viewport: null,
        launchOptions: {
          args: [
            '--window-size=1920,1080',
            '--start-maximized',
            '--disable-notifications',
            '--incognito',
          ],
        },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        baseURL: appConfig.baseUrl,
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        baseURL: appConfig.baseUrl,
      },
    },
  ];

  const browser = process.env.BROWSER?.toLowerCase();
  if (browser) {
    return allProjects.filter((project) => project.name === browser);
  }

  return allProjects;
}

export function getTestTimeout(): number {
  const explicit = Number(process.env.TEST_TIMEOUT_MS);
  return Number.isFinite(explicit) && explicit > 0 ? explicit : 300_000;
}

export function getExpectTimeout(): number {
  const explicit = Number(process.env.EXPECT_TIMEOUT_MS);
  return Number.isFinite(explicit) && explicit > 0 ? explicit : 30_000;
}
