import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { BasePage } from '../base/BasePage';
import {
  formatDrilledHoleDiamDisplay,
  formatDrilledHoleMdDisplay,
  type DrilledHoleFlowData,
  type DrilledHoleRowData,
} from '../excel/drilledHoleTestData';
import { AssertionUtils } from '../utils/AssertionUtils';
import { step } from '../utils/step';
import { WaitUtils } from '../utils/WaitUtils';

const FIELD_WAIT_MS = 15_000;

/**
 * Wellbore Configuration → Drilled Hole HandsOnTable.
 *
 * Edit pattern (matches staging codegen):
 *   1. Double-click the cell
 *   2. Playwright clear() then fill (never keyboard clear)
 *   3. Single-click a column header to commit the value
 *   4. Then double-click the next cell
 */
export class DrilledHolePage extends BasePage {
  private readonly wellboreLink = this.page.getByRole('link', { name: 'Wellbore Configuration' });
  private readonly drilledHoleTab = this.page.getByRole('tab', { name: 'Drilled Hole' });
  private readonly handsOnTable = this.page.locator('#handOnTableId');
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  private readonly nextButton = this.page.getByRole('button', { name: 'Next' });
  private readonly schematicButton = this.page.getByRole('button', { name: /Schematic/i });

  private cell(row: number, col: number): Locator {
    return this.handsOnTable.locator(`#cell-${row}-${col}`);
  }

  private editor(): Locator {
    return this.page.locator('textarea.handsontableInput, textarea').last();
  }

  /**
   * Single-click a column HEADER only (never the Open Hole cell / dropdown).
   * Use one locator only — `.or()` causes strict-mode violations when th + .table-header both match.
   * Codegen parity: getByText(header).nth(1) targets the visible HandsOnTable header chrome.
   */
  private async singleClickHeaderToCommit(headerText: string): Promise<void> {
    await step(`Single-click header "${headerText}" to commit cell`, async () => {
      const header = this.page.getByText(headerText, { exact: true }).nth(1);
      await WaitUtils.untilVisible(header, FIELD_WAIT_MS);
      await header.click({ force: true });
      await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
    });
  }

  /**
   * Commit via unambiguous headers only (Length / Top MD / Bot MD / Bit / Effective).
   * Never click "Open Hole" — that opens the hole-type dropdown in the cell.
   */
  private commitHeaderForColumn(col: number): string {
    switch (col) {
      case 1: // Top MD
        return 'Bot MD (ft)';
      case 2: // Bot MD
        return 'Length (ft)';
      case 4: // Bit Diam
        return 'Effective Diam (in)';
      case 5: // Effective Diam
        return 'Bit Diam (in)';
      default:
        return 'Bot MD (ft)';
    }
  }

  async openDrilledHole(): Promise<void> {
    await step('Open Wellbore Configuration → Drilled Hole', async () => {
      await WaitUtils.untilVisible(this.wellboreLink, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.wellboreLink, 'Wellbore Configuration');
      await WaitUtils.untilVisible(this.handsOnTable, TIMEOUTS.SLOW_UI_MS);

      if (await this.drilledHoleTab.isVisible().catch(() => false)) {
        await this.click(this.drilledHoleTab, 'Drilled Hole');
        await WaitUtils.untilVisible(this.handsOnTable, TIMEOUTS.SLOW_UI_MS);
      }
    });
  }

  async verifyPageChrome(): Promise<void> {
    await step('Verify Drilled Hole page chrome and column headers', async () => {
      await AssertionUtils.assertVisible(
        this.page.locator('div').filter({ hasText: /^×Casing$/ }).first(),
        'Casing chip visible',
      );
      await AssertionUtils.assertVisible(
        this.page.locator('div').filter({ hasText: /^×Length$/ }).first(),
        'Length chip visible',
      );
      await AssertionUtils.assertVisible(this.nextButton, 'Next button visible');
      await AssertionUtils.assertVisible(this.schematicButton, 'Schematic button visible');
      await AssertionUtils.assertTextContains(this.handsOnTable, 'Length (ft)');
      await AssertionUtils.assertTextContains(this.handsOnTable, 'Top MD (ft)');
      await AssertionUtils.assertTextContains(this.handsOnTable, 'Bot MD (ft)');
      await AssertionUtils.assertTextContains(this.handsOnTable, 'Open Hole');
      await AssertionUtils.assertTextContains(this.handsOnTable, 'Bit Diam (in)');
      await AssertionUtils.assertTextContains(this.handsOnTable, 'Effective Diam (in)');
    });
  }

  /**
   * Double-click cell → clear() → fill → single-click header to commit.
   * Never uses keyboard shortcuts to clear the cell.
   */
  private async clearAndFillCell(row: number, col: number, value: string, label: string): Promise<void> {
    const inputValue = String(value).replace(/,/g, '').trim();
    const cell = this.cell(row, col);
    const commit = this.commitHeaderForColumn(col);

    await step(`Enter ${label} = ${inputValue} (dblclick → clear → fill → header click)`, async () => {
      await WaitUtils.untilVisible(cell, TIMEOUTS.SLOW_UI_MS);
      await cell.scrollIntoViewIfNeeded();

      // Activate editor with double-click (codegen pattern)
      await this.dblclick(cell, label);

      const editor = this.editor();
      await WaitUtils.untilVisible(editor, FIELD_WAIT_MS);
      await editor.click({ force: true });
      await editor.clear();
      await editor.fill(inputValue);

      // Commit with a single HEADER click before the next cell dblclick
      await this.singleClickHeaderToCommit(commit);
    });
  }

  private async assertCellContains(row: number, col: number, expected: string, label: string): Promise<void> {
    const cell = this.cell(row, col);
    await WaitUtils.untilVisible(cell);
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

  /** Row 1: valid Top/Bot → invalid Top triggers validation → restore valid Top/Bot. */
  async verifyTopMdCannotExceedBotMd(data: DrilledHoleFlowData): Promise<void> {
    const row = data.rows[0];
    await step('Validate Top MD cannot be greater than Bottom MD', async () => {
      await this.clearAndFillCell(0, 1, row.topMd, 'Row 1 Top MD');
      await this.clearAndFillCell(0, 2, row.botMd, 'Row 1 Bot MD');

      await this.clearAndFillCell(0, 1, data.invalidTopMd, 'Row 1 invalid Top MD');
      // Header click already committed invalid Top MD — assert validation text
      await AssertionUtils.assertVisible(
        this.page.getByText(data.validationMessage, { exact: false }).first(),
        data.validationMessage,
      );

      await this.clearAndFillCell(0, 1, row.topMd, 'Row 1 Top MD (restore)');
      await this.clearAndFillCell(0, 2, row.botMd, 'Row 1 Bot MD (restore)');
    });
  }

  async fillDrilledHoleRows(data: DrilledHoleFlowData): Promise<void> {
    await step('Fill Drilled Hole rows from Excel', async () => {
      for (let i = 0; i < data.rows.length; i++) {
        await this.fillRow(i, data.rows[i], data.defaultDiamDisplay);
      }
    });
  }

  private async fillRow(
    rowIndex: number,
    row: DrilledHoleRowData,
    defaultDiamDisplay: string,
  ): Promise<void> {
    await step(`Fill Drilled Hole row ${rowIndex + 1}`, async () => {
      await this.clearAndFillCell(rowIndex, 1, row.topMd, `Row ${rowIndex + 1} Top MD`);
      await this.clearAndFillCell(rowIndex, 2, row.botMd, `Row ${rowIndex + 1} Bot MD`);

      // Skip Open Hole dropdown — leave UI default; do not click/select hole type

      if (row.bitDiam) {
        await this.clearAndFillCell(rowIndex, 4, row.bitDiam, `Row ${rowIndex + 1} Bit Diam`);
      } else {
        await this.assertCellContains(
          rowIndex,
          4,
          defaultDiamDisplay,
          `Row ${rowIndex + 1} Bit Diam default`,
        );
      }

      if (row.effectiveDiam) {
        await this.clearAndFillCell(
          rowIndex,
          5,
          row.effectiveDiam,
          `Row ${rowIndex + 1} Effective Diam`,
        );
      } else {
        await this.assertCellContains(
          rowIndex,
          5,
          defaultDiamDisplay,
          `Row ${rowIndex + 1} Effective Diam default`,
        );
      }
    });
  }

  async save(): Promise<void> {
    await step('Save Drilled Hole', async () => {
      // Commit any open editor before Save (safe header — never Open Hole cell)
      await this.singleClickHeaderToCommit('Bot MD (ft)');
      await WaitUtils.untilVisible(this.saveButton, TIMEOUTS.SLOW_UI_MS);
      await expect(this.saveButton).toBeEnabled({ timeout: TIMEOUTS.SLOW_UI_MS });
      await this.click(this.saveButton, 'Save');
      await this.page.waitForTimeout(TIMEOUTS.SAVE_WAIT_MS);
    });
  }

  async assertSavedRows(data: DrilledHoleFlowData): Promise<void> {
    await step('Assert saved Drilled Hole values', async () => {
      for (let i = 0; i < data.rows.length; i++) {
        const row = data.rows[i];
        await this.assertCellContains(
          i,
          2,
          formatDrilledHoleMdDisplay(row.botMd),
          `Saved row ${i + 1} Bot MD`,
        );

        const bitExpected = row.bitDiam
          ? formatDrilledHoleDiamDisplay(row.bitDiam)
          : data.defaultDiamDisplay;
        await this.assertCellContains(i, 4, bitExpected, `Saved row ${i + 1} Bit Diam`);
      }
    });
  }

  async runDrilledHoleFlow(data: DrilledHoleFlowData): Promise<void> {
    await this.openDrilledHole();
    await this.verifyPageChrome();
    await this.verifyTopMdCannotExceedBotMd(data);
    await this.fillDrilledHoleRows(data);
    await this.save();
    await this.assertSavedRows(data);
  }
}

export function createDrilledHolePage(page: Page): DrilledHolePage {
  return new DrilledHolePage(page);
}
