import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { BasePage } from '../base/BasePage';
import {
  displayMatchesFillValue,
  normalizeDisplayNumber,
  type HeatTransferDefaults,
  type HeatTransferFillValues,
  type HeatTransferGridValues,
  type HeatTransferTestData,
} from '../excel/heatTransferTestData';
import { logger } from '../logger';
import { step } from '../utils/step';
import { AssertionUtils } from '../utils/AssertionUtils';
import { WaitUtils } from '../utils/WaitUtils';

const PAGE_HEADING = 'Heat Transfer Parameters';
const FIELD_WAIT_MS = 10_000;

/**
 * Inputs → Heat Transfer Parameters screen (app-heat-transfer).
 */
export class HeatTransferParametersPage extends BasePage {
  private readonly inputsSectionIcon = this.page.getByRole('link', { name: /icon\s+Inputs/i }).first();
  private readonly heatTransferNavLink = this.page.getByRole('link', { name: PAGE_HEADING });
  private readonly pageHeading = this.page.getByRole('heading', { name: PAGE_HEADING });
  private readonly heatTransferApp = this.page.locator('app-heat-transfer');
  private readonly tempGaugeCheckbox = this.page.locator('#TempGauge');
  private readonly offshoreCheckbox = this.page.locator('#Offshore');
  private readonly tableCheckbox = this.page.locator('#Table');
  private readonly handsOnTable = this.page.locator('#handOnTableId');
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  private readonly savedToast = this.page.getByLabel('SAVED!');
  private readonly displayTempField = this.page.getByRole('textbox', { name: 'Display Temperature at*' });

  private async isVisibleQuick(locator: Locator, timeout = 2000): Promise<boolean> {
    return locator.isVisible({ timeout }).catch(() => false);
  }

  private textbox(name: string, exact = false): Locator {
    return this.page.getByRole('textbox', { name, exact });
  }

  private cell(cellId: string): Locator {
    return this.page.locator(cellId);
  }

  private async ensureInputsSectionExpanded(): Promise<void> {
    if (await this.isVisibleQuick(this.heatTransferNavLink)) {
      return;
    }
    await this.click(this.inputsSectionIcon, 'Inputs section');
    await expect(
      this.heatTransferNavLink,
      'Heat Transfer Parameters link should be visible after expanding Inputs',
    ).toBeVisible();
  }

  async openFromInputsMenu(): Promise<void> {
    await step('Open Heat Transfer Parameters from Inputs menu', async () => {
      await this.ensureInputsSectionExpanded();
      await this.click(this.heatTransferNavLink, PAGE_HEADING);
      await this.waitForScreen();
      logger.info('Inputs → Heat Transfer Parameters opened');
    });
  }

  async waitForScreen(): Promise<void> {
    await WaitUtils.untilVisible(this.pageHeading, TIMEOUTS.SLOW_UI_MS);
    await WaitUtils.untilVisible(this.heatTransferApp, TIMEOUTS.SLOW_UI_MS);
  }

  private async ensureCheckboxState(checkbox: Locator, desired: boolean): Promise<void> {
    await WaitUtils.untilVisible(checkbox);
    const isChecked = await checkbox.isChecked();
    if (isChecked !== desired) {
      desired ? await this.actions.check(checkbox) : await this.actions.uncheck(checkbox);
    }
    desired
      ? await expect(checkbox).toBeChecked()
      : await expect(checkbox).not.toBeChecked();
  }

  private async assertFieldValue(fieldName: string, expected: string, exact = false): Promise<void> {
    const field = this.textbox(fieldName, exact);
    await AssertionUtils.assertVisible(field);
    await expect
      .poll(
        async () => {
          const actual = await field.inputValue();
          return displayMatchesFillValue(expected, actual)
            ? 'match'
            : `expected="${expected}" actual="${actual}"`;
        },
        { timeout: FIELD_WAIT_MS },
      )
      .toBe('match');
  }

  private async assertFieldContainsFillValue(
    fieldName: string,
    fillValue: string,
    exact = false,
  ): Promise<void> {
    const field = this.textbox(fieldName, exact);
    await AssertionUtils.assertVisible(field);
    await expect
      .poll(
        async () => {
          const actual = await field.inputValue();
          return displayMatchesFillValue(fillValue, actual)
            ? 'match'
            : `expected~="${fillValue}" actual="${actual}"`;
        },
        { timeout: FIELD_WAIT_MS },
      )
      .toBe('match');
  }

  private async assertCellContainsFillValue(cellId: string, fillValue: string): Promise<void> {
    const cell = this.cell(cellId);
    await AssertionUtils.assertVisible(cell);
    await expect
      .poll(
        async () => {
          const actual = (await cell.textContent())?.trim() ?? '';
          return displayMatchesFillValue(fillValue, actual)
            ? 'match'
            : `expected~="${fillValue}" actual="${actual}"`;
        },
        { timeout: FIELD_WAIT_MS },
      )
      .toBe('match');
  }

  private async fillFieldIfEditable(fieldName: string, value: string): Promise<boolean> {
    const field = this.textbox(fieldName);
    if (!(await field.isEditable({ timeout: 3000 }).catch(() => false))) {
      logger.info(`Skipping non-editable field: ${fieldName}`);
      return false;
    }
    await WaitUtils.untilVisible(field);
    await field.scrollIntoViewIfNeeded();
    await this.dblclick(field, fieldName);
    await this.fillFast(field, value, fieldName);
    await this.actions.pressKey('Tab');
    return true;
  }

  /** Force-fill used when restoring a known baseline (ignores transient non-editable state). */
  private async fillFieldForced(fieldName: string, value: string): Promise<void> {
    const field = this.textbox(fieldName);
    await WaitUtils.untilVisible(field);
    await field.scrollIntoViewIfNeeded();
    await this.dblclick(field, fieldName);
    await this.fillFast(field, value, fieldName);
    await this.actions.pressKey('Tab');
  }

  private async validateRequiredField(
    fieldName: string,
    errorMessage: string,
    restoreValue: string,
  ): Promise<void> {
    const blurTarget = this.page.getByRole('heading').first();
    const field = this.textbox(fieldName, true);

    await WaitUtils.untilVisible(field);
    await this.dblclick(field, fieldName);
    await this.fillFast(field, '', `Clear ${fieldName}`);
    await this.click(blurTarget, 'Blur field');
    await AssertionUtils.assertVisible(this.page.getByText(errorMessage), errorMessage);

    await this.dblclick(field, fieldName);
    await this.fillFast(field, restoreValue, fieldName);
    await this.actions.pressKey('Tab');
  }

  private async fillGridCell(cellId: string, value: string): Promise<void> {
    // HandsOnTable rejects comma-formatted Excel values (e.g. "1,000"); enter plain numbers.
    const inputValue = normalizeDisplayNumber(value);
    const cell = this.cell(cellId);
    await WaitUtils.untilVisible(cell);
    await cell.scrollIntoViewIfNeeded();
    await this.dblclick(cell, `Heat Transfer cell ${cellId}`);

    const editor = this.page.locator('textarea').last();
    await this.fillFast(editor, inputValue, `Heat Transfer ${cellId}`);
    await this.actions.pressKey('Enter');
    await this.page.keyboard.press('Escape');

    await step(`Verify Heat Transfer cell ${cellId} shows "${inputValue}"`, async () => {
      await expect
        .poll(
          async () => {
            const actual = (await cell.textContent())?.trim() ?? '';
            return displayMatchesFillValue(inputValue, actual)
              ? 'match'
              : `expected~="${inputValue}" actual="${actual}"`;
          },
          { timeout: FIELD_WAIT_MS },
        )
        .toBe('match');
    });
  }

  async verifyPageLevelElements(padName?: string, wellName?: string): Promise<void> {
    await AssertionUtils.assertVisible(this.page.getByRole('img').first());
    await AssertionUtils.assertVisible(this.pageHeading);
    await AssertionUtils.assertTextContains(this.pageHeading, PAGE_HEADING);
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
      // Well is a header ng-select (created wells populate this dropdown)
      const wellSelect = this.page.locator('app-sub-menubar ng-select').first();
      await AssertionUtils.assertVisible(wellSelect, 'Well dropdown is visible');
      await AssertionUtils.assertTextContains(
        wellSelect,
        wellName,
        `Well dropdown shows "${wellName}"`,
      );
    }

    await AssertionUtils.assertTextContains(this.heatTransferApp, 'Enter Temperature vs. Depth');
    await AssertionUtils.assertVisible(
      this.page.getByRole('button', { name: 'Thermal Fluid Properties' }),
    );
  }

  async verifyTemperatureFieldDefaults(defaults: HeatTransferDefaults): Promise<void> {
    const tempFields: { label: string; fieldName: string; expected: string }[] = [
      {
        label: 'Surface Fluid Temperature*',
        fieldName: 'Surface Fluid Temperature*',
        expected: defaults.surfaceFluidTemp,
      },
      {
        label: 'Surface Proppant Temperature*',
        fieldName: 'Surface Proppant Temperature*',
        expected: defaults.surfaceProppantTemp,
      },
      {
        label: 'Surface N2 Temperature*',
        fieldName: 'Surface N2 Temperature*',
        expected: defaults.surfaceN2Temp,
      },
      {
        label: 'Surface C02 Temperature*',
        fieldName: 'Surface C02 Temperature*',
        expected: defaults.surfaceCO2Temp,
      },
      {
        label: 'Surface Rock Temperature*',
        fieldName: 'Surface Rock Temperature*',
        expected: defaults.surfaceRockTemp,
      },
      {
        label: 'Reservoir Temperature at Frac Center Depth*',
        fieldName: 'Reservoir Temperature at Frac',
        expected: defaults.reservoirTemp,
      },
    ];

    for (const { label, fieldName, expected } of tempFields) {
      await AssertionUtils.assertTextContains(this.heatTransferApp, label);
      await this.assertFieldValue(fieldName, expected);
    }
  }

  async verifyDisplayTemperatureAndFracCenterDepth(): Promise<void> {
    await AssertionUtils.assertTextContains(this.heatTransferApp, 'Display Temperature at*');
    await AssertionUtils.assertVisible(this.page.getByText('ft MD'));
    await AssertionUtils.assertVisible(this.displayTempField);

    await AssertionUtils.assertTextContains(this.heatTransferApp, 'Use Fracture Center Depth');
    await AssertionUtils.assertVisible(this.tempGaugeCheckbox);

    await this.ensureCheckboxState(this.tempGaugeCheckbox, true);
    await expect(this.displayTempField).not.toHaveValue('', { timeout: FIELD_WAIT_MS });
    const checkedValue = await this.displayTempField.inputValue();

    await this.tempGaugeCheckbox.uncheck();
    await this.tempGaugeCheckbox.check();
    await this.tempGaugeCheckbox.uncheck();
    await expect(this.displayTempField).toBeVisible();

    await this.tempGaugeCheckbox.check();
    await expect(this.displayTempField).toHaveValue(checkedValue);

    await this.tempGaugeCheckbox.uncheck();
    await expect(this.displayTempField).toBeVisible();

    await this.tempGaugeCheckbox.check();
    await expect(this.displayTempField).toHaveValue(checkedValue);
  }

  async verifyMultiplierFields(defaults: HeatTransferDefaults): Promise<void> {
    await AssertionUtils.assertTextContains(
      this.heatTransferApp,
      'Wellbore Heat Transfer Coefficient Multiplier*',
    );
    await this.assertFieldValue(
      'Wellbore Heat Transfer Coefficient Multiplier*',
      defaults.wellboreMultiplier,
      true,
    );

    await AssertionUtils.assertTextContains(
      this.heatTransferApp,
      'Fracture Heat Transfer Coefficient Multiplier*',
    );
    await this.assertFieldValue(
      'Fracture Heat Transfer Coefficient Multiplier*',
      defaults.fractureMultiplier,
      true,
    );
  }

  async verifyOffshoreWellSection(defaults: HeatTransferDefaults): Promise<void> {
    await AssertionUtils.assertTextContains(this.heatTransferApp, 'Offshore Well');
    await AssertionUtils.assertVisible(this.offshoreCheckbox);

    await this.ensureCheckboxState(this.offshoreCheckbox, false);
    await this.ensureCheckboxState(this.offshoreCheckbox, true);

    await AssertionUtils.assertTextContains(this.heatTransferApp, 'Water Depth*');
    await AssertionUtils.assertVisible(this.page.getByText('ft', { exact: true }));
    await this.assertFieldValue('Water Depth*', defaults.waterDepth);

    await AssertionUtils.assertTextContains(this.heatTransferApp, 'Surface Water Temperature*');
    await this.assertFieldValue('Surface Water Temperature*', defaults.surfaceWaterTemp);

    await AssertionUtils.assertTextContains(this.heatTransferApp, 'Seabed Temperature*');
    await this.assertFieldValue('Seabed Temperature*', defaults.seabedTemp);

    await AssertionUtils.assertTextContains(this.heatTransferApp, 'Sea Current*');
    await AssertionUtils.assertVisible(this.page.getByText('Knot'));
    await this.assertFieldValue('Sea Current*', defaults.seaCurrent);

    await AssertionUtils.assertTextContains(
      this.heatTransferApp,
      'Ocean/Wellbore Heat Transfer Coefficient Multiplier*',
    );
    await this.assertFieldValue('Ocean/Wellbore Heat Transfer', defaults.oceanMultiplier);

    await this.offshoreCheckbox.uncheck();
  }

  async fillTemperatureFields(fill: HeatTransferFillValues): Promise<void> {
    const fields: { name: string; value: string }[] = [
      { name: 'Surface Fluid Temperature*', value: fill.surfaceFluidTemp },
      { name: 'Surface Proppant Temperature*', value: fill.surfaceProppantTemp },
      { name: 'Surface N2 Temperature*', value: fill.surfaceN2Temp },
      { name: 'Surface C02 Temperature*', value: fill.surfaceCO2Temp },
      { name: 'Surface Rock Temperature*', value: fill.surfaceRockTemp },
      { name: 'Reservoir Temperature at Frac', value: fill.reservoirTemp },
    ];

    for (const { name, value } of fields) {
      await this.fillFieldIfEditable(name, value);
    }
  }

  /**
   * Restores Excel baseline values and saves so default assertions remain
   * deterministic across re-runs on a previously modified well.
   *
   * Unchecks "Enter Temperature vs. Depth" first — that mode makes Surface Rock
   * (and related fields) read-only, which blocked baseline restore.
   */
  async resetToExcelBaseline(data: HeatTransferTestData): Promise<void> {
    const { defaults } = data;

    await this.ensureCheckboxState(this.tableCheckbox, false);
    await this.ensureCheckboxState(this.offshoreCheckbox, false);

    const temperatureFields: { name: string; value: string }[] = [
      { name: 'Surface Fluid Temperature*', value: defaults.surfaceFluidTemp },
      { name: 'Surface Proppant Temperature*', value: defaults.surfaceProppantTemp },
      { name: 'Surface N2 Temperature*', value: defaults.surfaceN2Temp },
      { name: 'Surface C02 Temperature*', value: defaults.surfaceCO2Temp },
      { name: 'Surface Rock Temperature*', value: defaults.surfaceRockTemp },
      { name: 'Reservoir Temperature at Frac', value: defaults.reservoirTemp },
      {
        name: 'Wellbore Heat Transfer Coefficient Multiplier*',
        value: defaults.wellboreMultiplier,
      },
      {
        name: 'Fracture Heat Transfer Coefficient Multiplier*',
        value: defaults.fractureMultiplier,
      },
    ];

    for (const { name, value } of temperatureFields) {
      await this.fillFieldForced(name, value);
    }

    await this.ensureCheckboxState(this.offshoreCheckbox, true);
    await AssertionUtils.assertVisible(this.textbox('Water Depth*'));

    const offshoreFields: { name: string; value: string }[] = [
      { name: 'Water Depth*', value: defaults.waterDepth },
      { name: 'Surface Water Temperature*', value: defaults.surfaceWaterTemp },
      { name: 'Seabed Temperature*', value: defaults.seabedTemp },
      { name: 'Sea Current*', value: defaults.seaCurrent },
      { name: 'Ocean/Wellbore Heat Transfer', value: defaults.oceanMultiplier },
    ];

    for (const { name, value } of offshoreFields) {
      await this.fillFieldForced(name, value);
    }

    await this.save();
    await expect(this.savedToast.first()).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });
    await this.ensureCheckboxState(this.offshoreCheckbox, false);
    logger.info('Heat Transfer form reset to Excel baseline');
  }

  async validateMultiplierRequiredErrors(fill: HeatTransferFillValues): Promise<void> {
    await this.validateRequiredField(
      'Wellbore Heat Transfer Coefficient Multiplier*',
      'Wellbore Heat Transfer Coefficient Multiplier is required.',
      fill.wellboreMultiplier,
    );
    await this.validateRequiredField(
      'Fracture Heat Transfer Coefficient Multiplier*',
      'Fracture Heat Transfer Coefficient Multiplier is required.',
      fill.fractureMultiplier,
    );
  }

  async fillOffshoreFields(fill: HeatTransferFillValues): Promise<void> {
    await this.ensureCheckboxState(this.offshoreCheckbox, true);
    await AssertionUtils.assertVisible(this.textbox('Water Depth*'));

    const fields: { name: string; value: string }[] = [
      { name: 'Water Depth*', value: fill.waterDepth },
      { name: 'Surface Water Temperature*', value: fill.surfaceWaterTemp },
      { name: 'Seabed Temperature*', value: fill.seabedTemp },
      { name: 'Sea Current*', value: fill.seaCurrent },
      { name: 'Ocean/Wellbore Heat Transfer', value: fill.oceanMultiplier },
    ];

    for (const { name, value } of fields) {
      await this.fillFieldIfEditable(name, value);
    }
  }

  async fillTemperatureGrid(grid: HeatTransferGridValues): Promise<void> {
    await this.ensureCheckboxState(this.tableCheckbox, true);

    const cells: { id: string; value: string }[] = [
      { id: '#cell-0-0', value: grid.depth1 },
      { id: '#cell-0-1', value: grid.temp1 },
      { id: '#cell-1-0', value: grid.depth2 },
      { id: '#cell-1-1', value: grid.temp2 },
    ];

    for (const { id, value } of cells) {
      await this.fillGridCell(id, value);
    }
  }

  async save(): Promise<void> {
    await this.click(this.saveButton, 'Save');
  }

  async assertSavedFillValues(
    fill: HeatTransferFillValues,
    grid: HeatTransferGridValues,
  ): Promise<void> {
    await expect(this.savedToast.first()).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });

    const savedFields: { name: string; fillValue: string; exact?: boolean }[] = [
      { name: 'Surface Fluid Temperature*', fillValue: fill.surfaceFluidTemp },
      { name: 'Surface Proppant Temperature*', fillValue: fill.surfaceProppantTemp },
      { name: 'Surface N2 Temperature*', fillValue: fill.surfaceN2Temp },
      { name: 'Surface C02 Temperature*', fillValue: fill.surfaceCO2Temp },
      {
        name: 'Wellbore Heat Transfer Coefficient Multiplier*',
        fillValue: fill.wellboreMultiplier,
        exact: true,
      },
      { name: 'Fracture Heat Transfer', fillValue: fill.fractureMultiplier },
      { name: 'Water Depth*', fillValue: fill.waterDepth },
      { name: 'Surface Water Temperature*', fillValue: fill.surfaceWaterTemp },
      { name: 'Seabed Temperature*', fillValue: fill.seabedTemp },
      { name: 'Sea Current*', fillValue: fill.seaCurrent },
      { name: 'Ocean/Wellbore Heat Transfer', fillValue: fill.oceanMultiplier },
    ];

    for (const { name, fillValue, exact } of savedFields) {
      await this.assertFieldContainsFillValue(name, fillValue, exact);
    }

    await AssertionUtils.assertVisible(this.displayTempField);
    await expect(this.displayTempField).not.toHaveValue('');

    await AssertionUtils.assertTextContains(this.handsOnTable, 'Depth TVD (ft)');
    await AssertionUtils.assertTextContains(this.handsOnTable, 'Temperature (°F)');

    const gridCells: { id: string; fillValue: string }[] = [
      { id: '#cell-0-0', fillValue: grid.depth1 },
      { id: '#cell-0-1', fillValue: grid.temp1 },
      { id: '#cell-1-0', fillValue: grid.depth2 },
      { id: '#cell-1-1', fillValue: grid.temp2 },
    ];

    for (const { id, fillValue } of gridCells) {
      await this.assertCellContainsFillValue(id, fillValue);
    }
  }

  /** Full Heat Transfer Parameters flow after well is opened. */
  async runHeatTransferFlow(
    data: HeatTransferTestData,
    options?: { padName?: string; wellName?: string },
  ): Promise<void> {
    await this.openFromInputsMenu();
    await this.verifyPageLevelElements(options?.padName, options?.wellName);
    await this.resetToExcelBaseline(data);
    await this.verifyTemperatureFieldDefaults(data.defaults);
    await this.verifyDisplayTemperatureAndFracCenterDepth();
    await this.verifyMultiplierFields(data.defaults);
    await this.verifyOffshoreWellSection(data.defaults);
    await this.fillTemperatureFields(data.fill);
    await this.validateMultiplierRequiredErrors(data.fill);
    await this.fillOffshoreFields(data.fill);
    await this.fillTemperatureGrid(data.grid);
    await this.save();
    await this.assertSavedFillValues(data.fill, data.grid);
  }
}

export function createHeatTransferParametersPage(page: Page): HeatTransferParametersPage {
  return new HeatTransferParametersPage(page);
}
