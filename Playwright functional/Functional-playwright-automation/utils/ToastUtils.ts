import { expect, type Page } from '@playwright/test';
import { WaitUtils } from './WaitUtils';

/**
 * Toast / snackbar / alert message validation.
 */
export class ToastUtils {
  constructor(private readonly page: Page) {}

  private toastLocator(text?: string | RegExp) {
    const base = this.page.locator(
      '[role="alert"], [class*="toast"], [class*="snackbar"], [class*="notification"]',
    );
    return text ? base.filter({ hasText: text }) : base.first();
  }

  async waitForToast(text: string | RegExp, timeoutMs?: number): Promise<void> {
    await WaitUtils.untilVisible(this.toastLocator(text), timeoutMs);
  }

  async expectToastVisible(text: string | RegExp, timeoutMs?: number): Promise<void> {
    await this.waitForToast(text, timeoutMs);
    await expect(this.toastLocator(text)).toBeVisible();
  }

  async expectToastHidden(text?: string | RegExp, timeoutMs?: number): Promise<void> {
    const locator = text ? this.toastLocator(text) : this.toastLocator();
    await WaitUtils.untilHidden(locator, timeoutMs);
  }

  async dismissToastIfPresent(): Promise<void> {
    const closeBtn = this.page.locator(
      '[role="alert"] button, [class*="toast"] button, [aria-label="Close"]',
    ).first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click();
    }
  }
}
