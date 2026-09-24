import { type Locator, type Page, expect } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import type { EditFluidTestData } from '../excel/materialTestData';
import { escapeRegex } from '../excel/materialTestData';
import { BasePage } from '../base/BasePage';
import { AssertionUtils } from '../utils/AssertionUtils';
import { WaitUtils } from '../utils/WaitUtils';

const WELLBORE_TABLE_HEADERS = [
  'Selected Fluid',
  'Wellbore Segment',
  'Segment Type',
  'Length (ft)',
  'Csg ID (in)',
  'Q (bpm)',
  'P (psi/1000 ft)',
  'Peff (psi/100 ft)',
];

const RHEOLOGY_STATIC_HEADERS = [
  'Selected Fluid',
  'Rheology for Selected Fluid',
  'Apparent Viscosity Calculator',
  'Recalculate',
];

const RHEOLOGY_TREEGRID_HEADERS = ["Time (hr)", "n'", "k'"];

const THERMAL_STATIC_HEADERS = ['BTU/ft-hr-°F', 'BTU/lb-°F', 'sg'];

const CHEMICAL_TABLE_HEADERS = ['Chemical Name', 'Concentration', 'Unit', 'Type'];

/**
 * Material Selection — edit fluid flow driven by Excel test data.
 */
export class EditFluidPage extends BasePage {
  private readonly materialSelectionLink = this.page.getByRole('link', { name: 'Material Selection' });
  private readonly fluidEditButton = this.page.locator('#cell-0-2').getByRole('img', { name: 'Edit' });
  private readonly descriptionField = this.page.getByRole('textbox', { name: 'Description Description' });
  private readonly systemField = this.page.getByRole('textbox', { name: 'System System System System' });
  private readonly tabPanel = this.page.getByRole('tabpanel');
  private readonly tabPanelDescription = this.page.getByRole('tabpanel').locator('#description');
  private readonly setIndividualValuesRadio = this.page.getByRole('radio', { name: 'Set Individual Values' });
  private readonly valuesTreeGrid = this.page
    .getByRole('treegrid')
    .filter({ hasText: '# Q (bpm) P (psi/1000 ft)' });
  private readonly treeGrid = this.page.getByRole('treegrid');
  private readonly chemicalsTreeGrid = this.page
    .getByRole('treegrid')
    .filter({ hasText: 'Chemical Name' });
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  private readonly fluidRheologyTab = this.page.getByRole('tab', { name: 'Fluid Rheology' });
  private readonly fluidThermalPropertiesTab = this.page.getByRole('tab', { name: 'Fluid Thermal Properties' });
  private readonly chemicalsTab = this.page.getByRole('tab', { name: 'Chemicals' });
  private readonly shearRateInput = this.page.locator('div:nth-child(2) > .input-group > .form-control').first();
  private readonly apparentViscosityInput = this.page.locator('.input-group.ng-star-inserted > .form-control');
  private readonly defaultTemperatureInput = this.page.locator(
    '.form-control.input-field.ng-untouched.ng-pristine.ng-star-inserted',
  );
  private readonly thermalConductivityInput = this.page.locator('.input-group.flex-nowrap > .form-control').first();
  private readonly thermalCapacityInput = this.page.locator(
    '.col-lg-12 > .main-card > .wrap-card > .card-body > .px-3 > .row > div:nth-child(2) > .input-group > .form-control',
  );
  private readonly specificGravityInput = this.page.locator(
    '.col-lg-12 > .main-card > .wrap-card > .card-body > .px-3 > .row > div:nth-child(3) > .input-group > .form-control',
  );
  private readonly fluidDataHeading = this.page.getByRole('heading');

  private async waitAndClick(locator: Locator, label: string): Promise<void> {
    await this.click(locator, label);
  }

  private async waitAndDblClick(locator: Locator): Promise<void> {
    await WaitUtils.untilVisible(locator);
    await expect(locator).toBeEnabled();
    await locator.dblclick();
  }

  private async waitAndFillFast(locator: Locator, value: string): Promise<void> {
    await WaitUtils.untilVisible(locator);
    await expect(locator).toBeEditable();
    await locator.fill(value);
  }

  /** Edit a HandsOnTable cell inside the wellbore Q/P grid. */
  private async editWellboreCell(
    cellSelector: string,
    value: string,
    activateTwice = false,
  ): Promise<void> {
    const cell = this.valuesTreeGrid.locator(cellSelector);
    await this.waitAndDblClick(cell);
    if (activateTwice) {
      await this.waitAndDblClick(cell);
    }

    const editor = this.valuesTreeGrid.locator('textarea');
    await WaitUtils.untilVisible(editor);
    await editor.fill(value, { force: true });

    if (activateTwice) {
      await this.page.keyboard.press('Enter');
      await WaitUtils.untilVisible(cell);
    }
  }

  private async waitAndCheck(locator: Locator): Promise<void> {
    await WaitUtils.untilVisible(locator);
    await expect(locator).toBeEnabled();
    await locator.check();
  }

  private async waitAndAssertValue(locator: Locator, value: string | RegExp): Promise<void> {
    await AssertionUtils.assertValue(locator, value);
  }

  private async waitAndAssertContains(locator: Locator, text: string | RegExp): Promise<void> {
    await AssertionUtils.assertTextContains(locator, text);
  }

  private chemicalRow(name: string): Locator {
    return this.chemicalsTreeGrid
      .getByRole('row')
      .filter({ hasText: new RegExp(escapeRegex(name), 'i') })
      .first();
  }

  /** Clear then type into the active HandsOnTable editor. */
  private async clearAndTypeHandsOnEditor(editor: Locator, value: string): Promise<void> {
    await WaitUtils.untilVisible(editor);
    await editor.click({ force: true });
    await editor.press('ControlOrMeta+a');
    await editor.press('Backspace');
    await editor.fill('');
    await editor.pressSequentially(value, { delay: TIMEOUTS.TYPING_DELAY_MS });
  }

  /** Edit concentration for a chemical row in the Chemicals tab grid. */
  private async editChemicalConcentrationCell(
    rowIndex: number,
    _chemicalName: string,
    value: string,
  ): Promise<void> {
    const concentrationCell = this.chemicalsTreeGrid.locator(`#cell-${rowIndex}-1`);

    await concentrationCell.scrollIntoViewIfNeeded();
    await this.waitAndDblClick(concentrationCell);

    const editor = this.page.locator('textarea.handsontableInput').last();
    await this.clearAndTypeHandsOnEditor(editor, value);
    await editor.press('Enter');
    await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
  }

  private async verifySaveSettled(): Promise<void> {
    await expect(this.saveButton).toBeDisabled({ timeout: TIMEOUTS.SLOW_UI_MS });
  }

  private formatSavedNumeric(value: string): RegExp {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
      return new RegExp(escapeRegex(value));
    }
    return new RegExp(`${numeric}(\\.0+)?`);
  }

  /** Allow backend/UI to persist fluid editor changes after Save. */
  private async waitAfterSave(): Promise<void> {
    await this.page.waitForTimeout(TIMEOUTS.SAVE_WAIT_MS);
  }

  async openMaterialSelection(): Promise<void> {
    await this.waitAndClick(this.materialSelectionLink, 'Material Selection');
    await WaitUtils.untilVisible(this.fluidEditButton);
  }

  async openFluidEditor(): Promise<void> {
    await this.waitAndClick(this.fluidEditButton, 'Fluid Edit');
  }

  async verifyFluidEditorDefaults(data: EditFluidTestData): Promise<void> {
    await this.waitAndAssertValue(this.descriptionField, data.description);
    await this.waitAndAssertValue(this.systemField, data.system);
  }

  async verifyWellboreTableHeaders(): Promise<void> {
    for (const header of WELLBORE_TABLE_HEADERS) {
      await this.waitAndAssertContains(this.tabPanel, header);
    }
  }

  async setIndividualValues(data: EditFluidTestData): Promise<void> {
    await this.waitAndCheck(this.setIndividualValuesRadio);
    await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);

    await this.editWellboreCell('#cell-0-0', data.qValue);
    await this.editWellboreCell('#cell-0-1', data.pValue, true);
  }

  async saveFluidChanges(data: EditFluidTestData): Promise<void> {
    await this.waitAndClick(this.saveButton, 'Save');
    await this.waitAfterSave();
    await this.verifySavedIndividualValues(data);
    await this.verifySaveSettled();
  }

  async verifySavedIndividualValues(data: EditFluidTestData): Promise<void> {
    const qCell = this.valuesTreeGrid.locator('#cell-0-0');
    const pCell = this.valuesTreeGrid.locator('#cell-0-1');

    await expect(qCell).toContainText(this.formatSavedNumeric(data.qValue), {
      timeout: TIMEOUTS.SAVE_WAIT_MS + 15_000,
    });
    await expect(pCell).toContainText(this.formatSavedNumeric(data.pValue), {
      timeout: TIMEOUTS.SAVE_WAIT_MS + 15_000,
    });
  }

  async verifyFluidRheologyTab(data: EditFluidTestData): Promise<void> {
    await this.waitAndClick(this.fluidRheologyTab, 'Fluid Rheology');
    await this.waitAndAssertValue(this.tabPanelDescription, data.description);

    for (const header of RHEOLOGY_STATIC_HEADERS) {
      await this.waitAndAssertContains(this.tabPanel, header);
    }
    await this.waitAndAssertContains(this.tabPanel, data.primaryFluidName);

    for (const header of RHEOLOGY_TREEGRID_HEADERS) {
      await this.waitAndAssertContains(this.treeGrid, header);
    }

    await this.waitAndAssertValue(this.shearRateInput, data.shearRate);
    await this.waitAndAssertValue(this.apparentViscosityInput, data.apparentViscosity);
    await this.waitAndAssertValue(this.defaultTemperatureInput, data.defaultTemperature);
  }

  async verifyFluidThermalPropertiesTab(data: EditFluidTestData): Promise<void> {
    await this.waitAndClick(this.fluidThermalPropertiesTab, 'Fluid Thermal Properties');
    await this.waitAndAssertContains(this.tabPanel, data.primaryFluidName);

    for (const header of THERMAL_STATIC_HEADERS) {
      await this.waitAndAssertContains(this.tabPanel, header);
    }

    await this.waitAndAssertValue(this.tabPanelDescription, data.description);
    await this.waitAndAssertValue(this.thermalConductivityInput, data.thermalConductivity);
    await this.waitAndAssertValue(this.thermalCapacityInput, data.specificHeat);
    await this.waitAndAssertValue(this.specificGravityInput, data.specificGravity);
  }

  async verifyChemicalsTabDefaults(data: EditFluidTestData): Promise<void> {
    await this.waitAndClick(this.chemicalsTab, 'Chemicals');

    for (const header of CHEMICAL_TABLE_HEADERS) {
      await this.waitAndAssertContains(this.chemicalsTreeGrid, header);
    }

    for (let index = 0; index < data.chemicals.length; index++) {
      const chemical = data.chemicals[index];
      const row = this.chemicalRow(chemical.name);
      await this.waitAndAssertContains(this.chemicalsTreeGrid, chemical.name);
      await expect(row.locator(`#cell-${index}-2`)).not.toHaveText('-');
      await this.waitAndAssertContains(row.locator(`#cell-${index}-3`), chemical.type);
    }
  }

  async editChemicalConcentrations(data: EditFluidTestData): Promise<void> {
    for (let index = 0; index < data.chemicals.length; index++) {
      const chemical = data.chemicals[index];
      await this.editChemicalConcentrationCell(index, chemical.name, chemical.concentrationInput);
    }

    await this.fluidDataHeading.click();
    await expect(this.saveButton).toBeEnabled({ timeout: TIMEOUTS.SLOW_UI_MS });
    await this.saveChemicalChanges(data);
  }

  async saveChemicalChanges(data: EditFluidTestData): Promise<void> {
    await this.waitAndClick(this.saveButton, 'Save');
    await this.waitAfterSave();
    await this.waitAndClick(this.chemicalsTab, 'Chemicals');
    await WaitUtils.untilVisible(this.chemicalsTreeGrid);
    await this.verifySavedChemicalConcentrations(data);
    await this.verifySaveSettled();
  }

  async verifySavedChemicalConcentrations(data: EditFluidTestData): Promise<void> {
    for (let index = 0; index < data.chemicals.length; index++) {
      const chemical = data.chemicals[index];

      await this.waitAndAssertContains(
        this.chemicalsTreeGrid.locator(`#cell-${index}-0`),
        chemical.name,
      );
      await expect(this.chemicalsTreeGrid.locator(`#cell-${index}-1`)).toContainText(
        chemical.expectedConcentration,
        { timeout: TIMEOUTS.SAVE_WAIT_MS + 15_000 },
      );
      await this.waitAndAssertContains(
        this.chemicalsTreeGrid.locator(`#cell-${index}-3`),
        chemical.type,
      );
    }

    await this.waitAndAssertContains(this.fluidDataHeading, 'Fluid Data');
  }

  /** Full edit-fluid flow after well is opened. */
  async runEditFluidFlow(data: EditFluidTestData): Promise<void> {
    await this.openMaterialSelection();
    await this.openFluidEditor();
    await this.verifyFluidEditorDefaults(data);
    await this.verifyWellboreTableHeaders();
    await this.setIndividualValues(data);
    await this.saveFluidChanges(data);
    await this.verifyFluidRheologyTab(data);
    await this.verifyFluidThermalPropertiesTab(data);
    await this.verifyChemicalsTabDefaults(data);
    await this.editChemicalConcentrations(data);
  }
}

export function createEditFluidPage(page: Page): EditFluidPage {
  return new EditFluidPage(page);
}
