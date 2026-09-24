import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { BasePage } from '../base/BasePage';
import { AssertionUtils } from '../utils/AssertionUtils';
import { step } from '../utils/step';
import { WaitUtils } from '../utils/WaitUtils';

const FIELD_WAIT_MS = 20_000;

/**
 * Results → Report → Plots in Word Report.
 * Codegen-aligned: plot grid, report buttons, Surf PRC checkbox, ASCII Report dialog.
 */
export class PlotInWordReportPage extends BasePage {
  private readonly resultsSectionIcon = this.page
    .getByRole('link', { name: /icon\s+Results/i })
    .first();
  private readonly reportNavLink = this.page.getByRole('link', { name: 'Report', exact: true });
  private readonly plotsInWordReportTab = this.page.getByRole('tab', {
    name: 'Plots in Word Report',
  });
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  private readonly downloadWitsmlButton = this.page.getByRole('button', {
    name: 'Download WITSML Report',
  });
  private readonly downloadWordButton = this.page.getByRole('button', {
    name: 'Download Word Report',
  });
  /** Staging may label this "ASCII Report" or "Download ASCII Report". */
  private readonly asciiReportButton = this.page.getByRole('button', {
    name: /ASCII Report/i,
  });
  private readonly asciiDialog = this.page.locator('app-ascii-report-dialog');
  private readonly asciiDialogTitle = this.page.locator('h5', { hasText: 'ASCII Report' });

  private availablePlotsGrid(): Locator {
    return this.page.getByRole('treegrid').filter({ hasText: 'Available Plots' });
  }

  private cell(row: number, col: number): Locator {
    return this.page.locator(`#cell-${row}-${col}`).first();
  }

  private async ensureResultsSectionExpanded(): Promise<void> {
    if (await this.reportNavLink.isVisible().catch(() => false)) {
      return;
    }
    await this.click(this.resultsSectionIcon, 'Results section');
    await WaitUtils.untilVisible(this.reportNavLink, TIMEOUTS.SLOW_UI_MS);
  }

  async openFromResultsMenu(): Promise<void> {
    await step('Open Results → Report → Plots in Word Report', async () => {
      await this.ensureResultsSectionExpanded();
      await this.click(this.reportNavLink, 'Report');
      await WaitUtils.untilVisible(this.plotsInWordReportTab, TIMEOUTS.SLOW_UI_MS);
      if (!(await this.plotsInWordReportTab.getAttribute('aria-selected').catch(() => null))) {
        await this.click(this.plotsInWordReportTab, 'Plots in Word Report');
      } else {
        const selected = await this.plotsInWordReportTab.getAttribute('aria-selected');
        if (selected !== 'true') {
          await this.click(this.plotsInWordReportTab, 'Plots in Word Report');
        }
      }
      await WaitUtils.untilVisible(this.availablePlotsGrid(), TIMEOUTS.SLOW_UI_MS);
    });
  }

  async verifyPlotsGridAndActions(): Promise<void> {
    await step('Verify Available Plots grid and report action buttons', async () => {
      await expect(this.cell(0, 0)).toContainText('Surf PRC', { timeout: FIELD_WAIT_MS });
      await expect(this.cell(1, 0)).toContainText('Btm PRC', { timeout: FIELD_WAIT_MS });

      await AssertionUtils.assertVisible(this.saveButton, 'Save');
      await AssertionUtils.assertVisible(this.downloadWitsmlButton, 'Download WITSML Report');
      await AssertionUtils.assertVisible(this.downloadWordButton, 'Download Word Report');
      await AssertionUtils.assertVisible(this.asciiReportButton.first(), 'ASCII Report');

      const grid = this.availablePlotsGrid();
      await AssertionUtils.assertTextContains(grid, 'Available Plots');
      await AssertionUtils.assertTextContains(grid, 'Action');
    });
  }

  async checkSurfPrcPlot(): Promise<void> {
    await step('Check Surf PRC plot checkbox', async () => {
      const checkbox = this.page
        .getByRole('row', { name: /Surf PRC Unchecked/i })
        .getByLabel('Unchecked')
        .or(this.availablePlotsGrid().getByLabel('Unchecked').first());

      await WaitUtils.untilVisible(checkbox.first(), FIELD_WAIT_MS);
      await checkbox.first().click({ force: true });
      await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);

      await expect(this.cell(0, 0)).toContainText('Surf PRC', { timeout: FIELD_WAIT_MS });
      await expect(this.cell(1, 0)).toContainText('Btm PRC', { timeout: FIELD_WAIT_MS });
    });
  }

  async verifyAsciiReportDialogAndCancel(): Promise<void> {
    await step('Open ASCII Report dialog, verify chrome, Cancel', async () => {
      await this.click(this.asciiReportButton.first(), 'ASCII Report');
      await WaitUtils.untilVisible(this.asciiDialogTitle, FIELD_WAIT_MS);
      await expect(this.asciiDialogTitle).toContainText('ASCII Report');

      await AssertionUtils.assertVisible(
        this.page.getByRole('button', { name: 'Real-time' }),
        'Real-time',
      );
      await AssertionUtils.assertVisible(
        this.page.getByRole('button', { name: 'FracPro' }),
        'FracPro',
      );
      await AssertionUtils.assertTextContains(this.asciiDialog, 'Channel');

      const cancel = this.asciiDialog
        .getByRole('button', { name: 'Cancel' })
        .or(this.page.getByRole('button', { name: 'Cancel' }));
      await AssertionUtils.assertVisible(cancel.first(), 'Cancel');
      await this.click(cancel.first(), 'Cancel');
      await this.asciiDialogTitle.waitFor({ state: 'hidden', timeout: FIELD_WAIT_MS }).catch(
        () => undefined,
      );
    });
  }

  async runPlotInWordReportFlow(): Promise<void> {
    await this.openFromResultsMenu();
    await this.verifyPlotsGridAndActions();
    await this.checkSurfPrcPlot();
    await this.verifyAsciiReportDialogAndCancel();
  }
}

export function createPlotInWordReportPage(page: Page): PlotInWordReportPage {
  return new PlotInWordReportPage(page);
}
