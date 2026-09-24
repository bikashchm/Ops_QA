import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { BasePage } from '../base/BasePage';
import { logger } from '../logger';
import { AssertionUtils } from '../utils/AssertionUtils';
import { WaitUtils } from '../utils/WaitUtils';

const PAGE_HEADING = 'Report';

const CHEMICAL_USAGE_HEADERS = [
  'Chemical Name',
  'Design Totals',
  'Metered Totals',
  'Actual Totals',
  'As Pumped',
  'Unit',
] as const;

const PROPPANT_USAGE_HEADERS = [
  'Proppant Name',
  'Design Totals (lbs)',
  'Metered Totals (lbs)',
  'Actual Totals (lbs)',
] as const;

const POST_JOB_DATA_FIELD_LABELS = [
  'Kickoff TVD',
  'Plug Depth',
  'Produced Water',
  'Design Avg. Treating Pressure',
  'Design Avg. Frac Gradient',
  'Charge Weight',
  'Plug Type',
  'Bacteria Treatment Method',
  '# of Pumps at Start',
  '# of Pumps at End',
  'Pad Stage No.',
  "Operator's Max Pressure",
  'Pumpdown Volume',
  'Pumpdown Max Rate',
  'Pumpdown Max Pressure',
  'Field Gas',
  'CNG',
  'Diesel',
  'Sub %',
  'Chlorides',
  'Override Surface Max Pressure',
] as const;

/**
 * Results → Report screen.
 */
export class ReportPage extends BasePage {
  private readonly resultsSectionIcon = this.page.getByRole('link', { name: /icon\s+Results/i }).first();
  private readonly reportNavLink = this.page.getByRole('link', { name: PAGE_HEADING });
  private readonly pageHeading = this.page.getByRole('heading', { name: PAGE_HEADING, exact: true });
  private readonly tabList = this.page.getByRole('tablist', { name: 'Tabs' });
  private readonly plotsInWordReportTab = this.page.getByRole('tab', { name: 'Plots in Word Report' });
  private readonly materialUsageTab = this.page.getByRole('tab', { name: 'Material Usage' });
  private readonly postJobDataTab = this.page.getByRole('tab', { name: 'Post Job Data' });
  private readonly materialUsagePanel = this.page.getByRole('tabpanel', { name: 'Material Usage' });
  private readonly postJobDataPanel = this.page.getByRole('tabpanel', { name: 'Post Job Data' });
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  private readonly downloadWitsmlButton = this.page.getByRole('button', { name: 'Download WITSML Report' });
  private readonly downloadWordButton = this.page.getByRole('button', { name: 'Download Word Report' });
  private readonly downloadAsciiButton = this.page.getByRole('button', { name: 'Download ASCII Report' });
  private readonly displayPrcPlotButton = this.page.getByRole('button', { name: 'Display PRC Plot' });
  private readonly importFromXopsButton = this.page.getByRole('button', { name: 'Import from XOPS' });

  private async isVisibleQuick(locator: Locator, timeout = 2000): Promise<boolean> {
    return locator.isVisible({ timeout }).catch(() => false);
  }

  private availablePlotsGrid(): Locator {
    return this.page.getByRole('treegrid').filter({ hasText: 'Available Plots' });
  }

  private chemicalUsageGrid(): Locator {
    return this.materialUsagePanel.getByRole('treegrid').filter({ hasText: 'Chemical Name' });
  }

  private proppantUsageGrid(): Locator {
    return this.materialUsagePanel.getByRole('treegrid').filter({ hasText: 'Proppant Name' });
  }

  private acidUsageGrid(): Locator {
    return this.materialUsagePanel.getByRole('treegrid').filter({ hasText: 'Acid Name' });
  }

  private postJobDataPlotSelect(): Locator {
    return this.postJobDataPanel.locator('#select-plot');
  }

  private async ensureResultsSectionExpanded(): Promise<void> {
    if (await this.isVisibleQuick(this.reportNavLink)) {
      return;
    }
    await this.click(this.resultsSectionIcon, 'Results section');
    await expect(
      this.reportNavLink,
      'Report link should be visible after expanding Results',
    ).toBeVisible();
  }

  /** Opens Results → Report. */
  async openFromResultsMenu(): Promise<void> {
    await this.ensureResultsSectionExpanded();
    await this.click(this.reportNavLink, PAGE_HEADING);
    await this.waitForScreen();
    logger.info('Results → Report screen opened');
  }

  async waitForScreen(): Promise<void> {
    await WaitUtils.untilVisible(this.pageHeading, TIMEOUTS.SLOW_UI_MS);
    await WaitUtils.untilVisible(this.tabList, TIMEOUTS.SLOW_UI_MS);
  }

  async verifyPageLevelElements(padName?: string, wellName?: string): Promise<void> {
    await AssertionUtils.assertVisible(this.page.getByRole('img').first());
    await AssertionUtils.assertVisible(this.pageHeading);
    await AssertionUtils.assertVisible(
      this.page.getByRole('button', { name: 'applications' }).first(),
    );
    await AssertionUtils.assertVisible(this.page.locator('#page-header-notifications-dropdown'));
    await AssertionUtils.assertVisible(this.page.getByText('Version:'));
    await AssertionUtils.assertVisible(this.page.getByText('Stage:'));

    if (padName) {
      await AssertionUtils.assertTextContains(
        this.page.locator('app-sub-menubar'),
        `Pad: ${padName}`,
      );
    }
    if (wellName) {
      await AssertionUtils.assertVisible(this.page.getByText(`Well: ${wellName}`));
    }
  }

  async verifyReportTabs(): Promise<void> {
    await AssertionUtils.assertVisible(this.tabList);
    await AssertionUtils.assertVisible(this.plotsInWordReportTab);
    await AssertionUtils.assertVisible(this.materialUsageTab);
    await AssertionUtils.assertVisible(this.postJobDataTab);
  }

  async verifyAvailablePlotsGrid(): Promise<void> {
    const grid = this.availablePlotsGrid();
    await AssertionUtils.assertVisible(grid);
    await AssertionUtils.assertVisible(grid.getByRole('columnheader', { name: 'Available Plots' }));
    await AssertionUtils.assertVisible(grid.getByRole('columnheader', { name: 'Action' }));
    await AssertionUtils.assertVisible(grid.getByRole('gridcell', { name: 'Surf PRC' }));
    await AssertionUtils.assertVisible(grid.getByRole('gridcell', { name: 'Btm PRC' }));
  }

  async verifyReportActionButtons(): Promise<void> {
    await AssertionUtils.assertVisible(this.saveButton);
    await AssertionUtils.assertVisible(this.downloadWitsmlButton);
    await AssertionUtils.assertVisible(this.downloadWordButton);
    await AssertionUtils.assertVisible(this.downloadAsciiButton);
  }

  async openMaterialUsageTab(): Promise<void> {
    await this.click(this.materialUsageTab, 'Material Usage');
    await WaitUtils.untilVisible(this.materialUsagePanel, TIMEOUTS.SLOW_UI_MS);
  }

  async verifyMaterialUsageGridHeaders(): Promise<void> {
    const chemicalGrid = this.chemicalUsageGrid();
    const proppantGrid = this.proppantUsageGrid();
    const acidGrid = this.acidUsageGrid();

    await AssertionUtils.assertVisible(chemicalGrid);
    for (const header of CHEMICAL_USAGE_HEADERS) {
      await AssertionUtils.assertVisible(chemicalGrid.getByRole('columnheader', { name: header }));
    }

    await AssertionUtils.assertVisible(proppantGrid);
    for (const header of PROPPANT_USAGE_HEADERS) {
      await AssertionUtils.assertVisible(proppantGrid.getByRole('columnheader', { name: header }));
    }

    await AssertionUtils.assertVisible(acidGrid);
    await AssertionUtils.assertVisible(acidGrid.getByRole('columnheader', { name: 'Acid Name' }));
    await AssertionUtils.assertVisible(
      acidGrid.getByRole('columnheader', { name: 'Design Total (gal)' }),
    );
    await AssertionUtils.assertVisible(
      acidGrid.getByRole('columnheader', { name: 'Actual Total (gal)' }),
    );
    await AssertionUtils.assertVisible(
      this.materialUsagePanel.getByRole('textbox', { name: 'Clean Total' }),
    );
  }

  async verifyMaterialUsageControls(): Promise<void> {
    await AssertionUtils.assertVisible(
      this.materialUsagePanel.getByText('Select Plot', { exact: true }),
    );
    await AssertionUtils.assertVisible(this.displayPrcPlotButton);
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'Clear Design' }));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'Clear Metered' }));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'Clear Actuals' }));
    await AssertionUtils.assertVisible(this.importFromXopsButton);
    await this.verifyReportActionButtons();
  }

  async openPostJobDataTab(): Promise<void> {
    await this.click(this.postJobDataTab, 'Post Job Data');
    await WaitUtils.untilVisible(this.postJobDataPanel, TIMEOUTS.SLOW_UI_MS);
  }

  async verifyPostJobDataFields(): Promise<void> {
    for (const label of POST_JOB_DATA_FIELD_LABELS) {
      await AssertionUtils.assertVisible(
        this.postJobDataPanel.getByText(label, { exact: true }),
      );
    }
  }

  async verifyPostJobDataControls(): Promise<void> {
    const plotSelect = this.postJobDataPlotSelect();

    await AssertionUtils.assertVisible(
      this.postJobDataPanel.getByText('Select Plot', { exact: true }),
    );
    await AssertionUtils.assertVisible(plotSelect.locator('.ng-select-container input'));
    await AssertionUtils.assertVisible(this.displayPrcPlotButton);
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'Clear Data' }));
    await AssertionUtils.assertVisible(this.importFromXopsButton);
    await this.verifyReportActionButtons();
  }

  async selectPostJobDataPlot(option: string): Promise<void> {
    const plotSelect = this.postJobDataPlotSelect();
    await this.click(plotSelect.locator('.ng-arrow-wrapper'), `Select Plot → ${option}`);
    await this.dropdown.selectRoleOption(option, true);
    await AssertionUtils.assertVisible(plotSelect.locator('.ng-select-container input'));
  }

  async verifyPostJobDataPlotSelection(): Promise<void> {
    await this.selectPostJobDataPlot('Btm PRC');
    await this.selectPostJobDataPlot('Measured Data');
    await this.selectPostJobDataPlot('Surf PRC');
    await this.click(this.pageHeading, PAGE_HEADING);
  }

  /** Full Results → Report layout and tab validation. */
  async runReportLayoutFlow(padName?: string, wellName?: string): Promise<void> {
    await this.verifyPageLevelElements(padName, wellName);
    await this.verifyReportTabs();
    await this.verifyAvailablePlotsGrid();
    await this.verifyReportActionButtons();

    await this.openMaterialUsageTab();
    await this.verifyMaterialUsageGridHeaders();
    await this.verifyMaterialUsageControls();

    await this.openPostJobDataTab();
    await this.verifyPostJobDataFields();
    await this.verifyPostJobDataControls();
    await this.verifyPostJobDataPlotSelection();
  }
}

export function createReportPage(page: Page): ReportPage {
  return new ReportPage(page);
}
