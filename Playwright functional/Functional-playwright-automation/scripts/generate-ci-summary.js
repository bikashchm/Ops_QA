/**
 * Converts reports/execution-summary.json into a Markdown report that Azure
 * DevOps renders inline on the pipeline run page (via task.uploadsummary).
 *
 * Includes per-step ✅ / ❌ detail under each test.
 *
 * Output: reports/ci-summary.md
 * Usage:  node scripts/generate-ci-summary.js
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const summaryJsonPath = path.join(root, 'reports', 'execution-summary.json');
const outPath = path.join(root, 'reports', 'ci-summary.md');

const STATUS_ICON = {
  passed: '✅',
  failed: '❌',
  timedOut: '⏱️',
  skipped: '⏭️',
  flaky: '⚠️',
  interrupted: '🚫',
};

function fmtDuration(ms) {
  if (!ms || ms < 0) return '0s';
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s % 60)}s`;
}

function esc(v) {
  return String(v ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function build(summary) {
  const c = summary.counts || {};
  const sc = summary.stepCounts || {};
  const env = summary.environment || {};
  const overall = summary.status === 'passed' ? '✅ PASSED' : '❌ FAILED';

  const lines = [];
  lines.push(`# LivePlus Priority Suite — ${overall}`);
  lines.push('');
  lines.push(
    `**Environment:** \`${esc(env.testEnv)}\` &nbsp;|&nbsp; ` +
      `**Base URL:** ${esc(env.baseUrl)} &nbsp;|&nbsp; ` +
      `**Duration:** ${fmtDuration(summary.durationMs)}`,
  );
  lines.push('');
  lines.push('### Tests');
  lines.push('| Total | ✅ Passed | ❌ Failed | ⏭️ Skipped | ⚠️ Flaky |');
  lines.push('|:---:|:---:|:---:|:---:|:---:|');
  lines.push(
    `| ${c.total ?? 0} | ${c.passed ?? 0} | ${c.failed ?? 0} | ${c.skipped ?? 0} | ${c.flaky ?? 0} |`,
  );
  lines.push('');
  lines.push('### Steps');
  lines.push('| Total | ✅ Passed | ❌ Failed |');
  lines.push('|:---:|:---:|:---:|');
  lines.push(`| ${sc.total ?? 0} | ${sc.passed ?? 0} | ${sc.failed ?? 0} |`);
  lines.push('');

  const tests = [...(summary.tests || [])].sort((a, b) =>
    String(a.project).localeCompare(String(b.project)),
  );

  lines.push('## Detailed results (priority order)');
  lines.push('');

  for (const t of tests) {
    const icon = STATUS_ICON[t.status] || '';
    const stepSummary = t.stepCounts
      ? `${t.stepCounts.passed ?? 0}/${t.stepCounts.total ?? 0} steps passed`
      : '';
    lines.push(`### ${icon} ${esc(t.project)} — ${esc(t.title)}`);
    lines.push('');
    lines.push(
      `**Status:** ${icon} ${esc(t.status)} &nbsp;|&nbsp; **Duration:** ${fmtDuration(t.durationMs)}` +
        (stepSummary ? ` &nbsp;|&nbsp; **Steps:** ${stepSummary}` : ''),
    );
    lines.push('');

    const steps = t.steps || [];
    if (steps.length) {
      lines.push('| # | Step | Status | Duration |');
      lines.push('|:--|:--|:--:|--:|');
      steps.forEach((s, i) => {
        const sIcon = STATUS_ICON[s.status] || '';
        lines.push(
          `| ${i + 1} | ${esc(s.title)} | ${sIcon} ${esc(s.status)} | ${fmtDuration(s.durationMs)} |`,
        );
      });
      lines.push('');
    } else {
      lines.push('_No named steps recorded for this test._');
      lines.push('');
    }
  }

  const failures = tests.filter((t) => t.status === 'failed' || t.status === 'timedOut');
  if (failures.length) {
    lines.push('## ❌ Failure Details');
    lines.push('');
    for (const t of failures) {
      lines.push(`### ${esc(t.title)} (${esc(t.project)})`);
      lines.push('');
      lines.push('```');
      lines.push(String(t.error || 'No error message').slice(0, 4000));
      lines.push('```');
      lines.push('');
      const failedSteps = (t.steps || []).filter((s) => s.status === 'failed');
      for (const s of failedSteps) {
        lines.push(`- ❌ **${esc(s.title)}**`);
        lines.push('');
        lines.push('```');
        lines.push(String(s.error || 'No error message').slice(0, 2000));
        lines.push('```');
        lines.push('');
      }
    }
  }

  lines.push('---');
  lines.push(
    '_Full step HTML: download the **execution-summary** artifact and open `execution-summary.html`. ' +
      'Per-test pass/fail is also in the **Tests** tab above._',
  );
  lines.push('');
  return lines.join('\n');
}

function main() {
  if (!fs.existsSync(summaryJsonPath)) {
    const md = `# LivePlus Priority Suite\n\n> No execution summary found at \`reports/execution-summary.json\`. The test run may not have produced results.\n`;
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, md, 'utf-8');
    console.log(`Wrote fallback summary to ${outPath}`);
    return;
  }

  const summary = JSON.parse(fs.readFileSync(summaryJsonPath, 'utf-8'));
  const md = build(summary);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, md, 'utf-8');
  console.log(`Wrote CI summary to ${outPath}`);
}

main();
