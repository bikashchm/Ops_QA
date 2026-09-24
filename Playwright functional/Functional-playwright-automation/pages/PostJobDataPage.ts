import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import type { PostJobDataTestData } from '../excel/postJobDataTestData';
import { BasePage } from '../base/BasePage';
import { AssertionUtils } from '../utils/AssertionUtils';
import { step } from '../utils/step';
import { WaitUtils } from '../utils/WaitUtils';

const FIELD_WAIT_MS = 15_000;

/**
 * Results → Report → Post Job Data.
 * Excel-driven defaults, Clear Data, fill, Save, and persistence asserts (codegen-aligned).
 */
export class PostJobDataPage extends BasePage {
  private readonly resultsSectionIcon = this.page
    .getByRole('link', { name: /icon\s+Results/i })
    .first();
  private readonly reportNavLink = this.page.getByRole('link', { name: 'Report', exact: true });
  private readonly postJobDataTab = this.page.getByRole('tab', { name: 'Post Job Data' });
  private readonly postJobPanel = this.page.getByRole('tabpanel', { name: 'Post Job Data' });
  private readonly displayPrcPlotButton = this.page.getByRole('button', { name: 'Display PRC Plot' });
  private readonly clearDataButton = this.page.getByRole('button', { name: 'Clear Data' });
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  private readonly bacteriaInput = this.page.locator(
    '#bacteriaTreatmentMethod > .ng-select-container > .ng-value-container > .ng-input > input',
  );
  private readonly padStageCompleted = this.page.locator('#padStageCompleted');
  private readonly padStageTotal = this.page.locator('#padStageTotal');

  private field(name: string): Locator {
    return this.page.getByRole('textbox', { name });
  }

  private async ensureResultsSectionExpanded(): Promise<void> {
    if (await this.reportNavLink.isVisible().catch(() => false)) {
      return;
    }
    await this.click(this.resultsSectionIcon, 'Results section');
    await WaitUtils.untilVisible(this.reportNavLink, TIMEOUTS.SLOW_UI_MS);
  }

  async openPostJobData(): Promise<void> {
    await step('Open Results → Report → Post Job Data', async () => {
      await this.ensureResultsSectionExpanded();
      await this.click(this.reportNavLink, 'Report');
      await WaitUtils.untilVisible(this.postJobDataTab, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.postJobDataTab, 'Post Job Data');
      await WaitUtils.untilVisible(this.postJobPanel, TIMEOUTS.SLOW_UI_MS);
      await WaitUtils.untilVisible(this.field('Kickoff TVD'), TIMEOUTS.SLOW_UI_MS);
    });
  }

  private async assertFieldValue(name: string, expected: string): Promise<void> {
    await expect(this.field(name)).toHaveValue(expected, { timeout: FIELD_WAIT_MS });
  }

  private async fillField(name: string, value: string): Promise<void> {
    const input = this.field(name);
    await this.click(input, name);
    await input.fill(value);
  }

  async verifyDefaultValues(data: PostJobDataTestData): Promise<void> {
    await step('Verify Post Job Data default field values from Excel', async () => {
      const d = data.defaults;
      await this.assertFieldValue('Kickoff TVD', d.kickoffTvd);
      await this.assertFieldValue('Plug Depth', d.plugDepth);
      await this.assertFieldValue('Produced Water', d.producedWater);
      await this.assertFieldValue('Design Avg. Treating Pressure', d.designAvgTreatingPressure);
      await this.assertFieldValue('Design Avg. Frac Gradient', d.designAvgFracGradient);
      await this.assertFieldValue('Charge Weight', d.chargeWeight);
      await this.assertFieldValue("Operator's Max Pressure", d.operatorsMaxPressure);
      await this.assertFieldValue('Pumpdown Volume', d.pumpdownVolume);
      await this.assertFieldValue('Pumpdown Max Pressure', d.pumpdownMaxPressure);
      await this.assertFieldValue('Pumpdown Max Rate', d.pumpdownMaxRate);
      await this.assertFieldValue('Field Gas', d.fieldGas);
      await this.assertFieldValue('CNG', d.cng);
      await this.assertFieldValue('Diesel', d.diesel);
      await this.assertFieldValue('Chlorides', d.chlorides);
      await this.assertFieldValue('Override Surface Max Pressure', d.overrideSurfaceMaxPressure);
      await expect(this.bacteriaInput).toBeEmpty({ timeout: FIELD_WAIT_MS });

      await this.click(this.page.getByText('Pad Stage No.'), 'Pad Stage No.');
      await expect(this.padStageCompleted).toHaveValue(d.padStageCompleted, {
        timeout: FIELD_WAIT_MS,
      });
      await expect(this.padStageTotal).toHaveValue(d.padStageTotal, { timeout: FIELD_WAIT_MS });

      await AssertionUtils.assertVisible(this.displayPrcPlotButton, 'Display PRC Plot');
      await AssertionUtils.assertVisible(this.clearDataButton, 'Clear Data');
    });
  }

  async verifyClearDataResetsSampleFields(data: PostJobDataTestData): Promise<void> {
    await step('Fill sample fields, Clear Data, assert defaults restored', async () => {
      const sample = data.clearSampleValue;
      const d = data.defaults;

      await this.fillField('Kickoff TVD', sample);
      await this.fillField('Plug Depth', sample);
      await this.fillField('Pumpdown Max Pressure', sample);
      await this.fillField('Field Gas', sample);

      await this.click(this.clearDataButton, 'Clear Data');

      await this.assertFieldValue('Kickoff TVD', d.kickoffTvd);
      await this.assertFieldValue('Plug Depth', d.plugDepth);
      await this.assertFieldValue('Pumpdown Max Pressure', d.pumpdownMaxPressure);
      await this.assertFieldValue('Field Gas', d.fieldGas);
    });
  }

  async fillPostJobData(data: PostJobDataTestData): Promise<void> {
    await step('Fill Post Job Data fields from Excel', async () => {
      const f = data.fill;
      await this.fillField('Kickoff TVD', f.kickoffTvd);
      await this.fillField('Plug Depth', f.plugDepth);
      await this.fillField('Produced Water', f.producedWater);
      await this.fillField('Design Avg. Treating Pressure', f.designAvgTreatingPressure);
      await this.fillField('Design Avg. Frac Gradient', f.designAvgFracGradient);
      await this.fillField('Charge Weight', f.chargeWeight);
      await this.fillField('Plug Type', f.plugType);
      await this.fillField("Operator's Max Pressure", f.operatorsMaxPressure);
      await this.fillField('Pumpdown Volume', f.pumpdownVolume);
      await this.fillField('Pumpdown Max Pressure', f.pumpdownMaxPressure);
      await this.fillField('Pumpdown Max Rate', f.pumpdownMaxRate);
      await this.fillField('Field Gas', f.fieldGas);
      await this.fillField('CNG', f.cng);
      await this.fillField('Diesel', f.diesel);
      await this.click(this.field('Sub %'), 'Sub %');
      await this.fillField('Chlorides', f.chlorides);
      await this.fillField('Override Surface Max Pressure', f.overrideSurfaceMaxPressure);

      await this.click(this.padStageCompleted, 'Pad Stage Completed');
      await this.padStageCompleted.fill(f.padStageCompleted);
      await this.click(this.padStageTotal, 'Pad Stage Total');
      await this.padStageTotal.fill(f.padStageTotal);
    });
  }

  async savePostJobData(): Promise<void> {
    await step('Save Post Job Data', async () => {
      await this.click(this.saveButton, 'Save');
      await this.page.waitForTimeout(TIMEOUTS.SAVE_WAIT_MS);
    });
  }

  async verifySavedValues(data: PostJobDataTestData): Promise<void> {
    await step('Verify Post Job Data values after Save from Excel', async () => {
      const f = data.fill;
      await this.assertFieldValue('Kickoff TVD', f.kickoffTvd);
      await this.assertFieldValue('Plug Depth', f.plugDepth);
      await this.assertFieldValue('Produced Water', f.producedWaterDisplay);
      await this.assertFieldValue('Design Avg. Treating Pressure', f.designAvgTreatingPressure);
      await this.assertFieldValue('Design Avg. Frac Gradient', f.designAvgFracGradientDisplay);
      await this.assertFieldValue('Charge Weight', f.chargeWeightDisplay);
      await this.assertFieldValue('Plug Type', f.plugType);
      await expect(this.padStageCompleted).toHaveValue(f.padStageCompleted, {
        timeout: FIELD_WAIT_MS,
      });
      await expect(this.padStageTotal).toHaveValue(f.padStageTotal, { timeout: FIELD_WAIT_MS });
      await this.assertFieldValue("Operator's Max Pressure", f.operatorsMaxPressure);
      await this.assertFieldValue('Pumpdown Volume', f.pumpdownVolumeDisplay);
      await this.assertFieldValue('Pumpdown Max Pressure', f.pumpdownMaxPressure);
      await this.assertFieldValue('Pumpdown Max Rate', f.pumpdownMaxRate);
      await this.assertFieldValue('Field Gas', f.fieldGas);
      await this.assertFieldValue('CNG', f.cng);
      await this.assertFieldValue('Diesel', f.diesel);
      await this.assertFieldValue('Sub %', f.subPercentAfterSave);
      await this.assertFieldValue('Chlorides', f.chlorides);
      await this.assertFieldValue('Override Surface Max Pressure', f.overrideSurfaceMaxPressure);
    });
  }

  /** Full Post Job Data flow after well is opened. */
  async runPostJobDataFlow(data: PostJobDataTestData): Promise<void> {
    await this.openPostJobData();
    // Reset any previously saved values so default asserts stay stable across runs
    await this.click(this.clearDataButton, 'Clear Data');
    await this.verifyDefaultValues(data);
    await this.verifyClearDataResetsSampleFields(data);
    await this.fillPostJobData(data);
    await this.savePostJobData();
    await this.verifySavedValues(data);
  }
}

export function createPostJobDataPage(page: Page): PostJobDataPage {
  return new PostJobDataPage(page);
}
