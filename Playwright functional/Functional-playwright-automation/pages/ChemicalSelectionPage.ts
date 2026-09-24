import { type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import type { MaterialChemicalData } from '../excel/materialTestData';
import { escapeRegex } from '../excel/materialTestData';
import { BasePage } from '../base/BasePage';
import { AssertionUtils } from '../utils/AssertionUtils';
import { WaitUtils } from '../utils/WaitUtils';

export type ChemicalRowData = MaterialChemicalData;

const CHEMICAL_TABLE_HEADERS = ['Chemical Name', 'Additive Rate Channel', 'Unit', 'Type'];

/**
 * Material Selection → Chemical Selection — Excel-driven chemical rows.
 * Name cells use HandsOnTable textarea clear()/fill (not fragile textbox.nth).
 */
export class ChemicalSelectionPage extends BasePage {
  private readonly materialSelectionLink = this.page.getByRole('link', { name: 'Material Selection' });
  private readonly chemicalSelectionTab = this.page.getByRole('tab', { name: 'Chemical Selection' });
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  private readonly handsOnTable = this.page.locator('#handOnTableId');

  private editor(): Locator {
    return this.page
      .locator('textarea.handsontableInput:focus:not([role="combobox"])')
      .or(this.page.locator('textarea.handsontableInput:visible:not([role="combobox"])').last())
      .or(this.page.locator('textarea:visible:not([role="combobox"])').last());
  }

  private async waitAndClick(locator: Locator, label: string): Promise<void> {
    await this.click(locator, label);
  }

  private async waitAndDblClick(locator: Locator, label: string): Promise<void> {
    await this.dblclick(locator, label);
  }

  private async selectDropdownOption(optionName: string): Promise<void> {
    const option = this.page.getByRole('option', { name: optionName });
    await this.waitAndClick(option, optionName);
  }

  private async waitAndAssertContains(locator: Locator, text: string | RegExp): Promise<void> {
    await AssertionUtils.assertTextContains(locator, text);
  }

  private async waitAfterSave(): Promise<void> {
    await this.page.waitForTimeout(TIMEOUTS.SAVE_WAIT_MS);
  }

  /** Commit open HOT editor by clicking the Chemical Name header. */
  private async commitEditor(): Promise<void> {
    const header = this.handsOnTable.getByText('Chemical Name', { exact: true }).first();
    if (await header.isVisible().catch(() => false)) {
      await header.click({ force: true });
      return;
    }
    await this.page.keyboard.press('Enter');
  }

  async openChemicalSelection(): Promise<void> {
    await this.waitAndClick(this.materialSelectionLink, 'Material Selection');
    await this.waitAndClick(this.chemicalSelectionTab, 'Chemical Selection');

    for (const header of CHEMICAL_TABLE_HEADERS) {
      await this.waitAndAssertContains(this.handsOnTable, header);
    }
  }

  private async fillChemicalName(rowIndex: number, name: string): Promise<void> {
    const nameCell = this.page.locator(`#cell-${rowIndex}-0`);
    await WaitUtils.untilVisible(nameCell);
    await nameCell.scrollIntoViewIfNeeded();
    await this.waitAndDblClick(nameCell, `Chemical Name cell row ${rowIndex + 1}`);

    const editor = this.editor();
    await WaitUtils.untilVisible(editor, TIMEOUTS.SLOW_UI_MS);
    await editor.click({ force: true });
    await editor.clear();
    await editor.fill(name);

    // Autocomplete: prefer exact option if the catalog offers one
    const option = this.page
      .getByRole('option', { name: new RegExp(`^${escapeRegex(name)}$`, 'i') })
      .first();
    if (await option.isVisible({ timeout: 1500 }).catch(() => false)) {
      await this.waitAndClick(option, name);
      return;
    }

    await this.commitEditor();
  }

  private async addChemicalRow(rowIndex: number, item: MaterialChemicalData): Promise<void> {
    await this.fillChemicalName(rowIndex, item.name);

    const unitCell = this.page.locator(`#cell-${rowIndex}-2`);
    if (rowIndex === 0) {
      await this.waitAndClick(unitCell, 'cell-0-2');
    }
    await this.waitAndDblClick(unitCell, `Chemical Unit cell row ${rowIndex + 1}`);
    await this.selectDropdownOption(item.unit);

    const typeCell = this.page.locator(`#cell-${rowIndex}-3`);
    await this.waitAndDblClick(typeCell, `Chemical Type cell row ${rowIndex + 1}`);
    await this.selectDropdownOption(item.type);
  }

  async addChemicals(chemicals: MaterialChemicalData[]): Promise<void> {
    for (let index = 0; index < chemicals.length; index++) {
      await this.addChemicalRow(index, chemicals[index]);
    }
  }

  async saveChemicals(): Promise<void> {
    await this.waitAndClick(this.saveButton, 'Save');
    await this.waitAfterSave();
  }

  async verifyChemicalSelection(chemicals: MaterialChemicalData[]): Promise<void> {
    for (let index = 0; index < chemicals.length; index++) {
      await this.waitAndAssertContains(
        this.page.locator(`#cell-${index}-0`),
        chemicals[index].name,
      );
      await this.waitAndAssertContains(
        this.page.locator(`#cell-${index}-3`),
        chemicals[index].type,
      );
    }
  }

  /** Full chemical selection flow after well is opened. */
  async runChemicalSelectionFlow(chemicals: MaterialChemicalData[]): Promise<void> {
    await this.openChemicalSelection();
    await this.addChemicals(chemicals);
    await this.saveChemicals();
    await this.verifyChemicalSelection(chemicals);
  }
}

export function createChemicalSelectionPage(page: Page): ChemicalSelectionPage {
  return new ChemicalSelectionPage(page);
}
