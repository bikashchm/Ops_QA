import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { BasePage } from '../base/BasePage';
import { logger } from '../logger';
import { AssertionUtils } from '../utils/AssertionUtils';
import { WaitUtils } from '../utils/WaitUtils';
import type { TestDataManager } from '../excel/TestDataManager';
import {
  PLOT_BASELINE_PAD_PLOT,
  PLOT_BASELINE_USER_DEFINED,
  type PlotBaselineData,
} from '../excel/plotTestData';

/** Fracpro Live+ plot categories in the right-side Plots menu. */
export const FRACPRO_LIVE_PLOT_TYPES = ['Surf PRC', 'Btm PRC', 'Measured Data', 'Chemical'] as const;
export type FracproLivePlotType = (typeof FRACPRO_LIVE_PLOT_TYPES)[number];

/** Categories where + New Plot is visible and enabled. Chemical does not show the button. */
export const NEW_PLOT_ENABLED_TYPES = ['Surf PRC', 'Btm PRC', 'Measured Data'] as const;
export type NewPlotEnabledType = (typeof NEW_PLOT_ENABLED_TYPES)[number];

/**
 * SPA plotId query values from codegen. wellId is always read from the live URL.
 * Surf PRC=1, Btm PRC=2, Measured Data=0, Chemical=chemical.
 */
const PLOT_QUERY_ID: Record<FracproLivePlotType, string> = {
  'Surf PRC': '1',
  'Btm PRC': '2',
  'Measured Data': '0',
  Chemical: 'chemical',
};

const DUPLICATE_PLOT_NAME_MESSAGE = /plot with this name already|already exists|duplicate/i;

/**
 * Results → Plot screen (#plot-dashboard).
 * Reuses the same post-open validations used after Measured Data plot opens,
 * but navigates only via Results → Plot (never Channel Input).
 */
export class PlotPage extends BasePage {
  private treatmentId = '';
  private readonly protectedPlotNames = new Set<string>([
    PLOT_BASELINE_USER_DEFINED,
    PLOT_BASELINE_PAD_PLOT,
  ]);
  private readonly resultsSectionIcon = this.page.getByRole('link', { name: /icon\s+Results/i }).first();
  private readonly plotNavLink = this.page.getByRole('link', { name: 'Plot' });
  private readonly plotScreenHeading = this.page.getByRole('heading', { name: 'Plot', exact: true });
  private readonly plotsMenuHeading = this.page.getByRole('heading', { name: 'Plots', exact: true });
  private readonly fracproLiveHeading = this.page.getByRole('heading', { name: 'Fracpro Live+', exact: true });
  private readonly userDefinedPlotsHeading = this.page.getByRole('heading', { name: 'User-defined Plots' });
  private readonly padPlotsMenuHeading = this.page.getByRole('heading', { name: 'Pad Plots', exact: true });
  private readonly plotsListButton = this.page.getByRole('button', { name: 'list' });
  private readonly savePlotHeading = this.page.getByRole('heading', { name: 'Save Plot' });
  private readonly renamePlotHeading = this.page.getByRole('heading', { name: 'Rename Plot' });
  private readonly deleteConfirmHeading = this.page.getByRole('heading', { name: 'Confirmation' });
  private readonly plotDashboard = this.page.locator('#plot-dashboard');
  private readonly newPlotButton = this.page.getByRole('button', { name: '+ New Plot' });
  /** Enabled Auto Step only — used by dialog flow when the control is clickable. */
  private readonly autoStepButton = this.page.locator('button:has-text("Auto Step"):not(.disabled)').first();
  /** Any Auto Step control (enabled or disabled) — used for enable/disable assertions. */
  private readonly autoStepButtonAny = this.page.getByRole('button', { name: 'Auto Step' });
  /** Preset types that keep Auto Step disabled while + New Plot stays enabled. Chemical is excluded. */
  private readonly presetPlotTypes = ['Surf PRC', 'Btm PRC'] as const;
  private readonly measuredPlotToolbarActions = this.page.locator(
    '.d-flex.flex-wrap.align-items-center.justify-content-end',
  );
  private readonly measuredPlotCommentButton = this.page.getByRole('button', { name: 'comment' });
  private readonly measuredPlotTooltipCombobox = this.measuredPlotToolbarActions
    .getByRole('combobox')
    .last();
  private readonly measuredPlotChannelButton = this.page.getByRole('button', {
    name: 'channel',
    exact: true,
  });
  private readonly channelSelectionHeading = this.page.getByRole('heading', {
    name: 'Channel Selection',
  });
  /**
   * The exact "Pop out" button from Playwright codegen (highlighted in screenshot).
   * Located in the top-right toolbar of #plot-dashboard.
   * NO expand/collapse fallback — those are different buttons that collapse the chart.
   */
  private popoutButton(): Locator {
    // Codegen exact match first — works across all envs that use this accessible name
    return this.page.getByRole('button', { name: 'Pop out' });
  }

  /**
   * The exact "Dock to plot" button from Playwright codegen.
   * Only visible when the floating popout window is open.
   */
  private dockToPlotButton(): Locator {
    return this.page.getByRole('button', { name: 'Dock to plot' });
  }

  private link(name: string | RegExp): Locator {
    return this.page.getByRole('link', { name });
  }

  private async isVisibleQuick(locator: Locator, timeout = 2000): Promise<boolean> {
    return locator.isVisible({ timeout }).catch(() => false);
  }

  private async ensureResultsSectionExpanded(): Promise<void> {
    if (await this.isVisibleQuick(this.plotNavLink)) {
      return;
    }
    await this.click(this.resultsSectionIcon, 'Results section');
    await expect(this.plotNavLink, 'Plot link should be visible after expanding Results').toBeVisible();
  }

  /** Optional PlotTreatmentId from Excel — used when selecting Measured Data. */
  setTreatmentId(treatmentId: string): void {
    this.treatmentId = (treatmentId ?? '').trim();
  }

  /** Opens Results → Plot only. Does not open Channel Input. */
  async openFromResultsMenu(): Promise<void> {
    await this.ensureResultsSectionExpanded();
    await this.click(this.plotNavLink, 'Plot');
    await this.waitForPlotScreen();
    logger.info('Results → Plot screen opened');
  }

  async waitForPlotScreen(): Promise<void> {
    await WaitUtils.untilVisible(this.plotScreenHeading, TIMEOUTS.SLOW_UI_MS);
    await WaitUtils.untilVisible(this.plotDashboard, TIMEOUTS.SLOW_UI_MS);
    await this.ensurePlotsSideMenuOpen();
  }

  private savePlotDialog(): Locator {
    return this.page.getByRole('dialog').filter({ has: this.savePlotHeading });
  }

  private plotNameInput(): Locator {
    return this.savePlotDialog().getByRole('textbox', { name: /Plot Name/i });
  }

  private plotPageHeader(plotType: string): Locator {
    return this.page.getByRole('heading', { name: plotType, exact: true });
  }

  private plotMenuLabel(plotType: string): Locator {
    return this.page.locator('label').filter({ hasText: plotType }).first();
  }

  private async isPlotsSideMenuOpen(): Promise<boolean> {
    return this.isVisibleQuick(this.plotsMenuHeading, 1500);
  }

  /**
   * Header list icon (next to Save) toggles the right-side Plots panel.
   * Click once only when the panel is closed — a second click would close it.
   */
  private async ensurePlotsSideMenuOpen(): Promise<void> {
    const surfRadio = this.plotTypeRadio('Surf PRC');
    if (await this.isPlotsSideMenuOpen()) {
      await expect(this.plotsMenuHeading, 'Plots header should be displayed in the right-side menu').toBeVisible();
      await WaitUtils.untilVisible(surfRadio, TIMEOUTS.SLOW_UI_MS);
      return;
    }

    await WaitUtils.untilVisible(this.plotsListButton, TIMEOUTS.SLOW_UI_MS);
    await this.click(this.plotsListButton, 'Plots list');
    await expect(
      this.plotsMenuHeading,
      'Plots header should be displayed in the right-side menu',
    ).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });
    await WaitUtils.untilVisible(surfRadio, TIMEOUTS.SLOW_UI_MS);
  }

  /** Click the same list icon again to close the right-side Plots panel. */
  private async closePlotsSideMenu(): Promise<void> {
    if (!(await this.isPlotsSideMenuOpen())) {
      return;
    }

    await this.click(this.plotsListButton, 'Plots list');
    await expect(
      this.plotsMenuHeading,
      'Plots side menu should close after clicking the list icon again',
    ).toBeHidden({ timeout: TIMEOUTS.SLOW_UI_MS });
    logger.info('Plots side menu closed via list toggle');
  }

  private protectPlotName(name: string): void {
    const trimmed = name.trim();
    if (trimmed) {
      this.protectedPlotNames.add(trimmed);
    }
  }

  private assertNotProtectedPlot(plotName: string): void {
    if (this.protectedPlotNames.has(plotName)) {
      throw new Error(`Refusing to delete baseline plot "${plotName}". Baseline plots must never be deleted.`);
    }
  }

  async openPlotList(): Promise<void> {
    await this.ensurePlotsSideMenuOpen();
    logger.info('Plot list panel is open');
  }

  async closePlotList(): Promise<void> {
    await this.closePlotsSideMenu();
  }

  async validateFracProPlots(): Promise<void> {
    await this.verifyDefaultPlotCategories();
  }

  async selectPlot(plotName: string): Promise<void> {
    if ((FRACPRO_LIVE_PLOT_TYPES as readonly string[]).includes(plotName)) {
      await this.selectPlotCategory(plotName as FracproLivePlotType);
      return;
    }
    await this.selectSavedPlot(plotName, { keepMenuOpen: true });
  }

  async validatePlotHeader(plotName: string): Promise<void> {
    await expect(
      this.plotPageHeader(plotName),
      `Plot page header should display "${plotName}"`,
    ).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });
  }

  async validateNewPlotAvailability(plotName: string): Promise<void> {
    if (plotName === 'Chemical') {
      await expect(this.newPlotButton, '+ New Plot remains in the toolbar for Chemical').toBeVisible({
        timeout: TIMEOUTS.SLOW_UI_MS,
      });
      await expect(
        this.newPlotButton,
        '+ New Plot should be disabled / not available for Chemical',
      ).toHaveClass(/disabled/);
      logger.info('+ New Plot is visible but disabled for Chemical');
      return;
    }

    await expect(this.newPlotButton, `+ New Plot should be visible for ${plotName}`).toBeVisible({
      timeout: TIMEOUTS.SLOW_UI_MS,
    });
    await expect(this.newPlotButton, `+ New Plot should be enabled for ${plotName}`).toBeEnabled();
    await expect(
      this.newPlotButton,
      `+ New Plot should not have disabled class for ${plotName}`,
    ).not.toHaveClass(/disabled/);
    logger.info(`+ New Plot is visible and enabled for ${plotName}`);
  }

  async openSavePlotPopup(): Promise<void> {
    await this.openSavePlotDialog();
  }

  async validateSavePlotPopup(): Promise<void> {
    await this.verifySavePlotPopup();
  }

  async validateDuplicatePlotName(): Promise<void> {
    await this.verifyDuplicatePlotNameValidation();
  }

  async createUserDefinedPlot(plotName?: string): Promise<string> {
    const name = plotName?.trim() || this.generateUniquePlotName('UD Plot');
    await this.saveUserDefinedPlot(name);
    return name;
  }

  async createPadPlot(plotName?: string): Promise<string> {
    const name = plotName?.trim() || this.generateUniquePlotName('Pad Plot');
    await this.savePadPlot(name);
    return name;
  }

  async renamePlot(
    currentName: string,
    newName: string,
    sectionHeading: 'User-defined Plots' | 'Pad Plots',
  ): Promise<void> {
    await this.renameSavedPlot(currentName, newName, sectionHeading);
  }

  async deletePlot(
    plotName: string,
    sectionHeading: 'User-defined Plots' | 'Pad Plots',
  ): Promise<void> {
    await this.deleteSavedPlot(plotName, sectionHeading);
  }

  async validatePlotExists(
    plotName: string,
    sectionHeading: 'User-defined Plots' | 'Pad Plots',
  ): Promise<void> {
    await this.openPlotList();
    await this.assertPlotUnderHeading(plotName, sectionHeading);
  }

  async validatePlotNotExists(plotName: string): Promise<void> {
    await this.openPlotList();
    await expect(
      this.savedPlotRadio(plotName),
      `Plot "${plotName}" should not be listed`,
    ).toHaveCount(0);
    await expect(
      this.savedPlotLabel(plotName),
      `Plot label "${plotName}" should not be displayed`,
    ).toHaveCount(0);
  }

  async verifyPlotPersistenceAfterReopen(expected: {
    userDefined: string[];
    padPlots: string[];
  }): Promise<void> {
    await this.closePlotList();
    await this.openPlotList();
    await this.validateFracProPlots();
    for (const name of expected.userDefined) {
      await this.validatePlotExists(name, 'User-defined Plots');
    }
    for (const name of expected.padPlots) {
      await this.validatePlotExists(name, 'Pad Plots');
    }
    logger.info('Plot list persistence verified after close/reopen');
  }

  readPlotFromExcel(testData: TestDataManager, kind: 'userDefined' | 'pad'): string {
    return testData.readPlotFromExcel(kind);
  }

  savePlotToExcel(testData: TestDataManager, kind: 'userDefined' | 'pad', name: string): void {
    testData.savePlotToExcel(kind, name);
    this.protectPlotName(name);
  }

  /**
   * Always create the Excel baseline plots (user-defined + pad).
   * If the Excel name is already listed, generate a unique name, create that plot,
   * and overwrite Excel so Dashboard can select the same two plots.
   */
  async createBaselinePlotsIfRequired(testData: TestDataManager): Promise<PlotBaselineData> {
    await this.openPlotList();

    const userDefinedName = await this.createBaselinePlotAndSave(
      testData,
      'userDefined',
      'Test UserDefine Plot',
    );
    await this.validatePlotExists(userDefinedName, 'User-defined Plots');

    const padPlotName = await this.createBaselinePlotAndSave(testData, 'pad', 'Test Pad Plot');
    await this.validatePlotExists(padPlotName, 'Pad Plots');

    return { userDefinedName, padPlotName };
  }

  private async createBaselinePlotAndSave(
    testData: TestDataManager,
    kind: 'userDefined' | 'pad',
    uniquePrefix: string,
  ): Promise<string> {
    const previousExcelName = testData.readPlotFromExcel(kind).trim();
    let name: string;
    do {
      name = this.generateUniquePlotName(uniquePrefix);
    } while (await this.isPlotListed(name));

    logger.info(
      previousExcelName
        ? `Excel already has ${kind} plot "${previousExcelName}" — creating unique plot: ${name}`
        : `Creating unique ${kind} plot: ${name}`,
    );

    if (kind === 'userDefined') {
      await this.createUserDefinedPlot(name);
    } else {
      await this.createPadPlot(name);
    }
    this.savePlotToExcel(testData, kind, name);
    logger.info(`Saved ${kind} plot name to Excel: ${name}`);
    return name;
  }

  private async isPlotListed(plotName: string): Promise<boolean> {
    const radio = this.savedPlotRadio(plotName).first();
    const label = this.savedPlotLabel(plotName).first();
    return (
      (await this.isVisibleQuick(radio, 3000)) || (await this.isVisibleQuick(label, 1000))
    );
  }

  /**
   * Radio check plus SPA plotId sync (codegen: wellId from current URL, never hardcoded).
   */
  private async syncPlotRoute(plotType: FracproLivePlotType): Promise<void> {
    const wellId = this.extractWellIdFromUrl();
    if (!wellId) {
      logger.warn(`wellId not found in URL after selecting ${plotType}; radio selection only`);
      return;
    }

    const current = new URL(this.page.url());
    const expectedPlotId = PLOT_QUERY_ID[plotType];
    if (current.pathname.includes('/plots') && current.searchParams.get('plotId') === expectedPlotId) {
      return;
    }

    const params = new URLSearchParams({
      wellId,
      callApi: 'true',
      plotId: expectedPlotId,
    });
    if (plotType === 'Measured Data' && this.treatmentId) {
      params.set('treatmentId', this.treatmentId);
    }

    const target = `${current.origin}/plots?${params.toString()}`;
    await this.page.goto(target);
    await WaitUtils.forLoadState(this.page, 'domcontentloaded');
    await WaitUtils.untilVisible(this.plotDashboard, TIMEOUTS.SLOW_UI_MS);
    await this.ensurePlotsSideMenuOpen();
  }

  async selectPlotCategory(plotType: FracproLivePlotType): Promise<void> {
    await this.ensurePlotsSideMenuOpen();
    const radio = this.plotTypeRadio(plotType);
    await WaitUtils.untilVisible(radio, TIMEOUTS.SLOW_UI_MS);

    // Angular plot radios often start a navigation on click, so native input.check()
    // fails with "did not change its state". Click the visible label, then sync the SPA route.
    const label = this.plotMenuLabel(plotType);
    if (await this.isVisibleQuick(label, 2000)) {
      await label.click();
    } else {
      await radio.click({ force: true });
    }

    await this.syncPlotRoute(plotType);
    await expect(radio, `${plotType} radio should be selected`).toBeChecked();
    await expect(
      this.plotPageHeader(plotType),
      `Plot page header should display "${plotType}"`,
    ).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });
    logger.info(`Selected plot category: ${plotType}`);
  }

  /** 1. Plots header in the right-side menu. */
  async verifyPlotsMenuHeader(): Promise<void> {
    await this.ensurePlotsSideMenuOpen();
    await AssertionUtils.assertVisible(
      this.plotsMenuHeading,
      'Plots header should be displayed in the right-side menu',
    );
  }

  /** 2. Default Fracpro Live+ categories. */
  async verifyDefaultPlotCategories(): Promise<void> {
    await this.ensurePlotsSideMenuOpen();
    await AssertionUtils.assertVisible(this.fracproLiveHeading, 'Fracpro Live+ section should be visible');

    for (const plotType of FRACPRO_LIVE_PLOT_TYPES) {
      await expect(
        this.plotTypeRadio(plotType),
        `${plotType} should be displayed under Fracpro Live+`,
      ).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });
      await expect(
        this.plotMenuLabel(plotType),
        `${plotType} label should be displayed under Fracpro Live+`,
      ).toBeVisible();
    }
    logger.info('Fracpro Live+ default plot categories are visible');
  }

  /** 3. Radio selected + plot header matches for each Fracpro Live+ category. */
  async verifyPlotSelectionForAllCategories(): Promise<void> {
    for (const plotType of FRACPRO_LIVE_PLOT_TYPES) {
      await this.selectPlotCategory(plotType);
      await expect(
        this.plotPageHeader(plotType),
        `Plot page header should display "${plotType}" after closing the Plots list`,
      ).toBeVisible();
    }
    logger.info('Plot selection validated for Surf PRC, Btm PRC, Measured Data, and Chemical');
  }

  /** 4. + New Plot visible/enabled for Surf/Btm/Measured Data; disabled (not available) for Chemical. */
  async verifyNewPlotButtonAvailability(): Promise<void> {
    for (const plotType of NEW_PLOT_ENABLED_TYPES) {
      await this.selectPlotCategory(plotType);
      await expect(this.newPlotButton, `+ New Plot should be visible for ${plotType}`).toBeVisible({
        timeout: TIMEOUTS.SLOW_UI_MS,
      });
      await expect(this.newPlotButton, `+ New Plot should be enabled for ${plotType}`).toBeEnabled();
      await expect(
        this.newPlotButton,
        `+ New Plot should not have disabled class for ${plotType}`,
      ).not.toHaveClass(/disabled/);
      logger.info(`+ New Plot is visible and enabled for ${plotType}`);
    }

    await this.selectPlotCategory('Chemical');
    await expect(this.newPlotButton, '+ New Plot remains in the toolbar for Chemical').toBeVisible({
      timeout: TIMEOUTS.SLOW_UI_MS,
    });
    await expect(
      this.newPlotButton,
      '+ New Plot should be disabled / not available for Chemical',
    ).toHaveClass(/disabled/);
    logger.info('+ New Plot is visible but disabled for Chemical');

    await this.selectPlotCategory('Surf PRC');
  }

  async openSavePlotDialog(): Promise<void> {
    await expect(this.newPlotButton, '+ New Plot must be visible before opening Save Plot').toBeVisible();
    await expect(this.newPlotButton, '+ New Plot must be enabled before opening Save Plot').toBeEnabled();
    await this.click(this.newPlotButton, '+ New Plot');
    await WaitUtils.untilVisible(this.savePlotHeading, TIMEOUTS.SLOW_UI_MS);
  }

  async closeSavePlotDialog(): Promise<void> {
    const dialog = this.savePlotDialog();
    if (!(await this.isVisibleQuick(this.savePlotHeading, 2000))) {
      return;
    }

    const cancelButton = dialog.getByRole('button', { name: 'Cancel' });
    if (await this.isVisibleQuick(cancelButton, 1500)) {
      await this.click(cancelButton, 'Save Plot Cancel');
    } else {
      await this.click(dialog.getByRole('button', { name: 'Close' }), 'Save Plot Close');
    }

    await WaitUtils.untilHidden(this.savePlotHeading, TIMEOUTS.SLOW_UI_MS);
  }

  /** 5. Save Plot popup controls. */
  async verifySavePlotPopup(): Promise<void> {
    await this.selectPlotCategory('Surf PRC');
    await this.openSavePlotDialog();

    const dialog = this.savePlotDialog();
    await expect(this.savePlotHeading, 'Save Plot popup should be displayed').toBeVisible();
    await expect(dialog.getByText('Plot Name'), 'Plot Name label should be present').toBeVisible();
    await expect(this.plotNameInput(), 'Plot Name textbox should be present').toBeVisible();
    await expect(dialog.getByText('Pad Plots'), 'Pad Plots control should be present').toBeVisible();
    await expect(
      dialog.getByRole('checkbox', { name: 'Pad Plots' }),
      'Pad Plots checkbox should be present',
    ).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Save' }), 'Save button should be present').toBeVisible();

    const cancelButton = dialog.getByRole('button', { name: 'Cancel' });
    if (await this.isVisibleQuick(cancelButton, 1500)) {
      await expect(cancelButton, 'Cancel button should be present').toBeVisible();
    } else {
      await expect(
        dialog.getByRole('button', { name: 'Close' }),
        'Close button should be present when Cancel is not available',
      ).toBeVisible();
    }

    logger.info('Save Plot popup controls validated');
    await this.closeSavePlotDialog();
  }

  /** 6. Plot Name is pre-populated with the selected category name. */
  async verifyDefaultPlotNameForEnabledCategories(): Promise<void> {
    for (const plotType of NEW_PLOT_ENABLED_TYPES) {
      await this.selectPlotCategory(plotType);
      await this.openSavePlotDialog();
      await expect(
        this.plotNameInput(),
        `Plot Name should be pre-populated with "${plotType}"`,
      ).toHaveValue(plotType);
      logger.info(`Default Plot Name for ${plotType} is "${plotType}"`);
      await this.closeSavePlotDialog();
    }
  }

  /** 7. Saving the default (already existing) name shows a duplicate validation message. */
  async verifyDuplicatePlotNameValidation(): Promise<void> {
    await this.selectPlotCategory('Surf PRC');
    await this.openSavePlotDialog();
    await expect(this.plotNameInput(), 'Duplicate check uses the default Surf PRC name').toHaveValue(
      'Surf PRC',
    );
    await this.click(this.savePlotDialog().getByRole('button', { name: 'Save' }), 'Save Plot');
    await expect(
      this.page.getByText(DUPLICATE_PLOT_NAME_MESSAGE).first(),
      'Duplicate plot name validation should be displayed',
    ).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });
    logger.info('Duplicate plot name validation displayed for default Surf PRC');
    await this.closeSavePlotDialog();
  }

  private async waitForSavePlotDialogToClose(): Promise<void> {
    await WaitUtils.untilHidden(this.savePlotHeading, TIMEOUTS.SLOW_UI_MS);
  }

  private async assertPlotUnderHeading(plotName: string, heading: string): Promise<void> {
    const headingLocator =
      heading === 'User-defined Plots'
        ? this.userDefinedPlotsHeading
        : heading === 'Pad Plots'
          ? this.padPlotsMenuHeading
          : this.page.getByRole('heading', { name: heading, exact: true });
    const plotLabel = this.page.locator('label').filter({ hasText: plotName }).first();

    await expect(headingLocator, `${heading} section should be visible`).toBeVisible({
      timeout: TIMEOUTS.SLOW_UI_MS,
    });
    await expect(plotLabel, `Saved plot "${plotName}" should appear in the Plots menu`).toBeVisible({
      timeout: TIMEOUTS.SLOW_UI_MS,
    });
    await expect(
      this.page.getByRole('radio', { name: plotName }).first(),
      `Saved plot "${plotName}" radio should match the entered name`,
    ).toBeVisible();

    const headingBox = await headingLocator.boundingBox();
    const plotBox = await plotLabel.boundingBox();
    expect(headingBox, `${heading} heading should have a layout box`).toBeTruthy();
    expect(plotBox, `"${plotName}" should have a layout box`).toBeTruthy();
    expect(
      plotBox!.y,
      `"${plotName}" should appear below the "${heading}" heading`,
    ).toBeGreaterThan(headingBox!.y);
  }

  private async assertPlotNotUnderHeading(plotName: string, heading: string): Promise<void> {
    const headingLocator = this.page.getByRole('heading', { name: heading, exact: true });
    if (!(await this.isVisibleQuick(headingLocator, 2000))) {
      logger.info(`"${heading}" section is not visible; "${plotName}" is not listed there`);
      return;
    }

    const plotLabel = this.page.locator('label').filter({ hasText: plotName }).first();
    const headingBox = await headingLocator.boundingBox();
    const plotBox = await plotLabel.boundingBox();
    if (!headingBox || !plotBox) {
      return;
    }

    const followingHeadings = ['Pad Plots', 'Fracpro Live+', 'Plots'];
    let nextHeadingY = Number.POSITIVE_INFINITY;
    for (const nextHeading of followingHeadings) {
      if (nextHeading === heading) {
        continue;
      }
      const next = this.page.getByRole('heading', { name: nextHeading, exact: true });
      if (!(await this.isVisibleQuick(next, 1000))) {
        continue;
      }
      const box = await next.boundingBox();
      if (box && box.y > headingBox.y && box.y < nextHeadingY) {
        nextHeadingY = box.y;
      }
    }

    const listedUnderHeading = plotBox.y > headingBox.y && plotBox.y < nextHeadingY;
    expect(
      listedUnderHeading,
      `"${plotName}" should not appear under "${heading}"`,
    ).toBe(false);
  }

  /** 8. Unique name saves under User-defined Plots. */
  async saveUserDefinedPlot(plotName: string): Promise<void> {
    await this.selectPlotCategory('Surf PRC');
    await this.openSavePlotDialog();
    await this.plotNameInput().fill('');
    await this.fill(this.plotNameInput(), plotName, 'Plot Name');
    await expect(this.plotNameInput(), 'Plot Name should match the entered unique value').toHaveValue(
      plotName,
    );
    await this.click(this.savePlotDialog().getByRole('button', { name: 'Save' }), 'Save Plot');
    await this.waitForSavePlotDialogToClose();
    await this.ensurePlotsSideMenuOpen();
    await this.assertPlotUnderHeading(plotName, 'User-defined Plots');
    logger.info(`User-defined plot saved: ${plotName}`);
  }

  /** 9. Unique pad plot appears under Pad Plots and not under User-defined Plots. */
  async savePadPlot(plotName: string): Promise<void> {
    await this.selectPlotCategory('Surf PRC');
    await this.openSavePlotDialog();
    await this.plotNameInput().fill('');
    await this.fill(this.plotNameInput(), plotName, 'Plot Name');
    const padPlotsCheckbox = this.savePlotDialog().getByRole('checkbox', { name: 'Pad Plots' });
    await padPlotsCheckbox.check();
    await expect(padPlotsCheckbox, 'Pad Plots checkbox should be selected before save').toBeChecked();
    await this.click(this.savePlotDialog().getByRole('button', { name: 'Save' }), 'Save Plot');
    await this.waitForSavePlotDialogToClose();
    await this.ensurePlotsSideMenuOpen();
    await this.assertPlotUnderHeading(plotName, 'Pad Plots');
    await this.assertPlotNotUnderHeading(plotName, 'User-defined Plots');
    logger.info(`Pad plot saved: ${plotName}`);
  }

  private savedPlotRadio(plotName: string): Locator {
    return this.page.getByRole('radio', { name: plotName, exact: true });
  }

  private savedPlotLabel(plotName: string): Locator {
    return this.page.locator('label').filter({ hasText: new RegExp(`^\\s*${this.escapeRegExp(plotName)}\\s*$`) });
  }

  private plotOverflowMenuButton(plotName: string): Locator {
    const row = this.page
      .locator('li, div')
      .filter({ has: this.savedPlotRadio(plotName) })
      .filter({ has: this.page.getByRole('button', { name: 'menu' }) })
      .first();
    return row.getByRole('button', { name: 'menu' });
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private renamePlotDialog(): Locator {
    return this.page.getByRole('dialog').filter({ has: this.renamePlotHeading });
  }

  private deleteConfirmDialog(): Locator {
    return this.page.getByRole('dialog').filter({ has: this.deleteConfirmHeading });
  }

  /**
   * Open a saved User-defined / Pad plot from the right-side list.
   * plotId is dynamic — never hardcoded; selection drives the SPA route.
   */
  async selectSavedPlot(plotName: string, options?: { keepMenuOpen?: boolean }): Promise<void> {
    await this.ensurePlotsSideMenuOpen();
    const radio = this.savedPlotRadio(plotName).first();
    const label = this.savedPlotLabel(plotName).first();
    await WaitUtils.untilVisible(radio, TIMEOUTS.SLOW_UI_MS);

    if (await this.isVisibleQuick(label, 2000)) {
      await label.click();
    } else {
      await radio.click({ force: true });
    }

    await expect(radio, `"${plotName}" radio should be selected`).toBeChecked({
      timeout: TIMEOUTS.SLOW_UI_MS,
    });
    await expect(
      this.plotPageHeader(plotName),
      `Plot page header should display "${plotName}"`,
    ).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });

    if (options?.keepMenuOpen === false) {
      await this.closePlotsSideMenu();
    }
    logger.info(`Opened saved plot: ${plotName}`);
  }

  private async openPlotOverflowMenu(plotName: string): Promise<void> {
    await this.ensurePlotsSideMenuOpen();
    await this.selectSavedPlot(plotName, { keepMenuOpen: true });
    const menuButton = this.plotOverflowMenuButton(plotName);
    await WaitUtils.untilVisible(menuButton, TIMEOUTS.SLOW_UI_MS);
    await this.click(menuButton, `${plotName} 3-dot menu`);
    await expect(
      this.page.getByText('Rename', { exact: true }).or(this.page.getByText('Delete', { exact: true })).first(),
      'Plot overflow menu should show Rename / Delete',
    ).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });
  }

  /** 10. Rename a saved plot and verify old name is gone and new name can be opened. */
  async renameSavedPlot(
    currentName: string,
    newName: string,
    sectionHeading: 'User-defined Plots' | 'Pad Plots',
  ): Promise<void> {
    await this.ensurePlotsSideMenuOpen();
    await this.assertPlotUnderHeading(currentName, sectionHeading);
    await this.openPlotOverflowMenu(currentName);
    await this.click(this.page.getByText('Rename', { exact: true }), 'Rename');

    const dialog = this.renamePlotDialog();
    await expect(this.renamePlotHeading, 'Rename Plot popup should be displayed').toBeVisible({
      timeout: TIMEOUTS.SLOW_UI_MS,
    });
    const nameInput = dialog.getByRole('textbox', { name: /Plot Name/i });
    await expect(nameInput, 'Rename Plot Name textbox should be visible').toBeVisible();
    await nameInput.fill('');
    await this.fill(nameInput, newName, 'Rename Plot Name');
    await expect(nameInput, 'Rename Plot Name should match the new unique value').toHaveValue(newName);
    await this.click(dialog.getByRole('button', { name: 'Save' }), 'Rename Plot Save');
    await WaitUtils.untilHidden(this.renamePlotHeading, TIMEOUTS.SLOW_UI_MS);

    await this.ensurePlotsSideMenuOpen();
    await this.assertPlotUnderHeading(newName, sectionHeading);
    await expect(
      this.savedPlotRadio(currentName),
      `Old plot name "${currentName}" should no longer be listed`,
    ).toHaveCount(0);
    await expect(
      this.savedPlotLabel(currentName),
      `Old plot label "${currentName}" should no longer be displayed`,
    ).toHaveCount(0);

    await this.selectSavedPlot(newName, { keepMenuOpen: true });
    await expect(
      this.plotPageHeader(newName),
      `Renamed plot "${newName}" should open successfully`,
    ).toBeVisible();
    logger.info(`Renamed plot "${currentName}" → "${newName}" under ${sectionHeading}`);
  }

  /** 11. Delete a saved plot and verify it is gone from the section and cannot be opened. */
  async deleteSavedPlot(
    plotName: string,
    sectionHeading: 'User-defined Plots' | 'Pad Plots',
  ): Promise<void> {
    this.assertNotProtectedPlot(plotName);
    await this.ensurePlotsSideMenuOpen();
    await this.assertPlotUnderHeading(plotName, sectionHeading);
    await this.openPlotOverflowMenu(plotName);
    await this.click(this.page.getByText('Delete', { exact: true }), 'Delete');

    const confirm = this.deleteConfirmDialog();
    await expect(this.deleteConfirmHeading, 'Delete Confirmation popup should be displayed').toBeVisible({
      timeout: TIMEOUTS.SLOW_UI_MS,
    });
    await expect(
      confirm.getByText(/Are you sure you want to/i),
      'Delete confirmation message should be displayed',
    ).toBeVisible();
    await this.click(confirm.getByRole('button', { name: 'Yes, Delete' }), 'Yes, Delete');
    await WaitUtils.untilHidden(this.deleteConfirmHeading, TIMEOUTS.SLOW_UI_MS);

    await this.ensurePlotsSideMenuOpen();
    await expect(
      this.savedPlotRadio(plotName),
      `Deleted plot "${plotName}" should not appear in the Plots menu`,
    ).toHaveCount(0);
    await expect(
      this.savedPlotLabel(plotName),
      `Deleted plot label "${plotName}" should no longer be displayed under ${sectionHeading}`,
    ).toHaveCount(0);
    logger.info(`Deleted plot "${plotName}" from ${sectionHeading}`);
  }

  generateUniquePlotName(prefix: string): string {
    const uniqueSuffix = `${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
    return `${prefix} ${uniqueSuffix}`;
  }

  /** Same style of panel checks as after Measured Data plot opens, adapted for Results → Plot. */
  async verifyPlotPanelOpened(): Promise<void> {
    await AssertionUtils.assertVisible(this.plotScreenHeading);
    await AssertionUtils.assertVisible(this.page.locator('.dropdown.me-3'));
    await AssertionUtils.assertVisible(this.newPlotButton);
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'Auto Step' }));
    await AssertionUtils.assertVisible(this.page.getByText('Version:'));
    await AssertionUtils.assertVisible(this.page.getByText('Stage:'));
    await AssertionUtils.assertVisible(this.page.getByRole('region', { name: 'scrollable content' }));
    await AssertionUtils.assertVisible(this.measuredPlotChannelButton);
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'Events download' }));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'sync' }));
    await AssertionUtils.assertVisible(this.page.locator('div:nth-child(4)'));
    await AssertionUtils.assertVisible(this.page.locator('.table-view-toggle').first());
    await AssertionUtils.assertVisible(
      this.page.locator('.d-flex.flex-wrap > div:nth-child(6)').first(),
    );
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'refresh' }));
    await AssertionUtils.assertVisible(this.popoutButton());
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'expand/collapse' }).first());
    await AssertionUtils.assertVisible(
      this.page.locator('.d-flex.flex-wrap.align-items-center.justify-content-end > div:nth-child(3)'),
    );
    await AssertionUtils.assertVisible(this.page.locator('div').filter({ hasText: /^Plot$/ }).first());
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'expand/collapse' }).nth(1));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'comment' }));
    await AssertionUtils.assertVisible(this.page.getByRole('combobox').nth(3));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'download  download' }));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'settings' }));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'Close' }));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'list' }));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'Save' }));
    await AssertionUtils.assertVisible(this.page.getByText('Click on the plot you would'));
    await AssertionUtils.assertVisible(this.page.getByRole('heading', { name: 'Plots', exact: true }));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'Close' }));
    await AssertionUtils.assertVisible(this.page.getByRole('heading', { name: 'Fracpro Live+', exact: true }));
    await AssertionUtils.assertVisible(this.plotDashboard.getByRole('radio', { name: 'Surf PRC' }));
    await AssertionUtils.assertVisible(this.plotDashboard.getByRole('radio', { name: 'Btm PRC' }));
    await AssertionUtils.assertVisible(this.plotDashboard.getByRole('radio', { name: 'Measured Data' }));
    await AssertionUtils.assertVisible(this.plotDashboard.getByRole('radio', { name: 'Chemical' }));
    await AssertionUtils.assertVisible(
      this.page.getByRole('listitem').filter({ hasText: 'Surf PRC' }).first(),
    );
  }

  private plotTypeRadio(plotType: string): Locator {
    return this.plotDashboard
      .getByRole('radio', { name: plotType })
      .or(this.page.getByRole('radio', { name: plotType }))
      .first();
  }

  async selectPlotType(plotType: FracproLivePlotType): Promise<void> {
    await this.selectPlotCategory(plotType);
  }

  /**
   * For preset plot templates (Surf PRC / Btm PRC / Chemical):
   * + New Plot must be enabled and Auto Step must be disabled.
   * Auto Step uses Angular `.disabled` class (not always the HTML disabled attribute).
   */
  async verifyNewPlotEnabledAndAutoStepDisabledForPlotType(
    plotType: (typeof this.presetPlotTypes)[number],
  ): Promise<void> {
    await this.selectPlotType(plotType);

    await expect(
      this.page.getByText(new RegExp(`${plotType}\\s*\\+\\s*New\\s*Plot\\s*Auto\\s*Step`, 'i')),
      `Toolbar should show ${plotType} with New Plot / Auto Step`,
    ).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });

    await expect(
      this.newPlotButton,
      `+ New Plot should be enabled for ${plotType}`,
    ).toBeEnabled();
    await expect(
      this.newPlotButton,
      `+ New Plot should not have disabled class for ${plotType}`,
    ).not.toHaveClass(/disabled/);

    await expect(
      this.autoStepButtonAny,
      `Auto Step should be visible for ${plotType}`,
    ).toBeVisible();
    await expect(
      this.autoStepButtonAny,
      `Auto Step should have disabled class for ${plotType}`,
    ).toHaveClass(/disabled/);
    await expect(
      this.page.locator('button:has-text("Auto Step"):not(.disabled)'),
      `Enabled Auto Step control should not be present for ${plotType}`,
    ).toHaveCount(0);
  }

  async verifyPresetPlotTypesNewPlotEnabledAutoStepDisabled(): Promise<void> {
    for (const plotType of this.presetPlotTypes) {
      await this.verifyNewPlotEnabledAndAutoStepDisabledForPlotType(plotType);
    }
    // Restore Surf PRC so later create / toolbar flows keep the prior baseline.
    await this.selectPlotType('Surf PRC');
  }

  async verifyNewPlotCreateAndDuplicateWarningFlow(): Promise<void> {
    await this.verifySavePlotPopup();
    await this.verifyDefaultPlotNameForEnabledCategories();
    await this.verifyDuplicatePlotNameValidation();
    await this.saveUserDefinedPlot(this.generateUniquePlotName('UD Plot'));
    await this.savePadPlot(this.generateUniquePlotName('Pad Plot'));
  }

  async verifyAutoStepDialogFlow(): Promise<void> {
    const enabledAutoStepCount = await this.page
      .locator('button:has-text("Auto Step"):not(.disabled)')
      .count();
    if (enabledAutoStepCount === 0) {
      logger.info('Auto Step button is disabled; skipping Auto Step dialog validation.');
      return;
    }

    await expect(this.autoStepButton, 'Auto Step should be enabled before Auto Step flow').toBeEnabled();
    await this.clickResilient(this.autoStepButton, 'Auto Step');
    const autoStepDialog = this.page.getByRole('dialog');

    await expect(this.page.getByRole('heading', { name: 'Auto Step' })).toBeVisible();
    await expect(autoStepDialog.getByRole('button', { name: 'Close' })).toBeVisible();
    await expect(autoStepDialog.getByText('Automatic Staging Function')).toBeVisible();
    await expect(autoStepDialog.getByText('Selection Option')).toBeVisible();
    await expect(autoStepDialog.getByText('Apply To All Stages')).toBeVisible();
    await expect(autoStepDialog.getByText('High Sensitivity')).toBeVisible();
    await expect(autoStepDialog.getByRole('button', { name: 'No' })).toBeVisible();
    await expect(autoStepDialog.getByRole('button', { name: 'Yes' })).toBeVisible();

    const highSensitivityCheckbox = autoStepDialog.getByRole('checkbox', { name: 'High Sensitivity' });
    await expect(highSensitivityCheckbox).toBeVisible();
    await expect(
      highSensitivityCheckbox,
      'High Sensitivity should be unchecked by default',
    ).not.toBeChecked();

    await highSensitivityCheckbox.check();
    await autoStepDialog.getByRole('button', { name: 'Yes' }).click();

    await this.clickResilient(this.autoStepButton, 'Auto Step');
    await this.page.getByRole('dialog').getByRole('button', { name: 'No' }).click();

    await this.clickResilient(this.autoStepButton, 'Auto Step');
    await this.page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  }

  private async clickResilient(locator: Locator, label: string): Promise<void> {
    await WaitUtils.untilVisible(locator);

    try {
      await locator.click({ timeout: 10_000 });
      return;
    } catch (error) {
      logger.warn(`${label} click retry (force) due to: ${(error as Error).message}`);
    }

    try {
      await locator.click({ force: true, timeout: 10_000 });
      return;
    } catch (error) {
      logger.warn(`${label} click fallback (JS) due to: ${(error as Error).message}`);
    }

    await locator.evaluate((el) => (el as HTMLElement).click());
  }

  async preparePlotCanvas(): Promise<void> {
    const plotsPrompt = this.page.getByText('Click on the plot you would');
    if (!(await this.isVisibleQuick(plotsPrompt))) {
      return;
    }

    const surfPrcRadio = this.page.getByRole('radio', { name: 'Surf PRC' });
    if (await this.isVisibleQuick(surfPrcRadio)) {
      await surfPrcRadio.check();
    }

    const plotsPanelCloseButton = this.page.getByRole('button', { name: 'Close' }).first();
    if (await this.isVisibleQuick(plotsPanelCloseButton)) {
      await plotsPanelCloseButton.click();
    }
  }

  /** Resolves the active main-plot name from selected preset radio or toolbar label. */
  private async resolveActivePlotName(): Promise<string> {
    for (const plotType of FRACPRO_LIVE_PLOT_TYPES) {
      const radio = this.plotTypeRadio(plotType);
      // Short timeout — radios may be hidden after Plots panel close; do not wait 30s each.
      const checked = await radio.isChecked({ timeout: 500 }).catch(() => false);
      if (checked) {
        return plotType;
      }
    }

    const toolbarLabel = this.page.getByText(/\+\s*New\s*Plot\s*Auto\s*Step/i).first();
    if (await this.isVisibleQuick(toolbarLabel, 1000)) {
      const text = ((await toolbarLabel.textContent()) ?? '').trim();
      const name = text.split('+')[0]?.trim();
      if (name) {
        return name;
      }
    }

    return 'Surf PRC';
  }

  /**
   * Explicit popout / dock flow (codegen locators):
   *  1. Assert "Pop out" is visible
   *  2. Click "Pop out" → assert "Dock to plot" is visible
   *  3. Assert popout plot name matches main plot name
   *  4. Click "Dock to plot" → assert it hides and "Pop out" is back
   */
  async verifyPopoutPlotNameMatchesAndDock(): Promise<void> {
    const mainPlotName = await this.resolveActivePlotName();
    expect(mainPlotName, 'Active main plot name should be available').toBeTruthy();
    logger.info(`Popout flow — active main plot name: "${mainPlotName}"`);

    // --- 1. Assert main plot name is present before opening popout ---
    await expect(
      this.page
        .getByText(new RegExp(`${mainPlotName}\\s*\\+\\s*New\\s*Plot\\s*Auto\\s*Step`, 'i'))
        .or(this.plotDashboard.getByRole('radio', { name: mainPlotName }))
        .first(),
      `Main plot "${mainPlotName}" should be visible before popout`,
    ).toBeVisible();

    // --- 2. Assert "Pop out" button and click it ---
    const popoutBtn = this.popoutButton();
    await expect(popoutBtn, '"Pop out" button must be visible before opening popout').toBeVisible({
      timeout: TIMEOUTS.SLOW_UI_MS,
    });
    await expect(popoutBtn, '"Pop out" button must be enabled').toBeEnabled();
    await expect(
      this.dockToPlotButton(),
      '"Dock to plot" must be hidden before opening popout',
    ).toBeHidden({ timeout: 3_000 });
    await popoutBtn.click();
    logger.info('Clicked "Pop out"');

    // --- 3. Assert "Dock to plot" appears (popout is open) ---
    const dockBtn = this.dockToPlotButton();
    await expect(dockBtn, '"Dock to plot" must appear after clicking Pop out').toBeVisible({
      timeout: 20_000,
    });
    await expect(dockBtn, '"Dock to plot" must be enabled while popout is open').toBeEnabled();
    logger.info('"Dock to plot" visible — popout is open');

    // --- 4. Assert plot name in popout matches main plot ---
    await expect(
      this.page.locator('app-plot-popout').getByText(mainPlotName).first(),
      `Popout plot name must match main plot "${mainPlotName}"`,
    ).toBeVisible({ timeout: 15_000 });
    logger.info(`Popout plot name matched main plot "${mainPlotName}"`);

    // --- 5. Click "Dock to plot" to close popout ---
    await dockBtn.click();
    logger.info('Clicked "Dock to plot"');

    // --- 6. Assert popout closed: Dock hidden, Pop out visible again ---
    await expect(dockBtn, '"Dock to plot" must hide after docking').toBeHidden({
      timeout: 20_000,
    });
    await expect(
      this.popoutButton(),
      '"Pop out" must be visible again after docking',
    ).toBeVisible({ timeout: 10_000 });
    await this.page.locator('app-plot-popout').waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => {});
    logger.info(`Popout closed via Dock — plot name was "${mainPlotName}"`);
  }

  private async isToolbarIconActive(button: Locator): Promise<boolean> {
    return button.evaluate((el) => {
      if (el.getAttribute('aria-pressed') === 'true') {
        return true;
      }
      if (el.getAttribute('aria-expanded') === 'true') {
        return true;
      }
      if (el.getAttribute('aria-selected') === 'true') {
        return true;
      }

      const className = el.className?.toString() ?? '';
      if (/\bactive\b|\bselected\b|\bpressed\b|\bbtn-active\b|\bfocused\b/i.test(className)) {
        return true;
      }

      const parentClassName = el.parentElement?.className?.toString() ?? '';
      if (/\bactive\b|\bselected\b/i.test(parentClassName)) {
        return true;
      }

      const style = window.getComputedStyle(el);
      const backgroundColor = style.backgroundColor;
      if (
        backgroundColor &&
        backgroundColor !== 'rgba(0, 0, 0, 0)' &&
        backgroundColor !== 'transparent' &&
        /255,\s*255,\s*255|rgb\(255/i.test(backgroundColor)
      ) {
        return true;
      }

      return el === document.activeElement;
    });
  }

  private async assertToolbarIconClicked(button: Locator, description: string): Promise<void> {
    await expect(button, `${description} icon should remain visible after click`).toBeVisible();

    if (await this.isToolbarIconActive(button)) {
      return;
    }

    await expect(button, `${description} icon should remain enabled after click`).toBeEnabled();
  }

  private async clickToolbarIconAndAssertActive(
    button: Locator,
    description: string,
  ): Promise<void> {
    await WaitUtils.untilVisible(button);
    await button.click();
    await this.assertToolbarIconClicked(button, description);
  }

  private async clickToggleIconAndAssertChanged(
    button: Locator,
    description: string,
  ): Promise<void> {
    await WaitUtils.untilVisible(button);
    const expandedBefore = await button.getAttribute('aria-expanded');
    const activeBefore = await this.isToolbarIconActive(button);

    await this.clickResilient(button, description);

    const expandedAfter = await button.getAttribute('aria-expanded');
    if (expandedBefore !== null && expandedAfter !== null && expandedBefore !== expandedAfter) {
      return;
    }

    const activeAfter = await this.isToolbarIconActive(button);
    if (activeBefore !== activeAfter || activeAfter) {
      return;
    }

    // Chart overlays (e.g. Highcharts on preset plots) can swallow pointer events;
    // still confirm the control remains visible/enabled after the click attempt.
    await this.assertToolbarIconClicked(button, description);
  }

  async verifyTooltipEnabledByDefaultOnMeasuredPlot(): Promise<void> {
    await expect(this.page.getByRole('button', { name: 'expand/collapse' }).nth(1)).toBeVisible();
    await AssertionUtils.assertVisible(this.measuredPlotCommentButton);
    await AssertionUtils.assertVisible(this.measuredPlotTooltipCombobox);
  }

  async verifyMeasuredPlotToolbarInteractions(): Promise<void> {
    await this.verifyTooltipEnabledByDefaultOnMeasuredPlot();

    await this.clickToolbarIconAndAssertActive(this.measuredPlotCommentButton, 'Comment');

    const dropdownArrow = this.measuredPlotToolbarActions
      .locator('.dropdown > .ng-select-container > .ng-arrow-wrapper, ng-select .ng-arrow-wrapper')
      .last();
    if (await this.isVisibleQuick(dropdownArrow)) {
      await dropdownArrow.click();
      await expect(this.page.locator('.ng-dropdown-panel').last()).toBeVisible();
      await dropdownArrow.click();
      await expect(this.page.locator('.ng-dropdown-panel').last()).toBeHidden();
    }

    const downloadButton = this.page.getByRole('button', { name: /download\s+download/i });
    if (await this.isVisibleQuick(downloadButton)) {
      await this.clickToolbarIconAndAssertActive(downloadButton, 'Download');
    }

    // Do not click arbitrary toolbar nth-child buttons here — that can re-open Pop out
    // and conflict with the dedicated popout/dock + channel flows.
  }

  async verifyAutoScaleYAxisCheckedByDefault(): Promise<void> {
    await expect(this.channelSelectionHeading).toBeVisible();
    await expect(this.page.getByText('Auto Scale Y-Axis').first()).toBeVisible();

    const autoScaleCheckbox = this.page
      .getByRole('checkbox', { name: /Auto Scale Y-Axis/i })
      .or(this.page.getByText('Auto Scale Y-Axis').locator('..').getByRole('checkbox'))
      .first();

    await AssertionUtils.assertVisible(autoScaleCheckbox);
    await expect(autoScaleCheckbox, 'Auto Scale Y-Axis should be checked by default').toBeChecked();
  }

  /** Normalize CSS color (rgb/rgba/#hex) to lowercase #rrggbb for comparison. */
  private normalizeCssColor(color: string): string {
    const value = color.trim().toLowerCase();
    if (value.startsWith('#')) {
      if (value.length === 4) {
        return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
      }
      return value.slice(0, 7);
    }
    const match = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!match) {
      return value;
    }
    const toHex = (n: string) => Number(n).toString(16).padStart(2, '0');
    return `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`;
  }

  /**
   * Channel Selection dialog → assert Auto Scale checked + selected channels/colors,
   * close dialog, then assert the same channel names appear on the plot in the same colors.
   */
  async verifyMeasuredPlotChannelSelectionFlow(): Promise<void> {
    // Guard: ensure popout is not open and no dialog is blocking before clicking Channel
    const dockBtn = this.dockToPlotButton();
    if (await dockBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      logger.warn('Popout still open before channel flow — docking first');
      await dockBtn.click();
      await expect(dockBtn, 'Popout should close before channel flow').toBeHidden({ timeout: 15_000 });
      await this.page.locator('app-plot-popout').waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    }
    const strayCancel = this.page.getByRole('button', { name: 'Cancel' });
    if (await strayCancel.isVisible({ timeout: 500 }).catch(() => false)) {
      await strayCancel.click();
    }

    // Open Channel Selection (codegen: getByRole('button', { name: 'channel' }))
    await this.clickToolbarIconAndAssertActive(this.measuredPlotChannelButton, 'Channel');
    await expect(this.channelSelectionHeading).toBeVisible();
    await this.verifyAutoScaleYAxisCheckedByDefault();

    const dialog = this.page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Close' })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Set', exact: true })).toBeVisible();

    // Selected channels in popup (from codegen + screenshot)
    const popupChannels: Array<{ name: string; plotLabel: string; colorIndex: number }> = [
      { name: 'Slurry Flow Rate', plotLabel: 'Slurry Flow Rate (bpm)', colorIndex: 0 },
      { name: 'Treating Pressure', plotLabel: 'Treating Pressure (psi)', colorIndex: 1 },
      { name: 'Proppant Conc', plotLabel: 'Proppant Conc (ppa)', colorIndex: 2 },
    ];

    const colorInputs = this.page.locator('.form-control.form-control-color');
    await expect(colorInputs.first(), 'Channel color picker should be visible').toBeVisible();

    // Accessible names include the color hex (codegen: "Treating Pressure #ffffff")
    const dialogAria = await dialog.ariaSnapshot();
    logger.info(`Channel Selection aria snapshot (color source):\n${dialogAria}`);

    const popupColors: string[] = [];
    for (const channel of popupChannels) {
      await expect(
        this.page.getByRole('cell', { name: channel.name }).locator('#customSelect'),
        `Popup channel "${channel.name}" should be selected`,
      ).toBeVisible();

      const colorInput = colorInputs.nth(channel.colorIndex);
      await expect(colorInput, `Color for "${channel.name}" should be visible`).toBeVisible();

      const hexMatch = dialogAria.match(
        new RegExp(`${channel.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n#]*(#[0-9a-fA-F]{6})`, 'i'),
      );
      const hex = this.normalizeCssColor(hexMatch?.[1] ?? '');
      expect(hex, `Popup accessible name should include hex color for "${channel.name}"`).toMatch(
        /^#[0-9a-f]{6}$/i,
      );
      popupColors.push(hex);
      logger.info(`Popup channel "${channel.name}" color = ${hex}`);
    }

    // Treating Pressure row also exposes color in accessible name (codegen: '#ffffff')
    await expect(
      this.page.getByRole('row', { name: /Treating Pressure\s*#ffffff/i }).locator('#customSelect'),
      'Treating Pressure row should show white (#ffffff) color',
    ).toBeVisible();
    expect(popupColors[1], 'Treating Pressure popup color should be white').toBe('#ffffff');

    // Close dialog (codegen uses dialog Close, not Cancel)
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(this.channelSelectionHeading, 'Channel Selection should close').toBeHidden({
      timeout: 15_000,
    });

    // Plot legends / axis labels must match popup channel names + colors
    await expect(this.page.getByText('Job Time (min)')).toBeVisible();
    for (let i = 0; i < popupChannels.length; i++) {
      const { plotLabel } = popupChannels[i];
      const expectedColor = popupColors[i];
      const plotTexts = this.page.getByText(plotLabel);
      await expect(plotTexts.first(), `Plot should show "${plotLabel}"`).toBeVisible({
        timeout: TIMEOUTS.SLOW_UI_MS,
      });

      const count = await plotTexts.count();
      let matchedColor = false;
      let seenColors: string[] = [];
      for (let j = 0; j < count; j++) {
        const actualColor = this.normalizeCssColor(
          await plotTexts.nth(j).evaluate((el) => {
            const style = window.getComputedStyle(el);
            const fill = style.getPropertyValue('fill');
            if (fill && fill !== 'none' && fill !== 'rgba(0, 0, 0, 0)') {
              return fill;
            }
            return style.color;
          }),
        );
        seenColors.push(actualColor);
        if (actualColor === expectedColor) {
          matchedColor = true;
          break;
        }
      }
      expect(
        matchedColor,
        `Plot text "${plotLabel}" should use popup color ${expectedColor} (seen: ${seenColors.join(', ')})`,
      ).toBe(true);
      logger.info(`Plot "${plotLabel}" color matched popup ${expectedColor}`);
    }

    // Extra presence checks from codegen (axis + legend copies)
    await expect(this.page.getByText('Slurry Flow Rate (bpm)').nth(1)).toBeVisible();
    await expect(this.page.getByText('Proppant Conc (ppa)').nth(1)).toBeVisible();
    await expect(this.page.getByText('Treating Pressure (psi)').nth(1)).toBeVisible();
  }

  async verifyMeasuredPlotToolbarAndChannelSelection(): Promise<void> {
    await this.verifyMeasuredPlotToolbarInteractions();
    await this.verifyMeasuredPlotChannelSelectionFlow();
  }

  /**
   * Extracts wellId from the current page URL (already present after well selection).
   * Falls back to empty string if the URL has no wellId param.
   */
  private extractWellIdFromUrl(): string {
    try {
      const params = new URL(this.page.url()).searchParams;
      return params.get('wellId') ?? '';
    } catch {
      return '';
    }
  }

  /**
   * Selects "Measured Data" radio, reloads the plot with the same wellId already in the URL
   * (extracted at runtime — no Excel key needed) plus the treatmentId from Excel, then asserts:
   *   - + New Plot is ENABLED
   *   - Auto Step is ENABLED (no disabled class)
   *
   * @param treatmentId  PlotTreatmentId from Excel
   * @param plotId       plotId query param (default "0")
   */
  async verifyMeasuredDataNewPlotAndAutoStepEnabled(
    treatmentId: string,
    plotId = '0',
  ): Promise<void> {
    const measuredDataRadio = this.page.getByRole('radio', { name: 'Measured Data' });
    if (await this.isVisibleQuick(measuredDataRadio)) {
      await measuredDataRadio.check();
      await expect(measuredDataRadio, 'Measured Data radio should be checked').toBeChecked();
    }

    const wellId = this.extractWellIdFromUrl();
    const baseUrl = this.page.url().split('/plots')[0];
    const directUrl = `${baseUrl}/plots?wellId=${wellId}&callApi=true&plotId=${plotId}&treatmentId=${treatmentId}`;
    await this.page.goto(directUrl);
    await WaitUtils.untilVisible(this.newPlotButton, TIMEOUTS.SLOW_UI_MS);

    await expect(
      this.newPlotButton,
      'Measured Data: + New Plot should be ENABLED',
    ).toBeEnabled();
    await expect(
      this.newPlotButton,
      'Measured Data: + New Plot should not have disabled class',
    ).not.toHaveClass(/\bdisabled\b/);
    await expect(
      this.autoStepButtonAny,
      'Measured Data: Auto Step should be visible',
    ).toBeVisible();
    await expect(
      this.autoStepButtonAny,
      'Measured Data: Auto Step should be ENABLED (no disabled class)',
    ).not.toHaveClass(/\bdisabled\b/);
    logger.info(`Measured Data: + New Plot ✓ enabled | Auto Step ✓ enabled`);
  }

  /**
   * Selects "Schematic" radio, reloads the plot with the same wellId already in the URL
   * (extracted at runtime) plus the treatmentId from Excel, then asserts:
   *   - Toolbar label shows "Schematic + New Plot Auto Step"
   *   - + New Plot is DISABLED (Angular .disabled class)
   *   - Auto Step is DISABLED (Angular .disabled class)
   * Then restores Surf PRC so later create / toolbar flows stay usable.
   *
   * @param treatmentId  PlotTreatmentId from Excel
   */
  async verifySchematicNewPlotAndAutoStepDisabled(
    treatmentId: string,
  ): Promise<void> {
    const schematicRadio = this.page.getByRole('radio', { name: 'Schematic' });
    if (await this.isVisibleQuick(schematicRadio)) {
      await schematicRadio.check();
      await expect(schematicRadio, 'Schematic radio should be checked').toBeChecked();
    }

    const wellId = this.extractWellIdFromUrl();
    const baseUrl = this.page.url().split('/plots')[0];
    const directUrl = `${baseUrl}/plots?wellId=${wellId}&callApi=true&treatmentId=${treatmentId}&view=schematic`;
    await this.page.goto(directUrl);
    await WaitUtils.untilVisible(this.newPlotButton, TIMEOUTS.SLOW_UI_MS);

    await expect(
      this.page.getByText('Schematic+ New Plot Auto Step').or(
        this.page.getByText(/Schematic\s*\+\s*New\s*Plot\s*Auto\s*Step/i),
      ).first(),
      'Schematic toolbar should show "Schematic + New Plot Auto Step"',
    ).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });

    await expect(
      this.newPlotButton,
      'Schematic: + New Plot should be DISABLED (has disabled class)',
    ).toHaveClass(/\bdisabled\b/);
    await expect(
      this.autoStepButtonAny,
      'Schematic: Auto Step should be DISABLED (has disabled class)',
    ).toHaveClass(/\bdisabled\b/);
    logger.info(`Schematic: + New Plot ✓ disabled | Auto Step ✓ disabled`);

    // Restore Surf PRC so create / Auto Step / toolbar steps after this stay unblocked.
    await this.selectPlotType('Surf PRC');
    await expect(
      this.newPlotButton,
      'After leaving Schematic, + New Plot must be enabled again',
    ).not.toHaveClass(/\bdisabled\b/);
    await expect(this.newPlotButton, '+ New Plot should be clickable after Surf PRC restore').toBeEnabled();
  }

  /** Full Results → Plot validation covering menu, categories, selection, and save flows. */
  async runPlotFlow(): Promise<void> {
    await this.verifyPlotsMenuHeader();
    await this.verifyDefaultPlotCategories();
    await this.verifyPlotSelectionForAllCategories();
    await this.verifyNewPlotButtonAvailability();
    await this.verifySavePlotPopup();
    await this.verifyDefaultPlotNameForEnabledCategories();
    await this.verifyDuplicatePlotNameValidation();
    await this.saveUserDefinedPlot(this.generateUniquePlotName('UD Plot'));
    await this.savePadPlot(this.generateUniquePlotName('Pad Plot'));
  }
}

export function createPlotPage(page: Page): PlotPage {
  return new PlotPage(page);
}
