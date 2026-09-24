import { expect, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { BasePage } from '../base/BasePage';
import type { TreatmentTotalsFlowData } from '../excel/treatmentTotalsTestData';
import { AssertionUtils } from '../utils/AssertionUtils';
import { WaitUtils } from '../utils/WaitUtils';
import { step } from '../utils/step';

const FIELD_WAIT_MS = 15_000;

/**
 * Treatment Schedule → Treatment Totals tab.
 */
export class TreatmentTotalsPage extends BasePage {
  private readonly treatmentScheduleLink = this.page.getByRole('link', { name: 'Treatment Schedule' });
  private readonly pageTopbar = this.page.locator('#page-topbar');
  private readonly totalsTab = this.page.getByRole('tab', { name: 'Treatment Totals' });
  private readonly totalsPanel = this.page.getByLabel('Treatment Totals');
  private readonly totalsForm = this.page.getByLabel('Treatment Totals').locator('form');
  private readonly nextButton = this.page.getByRole('button', { name: 'Next' });
  private readonly copyToButton = this.page.getByRole('button', { name: 'Copy To' });
  private readonly chatIcon = this.page.locator('.fixed-chat-icon');

  async openTreatmentSchedule(): Promise<void> {
    await step('Open Treatment Schedule', async () => {
      await WaitUtils.untilVisible(this.treatmentScheduleLink, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.treatmentScheduleLink, 'Treatment Schedule');
      await WaitUtils.untilVisible(this.pageTopbar, TIMEOUTS.SLOW_UI_MS);
      await AssertionUtils.assertTextContains(this.pageTopbar, 'Treatment Schedule');
    });
  }

  async openTreatmentTotalsTab(): Promise<void> {
    await step('Open Treatment Totals tab', async () => {
      await WaitUtils.untilVisible(this.totalsTab, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.totalsTab, 'Treatment Totals');
      await WaitUtils.untilVisible(this.totalsPanel, TIMEOUTS.SLOW_UI_MS);
      await WaitUtils.untilVisible(this.totalsForm, TIMEOUTS.SLOW_UI_MS);
    });
  }

  async verifyTreatmentSpecsFromExcel(data: TreatmentTotalsFlowData): Promise<void> {
    await step('Verify Treatment Specs values from Excel', async () => {
      await AssertionUtils.assertTextContains(this.totalsForm, 'Totals for');
      await AssertionUtils.assertTextContains(this.totalsForm, 'Totals split by');
      await AssertionUtils.assertTextContains(this.totalsForm, 'Treatment Specs');
      await AssertionUtils.assertTextContains(this.totalsForm, 'Proppant and Fluid');

      await AssertionUtils.assertVisible(this.page.locator('#formRadio1'));
      await AssertionUtils.assertVisible(this.page.locator('#formRadio3'));

      await expect(
        this.page.locator('.col-12.col-sm-6.col-md-4.col-lg-3.mt-0 > .input-group > .form-control').first(),
      ).toHaveValue(data.specField1, { timeout: FIELD_WAIT_MS });
      await expect(
        this.page.locator('.row.gy-3.gx-0.gap-3.w-100 > div:nth-child(2) > .input-group > .form-control'),
      ).toHaveValue(data.specField2, { timeout: FIELD_WAIT_MS });
      await expect(
        this.page.locator('.row.gy-3.gx-0.gap-3.w-100 > div:nth-child(3) > .input-group > .form-control'),
      ).toHaveValue(data.specField3, { timeout: FIELD_WAIT_MS });
      await expect(
        this.page.locator('.row.gy-3.gx-0.gap-3.w-100 > div:nth-child(4) > .input-group > .form-control'),
      ).toHaveValue(data.specField4, { timeout: FIELD_WAIT_MS });
    });
  }

  async verifyMaterialsFromExcel(data: TreatmentTotalsFlowData): Promise<void> {
    await step('Verify Materials grid from Excel', async () => {
      for (const label of [
        'Materials',
        'Quantity',
        'Units',
        'Unit Cost ($)',
        'Discount (%)',
        'Cost ($)',
      ]) {
        await AssertionUtils.assertTextContains(this.totalsForm, label);
      }

      await AssertionUtils.assertVisible(this.page.getByText('Include Cost'));
      await AssertionUtils.assertTextContains(this.totalsForm, data.fluidName);
      await AssertionUtils.assertTextContains(
        this.totalsPanel.locator('#cell-1-0'),
        data.proppantName,
      );
    });
  }

  async verifyCostAndActionChrome(): Promise<void> {
    await step('Verify cost summary and action buttons', async () => {
      await AssertionUtils.assertTextContains(this.totalsForm, 'Additional Items');
      await AssertionUtils.assertVisible(this.page.getByText('Additional Cost Sub Total'));
      await AssertionUtils.assertVisible(this.page.getByText('Total Cost'));
      await AssertionUtils.assertVisible(this.nextButton);
      await AssertionUtils.assertVisible(this.copyToButton);
    });
  }

  async verifyActualDataSection(): Promise<void> {
    await step('Verify Actual Data section labels', async () => {
      for (const label of [
        'Actual Data',
        'Injection',
        'N2 Storage Vol',
        'CO2 Storage Vol',
        'Pad Fraction',
        'Pad Vol',
        'Clean Vol (Main Frac)',
        'Slurry Vol (Main Frac)',
        'Total Prop (Main Frac)',
        'Flush Vol',
      ]) {
        await AssertionUtils.assertTextContains(this.totalsForm, label);
      }

      for (const unit of ['bbls', 'lbs', 'Mscf', 'klbs', '%']) {
        await AssertionUtils.assertTextContains(this.totalsForm, unit);
      }

      await AssertionUtils.assertVisible(this.chatIcon);
    });
  }

  async verifyTreatmentTotalsFromExcel(data: TreatmentTotalsFlowData): Promise<void> {
    await this.verifyTreatmentSpecsFromExcel(data);
    await this.verifyMaterialsFromExcel(data);
    await this.verifyCostAndActionChrome();
    await this.verifyActualDataSection();
  }

  async runTreatmentTotalsFlow(data: TreatmentTotalsFlowData): Promise<void> {
    await this.openTreatmentSchedule();
    await this.openTreatmentTotalsTab();
    await this.verifyTreatmentTotalsFromExcel(data);
  }
}

export function createTreatmentTotalsPage(page: Page): TreatmentTotalsPage {
  return new TreatmentTotalsPage(page);
}
