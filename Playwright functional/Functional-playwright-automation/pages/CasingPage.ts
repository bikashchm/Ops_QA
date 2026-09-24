import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { BasePage } from '../base/BasePage';
import {
  formatCasingMdDisplay,
  type CasingFlowData,
  type CasingRowData,
} from '../excel/casingTestData';
import { AssertionUtils } from '../utils/AssertionUtils';
import { step } from '../utils/step';
import { WaitUtils } from '../utils/WaitUtils';

const FIELD_WAIT_MS = 20_000;
const DROPDOWN_WAIT_MS = 300;

/**
 * Wellbore Configuration → Casing HandsOnTable (codegen-aligned, robust).
 *
 * MD cells: dismiss editors → dblclick → MD textarea clear()/fill → header commit → assert.
 * Per row: OD → Weight → assert ID → re-enter Weight → Grade (casing-type dropdown skipped).
 */
export class CasingPage extends BasePage {
  private readonly wellboreLink = this.page.getByRole('link', { name: 'Wellbore Configuration' });
  private readonly casingTab = this.page.getByRole('tab', { name: 'Casing' });
  private readonly handsOnTable = this.page.locator('#handOnTableId');
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });

  private cell(row: number, col: number): Locator {
    // HandsOnTable clones Length into .ht_clone_left — prefer master, then first match
    const master = this.handsOnTable.locator(`.ht_master #cell-${row}-${col}`);
    return master.or(this.handsOnTable.locator(`#cell-${row}-${col}`)).first();
  }

  async openCasing(): Promise<void> {
    await step('Open Wellbore Configuration → Casing', async () => {
      await WaitUtils.untilVisible(this.wellboreLink, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.wellboreLink, 'Wellbore Configuration');
      await WaitUtils.untilVisible(this.handsOnTable, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.casingTab, 'Casing');
      await WaitUtils.untilVisible(this.handsOnTable, TIMEOUTS.SLOW_UI_MS);
    });
  }

  async verifyPageChrome(): Promise<void> {
    await step('Verify Casing table column headers', async () => {
      for (const header of [
        'Length (ft)',
        'Top MD (ft)',
        'Bot MD (ft)',
        'Casing',
        'OD (in)',
        'Weight (lb/ft)',
        'ID (in)',
        'Grade',
      ]) {
        await AssertionUtils.assertTextContains(this.handsOnTable, header);
      }
    });
  }

  /** Close OD/Weight autocomplete so the next MD cell does not type into the wrong editor. */
  private async dismissOpenEditors(): Promise<void> {
    await this.page.keyboard.press('Escape').catch(() => undefined);
    await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
    // Blur any leftover combobox by clicking a safe numeric header
    const header = this.page.getByText('Length (ft)', { exact: true }).nth(1);
    if (await header.isVisible().catch(() => false)) {
      await header.click({ force: true }).catch(() => undefined);
      await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
    }
  }

  /**
   * MD numeric editor only — never the OD/Weight combobox (role=combobox).
   * Row 2+ codegen uses getByRole('textbox').nth(5) after the cell is open.
   */
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

  private async commitWithHeader(headerText: string): Promise<void> {
    const header = this.page.getByText(headerText, { exact: true }).nth(1);
    await WaitUtils.untilVisible(header, FIELD_WAIT_MS);
    await header.click({ force: true });
    await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
  }

  private async commitWithBotMdHeader(): Promise<void> {
    await this.commitWithHeader('Bot MD (ft)');
  }

  private async assertCellContains(row: number, col: number, expected: string, label: string): Promise<void> {
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

  /**
   * MD entry: dismiss open dropdown → dblclick → clear() → fill → header commit → verify.
   */
  private async clearAndFillMdCell(row: number, col: number, value: string, label: string): Promise<void> {
    const inputValue = String(value).replace(/,/g, '').trim();
    if (!inputValue) {
      throw new Error(`${label}: Excel value is empty`);
    }
    const cell = this.cell(row, col);
    const expectedDisplay = formatCasingMdDisplay(inputValue);
    const commitHeader = col === 2 ? 'Length (ft)' : 'Bot MD (ft)';

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

      await this.commitWithHeader(commitHeader);
      await this.assertCellContains(row, col, expectedDisplay, `${label} committed`);
    });
  }

  /**
   * Codegen: dblclick → scroll option into view → click option → verify cell.
   * No header click after dropdown (that was skipping Weight / corrupting next Bot MD).
   */
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

      // Weight/Grade codegen often clicks before dblclick; OD uses dblclick only
      if (col === 5 || col === 7) {
        await this.click(cell, label);
      }
      await this.dblclick(cell, label);
      await this.page.waitForTimeout(DROPDOWN_WAIT_MS);

      const option = this.page.getByRole('option', { name: optionName, exact });
      await this.scrollUntilOptionVisible(option, optionName);
      await WaitUtils.untilVisible(option, FIELD_WAIT_MS);
      await option.click();
      await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);

      // Must see the selected value in the cell before next action
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

  async verifyTopMdCannotExceedBotMd(data: CasingFlowData): Promise<void> {
    const row1 = data.rows[0];
    await step('Validate Top MD cannot be greater than Bottom MD', async () => {
      await this.clearAndFillMdCell(0, 1, data.validationTopMd, 'Validation Top MD');
      await this.clearAndFillMdCell(0, 2, data.validationBotMd, 'Validation Bot MD');
      await this.clearAndFillMdCell(0, 1, data.invalidTopMd, 'Invalid Top MD');

      await AssertionUtils.assertVisible(
        this.page.getByText(data.validationMessage, { exact: false }).first(),
        data.validationMessage,
      );

      await this.clearAndFillMdCell(0, 1, row1.topMd, 'Row 1 Top MD');
      await this.clearAndFillMdCell(0, 2, row1.botMd, 'Row 1 Bot MD');
    });
  }

  async fillCasingRows(data: CasingFlowData): Promise<void> {
    await step('Fill Casing rows from Excel', async () => {
      for (let i = 0; i < data.rows.length; i++) {
        await this.fillRow(i, data.rows[i], i === 0);
      }
    });
  }

  /**
   * @param skipTopBot row 0 Top/Bot already set by validation
   *
   * Flow per row: OD → Weight → assert ID → re-enter Weight → Grade.
   * Re-selecting Weight after ID keeps the dropdown editor from blocking the next row MD.
   */
  private async fillRow(rowIndex: number, row: CasingRowData, skipTopBot: boolean): Promise<void> {
    await step(`Fill Casing row ${rowIndex + 1}`, async () => {
      if (!skipTopBot) {
        await this.clearAndFillMdCell(rowIndex, 1, row.topMd, `Row ${rowIndex + 1} Top MD`);
        await this.clearAndFillMdCell(rowIndex, 2, row.botMd, `Row ${rowIndex + 1} Bot MD`);
      }

      // Skip Casing-type dropdown — wait for UI default after Top/Bot
      await this.assertCellContains(
        rowIndex,
        3,
        row.casingTypeDisplay,
        `Row ${rowIndex + 1} Casing type`,
      );

      await this.selectListOption(rowIndex, 4, row.od, `Row ${rowIndex + 1} OD`, true);
      await this.selectListOption(rowIndex, 5, row.weight, `Row ${rowIndex + 1} Weight`, true);

      await this.assertCellContains(rowIndex, 6, row.expectedId, `Row ${rowIndex + 1} ID`);

      // Re-enter Weight after ID (same for rows 1–3) before Grade / next row
      await this.selectListOption(
        rowIndex,
        5,
        row.weight,
        `Row ${rowIndex + 1} Weight (re-enter after ID)`,
        true,
      );
      await this.dismissOpenEditors();

      if (row.gradeOption) {
        await this.selectListOption(rowIndex, 7, row.gradeOption, `Row ${rowIndex + 1} Grade`, false);
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
    await step('Save Casing', async () => {
      await this.commitWithBotMdHeader();
      await WaitUtils.untilVisible(this.saveButton, TIMEOUTS.SLOW_UI_MS);
      await expect(this.saveButton).toBeEnabled({ timeout: TIMEOUTS.SLOW_UI_MS });
      await this.click(this.saveButton, 'Save');
      await this.page.waitForTimeout(TIMEOUTS.SAVE_WAIT_MS);
    });
  }

  async assertSavedRows(data: CasingFlowData): Promise<void> {
    await step('Assert all saved Casing fields for every row', async () => {
      for (let i = 0; i < data.rows.length; i++) {
        const row = data.rows[i];
        const rowLabel = `Saved row ${i + 1}`;
        const lengthDisplay = formatCasingMdDisplay(
          String(Number(row.botMd.replace(/,/g, '')) - Number(row.topMd.replace(/,/g, ''))),
        );

        await this.assertCellContains(i, 0, lengthDisplay, `${rowLabel} Length`);
        await this.assertCellContains(i, 1, formatCasingMdDisplay(row.topMd), `${rowLabel} Top MD`);
        await this.assertCellContains(i, 2, formatCasingMdDisplay(row.botMd), `${rowLabel} Bot MD`);
        await this.assertCellContains(i, 3, row.casingTypeDisplay, `${rowLabel} Casing type`);
        await this.assertCellContains(i, 4, row.od, `${rowLabel} OD`);
        await this.assertCellContains(i, 5, row.weight, `${rowLabel} Weight`);
        await this.assertCellContains(i, 6, row.expectedId, `${rowLabel} ID`);
        await this.assertCellContains(i, 7, row.expectedGrade, `${rowLabel} Grade`);
      }
    });
  }

  async runCasingFlow(data: CasingFlowData): Promise<void> {
    await this.openCasing();
    await this.verifyPageChrome();
    await this.verifyTopMdCannotExceedBotMd(data);
    await this.fillCasingRows(data);
    await this.save();
    await this.assertSavedRows(data);
  }
}

export function createCasingPage(page: Page): CasingPage {
  return new CasingPage(page);
}
