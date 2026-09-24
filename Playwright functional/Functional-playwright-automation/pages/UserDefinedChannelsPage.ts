import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { BasePage } from '../base/BasePage';
import { escapeRegex } from '../excel/materialTestData';
import { logger } from '../logger';
import { AssertionUtils } from '../utils/AssertionUtils';
import { WaitUtils } from '../utils/WaitUtils';

const FORMULA_KEYPAD_ARIA_SNAPSHOT = `
- button "1"
- button "2"
- button "3"
- button "4"
- button "5"
- button "6"
- button "7"
- button "8"
- button "9"
- button "0"
- button "()"
- button "E"
- button "^"
- button "/"
- button "<"
- button "*"
- button "<="
- button "-"
- button ">="
- button "+"
- button ">"
- button "."
- button "="
- button "<>"
- button "=="
- button "EXP"
- button "ABS"
- button "COS"
- button "ACOS"
- button "COSH"
- button "LOG10"
- button "SIGN"
- button "SIN"
- button "ASIN"
- button "SINH"
- button "LN"
- button "ROUND"
- button "TAN"
- button "ATAN"
- button "TANH"
- button "SQRT"
- button "D/DT"
- button "INT"
- button "Insert Channel Name"
`;

const ROW_VALIDATION_WARNING_PATTERNS = [/Row \d+\s*:\s*No parameters found/i] as const;

export interface UserDefinedChannelRowData {
  rowIndex: number;
  channelName: string;
  unitType: string;
  expectedUnitLabel: string;
  formulaButton: string;
  formulaText?: string;
}

export const DEFAULT_USER_DEFINED_CHANNEL_ROWS: UserDefinedChannelRowData[] = [
  {
    rowIndex: 0,
    channelName: 'abc',
    unitType: 'Activation Energy',
    expectedUnitLabel: '(kcal/mol)',
    formulaButton: 'ABS',
  },
  {
    rowIndex: 1,
    channelName: 'abc12',
    unitType: 'Additive Mass Concentration',
    expectedUnitLabel: '(lb/Mgal)',
    formulaButton: 'SIN',
    formulaText: 'SIN(90)',
  },
  {
    rowIndex: 2,
    channelName: 'abc123',
    unitType: 'Compressibility',
    expectedUnitLabel: '(1/psi)',
    formulaButton: 'COS',
    formulaText: 'COS(90)',
  },
];

/**
 * Utilities → User-defined Channels editor (Handsontable + formula keypad).
 */
export class UserDefinedChannelsPage extends BasePage {
  private readonly utilitiesMenuLink = this.page.getByRole('link', { name: /Utilities/i });
  private readonly userDefinedChannelsNavLink = this.page.getByRole('link', {
    name: 'User-defined Channels',
  });
  private readonly pageHeading = this.page.getByRole('heading', { name: 'User-defined Channels' });
  private readonly component = this.page.locator('app-user-defined-channels');
  private readonly saveAndValidateButton = this.page.getByRole('button', { name: 'Save & Validate' });
  private readonly savedToast = this.page.getByLabel('SAVED!');
  private readonly goBackButton = this.component.getByRole('button', { name: 'Go Back' });

  private cell(rowIndex: number, columnIndex: number): Locator {
    return this.page.locator(`#cell-${rowIndex}-${columnIndex}`);
  }

  private async isVisibleQuick(locator: Locator, timeout = 2000): Promise<boolean> {
    return locator.isVisible({ timeout }).catch(() => false);
  }

  private handsontableTextEditor(): Locator {
    return this.page
      .locator('textarea.handsontableInput:focus')
      .or(this.page.locator('textarea.handsontableInput:not([role="combobox"])').last())
      .first();
  }

  private async commitHandsontableEdit(): Promise<void> {
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
  }

  private async blurGridEditor(): Promise<void> {
    await this.pageHeading.click();
    await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
  }

  private async activateFormulaCell(rowIndex: number): Promise<Locator> {
    const formulaCell = this.cell(rowIndex, 3);
    await this.blurGridEditor();

    if (rowIndex === 2) {
      await formulaCell.click();
    } else {
      await formulaCell.dblclick();
    }

    return formulaCell;
  }

  private async clearFormulaCell(rowIndex: number): Promise<void> {
    const formulaCell = this.cell(rowIndex, 3);
    const currentText = (await formulaCell.textContent())?.trim() ?? '';
    if (!currentText) {
      return;
    }

    await this.activateFormulaCell(rowIndex);
    const editor = this.handsontableTextEditor();
    await WaitUtils.untilVisible(editor);
    await editor.fill('');
    await this.commitHandsontableEdit();
    await this.blurGridEditor();
  }

  private async fillChannelNameCell(rowIndex: number, channelName: string): Promise<void> {
    const nameCell = this.cell(rowIndex, 0);
    await nameCell.dblclick();

    const editor = this.handsontableTextEditor();
    await WaitUtils.untilVisible(editor);
    await editor.fill(channelName);
    await this.commitHandsontableEdit();
    await expect(nameCell, `Channel name for row ${rowIndex + 1}`).toHaveText(
      new RegExp(`^${escapeRegex(channelName)}$`),
    );
    await this.blurGridEditor();
  }

  private async fillFormulaText(value: string): Promise<void> {
    const editor = this.handsontableTextEditor();
    await WaitUtils.untilVisible(editor);
    await editor.fill(value);
    await this.commitHandsontableEdit();
  }

  /**
   * Soft peek for Model Running (default ~25s). Never fails the test — always proceeds.
   */
  private async waitForModelIdle(timeoutMs = 25_000): Promise<void> {
    const modelRunning = this.page.getByText(/Model Running/i).first();
    if (!(await this.isVisibleQuick(modelRunning, 1_000))) {
      return;
    }

    logger.info(`Model Running visible — soft wait up to ${timeoutMs}ms, then proceed either way.`);
    const stopped = await modelRunning
      .waitFor({ state: 'hidden', timeout: timeoutMs })
      .then(() => true)
      .catch(() => false);
    logger.info(
      stopped
        ? 'Model Running finished.'
        : `Model still running after ${timeoutMs}ms — proceeding with next action.`,
    );
  }

  async openFromUtilitiesMenu(): Promise<void> {
    // Do not wait for model stop — navigate immediately (force click if overlay blocks).
    if (!(await this.isVisibleQuick(this.userDefinedChannelsNavLink, 2_000))) {
      await this.click(this.utilitiesMenuLink, 'Utilities menu');
      await WaitUtils.untilVisible(this.userDefinedChannelsNavLink, TIMEOUTS.SLOW_UI_MS);
    }

    try {
      await this.click(this.userDefinedChannelsNavLink, 'User-defined Channels');
    } catch {
      logger.info('User-defined Channels click intercepted — retrying with force.');
      await this.userDefinedChannelsNavLink.click({ force: true });
    }
    await this.waitForScreen();
  }

  async waitForScreen(): Promise<void> {
    await WaitUtils.untilVisible(this.pageHeading);
    await WaitUtils.untilVisible(this.component);
  }

  async verifyPageLevelElements(): Promise<void> {
    await AssertionUtils.assertVisible(this.pageHeading);
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'applications' }).first());
    await AssertionUtils.assertVisible(this.page.locator('#page-header-notifications-dropdown'));
    await AssertionUtils.assertVisible(this.page.getByText('Version:'));
    await AssertionUtils.assertVisible(this.page.getByText('Stage:'));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: '«' }));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: '‹' }));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: '›' }));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: '»' }));
    await AssertionUtils.assertVisible(this.goBackButton);
    await AssertionUtils.assertVisible(this.page.getByText('Go BackSave & Validate'));
  }

  async verifyTableHeadersAndKeypad(): Promise<void> {
    await AssertionUtils.assertVisible(this.page.getByText('Channel Name').nth(1));
    await AssertionUtils.assertVisible(this.page.getByText('Unit types').nth(1));
    await AssertionUtils.assertVisible(this.page.getByText('Units').nth(1));
    await AssertionUtils.assertVisible(this.page.getByText('Formula').nth(1));
    await AssertionUtils.assertVisible(this.page.getByText('Action').nth(1));
    await expect(this.component).toMatchAriaSnapshot(FORMULA_KEYPAD_ARIA_SNAPSHOT);
  }

  /** Save & Validate is disabled and Go Back is enabled on initial editor load. */
  async verifySaveAndGoBackButtonBehaviorOnInitialLoad(): Promise<void> {
    await this.blurGridEditor();
    await WaitUtils.untilVisible(this.saveAndValidateButton);
    await WaitUtils.untilVisible(this.goBackButton);

    await this.assertGoBackButtonEnabled('on initial editor load');
    await this.waitForSaveButtonState(
      'disabled',
      'when no unsaved changes exist on initial load',
    );
  }

  /** Save & Validate becomes enabled after filling channel rows; Go Back stays enabled. */
  async verifySaveAndGoBackButtonBehaviorAfterFill(): Promise<void> {
    await this.blurGridEditor();
    await WaitUtils.untilVisible(this.saveAndValidateButton);
    await WaitUtils.untilVisible(this.goBackButton);

    await this.assertGoBackButtonEnabled('after filling channel rows');
    await this.waitForSaveButtonState(
      'enabled',
      'after filling channel rows',
    );
  }

  /** After a successful save, pending edits are cleared and Save returns to disabled. */
  async verifySaveAndGoBackButtonStatesAfterPersist(): Promise<void> {
    await this.blurGridEditor();
    await WaitUtils.untilVisible(this.saveAndValidateButton);
    await this.assertGoBackButtonEnabled('after successful save with no pending edits');
    await this.waitForSaveButtonState(
      'disabled',
      'after successful save with no pending edits',
    );
  }

  private async assertGoBackButtonEnabled(context: string): Promise<void> {
    await AssertionUtils.assertEnabled(
      this.goBackButton,
      `Go Back should be enabled ${context}`,
    );
    logger.info(`Go Back is enabled ${context}.`);
  }

  private async waitForSaveButtonState(
    state: 'enabled' | 'disabled',
    context: string,
  ): Promise<void> {
    await WaitUtils.untilVisible(this.saveAndValidateButton);

    if (state === 'enabled') {
      await WaitUtils.untilEnabled(
        this.saveAndValidateButton,
        TIMEOUTS.SLOW_UI_MS,
      );
      await AssertionUtils.assertEnabled(
        this.saveAndValidateButton,
        `Save & Validate should be enabled ${context}`,
      );
    } else {
      await expect(
        this.saveAndValidateButton,
        `Save & Validate should be disabled ${context}`,
      ).toBeDisabled({ timeout: TIMEOUTS.SLOW_UI_MS });
    }

    logger.info(`Save & Validate is ${state} ${context}.`);
  }

  async fillChannelRows(rows: UserDefinedChannelRowData[] = DEFAULT_USER_DEFINED_CHANNEL_ROWS): Promise<void> {
    await this.deleteAllExistingRowsIfPresent();
    for (const row of rows) {
      await this.fillChannelRow(row);
    }
  }

  private actionDeleteIcon(rowIndex: number): Locator {
    return this.cell(rowIndex, 4).locator('img[alt="Delete"]');
  }

  private normalizeCellText(value: string | null): string {
    return (value ?? '').replace(/▼/g, '').trim();
  }

  private async rowHasChannelData(rowIndex: number): Promise<boolean> {
    const channelName = this.normalizeCellText(await this.cell(rowIndex, 0).textContent());
    const unitType = this.normalizeCellText(await this.cell(rowIndex, 1).textContent());
    const formula = this.normalizeCellText(await this.cell(rowIndex, 3).textContent());
    return Boolean(channelName || unitType || formula);
  }

  private async getRowIndexesWithActionDeleteIcons(): Promise<number[]> {
    const rowIndexes: number[] = [];

    for (let rowIndex = 0; rowIndex < 20; rowIndex++) {
      const channelNameCell = this.cell(rowIndex, 0);
      if ((await channelNameCell.count()) === 0) {
        break;
      }

      if (!(await this.rowHasChannelData(rowIndex))) {
        continue;
      }

      if (await this.isVisibleQuick(this.actionDeleteIcon(rowIndex), 1000)) {
        rowIndexes.push(rowIndex);
      }
    }

    return rowIndexes.sort((left, right) => right - left);
  }

  private async hasExistingChannelData(): Promise<boolean> {
    return (await this.getRowIndexesWithActionDeleteIcons()).length > 0;
  }

  private async deleteRowUsingActionIcon(rowIndex: number): Promise<void> {
    await this.blurGridEditor();

    const deleteIcon = this.actionDeleteIcon(rowIndex);
    const channelNameBefore = this.normalizeCellText(await this.cell(rowIndex, 0).textContent());

    await deleteIcon.scrollIntoViewIfNeeded();
    await expect(deleteIcon, `Action delete icon row ${rowIndex + 1}`).toBeVisible();
    await deleteIcon.click();

    const yesDeleteButton = this.page.getByRole('button', { name: 'Yes, Delete' });
    if (channelNameBefore) {
      await expect(yesDeleteButton).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });
      await yesDeleteButton.click();
    } else if (await this.isVisibleQuick(yesDeleteButton, 2000)) {
      await yesDeleteButton.click();
    }

    await this.blurGridEditor();
    await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);

    if (await this.rowHasChannelData(rowIndex)) {
      throw new Error(`Row ${rowIndex + 1} still contains data after Action delete icon click.`);
    }

    logger.info(`Deleted user-defined channel row ${rowIndex + 1} using Action column delete icon.`);
  }

  /** Clears pre-existing rows using Action column delete icons before each fill. */
  private async deleteAllExistingRowsIfPresent(): Promise<void> {
    if (!(await this.hasExistingChannelData())) {
      logger.info('User-defined channels grid is empty; skipping Action column delete.');
      return;
    }

    logger.info('Existing user-defined channel data found; deleting rows via Action column icons.');

    for (let attempt = 0; attempt < 20; attempt++) {
      const rowIndexes = await this.getRowIndexesWithActionDeleteIcons();
      if (rowIndexes.length === 0) {
        break;
      }

      await this.deleteRowUsingActionIcon(rowIndexes[0]);
    }

    if (await this.hasExistingChannelData()) {
      throw new Error('Failed to delete all existing user-defined channel rows using Action delete icons.');
    }

    logger.info('All existing user-defined channel rows deleted from Action column.');
    await this.persistGridChangesIfSaveEnabled('cleared grid before fill');
  }

  private async persistGridChangesIfSaveEnabled(reason: string): Promise<void> {
    await this.blurGridEditor();
    await WaitUtils.untilVisible(this.saveAndValidateButton);

    if (!(await this.saveAndValidateButton.isEnabled())) {
      logger.info(`Save & Validate disabled after ${reason}; continuing without save.`);
      return;
    }

    logger.info(`Saving user-defined channels (${reason}).`);
    await this.saveAndValidateButton.click();
    await expect(this.savedToast).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });
    // Soft peek only — do not block the flow on Model Running.
    await this.waitForModelIdle();
    await WaitUtils.untilVisible(this.component);
    await WaitUtils.untilVisible(this.pageHeading);
  }

  private async waitForHandsontableGridReady(
    context: string,
    expectedFirstChannelName?: string,
  ): Promise<void> {
    await WaitUtils.untilVisible(this.component);
    await WaitUtils.untilVisible(this.pageHeading);

    if (expectedFirstChannelName) {
      await expect
        .poll(
          async () => this.normalizeCellText(await this.cell(0, 0).textContent()),
          { timeout: TIMEOUTS.SLOW_UI_MS },
        )
        .toBe(expectedFirstChannelName);
    } else {
      await expect
        .poll(async () => this.cell(0, 0).isVisible(), { timeout: TIMEOUTS.SLOW_UI_MS })
        .toBe(true);
    }

    logger.info(`Handsontable grid is ready ${context}.`);
  }

  private async fillChannelRow(row: UserDefinedChannelRowData): Promise<void> {
    await this.fillChannelNameCell(row.rowIndex, row.channelName);
    await this.selectUnitTypeAndAssertUnitsAutoPopulate(row);
    await this.setFormulaForRow(row);
    await this.assertDeleteActionVisible(row.rowIndex);
    await this.blurGridEditor();
  }

  /**
   * Units is empty until a Unit type is selected; selecting a unit type auto-fills Units.
   */
  private async selectUnitTypeAndAssertUnitsAutoPopulate(row: UserDefinedChannelRowData): Promise<void> {
    const unitTypeCell = this.cell(row.rowIndex, 1);
    const unitsCell = this.cell(row.rowIndex, 2);

    const unitTypeBefore = (await unitTypeCell.textContent())?.trim() ?? '';
    const unitsBefore = (await unitsCell.textContent())?.trim() ?? '';

    if (!unitTypeBefore) {
      await expect(
        unitsCell,
        `Units should be empty when no unit type is selected (row ${row.rowIndex + 1})`,
      ).toHaveText(/^$/);
    }

    await unitTypeCell.getByText('▼').click();
    await this.selectScrollableDropdownOption(row.unitType);

    await expect(
      unitTypeCell,
      `Unit type "${row.unitType}" should be selected (row ${row.rowIndex + 1})`,
    ).toContainText(row.unitType);

    await expect(
      unitsCell,
      `Units should auto-populate to "${row.expectedUnitLabel}" when "${row.unitType}" is selected (row ${row.rowIndex + 1})`,
    ).toHaveText(new RegExp(`^${escapeRegex(row.expectedUnitLabel)}$`));

    await expect(
      unitsCell,
      `Units should be read-only and derived from unit type (row ${row.rowIndex + 1})`,
    ).toHaveAttribute('aria-readonly', 'true');

    if (!unitsBefore) {
      logger.info(
        `Row ${row.rowIndex + 1}: units auto-populated from empty to "${row.expectedUnitLabel}" after selecting "${row.unitType}"`,
      );
    } else if (unitsBefore !== row.expectedUnitLabel) {
      logger.info(
        `Row ${row.rowIndex + 1}: units updated from "${unitsBefore}" to "${row.expectedUnitLabel}" after selecting "${row.unitType}"`,
      );
    } else {
      logger.info(
        `Row ${row.rowIndex + 1}: unit type "${row.unitType}" keeps units as "${row.expectedUnitLabel}"`,
      );
    }
  }

  private async assertUnitTypeToUnitsDependency(row: UserDefinedChannelRowData): Promise<void> {
    const unitTypeCell = this.cell(row.rowIndex, 1);
    const unitsCell = this.cell(row.rowIndex, 2);

    await expect(
      unitTypeCell,
      `Unit type should remain "${row.unitType}" (row ${row.rowIndex + 1})`,
    ).toContainText(row.unitType);
    await expect(
      unitsCell,
      `Units should match unit type "${row.unitType}" as "${row.expectedUnitLabel}" (row ${row.rowIndex + 1})`,
    ).toHaveText(new RegExp(`^${escapeRegex(row.expectedUnitLabel)}$`));
    await expect(unitsCell).toHaveAttribute('aria-readonly', 'true');
  }

  private async setFormulaForRow(row: UserDefinedChannelRowData): Promise<void> {
    await this.clearFormulaCell(row.rowIndex);
    const formulaCell = await this.activateFormulaCell(row.rowIndex);

    const formulaButton = this.page.getByRole('button', {
      name: row.formulaButton,
      exact: true,
    });

    await formulaButton.click();

    if (row.formulaText) {
      await this.fillFormulaText(row.formulaText);
    } else {
      await this.commitHandsontableEdit();
    }

    const expectedFormula = row.formulaText ?? row.formulaButton;
    await expect(formulaCell).toContainText(expectedFormula);
    await this.blurGridEditor();
  }

  private async assertDeleteActionVisible(rowIndex: number): Promise<void> {
    await expect(
      this.actionDeleteIcon(rowIndex),
      `Action delete icon should be visible for row ${rowIndex + 1}`,
    ).toBeVisible();
  }

  private async selectScrollableDropdownOption(optionName: string): Promise<void> {
    const autocompleteEditor = this.page.locator('.handsontableEditor').last();
    await expect(autocompleteEditor).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });

    const scrollContainer = autocompleteEditor.locator('.wtHolder').first();
    const option = autocompleteEditor
      .getByRole('option', { name: optionName, exact: true })
      .or(autocompleteEditor.locator('td').getByText(optionName, { exact: true }))
      .first();

    for (let attempt = 0; attempt < 50; attempt++) {
      if (await option.isVisible().catch(() => false)) {
        await option.click();
        return;
      }

      if (await scrollContainer.isVisible().catch(() => false)) {
        await scrollContainer.evaluate((element) => {
          element.scrollTop += 100;
        });
      } else {
        await this.page.mouse.wheel(0, 120);
      }

      await this.page.waitForTimeout(120);
    }

    const filterPrefix = optionName.split(/[\s(]/)[0];
    if (filterPrefix.length >= 3) {
      await this.page.keyboard.type(filterPrefix, { delay: 40 });
      await this.page.waitForTimeout(400);
    }

    await option.scrollIntoViewIfNeeded();
    await expect(option).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });
    await option.click();
  }

  async saveAndValidate(): Promise<void> {
    await this.persistGridChangesIfSaveEnabled('filled grid validation');
  }

  async assertChannelDataBeforeSave(
    rows: UserDefinedChannelRowData[] = DEFAULT_USER_DEFINED_CHANNEL_ROWS,
  ): Promise<void> {
    await this.assertPersistedChannelData(rows);
  }

  async assertRowValidationWarningsIfPresent(): Promise<void> {
    const warning = this.component.getByText(ROW_VALIDATION_WARNING_PATTERNS[0]);
    if (await this.isVisibleQuick(warning, 3000)) {
      await AssertionUtils.assertVisible(warning);
      logger.info(`User-defined channel validation warning shown: ${await warning.textContent()}`);
    } else {
      logger.info('User-defined channel validation warning not shown (optional).');
    }
  }

  async assertPersistedChannelData(
    rows: UserDefinedChannelRowData[] = DEFAULT_USER_DEFINED_CHANNEL_ROWS,
  ): Promise<void> {
    const expectedFirstChannelName = rows[0]?.channelName;

    try {
      await this.waitForHandsontableGridReady(
        'for post-save data validation',
        expectedFirstChannelName,
      );
    } catch (error) {
      logger.info(
        `Handsontable grid not ready after save (${error instanceof Error ? error.message : String(error)}); re-opening editor.`,
      );
      await this.openFromUtilitiesMenu();
      await this.waitForHandsontableGridReady(
        'after re-open for post-save data validation',
        expectedFirstChannelName,
      );
    }

    for (const row of rows) {
      await expect
        .poll(
          async () => this.normalizeCellText(await this.cell(row.rowIndex, 0).textContent()),
          `Channel name row ${row.rowIndex + 1} after save`,
        )
        .toBe(row.channelName);

      await this.assertUnitTypeToUnitsDependency(row);

      const expectedFormula = row.formulaText ?? row.formulaButton;
      await expect(this.cell(row.rowIndex, 3)).toContainText(expectedFormula);
    }
  }

  private async findNextEmptyRowIndex(): Promise<number> {
    for (let rowIndex = 0; rowIndex < 20; rowIndex++) {
      const channelNameCell = this.cell(rowIndex, 0);
      if ((await channelNameCell.count()) === 0) {
        break;
      }

      if (!(await this.rowHasChannelData(rowIndex))) {
        return rowIndex;
      }
    }

    throw new Error('No empty Handsontable row available to attempt a duplicate channel.');
  }

  private async countRowsWithChannelName(channelName: string): Promise<number> {
    let count = 0;

    for (let rowIndex = 0; rowIndex < 20; rowIndex++) {
      const channelNameCell = this.cell(rowIndex, 0);
      if ((await channelNameCell.count()) === 0) {
        break;
      }

      if (this.normalizeCellText(await channelNameCell.textContent()) === channelName) {
        count += 1;
      }
    }

    return count;
  }

  /**
   * TC: try to add a channel with the same name and criteria as an existing one.
   * Expected: application prevents the duplicate from being created.
   */
  async verifyDuplicateChannelPrevention(
    existingRow: UserDefinedChannelRowData = DEFAULT_USER_DEFINED_CHANNEL_ROWS[0],
  ): Promise<void> {
    await WaitUtils.untilVisible(this.component);
    await WaitUtils.untilVisible(this.pageHeading);

    const existingName = this.normalizeCellText(await this.cell(0, 0).textContent());
    if (existingName !== existingRow.channelName) {
      logger.info(
        `Existing channel "${existingRow.channelName}" not found at row 1; seeding baseline before duplicate check.`,
      );
      await this.fillChannelRows([existingRow]);
      await this.saveAndValidate();
    }

    const duplicateRowIndex = await this.findNextEmptyRowIndex();
    const duplicateRow: UserDefinedChannelRowData = {
      ...existingRow,
      rowIndex: duplicateRowIndex,
    };

    logger.info(
      `Attempting duplicate channel "${duplicateRow.channelName}" with same criteria at row ${duplicateRowIndex + 1}.`,
    );
    await this.fillChannelRow(duplicateRow);

    await expect(
      this.cell(duplicateRowIndex, 0),
      `Duplicate channel name should be filled before Save & Validate (row ${duplicateRowIndex + 1})`,
    ).toHaveText(new RegExp(`^${escapeRegex(existingRow.channelName)}$`));
    await expect(
      this.cell(duplicateRowIndex, 1),
      `Duplicate unit type should match existing channel criteria (row ${duplicateRowIndex + 1})`,
    ).toContainText(existingRow.unitType);

    const rowsWithNameBeforeSave = await this.countRowsWithChannelName(existingRow.channelName);
    expect(
      rowsWithNameBeforeSave,
      `Duplicate should exist in the grid before Save & Validate`,
    ).toBeGreaterThanOrEqual(2);

    await this.blurGridEditor();
    await WaitUtils.untilVisible(this.saveAndValidateButton);
    await WaitUtils.untilEnabled(this.saveAndValidateButton, TIMEOUTS.SLOW_UI_MS);
    await this.saveAndValidateButton.click();

    await expect
      .poll(
        async () => this.normalizeCellText(await this.cell(duplicateRowIndex, 0).textContent()),
        {
          timeout: TIMEOUTS.SLOW_UI_MS,
          message: `Duplicate channel at row ${duplicateRowIndex + 1} should be rejected after Save & Validate`,
        },
      )
      .toBe('');

    await expect
      .poll(
        async () => this.countRowsWithChannelName(existingRow.channelName),
        {
          timeout: TIMEOUTS.SLOW_UI_MS,
          message: `Only one channel named "${existingRow.channelName}" should remain after duplicate prevention`,
        },
      )
      .toBe(1);

    logger.info(
      `Duplicate channel prevention verified: only one "${existingRow.channelName}" row remains after Save & Validate.`,
    );
  }

  /** Full Utilities → User-defined Channels flow with post-save persistence checks. */
  async runUserDefinedChannelsFlow(
    rows: UserDefinedChannelRowData[] = DEFAULT_USER_DEFINED_CHANNEL_ROWS,
  ): Promise<void> {
    await this.openFromUtilitiesMenu();
    await this.verifyPageLevelElements();
    await this.verifyTableHeadersAndKeypad();
    await this.verifySaveAndGoBackButtonBehaviorOnInitialLoad();
    await this.fillChannelRows(rows);
    await this.assertChannelDataBeforeSave(rows);
    await this.verifySaveAndGoBackButtonBehaviorAfterFill();
    await this.saveAndValidate();
    await this.assertRowValidationWarningsIfPresent();
    await this.assertPersistedChannelData(rows);
    await this.verifySaveAndGoBackButtonStatesAfterPersist();
  }
}

export function createUserDefinedChannelsPage(page: Page): UserDefinedChannelsPage {
  return new UserDefinedChannelsPage(page);
}
