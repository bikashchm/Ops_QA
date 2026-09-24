import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { BasePage } from '../base/BasePage';
import type {
  DesignTreatmentFlowData,
  DesignTreatmentRowData,
  DesignTreatmentTestData,
} from '../excel/designTreatmentTestData';
import { logger } from '../logger';
import { AssertionUtils } from '../utils/AssertionUtils';
import { WaitUtils } from '../utils/WaitUtils';
import { step } from '../utils/step';

const FIELD_WAIT_MS = 12_000;
const GRID_SETTLE_MS = 500;
const FILL_ATTEMPTS = 3;

/**
 * Treatment Schedule → Design Treatment Schedule.
 * HandsOnTable: keyboard/type fill for numeric cells; cell-based asserts (not treegrid text).
 */
export class DesignTreatmentScheduledPage extends BasePage {
  private readonly treatmentScheduleLink = this.page.getByRole('link', { name: 'Treatment Schedule' });
  private readonly pageTopbar = this.page.locator('#page-topbar');
  private readonly designTab = this.page.getByRole('tab', { name: 'Design Treatment Schedule' });
  private readonly actualTab = this.page.getByRole('tab', { name: 'Actual Treatment Schedule' });
  private readonly designPanel = this.page.getByLabel('Design Treatment Schedule');
  private readonly treatmentApp = this.page.locator('app-treatment-schedule');
  private readonly treegrid = this.page.getByLabel('Design Treatment Schedule').getByRole('treegrid');
  private readonly editScheduleButton = this.page.getByRole('button', { name: 'Edit Schedule' });
  private readonly stopEditingButton = this.page.getByRole('button', { name: 'Stop Editing Schedule' });
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  private readonly nextButton = this.page.getByRole('button', { name: 'Next' });
  private readonly importFromXopsButton = this.page.getByRole('button', { name: 'Import from XOPS' });
  private readonly copyToButton = this.page.getByRole('button', { name: 'Copy To' });
  private readonly timeFromVolume = this.page.locator('#timeFromVolume');
  private readonly propModeDropdown = this.page
    .locator('label')
    .filter({ hasText: /Prop Mode/ })
    .locator('..')
    .locator('ng-select');
  private readonly selectCustomColumnsHeading = this.page.getByRole('heading', {
    name: 'Select Custom Columns',
  });

  private static readonly CELL = {
    stepLength: (row: number) => `#cell-${row}-0`,
    stepType: (row: number) => `#cell-${row}-1`,
    fluidType: (row: number) => `#cell-${row}-3`,
    proppantType: (row: number) => `#cell-${row}-4`,
    flowRate: (row: number) => `#cell-${row}-5`,
    propConc: (row: number) => `#cell-${row}-7`,
    propConc2: (row: number) => `#cell-${row}-8`,
    cleanVol: (row: number) => `#cell-${row}-13`,
    stepProp: (row: number) => `#cell-${row}-20`,
    cumulTime: (row: number) => `#cell-${row}-21`,
    slurryVol: (row: number) => `#cell-${row}-22`,
    cleanCum: (row: number) => `#cell-${row}-23`,
    propCum: (row: number) => `#cell-${row}-24`,
  } as const;

  private cell(cellId: string, scope?: Locator): Locator {
    const root = scope ?? this.designPanel;
    return root.locator(`.ht_master td${cellId}`).or(root.locator(cellId)).first();
  }

  private async isVisibleQuick(locator: Locator, timeout = 1500): Promise<boolean> {
    return locator.isVisible({ timeout }).catch(() => false);
  }

  private normalizeCellText(value: string): string {
    return value.replace(/,/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  private cellTextMatches(actual: string, expected: string): boolean {
    const a = this.normalizeCellText(actual);
    const e = this.normalizeCellText(expected);
    if (!e) return true;
    if (a.includes(e)) return true;
    if (e && a.includes(`${e}.00`)) return true;
    // Truncated UI labels e.g. "100 Mesh Arizo..."
    if (e.length > 8 && a.includes(e.slice(0, 10))) return true;
    return false;
  }

  private async readCellText(cellId: string, scope?: Locator): Promise<string> {
    return ((await this.cell(cellId, scope).textContent().catch(() => '')) ?? '').trim();
  }

  private async settleGrid(ms = GRID_SETTLE_MS): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  private async dismissOpenEditors(): Promise<void> {
    await this.page.keyboard.press('Escape').catch(() => undefined);
  }

  async openTreatmentSchedule(): Promise<void> {
    await step('Open Treatment Schedule', async () => {
      await WaitUtils.untilVisible(this.treatmentScheduleLink, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.treatmentScheduleLink, 'Treatment Schedule');
      await WaitUtils.untilVisible(this.pageTopbar, TIMEOUTS.SLOW_UI_MS);
      await AssertionUtils.assertTextContains(this.pageTopbar, 'Treatment Schedule');
    });
  }

  async openDesignTreatmentTab(): Promise<void> {
    await step('Open Design Treatment Schedule tab', async () => {
      await WaitUtils.untilVisible(this.designTab, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.designTab, 'Design Treatment Schedule');
      await WaitUtils.untilVisible(this.designPanel, TIMEOUTS.SLOW_UI_MS);
      await AssertionUtils.assertTextContains(this.designPanel, 'Wellbore Fluid');
    });
  }

  async verifyDesignChrome(): Promise<void> {
    await step('Verify Design Treatment Schedule chrome', async () => {
      await WaitUtils.untilVisible(this.selectCustomColumnsHeading);
      await this.click(this.selectCustomColumnsHeading, 'Select Custom Columns');

      for (const header of [
        'Step Length (min)',
        'Step Type',
        'Fluid Type',
        'Proppant Type',
        'Flow Rate (bpm)',
        'Prop Conc (ppg)',
        'Clean Vol (gal)',
        'Step Prop (lbs)',
      ]) {
        await AssertionUtils.assertTextContains(this.treegrid, header);
      }

      await AssertionUtils.assertVisible(this.nextButton);
      await AssertionUtils.assertVisible(this.importFromXopsButton);
      await AssertionUtils.assertVisible(this.editScheduleButton);
      await AssertionUtils.assertVisible(this.copyToButton);
      await AssertionUtils.assertVisible(this.page.getByText('Time from Volume'));
    });
  }

  async selectAllCustomColumns(): Promise<void> {
    await step('Select All custom columns', async () => {
      const designHeading = this.designPanel.getByRole('heading', { name: 'Select Custom Columns' });
      const designDropdown = this.designPanel.locator('span.dropdown-btn').first();
      const selectAll = this.designPanel.getByText('Select All', { exact: true });

      await this.click(designHeading, 'Select Custom Columns');
      if (!(await this.isVisibleQuick(selectAll))) {
        if (await this.isVisibleQuick(designDropdown)) {
          await this.click(designDropdown, 'Custom Columns dropdown');
        } else {
          await this.click(designHeading, 'Select Custom Columns');
        }
      }
      await this.click(selectAll, 'Select All');
    });
  }

  async enterEditScheduleMode(): Promise<void> {
    await step('Click Edit Schedule', async () => {
      if (await this.isVisibleQuick(this.stopEditingButton, 2_000)) {
        await this.click(this.stopEditingButton, 'Stop Editing Schedule');
        await WaitUtils.untilVisible(this.editScheduleButton);
      }
      await WaitUtils.untilVisible(this.editScheduleButton);
      await this.click(this.editScheduleButton, 'Edit Schedule');
      await this.settleGrid();
    });
  }

  private async resolveNumericEditor(): Promise<Locator | null> {
    const candidates: Locator[] = [
      this.page.locator('textarea.handsontableInput:focus'),
      this.page.locator('input.handsontableInput:focus'),
      this.page.locator('.handsontableInputHolder textarea:visible, .handsontableInputHolder input:visible').last(),
      this.page.locator('textarea.handsontableInput:visible').last(),
      this.page.getByRole('textbox').nth(5),
      this.page.getByRole('textbox').nth(4),
    ];

    for (const candidate of candidates) {
      if (!(await candidate.isVisible().catch(() => false))) continue;
      const name = (await candidate.getAttribute('name').catch(() => '')) ?? '';
      const aria = (await candidate.getAttribute('aria-label').catch(() => '')) ?? '';
      if (name === '__htFocusCatcher' || /focus catcher/i.test(aria)) continue;
      if (!(await candidate.isEditable().catch(() => false))) continue;
      return candidate;
    }
    return null;
  }

  /** Numeric HOT: open cell → replace selected value → Enter → verify. */
  private async fillCellById(cellId: string, value: string, scope?: Locator, label?: string): Promise<void> {
    const inputValue = String(value).replace(/,/g, '').trim();
    const fieldLabel = label ?? `Design Treatment ${cellId}`;

    for (let attempt = 1; attempt <= FILL_ATTEMPTS; attempt++) {
      const cell = this.cell(cellId, scope);
      logger.info(`${fieldLabel}: fill attempt ${attempt}/${FILL_ATTEMPTS} = ${inputValue}`);

      try {
        await this.dismissOpenEditors();
        await WaitUtils.untilVisible(cell, FIELD_WAIT_MS);
        await cell.scrollIntoViewIfNeeded();
        await cell.click({ force: true });
        await cell.dblclick({ force: true });
        await this.page.waitForTimeout(200);

        const editor = await this.resolveNumericEditor();
        if (editor) {
          await editor.click({ force: true });
          await editor.press('Control+a').catch(() => undefined);
          await editor.fill(inputValue);
        } else {
          await this.page.keyboard.press('Control+a');
          await this.page.keyboard.type(inputValue, { delay: 15 });
        }

        await this.page.keyboard.press('Enter');
        await this.settleGrid();

        const actual = await this.readCellText(cellId, scope);
        if (this.cellTextMatches(actual, inputValue) || this.cellTextMatches(actual, value)) {
          return;
        }
        logger.info(`${fieldLabel}: not committed (actual="${actual}")`);
      } catch (error) {
        logger.info(
          `${fieldLabel}: attempt ${attempt} failed — ${error instanceof Error ? error.message : String(error)}`,
        );
        await this.dismissOpenEditors();
      }
    }

    throw new Error(
      `${fieldLabel}: HandsOnTable did not accept "${inputValue}" (actual="${await this.readCellText(cellId, scope)}")`,
    );
  }

  private async fillCleanVolRow1(cleanVol: string): Promise<void> {
    await WaitUtils.untilVisible(this.timeFromVolume);
    await this.actions.check(this.timeFromVolume, 'Time from Volume');
    await this.settleGrid();
    await this.fillCellById(
      DesignTreatmentScheduledPage.CELL.cleanVol(0),
      cleanVol,
      this.designPanel,
      `Row 1 Clean Vol (${cleanVol})`,
    );
  }

  private async selectListCell(
    cellId: string,
    optionName: string,
    label: string,
    scope?: Locator,
  ): Promise<void> {
    const escaped = optionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    for (let attempt = 1; attempt <= FILL_ATTEMPTS; attempt++) {
      if (this.cellTextMatches(await this.readCellText(cellId, scope), optionName)) {
        return;
      }

      const cell = this.cell(cellId, scope);
      await this.dismissOpenEditors();
      await WaitUtils.untilVisible(cell, FIELD_WAIT_MS);
      await cell.scrollIntoViewIfNeeded();
      await cell.dblclick({ force: true });
      await this.page.waitForTimeout(200);

      const option = this.page
        .getByRole('option', { name: new RegExp(`^${escaped}$`, 'i') })
        .or(this.page.getByText(optionName, { exact: true }))
        .first();

      try {
        await WaitUtils.untilVisible(option, FIELD_WAIT_MS);
        await option.click({ force: true });
        await this.settleGrid();
        if (this.cellTextMatches(await this.readCellText(cellId, scope), optionName)) {
          return;
        }
      } catch (error) {
        logger.info(
          `${label}: attempt ${attempt} failed — ${error instanceof Error ? error.message : String(error)}`,
        );
        await this.dismissOpenEditors();
      }
    }

    throw new Error(
      `${label}: could not select "${optionName}" (actual="${await this.readCellText(cellId, scope)}")`,
    );
  }

  private async selectStepType(rowIndex: number, stepType: string): Promise<void> {
    await this.selectListCell(
      DesignTreatmentScheduledPage.CELL.stepType(rowIndex),
      stepType,
      `Row ${rowIndex + 1} Step Type`,
      this.designPanel,
    );
  }

  private async selectProppantType(rowIndex: number, proppantType: string): Promise<void> {
    await this.selectListCell(
      DesignTreatmentScheduledPage.CELL.proppantType(rowIndex),
      proppantType,
      `Row ${rowIndex + 1} Proppant Type`,
      this.designPanel,
    );
  }

  async fillRow1(row: DesignTreatmentRowData): Promise<void> {
    await step(`Fill Design row 1 (${row.stepType}) from Excel`, async () => {
      await this.selectStepType(0, row.stepType);
      await this.fillCellById(
        DesignTreatmentScheduledPage.CELL.flowRate(0),
        row.flowRate,
        this.designPanel,
        `Row 1 Flow Rate (${row.flowRate})`,
      );
      await this.fillCellById(
        DesignTreatmentScheduledPage.CELL.propConc(0),
        row.propConc,
        this.designPanel,
        `Row 1 Prop Conc (${row.propConc})`,
      );
      await this.fillCleanVolRow1(row.cleanVol);
      await this.selectProppantType(0, row.proppantType);
    });
  }

  async fillRow2(row: DesignTreatmentRowData): Promise<void> {
    await step(`Fill Design row 2 (${row.stepType}) from Excel`, async () => {
      await this.selectStepType(1, row.stepType);
      await this.fillCellById(
        DesignTreatmentScheduledPage.CELL.flowRate(1),
        row.flowRate,
        this.designPanel,
        `Row 2 Flow Rate (${row.flowRate})`,
      );
      await this.fillCellById(
        DesignTreatmentScheduledPage.CELL.propConc(1),
        row.propConc,
        this.designPanel,
        `Row 2 Prop Conc (${row.propConc})`,
      );
      await this.fillCellById(
        DesignTreatmentScheduledPage.CELL.cleanVol(1),
        row.cleanVol,
        this.designPanel,
        `Row 2 Clean Vol (${row.cleanVol})`,
      );
      await this.selectProppantType(1, row.proppantType);
    });
  }

  private async assertCellContains(cellId: string, expected: string, scope?: Locator): Promise<void> {
    const cell = this.cell(cellId, scope ?? this.designPanel);
    await WaitUtils.untilVisible(cell);
    await expect
      .poll(
        async () => {
          const actual = (await cell.textContent())?.trim() ?? '';
          return this.cellTextMatches(actual, expected)
            ? 'match'
            : `expected~="${expected}" actual="${actual}"`;
        },
        { timeout: FIELD_WAIT_MS },
      )
      .toBe('match');
  }

  /**
   * Assert entered values + proppant/fluid + Step Length / Step Prop / Total Time from Excel.
   * Wellbore Volume field itself is not asserted.
   */
  async assertRow1Values(row: DesignTreatmentRowData): Promise<void> {
    await step('Assert Design row 1 values from Excel', async () => {
      const c = DesignTreatmentScheduledPage.CELL;
      await this.assertCellContains(c.stepType(0), row.stepType, this.designPanel);
      await this.assertCellContains(c.fluidType(0), row.fluidType, this.designPanel);
      await this.assertCellContains(c.proppantType(0), row.proppantType, this.designPanel);
      await this.assertCellContains(c.flowRate(0), row.flowRateDisplay, this.designPanel);
      await this.assertCellContains(c.propConc(0), row.propConcDisplay, this.designPanel);
      await this.assertCellContains(c.cleanVol(0), row.cleanVolDisplay, this.designPanel);
      await this.assertCellContains(c.stepLength(0), row.expectedMetric, this.designPanel);
      await this.assertCellContains(c.stepProp(0), row.expectedStepProp, this.designPanel);
    });
  }

  async assertRow2Values(row: DesignTreatmentRowData, _includeCum = true): Promise<void> {
    await step('Assert Design row 2 values from Excel', async () => {
      const c = DesignTreatmentScheduledPage.CELL;
      await this.assertCellContains(c.stepType(1), row.stepType);
      await this.assertCellContains(c.fluidType(1), row.fluidType);
      await this.assertCellContains(c.proppantType(1), row.proppantType);
      await this.assertCellContains(c.flowRate(1), row.flowRateDisplay);
      await this.assertCellContains(c.propConc(1), row.propConcDisplay);
      await this.assertCellContains(c.cleanVol(1), row.cleanVolDisplay);
      await this.assertCellContains(c.stepLength(1), row.expectedMetric);
      await this.assertCellContains(c.stepProp(1), row.expectedStepProp);
    });
  }

  async assertTotals(data: DesignTreatmentTestData): Promise<void> {
    await step('Assert Design Treatment totals from Excel', async () => {
      const totalRoot = this.page.locator(
        '.card-body.position-relative > .mt-3 > .total-row > .total-right',
      );
      await expect(totalRoot.locator('div > .input-group > .form-control').first()).toHaveValue(
        data.totals.totalTime,
        { timeout: FIELD_WAIT_MS },
      );
      await expect(
        totalRoot.locator('div:nth-child(2) > .input-group > .form-control'),
      ).toHaveValue(data.totals.totalCleanVol, { timeout: FIELD_WAIT_MS });
      await expect(
        totalRoot.locator('.total-column.ng-star-inserted > .input-group > .form-control'),
      ).toHaveValue(data.totals.totalProp, { timeout: FIELD_WAIT_MS });
    });
  }

  async saveSchedule(): Promise<void> {
    await step('Save Design Treatment Schedule', async () => {
      await WaitUtils.untilVisible(this.saveButton);
      if (await this.saveButton.isDisabled().catch(() => false)) {
        logger.info('Save disabled — schedule already persisted with current values');
        return;
      }
      await this.click(this.saveButton, 'Save');
      await this.page.waitForTimeout(TIMEOUTS.SAVE_WAIT_MS);
    });
  }

  async switchActualThenDesign(): Promise<void> {
    await step('Switch Actual → Design tabs', async () => {
      await this.click(this.actualTab, 'Actual Treatment Schedule');
      await this.click(this.designTab, 'Design Treatment Schedule');
      await WaitUtils.untilVisible(this.designPanel, TIMEOUTS.SLOW_UI_MS);
    });
  }

  async refreshPage(): Promise<void> {
    await step('Refresh Design Treatment Schedule page', async () => {
      await this.page.reload({ waitUntil: 'domcontentloaded', timeout: TIMEOUTS.SLOW_UI_MS });
      if (await this.isVisibleQuick(this.designTab, 5_000)) {
        await this.openDesignTreatmentTab();
      } else if (await this.isVisibleQuick(this.treatmentScheduleLink, 5_000)) {
        await this.openTreatmentSchedule();
        await this.openDesignTreatmentTab();
      }
    });
  }

  async switchPropMode(mode: string): Promise<void> {
    await step(`Switch prop mode to ${mode}`, async () => {
      await this.enterEditScheduleMode().catch(() => undefined);
      const stagedChip = this.page.locator('div').filter({ hasText: /^×Staged$/ }).first();
      const propInput = this.propModeDropdown.locator('.ng-input > input').first();

      if (mode.toLowerCase() === 'ramped') {
        if (await this.isVisibleQuick(stagedChip, 2_000)) {
          await stagedChip.click();
        } else {
          await propInput.click();
        }
        await this.page.getByText('Ramped', { exact: true }).click();
      } else {
        await propInput.click();
        await this.page.getByText('Staged', { exact: true }).click();
      }
    });
  }

  async assertRampedMode(data: DesignTreatmentTestData): Promise<void> {
    await step('Assert Ramped mode columns from Excel', async () => {
      const c = DesignTreatmentScheduledPage.CELL;
      await AssertionUtils.assertTextContains(this.treegrid, 'Prop Conc 2 (ppg)');
      await this.assertCellContains(c.propConc2(0), data.row1.propConcDisplay, this.designPanel);
      await this.assertCellContains(c.propConc2(1), data.row2.propConcDisplay);
      await this.assertTotals(data);
      await AssertionUtils.assertVisible(this.stopEditingButton);
    });
  }

  async assertStagedChipVisible(): Promise<void> {
    await step('Assert Staged chip visible', async () => {
      await expect(this.page.locator('div').filter({ hasText: /^×Staged$/ }).first()).toBeVisible({
        timeout: FIELD_WAIT_MS,
      });
    });
  }

  async stopEditing(): Promise<void> {
    await step('Stop Editing Schedule', async () => {
      if (await this.isVisibleQuick(this.stopEditingButton, 3_000)) {
        await this.click(this.stopEditingButton, 'Stop Editing Schedule');
      }
      await AssertionUtils.assertVisible(this.editScheduleButton);
    });
  }

  async runDesignTreatmentFlow(data: DesignTreatmentFlowData): Promise<void> {
    await this.openTreatmentSchedule();
    await this.openDesignTreatmentTab();
    await this.verifyDesignChrome();
    await this.selectAllCustomColumns();
    await this.enterEditScheduleMode();
    await this.fillRow1(data.row1);
    await this.fillRow2(data.row2);
    await this.saveSchedule();
    await this.assertRow1Values(data.row1);
    await this.assertRow2Values(data.row2, true);
    await this.assertTotals(data);
    await this.switchActualThenDesign();
    await this.refreshPage();
    await this.stopEditing();
    await this.enterEditScheduleMode();
    await this.switchPropMode(data.propModeRamped);
    await this.saveSchedule();
    await this.assertRampedMode(data);
    await this.switchPropMode(data.propModeStaged);
    await this.saveSchedule();
    await this.assertStagedChipVisible();
    await this.stopEditing();
  }
}

export function createDesignTreatmentScheduledPage(page: Page): DesignTreatmentScheduledPage {
  return new DesignTreatmentScheduledPage(page);
}
