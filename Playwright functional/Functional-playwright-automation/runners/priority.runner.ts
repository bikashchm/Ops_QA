import { defineConfig, devices, type PlaywrightTestConfig, type ReporterDescription } from '@playwright/test';
import path from 'path';
import baseConfig from '../playwright.config';
import { PROJECT_ROOT, REPORTS_DIR, buildProjects } from '../config/playwright.settings';

/**
 * =============================================================================
 * PRIORITY RUNNER  —  TestNG-style ordered execution for Playwright
 * =============================================================================
 * This is the Playwright equivalent of the BDD `TestNgRunner` class.
 *
 * Add your `.ts` test files to `PRIORITY_SUITE` below, in the exact order they
 * must run. Execution is STRICTLY SEQUENTIAL and ORDERED:
 *
 *   - Each entry becomes its own Playwright "project".
 *   - Priority N depends on priority N-1 (Playwright project dependencies),
 *     so a lower-priority test never starts until the higher-priority one
 *     has finished.
 *   - Tests stay sequential (workers=1). A failure does not skip later
 *     priorities so the full run can finish and be fixed afterward.
 *
 * Run locally:   npm run priority
 * Run in CI:     npx playwright test --config=runners/priority.runner.ts
 * =============================================================================
 */

export interface PriorityTest {
  /** Lower number = runs first. Must be unique. */
  priority: number;
  /** Human-friendly name shown in reports / Azure Test tab. */
  name: string;
  /** Test file (relative to `tests/`). Glob allowed, but keep it specific. */
  file: string;
}

/* ── Register test files here, in priority order ─────────────────────────── */
export const PRIORITY_SUITE: PriorityTest[] = [
  { priority: 1, name: 'Create Pad and Well', file: 'createwellandpad.spec.ts' },
  { priority: 2, name: 'Well and Treatment', file: 'WellAndTreatment.spec.ts' },
  { priority: 3, name: 'Job Comment', file: 'JobComment.spec.ts' },
  // Deferred: Channel Input currently failing — re-enable after fix.
  // { priority: 4, name: 'Channel Input Model', file: 'ChannelInput.spec.ts' },
  { priority: 5, name: 'Drilled Hole', file: 'DrilledHole.spec.ts' },
  { priority: 6, name: 'Casing', file: 'Casing.spec.ts' },
  { priority: 7, name: 'Surface Line and Tubing', file: 'SurfaceLineTubing.spec.ts' },
  { priority: 8, name: 'Perforation', file: 'PerforationIntervals.spec.ts' },
  { priority: 9, name: 'Directional Survey', file: 'DirectionalSurvey.spec.ts' },
  { priority: 10, name: 'Path Summary', file: 'PathSummary.spec.ts' },
  { priority: 11, name: 'Schematic 2D', file: 'Schematic2D.spec.ts' },
  { priority: 12, name: 'Heat Transfer Parameters', file: 'HeatTransferParameters.spec.ts' },
  { priority: 13, name: 'Reservoir Parameters', file: 'ReservoirParameters.spec.ts' },
  { priority: 14, name: 'Add Material', file: 'add-material.spec.ts' },
  { priority: 15, name: 'Add Chemical', file: 'add-chemical.spec.ts' },
  { priority: 16, name: 'Edit Fluid', file: 'edit-fluid.spec.ts' },
  { priority: 17, name: 'Design Treatment Scheduled', file: 'DesignTreatmentScheduled.spec.ts' },
  { priority: 18, name: 'Actual Treatment Scheduled', file: 'ActualTreatmentScheduled.spec.ts' },
  { priority: 19, name: 'Treatment Totals', file: 'TreatmentTotals.spec.ts' },
  { priority: 20, name: 'Entry Friction', file: 'EntryFriction.spec.ts' },
  // Deferred: Plots — UAT plot menu issue; re-enable after app fix.
  // { priority: 21, name: 'Plots', file: 'Plot.spec.ts' },
  // Deferred: Plot in Word Report — UAT plot order (Btm PRC first); re-enable after app fix.
  // { priority: 22, name: 'Plot in Word Report', file: 'PlotInWordReport.spec.ts' },
  // { priority: 23, name: 'Material Usage', file: 'MaterialUsage.spec.ts' },
  // { priority: 24, name: 'Post Job Data', file: 'PostJobData.spec.ts' },
  { priority: 25, name: 'User Defined Channel', file: 'UserDefinedChannels.spec.ts' },
  { priority: 26, name: 'Version Control', file: 'VersionControl.spec.ts' },
  // Deferred: Dashboard — depends on Plot baselines; re-enable with Plots after app fix.
  // { priority: 27, name: 'Dashboard', file: 'Dashboard.spec.ts' },
  // Deferred: User Management — YOPmail works; new-user B2C login after password change
  // does not reach Digital Solutions in headless. Re-enable after that login is stable.
  // { priority: 28, name: 'User Management', file: 'UserManagement.spec.ts' },
];

/* ── Internal helpers ────────────────────────────────────────────────────── */

/** Slug used as the Playwright project id (referenced by `dependencies`). */
function projectId(entry: PriorityTest): string {
  return `P${entry.priority} · ${entry.name}`;
}

/** Reuse the chromium browser settings defined in the base config. */
function chromiumUse(): PlaywrightTestConfig['use'] {
  const projects = buildProjects() ?? [];
  const chromium = projects.find((p) => p.name === 'chromium');
  if (chromium?.use) return chromium.use;

  const fallback = { ...devices['Desktop Chrome'] };
  delete (fallback as { deviceScaleFactor?: number }).deviceScaleFactor;
  return { ...fallback, browserName: 'chromium', viewport: null };
}

/** Build ordered projects. No dependencies so a failure does not skip later priorities. */
function buildPriorityProjects(): NonNullable<PlaywrightTestConfig['projects']> {
  const ordered = [...PRIORITY_SUITE].sort((a, b) => a.priority - b.priority);
  const use = chromiumUse();

  return ordered.map((entry) => ({
    name: projectId(entry),
    testMatch: [`**/${entry.file}`],
    use,
  }));
}

function normalizeReporters(reporter: PlaywrightTestConfig['reporter']): ReporterDescription[] {
  if (!reporter) return [];
  if (Array.isArray(reporter)) return reporter as ReporterDescription[];
  return [reporter as unknown as ReporterDescription];
}

/* ── Reporters — inherit the full enterprise report stack + a suite JSON ──── */
const reporters = normalizeReporters(baseConfig.reporter);
if (!reporters.some((r) => Array.isArray(r) && r[0] === 'json' && `${(r[1] as { outputFile?: string })?.outputFile}`.includes('priority'))) {
  reporters.push(['json', { outputFile: path.join(REPORTS_DIR, 'priority-results.json') }]);
}

/* ── Config ──────────────────────────────────────────────────────────────── */
export default defineConfig({
  ...baseConfig,
  testDir: path.join(PROJECT_ROOT, 'tests'),
  outputDir: path.join(PROJECT_ROOT, 'test-results'),
  globalSetup: path.join(PROJECT_ROOT, 'global-setup/global-setup.ts'),
  globalTeardown: path.join(PROJECT_ROOT, 'global-teardown/global-teardown.ts'),
  reporter: reporters,

  // Ordering guarantees: never run priority tests in parallel with each other.
  fullyParallel: false,
  workers: 1,

  // A retry re-runs a whole priority step in isolation; keep 0 so the report
  // reflects the true first-attempt pass/fail. Override with PRIORITY_RETRIES.
  retries: process.env.PRIORITY_RETRIES ? Number(process.env.PRIORITY_RETRIES) : 0,

  projects: buildPriorityProjects(),

  metadata: {
    suite: 'priority',
    description: 'Priority-ordered sequential execution (TestNG-style)',
    order: [...PRIORITY_SUITE].sort((a, b) => a.priority - b.priority).map((t) => `${t.priority}. ${t.name} (${t.file})`),
  },
});
