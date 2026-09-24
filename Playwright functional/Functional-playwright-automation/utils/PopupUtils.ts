import { type Page } from '@playwright/test';
import { CommonActions } from './CommonActions';
import { WaitUtils } from './WaitUtils';

/**
 * Modal / dialog / popup interactions.
 */
export class PopupUtils {
  private readonly actions: CommonActions;

  constructor(private readonly page: Page) {
    this.actions = new CommonActions(page);
  }

  dialog() {
    return this.page.getByRole('dialog');
  }

  async waitForDialog(timeoutMs?: number): Promise<void> {
    await WaitUtils.untilVisible(this.dialog(), timeoutMs);
  }

  async clickDialogButton(name: string | RegExp): Promise<void> {
    await this.waitForDialog();
    await this.actions.click(this.dialog().getByRole('button', { name }), `dialog button ${name.toString()}`);
  }

  async confirmDialog(buttonName: string | RegExp = 'Save'): Promise<void> {
    await this.clickDialogButton(buttonName);
  }

  async closeDialog(buttonName: string | RegExp = 'Cancel'): Promise<void> {
    await this.clickDialogButton(buttonName);
  }

  async isDialogVisible(): Promise<boolean> {
    return this.dialog().isVisible();
  }
}
