import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { TIMEOUTS } from '../constants/timeouts';
import type { EntryFrictionFlowData } from '../excel/entryFrictionTestData';
import { logger } from '../logger';
import { WaitUtils } from '../utils/WaitUtils';

/**
 * Analysis → Entry Friction (codegen-aligned, Excel-driven values).
 */
export class EntryFrictionPage extends BasePage {
  private readonly sideMenu = this.page.locator('#side-menu');
  private readonly topbar = this.page.locator('#page-topbar');
  private readonly analysisSectionIcon = this.sideMenu
    .getByRole('link', { name: /icon\s+Analysis/i })
    .first();
  private readonly entryFrictionNavLink = this.sideMenu.getByRole('link', {
    name: 'Entry Friction',
  });
  private readonly root = this.page.locator('app-entry-friction');
  private readonly newStepDownButton = this.page.getByRole('button', {
    name: 'New Step-Down Analysis',
  });
  private readonly nextButton = this.page.getByRole('button', { name: 'Next' });
  private readonly saveButton = this.page.getByRole('button', { name: 'Save', exact: true });
  private readonly cramerCheckbox = this.page.getByRole('checkbox', {
    name: /Use Cramer'?s Perf Erosion/i,
  });
  private readonly editCramerButton = this.page.getByRole('button', {
    name: /Edit Parameters for Cramer'?s/i,
  });
  private readonly cramerModal = this.page.locator('#cramersModalLabel');
  private readonly cramerDialog = this.page.getByRole('dialog').filter({
    hasText: /Cramer's Perf Erosion/i,
  });

  private async isVisibleQuick(locator: Locator, timeout = 2000): Promise<boolean> {
    return locator.isVisible({ timeout }).catch(() => false);
  }

  /** Close any open ng-select / options list (Escape + click page header). */
  private async closeOpenDropdown(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);

    const options = this.page.getByLabel('Options list');
    if (!(await this.isVisibleQuick(options, 400))) {
      return;
    }

    // Click outside the open list — page heading / topbar
    const heading = this.topbar.getByRole('heading', { name: /Entry Friction/i }).first();
    if (await this.isVisibleQuick(heading, 800)) {
      await heading.click({ force: true });
    } else {
      await this.topbar.click({ position: { x: 48, y: 18 }, force: true });
    }
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);

    if (await this.isVisibleQuick(options, 400)) {
      await this.topbar.click({ position: { x: 48, y: 18 }, force: true });
      await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
    }
  }

  /** Wellbore Friction fluid ng-select that already shows the Excel fluid name. */
  private fluidNgSelect(fluidName: string): Locator {
    return this.root
      .locator('ng-select')
      .filter({ hasText: new RegExp(this.escapeRegex(fluidName), 'i') })
      .first();
  }

  /** Friction Multiplier input next to Wellbore Friction. */
  private frictionMultiplierSpin(): Locator {
    return this.root
      .locator('xpath=.//*[contains(normalize-space(.),"Friction Multiplier")]/following::input[1]')
      .first();
  }

  private async confirmNavigationIfPrompted(): Promise<void> {
    const yesSave = this.page.getByRole('button', { name: /Yes,\s*Save/i }).first();
    if (await this.isVisibleQuick(yesSave, 2500)) {
      await this.click(yesSave, 'Yes, Save (navigation)');
    }
  }

  async openAnalysisMenu(): Promise<void> {
    if (await this.isVisibleQuick(this.entryFrictionNavLink)) {
      await expect(this.sideMenu).toContainText(/Analysis/i);
      return;
    }

    await this.click(this.analysisSectionIcon, 'Analysis menu');
    await expect(this.entryFrictionNavLink).toBeVisible({ timeout: 10_000 });
  }

  async openEntryFriction(): Promise<void> {
    await this.openAnalysisMenu();
    await expect(this.entryFrictionNavLink).toBeEnabled();
    await this.click(this.entryFrictionNavLink, 'Entry Friction');
    await this.confirmNavigationIfPrompted();
    await expect(this.topbar).toContainText(/Entry Friction/i, { timeout: TIMEOUTS.SLOW_UI_MS });
    await WaitUtils.untilVisible(this.root, TIMEOUTS.SLOW_UI_MS);
    await this.closeOpenDropdown();
    logger.info('Analysis → Entry Friction opened');
  }

  async assertPageChrome(): Promise<void> {
    await this.closeOpenDropdown();
    await expect(this.root).toContainText('Entry Friction Vs Time');
    await expect(this.root).toContainText('Perforation Data');
    await expect(this.root).toContainText('Rate Step-Down Test Analyser');
    await expect(this.root).toContainText('Step-Down Friction Analysis');
    await expect(this.newStepDownButton).toBeVisible();
    await expect(this.nextButton).toBeVisible();
    await expect(this.root).toContainText('Time (min)');
    await expect(this.root).toContainText('Rate #1 (bpm)');
    await expect(this.root).toContainText('Rate #2 (bpm)');
    await expect(this.root).toContainText('Near-Wellbore Friction (psi)');
    await expect(this.root).toContainText('Perf. Friction (psi)');
    await expect(this.root).toContainText('Top MD (ft)');
    await expect(this.root).toContainText('Bot MD (ft)');
  }

  async assertPerforationData(data: EntryFrictionFlowData): Promise<void> {
    await this.closeOpenDropdown();
    for (const text of data.perforationTexts) {
      await expect(this.root).toContainText(text);
    }
    // Handsontable cell ids are not stable across builds — assert visible values on the page.
    await expect(this.root).toContainText(data.cellRateBpm);
    await expect(this.root).toContainText(data.cellDischarge);
    await expect(this.frictionMultiplierSpin()).toHaveValue(data.clusterCountDefault);
  }

  /**
   * Ensure Excel fluid is shown under Wellbore Friction.
   * Closes any open Pressure Drop Model list first; skips open when already selected.
   */
  async selectFluid(fluidName: string): Promise<void> {
    await this.closeOpenDropdown();

    const selected = this.fluidNgSelect(fluidName);
    if (await this.isVisibleQuick(selected, 3_000)) {
      logger.info(`Wellbore Friction fluid already selected: ${fluidName}`);
      await expect(selected).toContainText(fluidName);
    } else {
      const fluLabel = this.root.getByText('Flu.', { exact: true });
      await expect(fluLabel).toBeVisible({ timeout: 15_000 });
      const fluSelect = fluLabel.locator('xpath=following::ng-select[1]');
      const arrow = fluSelect.locator('.ng-arrow-wrapper').first();
      await this.click(arrow, 'Wellbore Friction fluid arrow');

      const option = this.page
        .getByLabel('Options list')
        .getByText(fluidName, { exact: false })
        .first();
      await expect(option, `Fluid "${fluidName}" should be listed`).toBeVisible({
        timeout: 15_000,
      });
      await this.click(option, `Fluid option ${fluidName}`);
      await this.closeOpenDropdown();
      await expect(this.fluidNgSelect(fluidName)).toBeVisible({ timeout: 15_000 });
    }

    await this.closeOpenDropdown();
    await expect(this.root).toContainText(fluidName);
    await expect(this.root).toContainText('Time (min)');
    await expect(this.root).toContainText('Rate #1 (bpm)');
    await expect(this.root).toContainText('Rate #2 (bpm)');
    await expect(this.root).toContainText('Change in Friction (psi)');
    await expect(this.root).toContainText('Step-Down Friction Analysis');
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async openNewStepDownAnalysis(): Promise<void> {
    await this.closeOpenDropdown();
    await this.click(this.newStepDownButton, 'New Step-Down Analysis');

    const infoDialog = this.page
      .locator('.modal.show, [role="dialog"]')
      .filter({ hasText: /run the model/i })
      .first();

    // Fresh pads have no model run — app shows an info dialog instead of the step-down plot UI.
    if (await this.isVisibleQuick(infoDialog, 8_000)) {
      await this.click(infoDialog.getByRole('button', { name: 'OK' }), 'Dismiss model-required info');
      await expect(infoDialog).toBeHidden({ timeout: 10_000 });
      logger.info('Step-down analysis skipped — model not run yet on this well');
      return;
    }

    await expect(this.page.getByRole('button', { name: 'Use Step-Down Data' })).toBeVisible({
      timeout: TIMEOUTS.SLOW_UI_MS,
    });
    await expect(this.page.locator('#plot-dashboard')).toContainText('Surf PRC', {
      timeout: TIMEOUTS.SLOW_UI_MS,
    });
  }

  async enableCramerAndUpdateClusterCount(data: EntryFrictionFlowData): Promise<void> {
    await this.closeOpenDropdown();
    if (!(await this.cramerCheckbox.isChecked())) {
      await this.cramerCheckbox.check();
    }
    await expect(this.cramerCheckbox).toBeChecked();

    const spin = this.frictionMultiplierSpin();
    await expect(spin).toBeVisible({ timeout: 10_000 });
    await this.click(spin, 'Friction Multiplier');
    await spin.fill(data.clusterCountTemp);
    await this.click(this.saveButton, 'Save Friction Multiplier temp');
    await expect(spin).toHaveValue(data.clusterCountTemp);

    await spin.dblclick();
    await spin.fill(data.clusterCountDefault);
    await this.click(this.saveButton, 'Save Friction Multiplier default');
    await expect(spin).toHaveValue(data.clusterCountDefault);

    await expect(this.root).toContainText('Note: Flow rate needs to go all the way to zero.');
    await expect(this.editCramerButton).toBeVisible();
  }

  private cramerSpin(name: string | RegExp): Locator {
    return this.page.getByRole('spinbutton', { name });
  }

  /** Compare type=number fields numerically (UI may use 0.90 vs 0.9, or spaced value attrs). */
  private async assertCramerNumericValue(locator: Locator, expected: string): Promise<void> {
    const expectedNum = Number(String(expected).replace(/,/g, '').replace(/\s/g, ''));
    await expect
      .poll(async () => {
        const raw =
          (await locator.getAttribute('value')) ??
          (await locator.inputValue().catch(() => '')) ??
          '';
        return Number(String(raw).replace(/,/g, '').replace(/\s/g, ''));
      }, { timeout: 15_000 })
      .toBeCloseTo(expectedNum, 4);
  }

  async assertCramerModalDefaults(data: EntryFrictionFlowData): Promise<void> {
    const dialog = this.cramerDialog;
    await expect(this.cramerModal).toContainText("Cramer's Perf Erosion Model Parameters");
    await expect(dialog.getByText('Initial Discharge Coefficient', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Final Discharge Coefficient', { exact: true })).toBeVisible();
    await expect(
      dialog.getByText('Proppant Volume when Final Discharge Coefficient is Reached', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      dialog.getByText('Proppant Volume when Perf Diameter Increase Starts', { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText('Perforation Diameter Change per Proppant Pumped', { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByText('Perf Friction is Unaffected for Proppant Smaller Than', { exact: true }),
    ).toBeVisible();

    const c = data.cramer;
    await this.assertCramerNumericValue(dialog.locator('#initialDischarge'), c.initialDischargeCoefficient);
    await this.assertCramerNumericValue(dialog.locator('#finalDischarge'), c.finalDischargeCoefficient);
    await this.assertCramerNumericValue(
      dialog.getByRole('spinbutton', { name: /Proppant Volume when Final/i }),
      c.proppantVolumeFinalDischarge,
    );
    await this.assertCramerNumericValue(
      dialog.getByRole('spinbutton', { name: /Proppant Volume when Perf/i }),
      c.proppantVolumePerfDiameterStart,
    );
    await this.assertCramerNumericValue(
      dialog.getByRole('spinbutton', { name: /Perforation Diameter Change/i }),
      c.perforationDiameterChange,
    );
    await this.assertCramerNumericValue(
      dialog.getByRole('spinbutton', { name: /Perf Friction is Unaffected/i }),
      c.perfFrictionUnaffectedBelow,
    );

    await expect(dialog.getByText('lbs/perf').first()).toBeVisible();
    await expect(dialog.getByText('in/klbs/perf')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
  }

  async openCramerModal(): Promise<void> {
    await this.closeOpenDropdown();
    await this.click(this.editCramerButton, "Edit Parameters for Cramer's");
    await expect(this.cramerModal).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });
  }

  async closeCramerModal(): Promise<void> {
    await this.click(this.page.getByRole('button', { name: 'Close' }), 'Close Cramer modal');
    await expect(this.cramerModal).toBeHidden({ timeout: 10_000 });
  }

  async saveCramerDefaultsAfterProbeEdit(data: EntryFrictionFlowData): Promise<void> {
    await this.openCramerModal();
    const initial = this.cramerSpin('Initial Discharge Coefficient');
    await this.click(initial, 'Initial Discharge Coefficient');
    await initial.fill('0.95');
    await this.click(initial, 'Initial Discharge Coefficient restore');
    await initial.fill(data.cramer.initialDischargeCoefficient);
    await this.click(
      this.cramerDialog.getByRole('button', { name: 'Save' }),
      'Save Cramer parameters',
    );
    await expect(this.cramerModal).toBeHidden({ timeout: 15_000 });
  }

  async verifyCramerDefaultsPersisted(data: EntryFrictionFlowData): Promise<void> {
    await this.openCramerModal();
    await this.assertCramerModalDefaults(data);
    await this.closeCramerModal();
  }

  async runEntryFrictionFlow(data: EntryFrictionFlowData): Promise<void> {
    await this.openEntryFriction();
    await this.closeOpenDropdown();
    await this.assertPageChrome();
    await this.assertPerforationData(data);
    await this.selectFluid(data.fluidName);
    await this.closeOpenDropdown();
    await this.openNewStepDownAnalysis();
    await this.openEntryFriction();
    await this.closeOpenDropdown();
    await this.enableCramerAndUpdateClusterCount(data);
    await this.openCramerModal();
    await this.assertCramerModalDefaults(data);
    await this.closeCramerModal();
    await this.saveCramerDefaultsAfterProbeEdit(data);
    await this.verifyCramerDefaultsPersisted(data);
    await expect(this.topbar).toContainText('Entry Friction');
  }
}

export function createEntryFrictionPage(page: Page): EntryFrictionPage {
  return new EntryFrictionPage(page);
}
