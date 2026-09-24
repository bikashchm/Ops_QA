import { expect, type Page } from '@playwright/test';
import { CommonActions } from './CommonActions';
import { WaitUtils } from './WaitUtils';

/**
 * Grid / Handsontable / data-table interactions.
 */
export class TableUtils {
  private readonly actions: CommonActions;

  constructor(private readonly page: Page) {
    this.actions = new CommonActions(page);
  }

  getCell(cellName: string | RegExp) {
    return this.page.getByRole('gridcell', { name: cellName });
  }

  async clickCell(cellName: string | RegExp): Promise<void> {
    const cell = this.getCell(cellName);
    await this.actions.click(cell, `gridcell ${cellName.toString()}`);
  }

  async expectCellVisible(cellName: string | RegExp, timeoutMs?: number): Promise<void> {
    await WaitUtils.untilVisible(this.getCell(cellName), timeoutMs);
    await expect(this.getCell(cellName)).toBeVisible();
  }

  async clickHandsontableCell(cellId: string): Promise<void> {
    await this.actions.click(this.page.locator(cellId), cellId);
  }

  async clickWtHolder(index = 0): Promise<void> {
    await this.actions.click(this.page.locator('.wtHolder').nth(index), 'wtHolder');
  }

  async getRowByText(text: string) {
    return this.page.getByRole('row').filter({ hasText: text });
  }
}
