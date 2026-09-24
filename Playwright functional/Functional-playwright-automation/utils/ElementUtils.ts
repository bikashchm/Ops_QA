import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { WaitUtils } from './WaitUtils';

/**
 * Low-level element interactions — scroll, visibility checks, typing.
 */
export class ElementUtils {
  constructor(private readonly page: Page) {}

  async isVisible(locator: Locator, timeoutMs = 5_000): Promise<boolean> {
    try {
      await locator.waitFor({ state: 'visible', timeout: timeoutMs });
      return true;
    } catch {
      return false;
    }
  }

  async scrollIntoView(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
  }

  async getText(locator: Locator): Promise<string> {
    await WaitUtils.untilVisible(locator);
    return (await locator.textContent())?.trim() ?? '';
  }

  async clearAndType(locator: Locator, value: string): Promise<void> {
    await WaitUtils.untilVisible(locator);
    await expect(locator).toBeEditable();
    await locator.click();
    await locator.fill('');
    await locator.pressSequentially(value, { delay: TIMEOUTS.TYPING_DELAY_MS });
  }

  /** LivePlus ng-select dropdown input inside a container id. */
  ngSelectInput(containerSelector: string): Locator {
    return this.page
      .locator(containerSelector)
      .locator('.ng-select-container .ng-value-container .ng-input input');
  }

  /** Alternate ng-select path used in some forms. */
  ngSelectInputDirect(containerSelector: string): Locator {
    return this.page.locator(
      `${containerSelector} > .ng-select-container > .ng-value-container > .ng-input > input`,
    );
  }
}
