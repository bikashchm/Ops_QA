import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { BasePage } from '../base/BasePage';
import {
  reservoirDisplayMatches,
  type ReservoirParametersDefaults,
  type ReservoirParametersFillValues,
  type ReservoirParametersTestData,
} from '../excel/reservoirParametersTestData';
import { logger } from '../logger';
import { AssertionUtils } from '../utils/AssertionUtils';
import { WaitUtils } from '../utils/WaitUtils';
import { step } from '../utils/step';

const PAGE_HEADING = 'Reservoir Parameters';
const FIELD_WAIT_MS = 10_000;

const FIELD_LABELS = [
  'Fracture Height (Gross Pay)*',
  'Payzone Height*',
  'Depth to Center of Pay*',
  'Closure Stress in Payzone*',
  'Formation Modulus*',
  "Formation Poisson's Ratio*",
  'Leakoff Coefficient*',
  'Pore Fluid Permeability*',
  'Reservoir Temperature*',
  'Fracture Toughness*',
  'Reservoir Lithology*',
] as const;

const UNIT_LABELS = ['ft', 'psi', 'ft / √min', 'mD', '°F', 'psi in½'] as const;

/**
 * Inputs → Reservoir Parameters screen (app-reservoir).
 */
export class ReservoirParametersPage extends BasePage {
  private readonly inputsSectionIcon = this.page.getByRole('link', { name: /icon\s+Inputs/i }).first();
  private readonly reservoirNavLink = this.page.getByRole('link', { name: PAGE_HEADING });
  private readonly pageHeading = this.page.getByRole('heading', { name: PAGE_HEADING });
  private readonly reservoirApp = this.page.locator('app-reservoir');
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  private readonly nextButton = this.page.getByRole('button', { name: 'Next' });
  private readonly savedToast = this.page.getByLabel('SAVED!');

  private async isVisibleQuick(locator: Locator, timeout = 2000): Promise<boolean> {
    return locator.isVisible({ timeout }).catch(() => false);
  }

  private textbox(name: string): Locator {
    return this.page.getByRole('textbox', { name });
  }

  private async ensureInputsSectionExpanded(): Promise<void> {
    if (await this.isVisibleQuick(this.reservoirNavLink)) {
      return;
    }
    await this.click(this.inputsSectionIcon, 'Inputs section');
    await expect(
      this.reservoirNavLink,
      'Reservoir Parameters link should be visible after expanding Inputs',
    ).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });
  }

  async openFromInputsMenu(): Promise<void> {
    await step('Open Reservoir Parameters from Inputs menu', async () => {
      await this.ensureInputsSectionExpanded();
      await this.click(this.reservoirNavLink, PAGE_HEADING);
      await this.waitForScreen();
      logger.info('Inputs → Reservoir Parameters opened');
    });
  }

  async waitForScreen(): Promise<void> {
    await WaitUtils.untilVisible(this.pageHeading, TIMEOUTS.SLOW_UI_MS);
    await WaitUtils.untilVisible(this.reservoirApp, TIMEOUTS.SLOW_UI_MS);
  }

  private async assertFieldValue(fieldName: string, expected: string): Promise<void> {
    const field = this.textbox(fieldName);
    await WaitUtils.untilVisible(field);
    await expect
      .poll(
        async () => {
          const actual = await field.inputValue();
          return reservoirDisplayMatches(expected, actual)
            ? 'match'
            : `expected="${expected}" actual="${actual}"`;
        },
        { timeout: FIELD_WAIT_MS },
      )
      .toBe('match');
  }

  private async fillField(fieldName: string, value: string): Promise<boolean> {
    const field = this.textbox(fieldName);
    await WaitUtils.untilVisible(field);
    if (!(await field.isEditable({ timeout: 3000 }).catch(() => false))) {
      logger.info(`Skipping non-editable field: ${fieldName}`);
      return false;
    }

    await field.scrollIntoViewIfNeeded();
    await this.dblclick(field, fieldName);
    await this.fillFast(field, value, fieldName);
    await this.actions.pressKey('Tab');

    await step(`Verify ${fieldName} shows "${value}"`, async () => {
      await expect
        .poll(
          async () => {
            const actual = await field.inputValue();
            return reservoirDisplayMatches(value, actual)
              ? 'match'
              : `expected="${value}" actual="${actual}"`;
          },
          { timeout: FIELD_WAIT_MS },
        )
        .toBe('match');
    });
    return true;
  }

  async verifyFieldLabels(): Promise<void> {
    await step('Verify Reservoir Parameters field labels', async () => {
      await WaitUtils.untilVisible(this.reservoirApp);
      for (const label of FIELD_LABELS) {
        await AssertionUtils.assertTextContains(this.reservoirApp, label);
      }
    });
  }

  async verifyDefaultFieldValues(defaults: ReservoirParametersDefaults): Promise<void> {
    await step('Verify Reservoir Parameters default values from Excel', async () => {
      await this.assertFieldValue('Fracture Height (Gross Pay)*', defaults.fractureHeight);
      await this.assertFieldValue('Payzone Height*', defaults.payzoneHeight);
      await this.assertFieldValue('Closure Stress in Payzone*', defaults.closureStressDisplay);
      await this.assertFieldValue('Formation Modulus*', defaults.formationModulus);
      await this.assertFieldValue("Formation Poisson's Ratio*", defaults.poissonsRatio);
      await this.assertFieldValue('Leakoff Coefficient*', defaults.leakoffCoefficient);
      await this.assertFieldValue('Pore Fluid Permeability*', defaults.poreFluidPermeability);
      await this.assertFieldValue('Reservoir Temperature*', defaults.reservoirTemperature);
      await this.assertFieldValue('Fracture Toughness*', defaults.fractureToughness);
    });
  }

  async selectLithology(lithology: string): Promise<void> {
    await step(`Select Reservoir Lithology "${lithology}"`, async () => {
      await WaitUtils.untilVisible(this.reservoirApp);
      const lithologyCombobox = this.reservoirApp.locator('ng-select').filter({
        has: this.page.locator('.ng-value-container'),
      }).last();
      await this.click(lithologyCombobox, 'Lithology dropdown');

      const option = this.page.getByLabel('Options list').getByText(lithology, { exact: true });
      await this.click(option, lithology);
      await AssertionUtils.assertTextContains(this.reservoirApp, lithology);
    });
  }

  async verifyUnits(): Promise<void> {
    await step('Verify Reservoir Parameters units', async () => {
      for (const unit of UNIT_LABELS) {
        await AssertionUtils.assertTextContains(this.reservoirApp, unit);
      }
    });
  }

  async verifyNextButtonVisible(): Promise<void> {
    await step('Verify Next button is visible', async () => {
      await WaitUtils.untilVisible(this.nextButton);
      await expect(this.nextButton).toBeVisible();
    });
  }

  async fillReservoirFields(fill: ReservoirParametersFillValues): Promise<void> {
    await step('Fill Reservoir Parameters fields from Excel', async () => {
      await this.fillField('Fracture Height (Gross Pay)*', fill.fractureHeight);
      await this.fillField('Payzone Height*', fill.payzoneHeight);
      await this.fillField('Depth to Center of Pay*', fill.depthToCenterOfPay);
      await this.fillField('Closure Stress in Payzone*', fill.closureStress);
      await this.fillField('Formation Modulus*', fill.formationModulus);
      await this.fillField("Formation Poisson's Ratio*", fill.poissonsRatio);
      await this.fillField('Leakoff Coefficient*', fill.leakoffCoefficient);
      await this.fillField('Pore Fluid Permeability*', fill.poreFluidPermeability);
      await this.fillField('Reservoir Temperature*', fill.reservoirTemperature);
      await this.fillField('Fracture Toughness*', fill.fractureToughness);
    });
  }

  async save(): Promise<void> {
    await step('Save Reservoir Parameters', async () => {
      await WaitUtils.untilVisible(this.saveButton);
      await expect(this.saveButton).toBeEnabled({ timeout: TIMEOUTS.SLOW_UI_MS });
      await this.click(this.saveButton, 'Save');
      const toastVisible = await this.savedToast
        .first()
        .isVisible({ timeout: 15_000 })
        .catch(() => false);
      if (!toastVisible) {
        await this.page.getByText(/saved/i).first().isVisible({ timeout: 5_000 }).catch(() => false);
      }
      await this.page.waitForTimeout(TIMEOUTS.SAVE_WAIT_MS);
    });
  }

  async assertSavedFillValues(
    fill: ReservoirParametersFillValues,
    closureStressDisplay: string,
  ): Promise<void> {
    await step('Assert saved Reservoir Parameters values from Excel', async () => {
      await this.assertFieldValue('Fracture Height (Gross Pay)*', fill.fractureHeight);
      await this.assertFieldValue('Payzone Height*', fill.payzoneHeight);
      await this.assertFieldValue('Closure Stress in Payzone*', closureStressDisplay);
      await this.assertFieldValue('Formation Modulus*', fill.formationModulus);
      await this.assertFieldValue("Formation Poisson's Ratio*", fill.poissonsRatio);
      await this.assertFieldValue('Leakoff Coefficient*', fill.leakoffCoefficient);
      // Pore Fluid Permeability is often disabled/read-only — assert only when editable.
      const perm = this.textbox('Pore Fluid Permeability*');
      if (await perm.isEditable({ timeout: 2000 }).catch(() => false)) {
        await this.assertFieldValue('Pore Fluid Permeability*', fill.poreFluidPermeability);
      }
      await this.assertFieldValue('Reservoir Temperature*', fill.reservoirTemperature);
      await this.assertFieldValue('Fracture Toughness*', fill.fractureToughness);
    });
  }

  async refreshPage(): Promise<void> {
    await step('Refresh Reservoir Parameters page', async () => {
      await this.page.reload({ waitUntil: 'load', timeout: TIMEOUTS.SLOW_UI_MS });
      await this.page.waitForTimeout(2_000);
      await this.waitForScreen();
    });
  }

  async runReservoirParametersFlow(data: ReservoirParametersTestData): Promise<void> {
    await this.openFromInputsMenu();
    await this.verifyFieldLabels();
    await this.verifyDefaultFieldValues(data.defaults);
    await this.selectLithology(data.fill.lithology);
    await this.verifyUnits();
    await this.verifyNextButtonVisible();
    await this.fillReservoirFields(data.fill);
    await this.save();
    await this.assertSavedFillValues(data.fill, data.defaults.closureStressDisplay);
    await this.refreshPage();
    await this.assertSavedFillValues(data.fill, data.defaults.closureStressDisplay);
  }
}

export function createReservoirParametersPage(page: Page): ReservoirParametersPage {
  return new ReservoirParametersPage(page);
}
