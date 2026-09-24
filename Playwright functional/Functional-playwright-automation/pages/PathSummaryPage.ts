import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { BasePage } from '../base/BasePage';
import type { PathSummaryFlowData } from '../excel/pathSummaryTestData';
import { AssertionUtils } from '../utils/AssertionUtils';
import { step } from '../utils/step';
import { WaitUtils } from '../utils/WaitUtils';

const FIELD_WAIT_MS = 20_000;

/**
 * Wellbore Configuration → Path Summary.
 * Verifies HOT headers, injection-path chip options, and volume / MD fields.
 * Avoids dynamic Angular option ids (codegen `#a25edfdb…`) — uses visible text instead.
 */
export class PathSummaryPage extends BasePage {
  private readonly wellboreLink = this.page.getByRole('link', { name: 'Wellbore Configuration' });
  private readonly pathSummaryTab = this.page.getByRole('tab', { name: 'Path Summary' });
  private readonly handsOnTable = this.page.locator('#handOnTableId');
  private readonly recalculateButton = this.page.getByRole('button', { name: 'Recalculate' });
  private readonly tabset = this.page.locator('tabset');

  async openPathSummary(): Promise<void> {
    await step('Open Wellbore Configuration → Path Summary', async () => {
      await WaitUtils.untilVisible(this.wellboreLink, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.wellboreLink, 'Wellbore Configuration');
      await WaitUtils.untilVisible(this.handsOnTable, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.pathSummaryTab, 'Path Summary');
      await WaitUtils.untilVisible(this.handsOnTable, TIMEOUTS.SLOW_UI_MS);
    });
  }

  async verifyTableHeaders(): Promise<void> {
    await step('Verify Path Summary column headers', async () => {
      for (const header of [
        'Segment Type',
        'Length (ft)',
        'MD (ft)',
        'TVD (ft)',
        'Deviat (deg)',
        'Ann OD (in)',
        'Ann ID (in)',
        'Pipe ID (in)',
      ]) {
        await AssertionUtils.assertTextContains(this.handsOnTable, header);
      }
      await AssertionUtils.assertVisible(this.recalculateButton, 'Recalculate');
    });
  }

  private chip(label: string): Locator {
    return this.page.locator('div').filter({ hasText: new RegExp(`^×${label}$`) }).first();
  }

  async selectInjectionPath(optionLabel: string): Promise<void> {
    await step(`Select injection path "${optionLabel}"`, async () => {
      const tubingChip = this.chip('Tubing');
      if (await tubingChip.isVisible().catch(() => false)) {
        await this.click(tubingChip, '×Tubing chip');
      } else {
        // Already on Tubing and Annulus or another chip — open current chip
        const current = this.page.locator('div').filter({ hasText: /^×/ }).first();
        await this.click(current, 'Current injection path chip');
      }

      const option = this.page.getByText(optionLabel, { exact: true }).first();
      await WaitUtils.untilVisible(option, FIELD_WAIT_MS);
      await this.click(option, optionLabel);
      await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
    });
  }

  async verifyTubingAndAnnulusChrome(): Promise<void> {
    await step('Verify Tubing and Annulus path chrome', async () => {
      await AssertionUtils.assertTextContains(this.tabset, 'Common Manifold');
      await AssertionUtils.assertTextContains(this.tabset, 'Isolated');
    });
  }

  async openVolumeDetailsPanel(): Promise<void> {
    await step('Open volume / transit details (ellipses)', async () => {
      const chip = this.chip('Tubing and Annulus');
      if (await chip.isVisible().catch(() => false)) {
        await this.click(chip, '×Tubing and Annulus chip');
      }

      const ellipsis = this.page.locator('.ellipses-text.ng-star-inserted').first();
      await WaitUtils.untilVisible(ellipsis, FIELD_WAIT_MS);
      await this.click(ellipsis, 'Ellipses volume details');
      await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
    });
  }

  async verifyVolumeAndTransitFields(data: PathSummaryFlowData): Promise<void> {
    await step('Verify volume labels and Excel expected values', async () => {
      await AssertionUtils.assertTextContains(this.tabset, 'MD for Well Transit Time');
      await AssertionUtils.assertTextContains(this.tabset, 'Frac String Partly Full');
      await AssertionUtils.assertTextContains(this.tabset, 'Frac String Full');

      const fracStringVol = this.page.getByRole('textbox', {
        name: 'Frac String Volume',
        exact: true,
      });
      const totalFracStringVol = this.page.getByRole('textbox', {
        name: 'Total Frac String Volume',
      });
      const flushAbove = this.page.getByRole('textbox', { name: 'Flush Above Top Perf' });
      const flushVol = this.page.getByRole('textbox', { name: 'Flush Volume' });
      const mdTransit = this.page.getByRole('textbox', { name: 'MD for Well Transit Time' });

      await expect(fracStringVol).toHaveValue(data.expectedFracStringVolume, {
        timeout: FIELD_WAIT_MS,
      });
      await expect(totalFracStringVol).toHaveValue(data.expectedTotalFracStringVolume, {
        timeout: FIELD_WAIT_MS,
      });
      await expect(flushAbove).toHaveValue(data.expectedFlushAboveTopPerf, {
        timeout: FIELD_WAIT_MS,
      });
      await expect(flushVol).toHaveValue(data.expectedFlushVolume, { timeout: FIELD_WAIT_MS });
      await expect(mdTransit).toHaveValue(data.expectedMdWellTransitTime, {
        timeout: FIELD_WAIT_MS,
      });
    });
  }

  async runPathSummaryFlow(data: PathSummaryFlowData): Promise<void> {
    await this.openPathSummary();
    await this.verifyTableHeaders();
    await this.selectInjectionPath(data.injectionPathOption);
    await this.verifyTubingAndAnnulusChrome();
    await this.openVolumeDetailsPanel();
    await this.verifyVolumeAndTransitFields(data);
  }
}

export function createPathSummaryPage(page: Page): PathSummaryPage {
  return new PathSummaryPage(page);
}
