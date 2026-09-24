import type { Page } from '@playwright/test';
import { logger } from '../logger';

/** When true, pause on each tab focus so Live+ ↔ YOPmail switches are visible (headed demo runs). */
export function isVisualTabMode(): boolean {
  return process.env.VISUAL_TABS === 'true';
}

function tabFocusDelayMs(): number {
  const parsed = Number(process.env.TAB_FOCUS_MS ?? 1200);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1200;
}

/**
 * Brings a browser tab/window to the front. In visual mode, pauses so the switch is easy to see.
 */
export async function focusTab(page: Page, label = 'tab'): Promise<void> {
  await page.bringToFront();
  if (isVisualTabMode()) {
    const delayMs = tabFocusDelayMs();
    if (delayMs > 0) {
      logger.info(`Visual tab focus: ${label} (${delayMs}ms)`);
      await page.waitForTimeout(delayMs);
    }
  }
}

/** Alternates focus between Live+ and YOPmail for demo-style runs. */
export async function showLivePlusThenYopmail(
  livePlusPage: Page,
  yopmailPage: Page,
): Promise<void> {
  await focusTab(livePlusPage, 'Live+');
  await focusTab(yopmailPage, 'YOPmail');
}

export async function showYopmailThenLivePlus(
  yopmailPage: Page,
  livePlusPage: Page,
): Promise<void> {
  await focusTab(yopmailPage, 'YOPmail');
  await focusTab(livePlusPage, 'Live+');
}
