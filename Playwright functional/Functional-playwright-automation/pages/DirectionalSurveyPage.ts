import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { BasePage } from '../base/BasePage';
import type { DirectionalSurveyFlowData } from '../excel/directionalSurveyTestData';
import { AssertionUtils } from '../utils/AssertionUtils';
import { step } from '../utils/step';
import { WaitUtils } from '../utils/WaitUtils';

const FIELD_WAIT_MS = 20_000;

/**
 * Wellbore Configuration → Directional Survey.
 *
 * Flow: select MD/Inclination/Azimuth → assert headers → clear start cell →
 * paste TSV from Excel sheet `directionalSurvey` → Save → assert rows.
 */
export class DirectionalSurveyPage extends BasePage {
  private readonly wellboreLink = this.page.getByRole('link', { name: 'Wellbore Configuration' });
  private readonly directionalTab = this.page.getByRole('tab', { name: 'Directional Survey' });
  private readonly handsOnTable = this.page.locator('#handOnTableId');
  private readonly specify = this.page.locator('#specify');
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });

  private cell(row: number, col: number): Locator {
    const master = this.handsOnTable.locator(`.ht_master #cell-${row}-${col}`);
    return master.or(this.handsOnTable.locator(`#cell-${row}-${col}`)).first();
  }

  async openDirectionalSurvey(): Promise<void> {
    await step('Open Wellbore Configuration → Directional Survey', async () => {
      await WaitUtils.untilVisible(this.wellboreLink, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.wellboreLink, 'Wellbore Configuration');
      await WaitUtils.untilVisible(this.handsOnTable, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.directionalTab, 'Directional Survey');
      await WaitUtils.untilVisible(this.handsOnTable, TIMEOUTS.SLOW_UI_MS);
    });
  }

  async selectSurveyMode(mode: string): Promise<void> {
    await step(`Select survey mode "${mode}"`, async () => {
      const combo = this.specify.getByRole('combobox');
      await WaitUtils.untilVisible(combo, FIELD_WAIT_MS);
      await this.click(combo, 'Specify combobox');
      const option = this.page.getByText(mode, { exact: false }).first();
      await WaitUtils.untilVisible(option, FIELD_WAIT_MS);
      await this.click(option, mode);
      await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
    });
  }

  async verifyColumnHeaders(): Promise<void> {
    await step('Verify Directional Survey column headers', async () => {
      for (const header of [
        'MD (ft)',
        'Inclination (deg)',
        'Azimuth (deg)',
        'N-S (ft)',
        'E-W (ft)',
        'TVD (ft)',
      ]) {
        await AssertionUtils.assertTextContains(this.handsOnTable, header);
      }
    });
  }

  /** Prefer master HOT cell — left clone (#cell-0-0) intercepts normal clicks. */
  private startCell(): Locator {
    return this.handsOnTable.locator('.ht_master td#cell-0-0').first();
  }

  /** Playwright clear() on start cell before paste (not keyboard clear). */
  private async clearStartCell(): Promise<void> {
    await step('Clear start cell #cell-0-0 before paste', async () => {
      const start = this.startCell();
      await WaitUtils.untilVisible(start, FIELD_WAIT_MS);
      await start.dblclick({ force: true });

      const editor = this.page.locator('textarea.handsontableInput:visible, textarea:visible').last();
      await WaitUtils.untilVisible(editor, FIELD_WAIT_MS);
      await editor.click({ force: true });
      await editor.clear();

      // Commit clear so paste starts on an empty active cell
      await this.page.keyboard.press('Enter').catch(() => undefined);
      await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
    });
  }

  private async focusPasteStartCell(): Promise<void> {
    await step('Click Directional Survey start cell for paste', async () => {
      const start = this.startCell();
      await WaitUtils.untilVisible(start, FIELD_WAIT_MS);
      // force: clone-left overlay otherwise intercepts pointer events
      await start.click({ force: true });
      await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
    });
  }

  private async writeClipboard(tsv: string): Promise<void> {
    await step('Copy directionalSurvey sheet TSV to clipboard', async () => {
      const origin = new URL(this.page.url()).origin;
      await this.page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
      const ok = await this.page.evaluate(async (text) => {
        try {
          await navigator.clipboard.writeText(text);
          return true;
        } catch {
          // Fallback for environments blocking clipboard API
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          const copied = document.execCommand('copy');
          ta.remove();
          return copied;
        }
      }, tsv);
      if (!ok) {
        throw new Error('Unable to write Directional Survey TSV to clipboard');
      }
    });
  }

  async pasteSurveyFromExcel(tsv: string): Promise<void> {
    await step('Paste directionalSurvey Excel data into HandsOnTable', async () => {
      if (!tsv.trim()) {
        throw new Error('directionalSurvey paste TSV is empty');
      }
      await this.clearStartCell();
      await this.focusPasteStartCell();
      await this.writeClipboard(tsv);
      await this.page.keyboard.press('Control+v');
      await this.page.waitForTimeout(TIMEOUTS.SAVE_WAIT_MS);
    });
  }

  async save(): Promise<void> {
    await step('Save Directional Survey', async () => {
      await WaitUtils.untilVisible(this.saveButton, TIMEOUTS.SLOW_UI_MS);
      await expect(this.saveButton).toBeEnabled({ timeout: TIMEOUTS.SLOW_UI_MS });
      await this.click(this.saveButton, 'Save');
      await this.page.waitForTimeout(TIMEOUTS.SAVE_WAIT_MS);
    });
  }

  private async assertCellContains(
    row: number,
    col: number,
    expected: string,
    label: string,
  ): Promise<void> {
    const cell = this.cell(row, col);
    await step(`Assert ${label} equals "${expected}" (numeric-tolerant)`, async () => {
      await expect
        .poll(
          async () => {
            const actual = (await cell.textContent())?.trim() ?? '';
            return cellMatchesNumeric(actual, expected)
              ? 'match'
              : `expected~="${expected}" actual="${actual}"`;
          },
          { timeout: FIELD_WAIT_MS },
        )
        .toBe('match');
    });
  }

  /** Post-save checks for MD / Inclination / Azimuth from Excel sheet. */
  async assertPastedsRows(data: DirectionalSurveyFlowData): Promise<void> {
    await step('Assert pasted Directional Survey values', async () => {
      for (let i = 0; i < data.rows.length; i++) {
        const row = data.rows[i];
        await this.assertCellContains(i, 0, row.md, `Row ${i + 1} MD`);
        await this.assertCellContains(i, 1, row.inclination, `Row ${i + 1} Inclination`);
        await this.assertCellContains(i, 2, row.azimuth, `Row ${i + 1} Azimuth`);
      }
    });
  }

  async runDirectionalSurveyFlow(data: DirectionalSurveyFlowData): Promise<void> {
    await this.openDirectionalSurvey();
    await this.selectSurveyMode(data.surveyMode);
    await this.verifyColumnHeaders();
    await this.pasteSurveyFromExcel(data.pasteTsv);
    await this.save();
    await this.assertPastedsRows(data);
  }
}

/** Compare HOT display (e.g. 0.00 / 10,800.00) to Excel raw values without false substring hits. */
function cellMatchesNumeric(actual: string, expected: string): boolean {
  const a = actual.replace(/,/g, '').trim();
  const e = String(expected).replace(/,/g, '').trim();
  if (!e) return true;
  const an = Number(a);
  const en = Number(e);
  if (!Number.isNaN(an) && !Number.isNaN(en)) {
    return an === en;
  }
  return a.includes(e);
}

export function createDirectionalSurveyPage(page: Page): DirectionalSurveyPage {
  return new DirectionalSurveyPage(page);
}
