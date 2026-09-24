import { test } from '@playwright/test';

/**
 * Named business step — shows as a pass/fail row in Playwright HTML,
 * execution-summary.html, and the Azure pipeline Markdown report.
 *
 * Usage: await step('Click Sign in', async () => { ... });
 */
export async function step<T>(title: string, body: () => Promise<T>): Promise<T> {
  return test.step(title, body);
}
