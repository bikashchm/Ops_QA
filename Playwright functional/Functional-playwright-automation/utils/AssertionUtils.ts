import { expect, type Locator } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { verifyStep } from './stepLabels';
import { step } from './step';
import { WaitUtils } from './WaitUtils';

/**
 * Generic reusable assertions — keeps expect logic out of test files.
 * Each assertion is a named step so reports show ✅ / ❌.
 */
export class AssertionUtils {
  static async assertVisible(
    locator: Locator,
    message?: string,
    timeoutMs = TIMEOUTS.SLOW_UI_MS,
  ): Promise<void> {
    const title = verifyStep(message ?? 'element is visible');
    await step(title, async () => {
      await WaitUtils.untilVisible(locator, timeoutMs);
      await expect(locator, message).toBeVisible();
    });
  }

  static async assertHidden(locator: Locator, message?: string): Promise<void> {
    const title = verifyStep(message ?? 'element is hidden');
    await step(title, async () => {
      await expect(locator, message).toBeHidden();
    });
  }

  static async assertTextContains(
    locator: Locator,
    text: string | RegExp,
    message?: string,
  ): Promise<void> {
    const textLabel = typeof text === 'string' ? `"${text}"` : 'expected text';
    const title = verifyStep(message ?? `page shows ${textLabel}`);
    await step(title, async () => {
      await WaitUtils.untilVisible(locator);
      await expect(locator, message).toContainText(text);
    });
  }

  static async assertValue(
    locator: Locator,
    value: string | RegExp,
    message?: string,
  ): Promise<void> {
    const title = verifyStep(message ?? 'field has expected value');
    await step(title, async () => {
      await WaitUtils.untilVisible(locator);
      await expect(locator, message).toHaveValue(value);
    });
  }

  static async assertEnabled(locator: Locator, message?: string): Promise<void> {
    const title = verifyStep(message ?? 'element is enabled');
    await step(title, async () => {
      await WaitUtils.untilVisible(locator);
      await expect(locator, message).toBeEnabled();
    });
  }

  static async assertDisabled(locator: Locator, message?: string): Promise<void> {
    const title = verifyStep(message ?? 'element is disabled');
    await step(title, async () => {
      await expect(locator, message).toBeDisabled();
    });
  }

  static async assertUrl(
    page: import('@playwright/test').Page,
    urlPattern: string | RegExp,
    message?: string,
  ): Promise<void> {
    const title = verifyStep(message ?? 'URL matches expected page');
    await step(title, async () => {
      await expect(page, message).toHaveURL(urlPattern);
    });
  }
}
