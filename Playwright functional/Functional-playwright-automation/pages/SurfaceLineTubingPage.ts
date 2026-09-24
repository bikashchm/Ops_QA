import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { BasePage } from '../base/BasePage';
import {
  formatSurfaceLineMdDisplay,
  type SurfaceLineTubingFlowData,
  type SurfaceLineTubingRowData,
} from '../excel/surfaceLineTubingTestData';
import { AssertionUtils } from '../utils/AssertionUtils';
import { step } from '../utils/step';
import { WaitUtils } from '../utils/WaitUtils';

const FIELD_WAIT_MS = 20_000;
const DROPDOWN_WAIT_MS = 300;

/**
 * Wellbore Configuration → Surface Line/Tubing HandsOnTable.
 *
 * MD: dismiss editors → dblclick → clear() → fill → Length header commit → assert.
 * Per row: type (Packer on row 2) → OD → Weight → assert ID → re-enter Weight → Grade.
 * OD/Weight use scroll-until-visible option click (same as Casing).
 */
export class SurfaceLineTubingPage extends BasePage {
  private readonly wellboreLink = this.page.getByRole('link', { name: 'Wellbore Configuration' });
  private readonly surfaceTab = this.page.getByRole('tab', { name: 'Surface Line/Tubing' });
  private readonly handsOnTable = this.page.locator('#handOnTableId');
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });

  private cell(row: number, col: number): Locator {
    const master = this.handsOnTable.locator(`.ht_master #cell-${row}-${col}`);
    return master.or(this.handsOnTable.locator(`#cell-${row}-${col}`)).first();
  }

  async openSurfaceLineTubing(): Promise<void> {
    await step('Open Wellbore Configuration → Surface Line/Tubing', async () => {
      await WaitUtils.untilVisible(this.wellboreLink, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.wellboreLink, 'Wellbore Configuration');
      await WaitUtils.untilVisible(this.handsOnTable, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.surfaceTab, 'Surface Line/Tubing');
      await WaitUtils.untilVisible(this.handsOnTable, TIMEOUTS.SLOW_UI_MS);
    });
  }

  async verifyPageChrome(): Promise<void> {
    await step('Verify Surface Line/Tubing column headers', async () => {
      for (const header of [
        'Length (ft)',
        'Top MD (ft)',
        'Bot MD (ft)',
        'Surf Line/Tubing',
        'OD (in)',
        'Weight (lb/ft)',
        'ID (in)',
        'Grade',
      ]) {
        await AssertionUtils.assertTextContains(this.handsOnTable, header);
      }
    });
  }

  private async dismissOpenEditors(): Promise<void> {
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
    await this.commitWithLengthHeader();
  }

  private async resolveMdEditor(row: number): Promise<Locator> {
    const focused = this.page.locator(
      'textarea.handsontableInput:focus:not([role="combobox"])',
    );
    if (await focused.isVisible().catch(() => false)) {
      return focused;
    }

    const plainHot = this.page
      .locator('textarea.handsontableInput:visible:not([role="combobox"])')
      .last();
    if (await plainHot.isVisible().catch(() => false)) {
      return plainHot;
    }

    if (row >= 1) {
      const textbox = this.page.getByRole('textbox').nth(5);
      if (await textbox.isVisible().catch(() => false)) {
        return textbox;
      }
    }

    const anyTextarea = this.page.locator('textarea:visible:not([role="combobox"])').last();
    await WaitUtils.untilVisible(anyTextarea, FIELD_WAIT_MS);
    return anyTextarea;
  }

  /** Codegen commits MD with Length (ft).nth(3). */
  private async commitWithLengthHeader(): Promise<void> {
    const header = this.page.getByText('Length (ft)', { exact: true }).nth(3);
    if (await header.isVisible().catch(() => false)) {
      await header.click({ force: true });
      await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
      return;
    }
    const fallback = this.page.getByText('Length (ft)', { exact: true }).nth(1);
    await WaitUtils.untilVisible(fallback, FIELD_WAIT_MS);
    await fallback.click({ force: true });
    await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
  }

  private async assertCellContains(
    row: number,
    col: number,
    expected: string,
    label: string,
  ): Promise<void> {
    const cell = this.cell(row, col);
    await step(`Assert ${label} contains "${expected}"`, async () => {
      await expect
        .poll(
          async () => {
            const actual = (await cell.textContent())?.trim() ?? '';
            return actual.includes(expected)
              ? 'match'
              : `expected~="${expected}" actual="${actual}"`;
          },
          { timeout: FIELD_WAIT_MS },
        )
        .toBe('match');
    });
  }

  private async clearAndFillMdCell(
    row: number,
    col: number,
    value: string,
    label: string,
  ): Promise<void> {
    const inputValue = String(value).replace(/,/g, '').trim();
    if (!inputValue) {
      throw new Error(`${label}: Excel value is empty`);
    }
    const cell = this.cell(row, col);
    const expectedDisplay = formatSurfaceLineMdDisplay(inputValue);

    await step(`Enter ${label} = ${inputValue}`, async () => {
      await this.dismissOpenEditors();
      await WaitUtils.untilVisible(cell, TIMEOUTS.SLOW_UI_MS);
      await cell.scrollIntoViewIfNeeded();
      await this.dblclick(cell, label);

      const editor = await this.resolveMdEditor(row);
      await WaitUtils.untilVisible(editor, FIELD_WAIT_MS);
      await editor.click({ force: true });
      await editor.clear();
      await editor.fill(inputValue);

      await this.commitWithLengthHeader();
      await this.assertCellContains(row, col, expectedDisplay, `${label} committed`);
    });
  }

  private async selectListOption(
    row: number,
    col: number,
    optionName: string,
    label: string,
    exact = true,
  ): Promise<void> {
    await step(`Select ${label} = ${optionName}`, async () => {
      const cell = this.cell(row, col);
      await WaitUtils.untilVisible(cell, TIMEOUTS.SLOW_UI_MS);
      await cell.scrollIntoViewIfNeeded();

      if (col === 3 || col === 5 || col === 7) {
        await this.click(cell, label);
      }
      await this.dblclick(cell, label);
      await this.page.waitForTimeout(DROPDOWN_WAIT_MS);

      const option = this.page.getByRole('option', { name: optionName, exact });
      await this.scrollUntilOptionVisible(option, optionName);
      await WaitUtils.untilVisible(option, FIELD_WAIT_MS);
      await option.click();
      await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);

      await this.assertCellContains(row, col, optionName, `${label} selected`);
    });
  }

  private async scrollUntilOptionVisible(option: Locator, optionName: string): Promise<void> {
    await step(`Scroll list until "${optionName}" is visible`, async () => {
      const holders = this.page.locator(
        '.htAutocompleteHolder, .ht_master .wtHolder, [role="listbox"]',
      );

      for (let i = 0; i < 80; i++) {
        if (await option.isVisible().catch(() => false)) {
          return;
        }

        if ((await option.count()) > 0) {
          await option.scrollIntoViewIfNeeded().catch(() => undefined);
          if (await option.isVisible().catch(() => false)) {
            return;
          }
        }

        const holderCount = await holders.count();
        if (holderCount > 0) {
          const holder = holders.nth(holderCount - 1);
          if (await holder.isVisible().catch(() => false)) {
            await holder.evaluate((el) => {
              el.scrollTop += 140;
              el.querySelectorAll('.wtHolder').forEach((n) => {
                (n as HTMLElement).scrollTop += 140;
              });
            });
          }
        }

        await this.page.keyboard.press('ArrowDown');
        await this.page.waitForTimeout(50);
      }
    });
  }

  /**
   * Codegen: Top 2000 / Bot 1000 → validation → restore Row 1 Top/Bot.
   */
  async verifyTopMdCannotExceedBotMd(data: SurfaceLineTubingFlowData): Promise<void> {
    const row1 = data.rows[0];
    await step('Validate Top MD cannot be greater than Bottom MD', async () => {
      await this.clearAndFillMdCell(0, 1, data.validationTopMd, 'Validation Top MD');
      await this.clearAndFillMdCell(0, 2, data.validationBotMd, 'Validation Bot MD');

      await AssertionUtils.assertVisible(
        this.page.getByText(data.validationMessage, { exact: false }).first(),
        data.validationMessage,
      );

      await this.clearAndFillMdCell(0, 1, row1.topMd, 'Row 1 Top MD');
      await this.clearAndFillMdCell(0, 2, row1.botMd, 'Row 1 Bot MD');
    });
  }

  async fillSurfaceLineRows(data: SurfaceLineTubingFlowData): Promise<void> {
    await step('Fill Surface Line/Tubing rows from Excel', async () => {
      for (let i = 0; i < data.rows.length; i++) {
        await this.fillRow(i, data.rows[i], i === 0);
      }
    });
  }

  /**
   * Flow: type (select Packer on row 2) → OD → Weight → ID → re-enter Weight → Grade.
   */
  private async fillRow(
    rowIndex: number,
    row: SurfaceLineTubingRowData,
    skipTopBot: boolean,
  ): Promise<void> {
    await step(`Fill Surface Line/Tubing row ${rowIndex + 1}`, async () => {
      if (!skipTopBot) {
        await this.clearAndFillMdCell(rowIndex, 1, row.topMd, `Row ${rowIndex + 1} Top MD`);
        await this.clearAndFillMdCell(rowIndex, 2, row.botMd, `Row ${rowIndex + 1} Bot MD`);
      }

      if (row.typeOption) {
        await this.selectListOption(
          rowIndex,
          3,
          row.typeOption,
          `Row ${rowIndex + 1} Surf Line/Tubing`,
          true,
        );
      } else {
        await this.assertCellContains(
          rowIndex,
          3,
          row.typeDisplay,
          `Row ${rowIndex + 1} Surf Line/Tubing type`,
        );
      }

      await this.selectListOption(rowIndex, 4, row.od, `Row ${rowIndex + 1} OD`, true);
      await this.selectListOption(rowIndex, 5, row.weight, `Row ${rowIndex + 1} Weight`, true);
      await this.assertCellContains(rowIndex, 6, row.expectedId, `Row ${rowIndex + 1} ID`);

      await this.selectListOption(
        rowIndex,
        5,
        row.weight,
        `Row ${rowIndex + 1} Weight (re-enter after ID)`,
        true,
      );
      await this.dismissOpenEditors();

      if (row.gradeOption) {
        await this.selectListOption(
          rowIndex,
          7,
          row.gradeOption,
          `Row ${rowIndex + 1} Grade`,
          false,
        );
      } else {
        await this.assertCellContains(
          rowIndex,
          7,
          row.expectedGrade,
          `Row ${rowIndex + 1} Grade default`,
        );
      }
    });
  }

  async save(): Promise<void> {
    await step('Save Surface Line/Tubing', async () => {
      await this.commitWithLengthHeader();
      await WaitUtils.untilVisible(this.saveButton, TIMEOUTS.SLOW_UI_MS);
      await expect(this.saveButton).toBeEnabled({ timeout: TIMEOUTS.SLOW_UI_MS });
      await this.click(this.saveButton, 'Save');
      await this.page.waitForTimeout(TIMEOUTS.SAVE_WAIT_MS);
    });
  }

  async assertSavedRows(data: SurfaceLineTubingFlowData): Promise<void> {
    await step('Assert all saved Surface Line/Tubing fields for every row', async () => {
      for (let i = 0; i < data.rows.length; i++) {
        const row = data.rows[i];
        const rowLabel = `Saved row ${i + 1}`;
        const lengthDisplay = formatSurfaceLineMdDisplay(
          String(Number(row.botMd.replace(/,/g, '')) - Number(row.topMd.replace(/,/g, ''))),
        );

        await this.assertCellContains(i, 0, lengthDisplay, `${rowLabel} Length`);
        await this.assertCellContains(
          i,
          1,
          formatSurfaceLineMdDisplay(row.topMd),
          `${rowLabel} Top MD`,
        );
        await this.assertCellContains(
          i,
          2,
          formatSurfaceLineMdDisplay(row.botMd),
          `${rowLabel} Bot MD`,
        );
        await this.assertCellContains(i, 3, row.typeDisplay, `${rowLabel} Surf Line/Tubing`);
        await this.assertCellContains(i, 4, row.od, `${rowLabel} OD`);
        await this.assertCellContains(i, 5, row.weight, `${rowLabel} Weight`);
        await this.assertCellContains(i, 6, row.expectedId, `${rowLabel} ID`);
        await this.assertCellContains(i, 7, row.expectedGrade, `${rowLabel} Grade`);
      }
    });
  }

  async runSurfaceLineTubingFlow(data: SurfaceLineTubingFlowData): Promise<void> {
    await this.openSurfaceLineTubing();
    await this.verifyPageChrome();
    await this.verifyTopMdCannotExceedBotMd(data);
    await this.fillSurfaceLineRows(data);
    await this.save();
    await this.assertSavedRows(data);
  }
}

export function createSurfaceLineTubingPage(page: Page): SurfaceLineTubingPage {
  return new SurfaceLineTubingPage(page);
}
