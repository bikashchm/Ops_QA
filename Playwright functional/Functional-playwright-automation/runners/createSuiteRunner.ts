import { defineConfig, type PlaywrightTestConfig, type ReporterDescription } from '@playwright/test';
import path from 'path';
import baseConfig from '../playwright.config';
import { REPORTS_DIR } from '../config/playwright.settings';
import type { SuiteName } from '../constants/tags';

const PROJECT_ROOT = path.resolve(__dirname, '..');

export interface SuiteRunnerOptions {
  suite: SuiteName;
  tag: string;
  description: string;
  /** Default worker count when RUN_WORKERS / RUN_MODE not set */
  workers?: number;
  fullyParallel?: boolean;
  retries?: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveWorkers(explicit?: number): number | undefined {
  if (process.env.RUN_WORKERS) {
    const parsed = Number(process.env.RUN_WORKERS);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }
  if (process.env.RUN_MODE === 'sequential') return 1;
  return explicit;
}

function resolveFullyParallel(explicit?: boolean): boolean {
  if (process.env.RUN_MODE === 'sequential') return false;
  return explicit ?? true;
}

function resolveRetries(explicit?: number): number {
  if (process.env.SUITE_RETRIES) {
    const parsed = Number(process.env.SUITE_RETRIES);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (explicit !== undefined) return explicit;
  return process.env.CI ? 2 : 0;
}

function normalizeReporters(
  reporter: PlaywrightTestConfig['reporter'],
): ReporterDescription[] {
  if (!reporter) return [];
  if (Array.isArray(reporter)) return reporter;
  return [reporter as unknown as ReporterDescription];
}

/**
 * Factory for TestNG-like suite runners.
 * One runner file per suite; all share base playwright.config.ts settings.
 */
export function createSuiteRunner(options: SuiteRunnerOptions): PlaywrightTestConfig {
  const workers = resolveWorkers(options.workers);
  const fullyParallel = resolveFullyParallel(options.fullyParallel);
  const retries = resolveRetries(options.retries);
  const runMode = process.env.RUN_MODE === 'sequential' ? 'sequential' : 'parallel';

  const reporters = normalizeReporters(baseConfig.reporter);
  const suiteJsonReport: ['json', { outputFile: string }] = [
    'json',
    { outputFile: path.join(REPORTS_DIR, `${options.suite}-results.json`) },
  ];

  if (!reporters.some((r) => Array.isArray(r) && r[0] === 'json')) {
    reporters.push(suiteJsonReport);
  }

  return defineConfig({
    ...baseConfig,
    testDir: path.join(PROJECT_ROOT, 'tests'),
    outputDir: path.join(PROJECT_ROOT, 'test-results'),
    globalSetup: path.join(PROJECT_ROOT, 'global-setup/global-setup.ts'),
    globalTeardown: path.join(PROJECT_ROOT, 'global-teardown/global-teardown.ts'),
    reporter: reporters,
    grep: new RegExp(escapeRegExp(options.tag)),
    workers,
    fullyParallel,
    retries,
    metadata: {
      suite: options.suite,
      tag: options.tag,
      description: options.description,
      runMode,
      workers: workers ?? 'default',
      retries,
    },
  });
}
