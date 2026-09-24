import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { BasePage } from '../base/BasePage';
import type { DesignTreatmentFlowData } from '../excel/designTreatmentTestData';
import { AssertionUtils } from '../utils/AssertionUtils';
import { WaitUtils } from '../utils/WaitUtils';
import { step } from '../utils/step';

const FIELD_WAIT_MS = 15_000;

/**
 * Treatment Schedule → Actual Treatment Schedule
 * (Import from Design + verify imported Excel values).
 */
export class ActualTreatmentScheduledPage extends BasePage {
  private readonly treatmentScheduleLink = this.page.getByRole('link', { name: 'Treatment Schedule' });
  private readonly materialSelectionLink = this.page.getByRole('link', { name: 'Material Selection' });
  private readonly pageTopbar = this.page.locator('#page-topbar');
  private readonly designTab = this.page.getByRole('tab', { name: 'Design Treatment Schedule' });
  private readonly actualTab = this.page.getByRole('tab', { name: 'Actual Treatment Schedule' });
  private readonly actualPanel = this.page.getByLabel('Actual Treatment Schedule');
  private readonly treatmentApp = this.page.locator('app-treatment-schedule');
  private readonly treegrid = this.page.getByLabel('Actual Treatment Schedule').getByRole('treegrid');
  private readonly importFromDesignButton = this.page.getByRole('button', { name: 'Import from Design' });
  private readonly setStagingButton = this.page.getByRole('button', {
    name: 'Set Staging from Measured Data',
  });
  private readonly nextButton = this.page.getByRole('button', { name: 'Next' });
  private readonly copyToButton = this.page.getByRole('button', { name: 'Copy To' });
  private readonly yesOverwriteButton = this.page.getByRole('button', { name: 'Yes, Overwrite' });
  private readonly noButton = this.page.getByRole('button', { name: 'No' });
  private readonly closeDialogButton = this.page.getByRole('button', { name: 'Close' });

  private static readonly CELL = {
    fluidType: (row: number) => `#cell-${row}-3`,
    proppantType: (row: number) => `#cell-${row}-4`,
    flowRate: (row: number) => `#cell-${row}-5`,
    propConc: (row: number) => `#cell-${row}-7`,
    cleanVol: (row: number) => `#cell-${row}-13`,
    stepProp: (row: number) => `#cell-${row}-20`,
  } as const;

  /** Scope cells to Actual panel — cell ids are duplicated on Design tab. */
  private cell(cellId: string): Locator {
    return this.actualPanel.locator(cellId).first();
  }

  private async isVisibleQuick(locator: Locator, timeout = 2000): Promise<boolean> {
    return locator.isVisible({ timeout }).catch(() => false);
  }

  async openTreatmentSchedule(): Promise<void> {
    await step('Open Treatment Schedule', async () => {
      await WaitUtils.untilVisible(this.treatmentScheduleLink, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.treatmentScheduleLink, 'Treatment Schedule');
      await WaitUtils.untilVisible(this.pageTopbar, TIMEOUTS.SLOW_UI_MS);
      await AssertionUtils.assertTextContains(this.pageTopbar, 'Treatment Schedule');
    });
  }

  async openActualTreatmentTab(): Promise<void> {
    await step('Open Actual Treatment Schedule tab', async () => {
      await WaitUtils.untilVisible(this.actualTab, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.actualTab, 'Actual Treatment Schedule');
      await WaitUtils.untilVisible(this.actualPanel, TIMEOUTS.SLOW_UI_MS);
      await AssertionUtils.assertTextContains(this.actualPanel, 'Wellbore Fluid');
    });
  }

  async verifyActualChrome(): Promise<void> {
    await step('Verify Actual Treatment Schedule chrome', async () => {
      await WaitUtils.untilVisible(this.actualPanel, TIMEOUTS.SLOW_UI_MS);
      await AssertionUtils.assertTextContains(this.actualPanel, 'Select Custom Columns');
      await AssertionUtils.assertTextContains(this.actualPanel, 'Wellbore Fluid');
      await AssertionUtils.assertVisible(
        this.page.locator('div').filter({ hasText: /^Select wellbore fluid×Binary 30 65$/ }).nth(1),
      );

      for (const header of [
        'Step Length (min)',
        'Step Type',
        'Fluid Type',
        'Proppant Type',
        'Flow Rate (bpm)',
        'Prop Conc (ppg)',
        'Clean Vol',
        'Step Prop (lbs)',
      ]) {
        await AssertionUtils.assertTextContains(this.treegrid, header);
      }

      await AssertionUtils.assertVisible(this.importFromDesignButton);
      await AssertionUtils.assertVisible(this.setStagingButton);
      await AssertionUtils.assertVisible(this.nextButton);
      await AssertionUtils.assertVisible(this.copyToButton);
    });
  }

  async importFromDesignAndConfirm(): Promise<void> {
    await step('Import from Design and confirm overwrite', async () => {
      await WaitUtils.untilVisible(this.importFromDesignButton);
      await this.click(this.importFromDesignButton, 'Import from Design');

      await WaitUtils.untilVisible(this.yesOverwriteButton, TIMEOUTS.SLOW_UI_MS);
      await AssertionUtils.assertVisible(this.yesOverwriteButton);
      await AssertionUtils.assertVisible(this.noButton);
      await AssertionUtils.assertVisible(this.closeDialogButton);
      await AssertionUtils.assertTextContains(
        this.page.getByRole('paragraph'),
        'Are you sure you want to overwrite the current Actual Treatment Schedule with the Design Treatment Schedule?',
      );
      await AssertionUtils.assertTextContains(this.page.locator('body'), 'Action Required');

      await this.click(this.yesOverwriteButton, 'Yes, Overwrite');
      await this.page.waitForTimeout(TIMEOUTS.SAVE_WAIT_MS);
      await WaitUtils.untilVisible(this.treegrid, TIMEOUTS.SLOW_UI_MS);
    });
  }

  private async assertCellContains(cellId: string, expected: string): Promise<void> {
    const cell = this.cell(cellId);
    await WaitUtils.untilVisible(cell);
    await step(`Verify Actual cell ${cellId} shows "${expected}"`, async () => {
      await expect
        .poll(
          async () => {
            const actual = (await cell.textContent())?.trim() ?? '';
            return actual.includes(expected) ? 'match' : `expected~="${expected}" actual="${actual}"`;
          },
          { timeout: FIELD_WAIT_MS },
        )
        .toBe('match');
    });
  }

  async assertImportedSchedule(data: DesignTreatmentFlowData): Promise<void> {
    await step('Assert Actual schedule values from Excel (imported Design)', async () => {
      const c = ActualTreatmentScheduledPage.CELL;
      const { row1, row2, totals } = data;

      await AssertionUtils.assertTextContains(this.treegrid, row1.expectedMetric);
      await AssertionUtils.assertTextContains(this.treegrid, row2.expectedMetric);
      await AssertionUtils.assertTextContains(this.treegrid, row1.stepType);
      await AssertionUtils.assertTextContains(this.treegrid, row2.stepType);

      await this.assertCellContains(c.fluidType(0), row1.fluidType);
      await this.assertCellContains(c.proppantType(0), row1.proppantType);
      await this.assertCellContains(c.flowRate(0), row1.flowRateDisplay);
      await this.assertCellContains(c.propConc(0), row1.propConcDisplay);
      await this.assertCellContains(c.cleanVol(0), row1.cleanVolDisplay);
      await this.assertCellContains(c.stepProp(0), row1.expectedStepProp);

      await this.assertCellContains(c.fluidType(1), row2.fluidType);
      await this.assertCellContains(c.proppantType(1), row2.proppantType);
      await this.assertCellContains(c.flowRate(1), row2.flowRateDisplay);
      await this.assertCellContains(c.propConc(1), row2.propConcDisplay);
      await this.assertCellContains(c.cleanVol(1), row2.cleanVolDisplay);
      await this.assertCellContains(c.stepProp(1), row2.expectedStepProp);

      await this.assertTotals(totals.totalCleanVol, totals.totalProp, totals.totalTime);
    });
  }

  private async assertTotals(
    totalCleanVol: string,
    totalProp: string,
    totalTime: string,
  ): Promise<void> {
    await step('Assert Actual Treatment totals from Excel', async () => {
      await expect(this.page.locator('.form-control').first()).toHaveValue(totalCleanVol, {
        timeout: FIELD_WAIT_MS,
      });
      await expect(
        this.page.locator('.total-column.ng-star-inserted > .input-group > .form-control').first(),
      ).toHaveValue(totalProp, { timeout: FIELD_WAIT_MS });
      await expect(this.page.locator('div:nth-child(3) > .input-group > .form-control').first()).toHaveValue(
        totalTime,
        { timeout: FIELD_WAIT_MS },
      );
    });
  }

  async verifyTreatmentDetailsSection(): Promise<void> {
    await step('Verify Treatment Details section labels', async () => {
      await AssertionUtils.assertTextContains(this.treatmentApp, 'Treatment Details');
      await AssertionUtils.assertTextContains(this.treatmentApp, 'Calculate Volume/Time');
      await AssertionUtils.assertTextContains(this.treatmentApp, 'Pulsed Proppant');
      await AssertionUtils.assertTextContains(this.treatmentApp, 'Include Step Aliases');
    });
  }

  async switchDesignThenActual(): Promise<void> {
    await step('Switch Design → Actual tabs', async () => {
      await WaitUtils.untilVisible(this.designTab);
      await this.click(this.designTab, 'Design Treatment Schedule');
      await WaitUtils.untilVisible(this.actualTab);
      await this.click(this.actualTab, 'Actual Treatment Schedule');
      await WaitUtils.untilVisible(this.actualPanel, TIMEOUTS.SLOW_UI_MS);
    });
  }

  async navigateMaterialThenBackToTreatment(): Promise<void> {
    await step('Navigate Material Selection → Treatment Schedule', async () => {
      await WaitUtils.untilVisible(this.materialSelectionLink, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.materialSelectionLink, 'Material Selection');
      await WaitUtils.untilVisible(this.treatmentScheduleLink, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.treatmentScheduleLink, 'Treatment Schedule');
      await WaitUtils.untilVisible(this.pageTopbar, TIMEOUTS.SLOW_UI_MS);
      await AssertionUtils.assertTextContains(this.pageTopbar, 'Treatment Schedule');
    });
  }

  async runActualTreatmentFlow(data: DesignTreatmentFlowData): Promise<void> {
    await this.openTreatmentSchedule();
    await this.openActualTreatmentTab();
    await this.verifyActualChrome();
    await this.importFromDesignAndConfirm();
    await this.assertImportedSchedule(data);
    await this.verifyTreatmentDetailsSection();
    await this.switchDesignThenActual();
    await this.navigateMaterialThenBackToTreatment();
  }
}

export function createActualTreatmentScheduledPage(page: Page): ActualTreatmentScheduledPage {
  return new ActualTreatmentScheduledPage(page);
}
