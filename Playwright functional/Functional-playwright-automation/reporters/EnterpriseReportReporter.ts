import fs from 'fs';
import path from 'path';
import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
  TestStep,
} from '@playwright/test/reporter';
import { ConfigManager } from '../config/ConfigManager';
import { PROJECT_ROOT, REPORTS_DIR } from '../config/playwright.settings';
import { getRunLogFilePath } from '../logger/winstonLogger';

export interface StepExecutionRecord {
  title: string;
  status: 'passed' | 'failed';
  durationMs: number;
  error?: string;
}

export interface TestExecutionRecord {
  title: string;
  file: string;
  project: string;
  status: string;
  durationMs: number;
  retry: number;
  error?: string;
  stack?: string;
  screenshots: string[];
  videos: string[];
  traces: string[];
  /** Named business steps (Click / Enter / Navigate / Wait …) with ✅/❌ */
  steps: StepExecutionRecord[];
  stepCounts: {
    total: number;
    passed: number;
    failed: number;
  };
}

export interface ExecutionSummary {
  generatedAt: string;
  startedAt: string;
  status: string;
  durationMs: number;
  environment: {
    testEnv: string;
    baseUrl: string;
    ci: boolean;
    browser: string;
    headless: boolean;
  };
  counts: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
  };
  stepCounts: {
    total: number;
    passed: number;
    failed: number;
  };
  artifacts: {
    logs: {
      automationLog: string;
      runLog: string;
    };
    reports: {
      playwrightHtml: string;
      executionSummaryHtml: string;
      junit: string;
      json: string;
      allure: string;
    };
  };
  tests: TestExecutionRecord[];
}

function classifyAttachment(
  contentType: string | undefined,
  name: string | undefined,
  filePath: string,
  buckets: { screenshots: string[]; videos: string[]; traces: string[] },
): void {
  if (contentType?.includes('image') || filePath.endsWith('.png')) {
    buckets.screenshots.push(filePath);
    return;
  }
  if (contentType?.includes('video') || filePath.endsWith('.webm')) {
    buckets.videos.push(filePath);
    return;
  }
  if (name?.includes('trace') || filePath.endsWith('.zip')) {
    buckets.traces.push(filePath);
  }
}

/**
 * Collect named `test.step(...)` entries for the report.
 * Uses leaf steps only (skips wrapper groups like "Login with credentials")
 * so each row is one brief action: Enter pad name, Click Save, Verify dashboard.
 */
function collectNamedSteps(steps: TestStep[]): StepExecutionRecord[] {
  const out: StepExecutionRecord[] = [];

  const walk = (step: TestStep): void => {
    if (step.category === 'test.step') {
      const nested = (step.steps ?? []).filter((s) => s.category === 'test.step');
      if (nested.length > 0) {
        for (const child of nested) walk(child);
        return;
      }
      out.push({
        title: step.title,
        status: step.error ? 'failed' : 'passed',
        durationMs: step.duration,
        error: step.error?.message,
      });
      return;
    }
    for (const child of step.steps ?? []) {
      walk(child);
    }
  };

  for (const step of steps) {
    walk(step);
  }
  return out;
}

function statusIcon(status: string): string {
  if (status === 'passed') return '✅';
  if (status === 'failed' || status === 'timedOut') return '❌';
  if (status === 'skipped') return '⏭️';
  return '•';
}

function buildSummaryHtml(summary: ExecutionSummary): string {
  const failedTests = summary.tests.filter(
    (t) => t.status === 'failed' || t.status === 'timedOut',
  );

  const testBlocks = summary.tests
    .map((t) => {
      const stepRows = (t.steps ?? [])
        .map(
          (s, i) => `
          <tr class="step-${s.status}">
            <td class="step-num">${i + 1}</td>
            <td>${escapeHtml(s.title)}</td>
            <td class="status">${statusIcon(s.status)} ${escapeHtml(s.status)}</td>
            <td>${s.durationMs}ms</td>
          </tr>`,
        )
        .join('');

      return `
      <section class="test-block ${t.status}">
        <h3>${statusIcon(t.status)} ${escapeHtml(t.title)}</h3>
        <p class="meta-line">
          <strong>Priority/Project:</strong> ${escapeHtml(t.project)} &nbsp;|&nbsp;
          <strong>Status:</strong> ${escapeHtml(t.status)} &nbsp;|&nbsp;
          <strong>Duration:</strong> ${t.durationMs}ms &nbsp;|&nbsp;
          <strong>Steps:</strong> ${t.stepCounts.passed}/${t.stepCounts.total} passed
          ${t.stepCounts.failed ? ` (${t.stepCounts.failed} failed)` : ''}
        </p>
        <table class="steps">
          <thead>
            <tr><th>#</th><th>Step</th><th>Status</th><th>Duration</th></tr>
          </thead>
          <tbody>
            ${stepRows || '<tr><td colspan="4">No named steps recorded.</td></tr>'}
          </tbody>
        </table>
      </section>`;
    })
    .join('');

  const failureBlocks = failedTests
    .map((t) => {
      const failedSteps = (t.steps ?? []).filter((s) => s.status === 'failed');
      const stepFailHtml = failedSteps
        .map(
          (s) => `
          <div class="failure-step">
            <strong>❌ ${escapeHtml(s.title)}</strong>
            <pre>${escapeHtml(s.error ?? 'No error message')}</pre>
          </div>`,
        )
        .join('');

      return `
      <div class="failure">
        <h3>${escapeHtml(t.title)}</h3>
        <p><strong>Status:</strong> ${escapeHtml(t.status)} | <strong>Project:</strong> ${escapeHtml(t.project)}</p>
        <pre>${escapeHtml(t.error ?? 'No error message')}</pre>
        ${t.stack ? `<pre class="stack">${escapeHtml(t.stack)}</pre>` : ''}
        ${stepFailHtml}
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>LivePlus Execution Summary</title>
  <style>
    body { font-family: Segoe UI, Arial, sans-serif; margin: 24px; color: #1f2937; }
    h1 { margin-bottom: 4px; }
    .meta { color: #4b5563; margin-bottom: 20px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 12px; margin: 20px 0; }
    .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #f9fafb; }
    .card strong { display: block; font-size: 22px; }
    .test-block { border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin: 20px 0; background: #fff; }
    .test-block.failed, .test-block.timedOut { border-color: #fca5a5; background: #fff7f7; }
    .test-block.passed { border-color: #86efac; background: #f0fdf4; }
    .meta-line { color: #4b5563; margin-top: 0; }
    table.steps { width: 100%; border-collapse: collapse; margin-top: 12px; }
    table.steps th, table.steps td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
    table.steps th { background: #f3f4f6; }
    tr.step-passed { background: #f0fdf4; }
    tr.step-failed { background: #fef2f2; }
    td.step-num { width: 40px; color: #6b7280; }
    td.status { white-space: nowrap; font-weight: 600; }
    .failure { border-left: 4px solid #dc2626; padding: 12px; margin: 16px 0; background: #fff7f7; }
    .failure-step { margin-top: 12px; }
    pre { white-space: pre-wrap; word-break: break-word; background: #111827; color: #f9fafb; padding: 12px; border-radius: 6px; }
    pre.stack { background: #374151; font-size: 12px; }
    a { color: #2563eb; }
  </style>
</head>
<body>
  <h1>LivePlus Automation — Detailed Step Report</h1>
  <div class="meta">
    <div><strong>Environment:</strong> ${escapeHtml(summary.environment.testEnv)}</div>
    <div><strong>Base URL:</strong> ${escapeHtml(summary.environment.baseUrl)}</div>
    <div><strong>Status:</strong> ${escapeHtml(summary.status)} | <strong>Duration:</strong> ${summary.durationMs}ms</div>
    <div><strong>Generated:</strong> ${escapeHtml(summary.generatedAt)}</div>
  </div>
  <div class="cards">
    <div class="card"><span>Tests</span><strong>${summary.counts.total}</strong></div>
    <div class="card"><span>Tests Passed</span><strong>${summary.counts.passed}</strong></div>
    <div class="card"><span>Tests Failed</span><strong>${summary.counts.failed}</strong></div>
    <div class="card"><span>Steps</span><strong>${summary.stepCounts.total}</strong></div>
    <div class="card"><span>Steps Passed</span><strong>${summary.stepCounts.passed}</strong></div>
    <div class="card"><span>Steps Failed</span><strong>${summary.stepCounts.failed}</strong></div>
  </div>
  <p>
    <a href="../playwright-report/index.html">Playwright HTML Report</a> |
    <a href="allure-report/index.html">Allure Report</a> |
    <a href="junit-results.xml">JUnit XML</a> |
    <a href="results.json">JSON Results</a>
  </p>
  <h2>Tests &amp; Steps</h2>
  ${testBlocks || '<p>No tests recorded.</p>'}
  <h2>Failure Details</h2>
  ${failureBlocks || '<p>No failures.</p>'}
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Enterprise execution summary reporter.
 * Produces reports/execution-summary.json + execution-summary.html
 * with per-step ✅/❌ detail for the pipeline.
 */
export default class EnterpriseReportReporter implements Reporter {
  private readonly tests: TestExecutionRecord[] = [];
  private readonly startedAt = new Date().toISOString();

  onTestEnd(test: TestCase, result: TestResult): void {
    const buckets = { screenshots: [] as string[], videos: [] as string[], traces: [] as string[] };

    for (const attachment of result.attachments) {
      if (attachment.path) {
        classifyAttachment(attachment.contentType, attachment.name, attachment.path, buckets);
      }
    }

    const steps = collectNamedSteps(result.steps ?? []);
    const stepCounts = {
      total: steps.length,
      passed: steps.filter((s) => s.status === 'passed').length,
      failed: steps.filter((s) => s.status === 'failed').length,
    };

    this.tests.push({
      title: test.title,
      file: test.location.file,
      project: test.parent.project()?.name ?? 'unknown',
      status: result.status,
      durationMs: result.duration,
      retry: result.retry,
      error: result.error?.message,
      stack: result.error?.stack,
      steps,
      stepCounts,
      ...buckets,
    });
  }

  onEnd(result: FullResult): void {
    const appConfig = ConfigManager.get();
    const allSteps = this.tests.flatMap((t) => t.steps);
    const summary: ExecutionSummary = {
      generatedAt: new Date().toISOString(),
      startedAt: this.startedAt,
      status: result.status,
      durationMs: result.duration,
      environment: {
        testEnv: appConfig.testEnv,
        baseUrl: appConfig.baseUrl,
        ci: !!process.env.CI,
        browser: process.env.BROWSER ?? 'all',
        headless: process.env.HEADED !== 'true' && (process.env.HEADLESS === 'true' || !!process.env.CI),
      },
      counts: {
        total: this.tests.length,
        passed: this.tests.filter((t) => t.status === 'passed').length,
        failed: this.tests.filter((t) => t.status === 'failed' || t.status === 'timedOut').length,
        skipped: this.tests.filter((t) => t.status === 'skipped').length,
        flaky: this.tests.filter((t) => t.status === 'flaky').length,
      },
      stepCounts: {
        total: allSteps.length,
        passed: allSteps.filter((s) => s.status === 'passed').length,
        failed: allSteps.filter((s) => s.status === 'failed').length,
      },
      artifacts: {
        logs: {
          automationLog: path.join(PROJECT_ROOT, 'logs', 'automation.log'),
          runLog: getRunLogFilePath(),
        },
        reports: {
          playwrightHtml: path.join(PROJECT_ROOT, 'playwright-report', 'index.html'),
          executionSummaryHtml: path.join(REPORTS_DIR, 'execution-summary.html'),
          junit: path.join(REPORTS_DIR, 'junit-results.xml'),
          json: path.join(REPORTS_DIR, 'results.json'),
          allure: path.join(REPORTS_DIR, 'allure-report', 'index.html'),
        },
      },
      tests: this.tests,
    };

    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(REPORTS_DIR, 'execution-summary.json'),
      JSON.stringify(summary, null, 2),
      'utf-8',
    );
    fs.writeFileSync(
      path.join(REPORTS_DIR, 'execution-summary.html'),
      buildSummaryHtml(summary),
      'utf-8',
    );
  }
}
