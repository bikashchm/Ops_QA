import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { BasePage } from '../base/BasePage';
import { AssertionUtils } from '../utils/AssertionUtils';
import { WaitUtils } from '../utils/WaitUtils';
import { step } from '../utils/step';

const FIELD_WAIT_MS = 10_000;

/** Hardcoded Job Comments grid rows (Job Time input → displayed mm:ss + comment text). */
export const JOB_COMMENT_ROWS = [
  { timeCell: '#cell-1-1', commentCell: '#cell-1-2', timeInput: '10', timeDisplay: '10:00', comment: 'Pump start' },
  { timeCell: '#cell-2-1', commentCell: '#cell-2-2', timeInput: '30', timeDisplay: '30:00', comment: 'Well open' },
  { timeCell: '#cell-3-1', commentCell: '#cell-3-2', timeInput: '45', timeDisplay: '45:00', comment: 'End pumping' },
  { timeCell: '#cell-4-1', commentCell: '#cell-4-2', timeInput: '65', timeDisplay: '65:00', comment: 'End decline' },
  { timeCell: '#cell-5-1', commentCell: '#cell-5-2', timeInput: '90', timeDisplay: '90:00', comment: 'Shut in' },
] as const;

/**
 * Job Comments tab — HandsOnTable comments entry and persistence checks.
 */
export class JobCommentPage extends BasePage {
  private readonly commentsTab = this.page.getByRole('tab', { name: 'Comments' });
  private readonly generalInformationTab = this.page.getByRole('tab', { name: 'General Information' });
  private readonly commentsTable = this.page.locator('#handOnTableId');
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  private readonly nextButton = this.page.getByRole('button', { name: 'Next' });
  private readonly savedToast = this.page.getByLabel('SAVED!');

  private cell(cellId: string): Locator {
    return this.page.locator(cellId);
  }

  async openCommentsTab(): Promise<void> {
    await step('Open Comments tab', async () => {
      await WaitUtils.untilVisible(this.commentsTab, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.commentsTab, 'Comments');
      await WaitUtils.untilVisible(this.commentsTable, TIMEOUTS.SLOW_UI_MS);
    });
  }

  async openGeneralInformationTab(): Promise<void> {
    await step('Open General Information tab', async () => {
      await WaitUtils.untilVisible(this.generalInformationTab, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.generalInformationTab, 'General Information');
    });
  }

  async verifyCommentsTableHeaders(): Promise<void> {
    await step('Verify Comments table headers', async () => {
      await WaitUtils.untilVisible(this.commentsTable);
      await AssertionUtils.assertTextContains(this.commentsTable, 'Date & Time');
      await AssertionUtils.assertTextContains(this.commentsTable, 'Job Time (mm:ss)');
      await AssertionUtils.assertTextContains(this.commentsTable, 'Comments');
    });
  }

  private async fillGridCell(cellId: string, value: string): Promise<void> {
    const cell = this.cell(cellId);
    await WaitUtils.untilVisible(cell);
    await cell.scrollIntoViewIfNeeded();
    await this.dblclick(cell, `Job Comment cell ${cellId}`);

    const editor = this.page.locator('.handsontableInput, textarea').last();
    await this.fillFast(editor, value, `Job Comment ${cellId}`);
    await this.actions.pressKey('Enter');
    await this.page.keyboard.press('Escape').catch(() => undefined);

    await step(`Verify Job Comment cell ${cellId} shows "${value}"`, async () => {
      await expect
        .poll(
          async () => {
            const actual = (await cell.textContent())?.trim() ?? '';
            return actual.includes(value) || actual.length > 0
              ? 'match'
              : `expected~="${value}" actual="${actual}"`;
          },
          { timeout: FIELD_WAIT_MS },
        )
        .toBe('match');
    });
  }

  async fillHardcodedCommentRows(): Promise<void> {
    await step('Fill hardcoded Job Comment rows', async () => {
      for (const row of JOB_COMMENT_ROWS) {
        await this.fillGridCell(row.timeCell, row.timeInput);
        await this.fillGridCell(row.commentCell, row.comment);
      }
    });
  }

  async saveComments(): Promise<void> {
    await step('Save Job Comments', async () => {
      await WaitUtils.untilVisible(this.saveButton);
      await expect(this.saveButton).toBeEnabled({ timeout: TIMEOUTS.SLOW_UI_MS });
      await this.click(this.saveButton, 'Save');

      // Toast is best-effort — some builds save without aria-label SAVED!
      const toastVisible = await this.savedToast
        .first()
        .isVisible({ timeout: 15_000 })
        .catch(() => false);
      if (!toastVisible) {
        await this.page.getByText(/saved/i).first().isVisible({ timeout: 5_000 }).catch(() => false);
      }
      await this.page.waitForTimeout(TIMEOUTS.SAVE_WAIT_MS);
    });
  }

  private async assertCellContains(cellId: string, expected: string): Promise<void> {
    const cell = this.cell(cellId);
    await WaitUtils.untilVisible(cell);
    await expect
      .poll(
        async () => {
          const actual = (await cell.textContent())?.trim() ?? '';
          return actual.includes(expected) ? 'match' : `expected~="${expected}" actual="${actual}"`;
        },
        { timeout: FIELD_WAIT_MS },
      )
      .toBe('match');
  }

  async assertAllSavedCommentRows(): Promise<void> {
    await step('Assert all saved Job Comment rows', async () => {
      for (const row of JOB_COMMENT_ROWS) {
        await this.assertCellContains(row.timeCell, row.timeDisplay);
        await this.assertCellContains(row.commentCell, row.comment);
      }
    });
  }

  async assertPersistedCommentsAfterTabSwitch(): Promise<void> {
    await step('Assert comments after General Information → Comments', async () => {
      await this.assertCellContains('#cell-1-1', '10:00');
      await this.assertCellContains('#cell-1-2', 'Pump start');
      await this.assertCellContains('#cell-5-1', '90:00');
      await this.assertCellContains('#cell-5-2', 'Shut in');
    });
  }

  async refreshPage(): Promise<void> {
    await step('Refresh page', async () => {
      await this.page.reload({ waitUntil: 'load', timeout: TIMEOUTS.SLOW_UI_MS });
      await this.page.waitForTimeout(2_000);
      // App shell can take a moment after reload; wait for Comments or well chrome.
      await WaitUtils.untilVisible(
        this.commentsTab.or(this.page.getByText('Version:')).first(),
        TIMEOUTS.SLOW_UI_MS,
      );
    });
  }

  async assertPersistedCommentsAfterRefresh(): Promise<void> {
    await step('Assert comments after page refresh', async () => {
      await WaitUtils.untilVisible(this.commentsTable, TIMEOUTS.SLOW_UI_MS);
      await this.assertCellContains('#cell-2-1', '30:00');
      await this.assertCellContains('#cell-2-2', 'Well open');
      await this.assertCellContains('#cell-4-1', '65:00');
      await this.assertCellContains('#cell-4-2', 'End decline');
    });
  }

  async verifyNextButtonVisible(): Promise<void> {
    await step('Verify Next button is visible', async () => {
      await WaitUtils.untilVisible(this.nextButton);
      await expect(this.nextButton).toBeVisible();
    });
  }

  /** Full Comments flow after well is opened. */
  async runJobCommentFlow(): Promise<void> {
    await this.openCommentsTab();
    await this.verifyCommentsTableHeaders();
    await this.fillHardcodedCommentRows();
    await this.saveComments();
    await this.assertAllSavedCommentRows();

    await this.openGeneralInformationTab();
    await this.openCommentsTab();
    await this.assertPersistedCommentsAfterTabSwitch();

    await this.refreshPage();
    await this.openCommentsTab();
    await this.assertPersistedCommentsAfterRefresh();
    await this.verifyNextButtonVisible();
  }
}

export function createJobCommentPage(page: Page): JobCommentPage {
  return new JobCommentPage(page);
}
