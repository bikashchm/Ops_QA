import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { logger } from '../logger';
import { waitStep } from './stepLabels';
import { step } from './step';

/**
 * Dynamic wait strategies — replaces hardcoded sleep with condition-based waits.
 * Pass an optional `label` to emit a named report step (Wait for …).
 */
export class WaitUtils {
  static async untilVisible(
    locator: Locator,
    timeoutMs: number = TIMEOUTS.SLOW_UI_MS,
    label?: string,
  ): Promise<void> {
    const run = async () => {
      await locator.waitFor({ state: 'visible', timeout: timeoutMs });
    };
    if (label) {
      await step(waitStep(label), run);
      return;
    }
    await run();
  }

  static async untilHidden(
    locator: Locator,
    timeoutMs: number = TIMEOUTS.SLOW_UI_MS,
    label?: string,
  ): Promise<void> {
    const run = async () => {
      await locator.waitFor({ state: 'hidden', timeout: timeoutMs });
    };
    if (label) {
      await step(waitStep(`${label} hidden`), run);
      return;
    }
    await run();
  }

  static async untilAttached(
    locator: Locator,
    timeoutMs: number = TIMEOUTS.SLOW_UI_MS,
  ): Promise<void> {
    await locator.waitFor({ state: 'attached', timeout: timeoutMs });
  }

  static async untilEnabled(
    locator: Locator,
    timeoutMs: number = TIMEOUTS.SLOW_UI_MS,
    label?: string,
  ): Promise<void> {
    const run = async () => {
      await expect(locator).toBeEnabled({ timeout: timeoutMs });
    };
    if (label) {
      await step(waitStep(`${label} enabled`), run);
      return;
    }
    await run();
  }

  static async untilUrl(
    page: Page,
    urlPattern: string | RegExp,
    timeoutMs: number = TIMEOUTS.SLOW_UI_MS,
  ): Promise<void> {
    await page.waitForURL(urlPattern, { timeout: timeoutMs });
    logger.debug(`URL matched: ${urlPattern.toString()}`);
  }

  static async forLoadState(
    page: Page,
    state: 'load' | 'domcontentloaded' | 'networkidle' = 'domcontentloaded',
  ): Promise<void> {
    await page.waitForLoadState(state);
  }

  static async untilNetworkIdle(page: Page, timeoutMs: number = TIMEOUTS.SLOW_UI_MS): Promise<void> {
    await page.waitForLoadState('networkidle', { timeout: timeoutMs }).catch(() => {
      logger.warn('networkidle wait timed out — continuing');
    });
  }
}

export const waitUntilVisible = WaitUtils.untilVisible.bind(WaitUtils);
