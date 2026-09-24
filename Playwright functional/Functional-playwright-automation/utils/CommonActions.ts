import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { logger } from '../logger';
import { clickStep, enterStep, humanizeLabel, selectStep } from './stepLabels';
import { step } from './step';
import { WaitUtils } from './WaitUtils';

/**
 * High-level user actions facade — click, fill, hover, check, dblclick.
 * Each action is a named Playwright step so reports show ✅ / ❌ per action
 * for every suite (priority / smoke / regression).
 */
export class CommonActions {
  constructor(private readonly page: Page) {}

  async click(locator: Locator, label?: string): Promise<void> {
    const title = label ? clickStep(label) : 'Click element';
    await step(title, async () => {
      await WaitUtils.untilVisible(locator);
      await expect(locator).toBeEnabled();
      await locator.click();
      logger.debug(title);
      await this.stabilize();
    });
  }

  async dblclick(locator: Locator, label?: string): Promise<void> {
    const title = label ? `Double-click ${humanizeLabel(label)}` : 'Double-click element';
    await step(title, async () => {
      await WaitUtils.untilVisible(locator);
      await locator.scrollIntoViewIfNeeded().catch(() => undefined);
      await locator.dblclick({ force: true }).catch(async () => {
        await locator.click({ force: true });
      });
      logger.debug(title);
      await this.stabilize();
    });
  }

  async fill(locator: Locator, value: string, label?: string): Promise<void> {
    const title = label ? enterStep(label) : 'Enter value';
    await step(title, async () => {
      await WaitUtils.untilVisible(locator);
      await expect(locator).toBeEditable();
      await locator.click();
      await locator.fill('');
      await locator.pressSequentially(value, { delay: TIMEOUTS.TYPING_DELAY_MS });
      logger.debug(`${title} (length=${value.length})`);
      await this.stabilize();
    });
  }

  /**
   * Fast fill for HandsOnTable / Angular editors that reject pressSequentially.
   * Still emits a named Enter step in the report.
   */
  async fillFast(locator: Locator, value: string, label?: string): Promise<void> {
    const title = label ? enterStep(label) : 'Enter value';
    await step(title, async () => {
      await WaitUtils.untilVisible(locator);
      await locator.click().catch(() => undefined);
      await locator.fill('');
      await locator.fill(value);
      logger.debug(`${title} fast (length=${value.length})`);
      await this.stabilize();
    });
  }

  async hover(locator: Locator, label?: string): Promise<void> {
    const title = label ? `Hover ${label}` : 'Hover element';
    await step(title, async () => {
      await WaitUtils.untilVisible(locator);
      await locator.hover();
    });
  }

  async check(locator: Locator, label?: string): Promise<void> {
    const title = label ? `Check ${label}` : 'Check element';
    await step(title, async () => {
      await WaitUtils.untilVisible(locator);
      await locator.check();
      await this.stabilize();
    });
  }

  async uncheck(locator: Locator, label?: string): Promise<void> {
    const title = label ? `Uncheck ${label}` : 'Uncheck element';
    await step(title, async () => {
      await WaitUtils.untilVisible(locator);
      await locator.uncheck();
      await this.stabilize();
    });
  }

  async selectOption(locator: Locator, optionName: string, context?: string): Promise<void> {
    const title = selectStep(optionName, context);
    await step(title, async () => {
      await WaitUtils.untilVisible(locator);
      await locator.click();
      await this.stabilize();
    });
  }

  async pressKey(key: string): Promise<void> {
    await step(`Press ${key}`, async () => {
      await this.page.keyboard.press(key);
    });
  }

  /** Brief stabilization after UI mutation — not a hardcoded long wait. */
  private async stabilize(): Promise<void> {
    await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
  }
}

// Backward-compatible exports
export async function waitAndClick(locator: Locator): Promise<void> {
  await new CommonActions(locator.page()).click(locator);
}

export async function waitAndFill(locator: Locator, value: string): Promise<void> {
  await new CommonActions(locator.page()).fill(locator, value);
}
