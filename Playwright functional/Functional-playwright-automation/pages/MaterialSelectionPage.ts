import { type Locator, type Page } from '@playwright/test';
import type { MaterialSelectionData } from '../excel/materialTestData';
import { escapeRegex } from '../excel/materialTestData';
import { BasePage } from '../base/BasePage';
import { AssertionUtils } from '../utils/AssertionUtils';
import { WaitUtils } from '../utils/WaitUtils';

export interface FluidSelectionItem {
  name: string;
  cellSelector: string;
}

export interface ProppantSelectionItem {
  name: string;
  cellSelector: string;
}

const FLUID_TABLE_HEADERS = ['Fluid Name', 'Fluid Type', 'Action'];
const PROPPANT_TABLE_HEADERS = ['Proppant Name', 'Source', 'Action'];

/**
 * Material Selection — fluid and proppant flows driven by Excel data.
 * Chemicals live in ChemicalSelectionPage / add-chemical.spec.ts.
 */
export class MaterialSelectionPage extends BasePage {
  private readonly materialSelectionLink = this.page.getByRole('link', { name: 'Material Selection' });
  private readonly fluidSelectionTab = this.page.getByRole('tab', { name: 'Fluid Selection' });
  private readonly proppantSelectionTab = this.page.getByRole('tab', { name: 'Proppant Selection' });
  private readonly addNewFluidButton = this.page.getByRole('button', { name: 'Add New Fluid to List' });
  private readonly addNewProppantButton = this.page.getByRole('button', { name: 'Add New Proppant to List' });
  private readonly addButton = this.page.getByRole('button', { name: 'Add', exact: true });
  private readonly handsOnTable = this.page.locator('#handOnTableId');

  private async waitAndClick(locator: Locator, label: string): Promise<void> {
    await this.click(locator, label);
  }

  private async waitAndAssertContains(locator: Locator, text: string | RegExp): Promise<void> {
    await AssertionUtils.assertTextContains(locator, text);
  }

  async openMaterialSelection(): Promise<void> {
    await this.waitAndClick(this.materialSelectionLink, 'Material Selection');
    await WaitUtils.untilVisible(this.addNewFluidButton);
  }

  async addFluidFromCatalog(fluidName: string): Promise<void> {
    await this.waitAndClick(this.addNewFluidButton, 'Add New Fluid to List');
    const row = this.page
      .getByRole('row', { name: new RegExp(`^\\d+\\s+${escapeRegex(fluidName)}`, 'i') })
      .first();
    await WaitUtils.untilVisible(row);
    await this.waitAndClick(row.locator('[id^="cell-"]').first(), fluidName);
    await this.waitAndClick(this.addButton, 'Add');
  }

  async addFluidsFromCatalog(fluids: string[]): Promise<void> {
    for (const fluidName of fluids) {
      await this.addFluidFromCatalog(fluidName);
    }
  }

  async verifyFluidSelection(fluids: string[]): Promise<void> {
    await this.waitAndClick(this.proppantSelectionTab, 'Proppant Selection');
    await this.waitAndClick(this.fluidSelectionTab, 'Fluid Selection');

    for (let index = 0; index < fluids.length; index++) {
      await this.waitAndAssertContains(this.page.locator(`#cell-${index}-0`), fluids[index]);
    }

    for (const header of FLUID_TABLE_HEADERS) {
      await this.waitAndAssertContains(this.handsOnTable, header);
    }
  }

  async addProppantFromCatalog(proppantName: string): Promise<void> {
    await this.waitAndClick(this.addNewProppantButton, 'Add New Proppant to List');
    const pickerCell = this.page
      .getByRole('gridcell', { name: new RegExp(`^${escapeRegex(proppantName)}$`, 'i') })
      .first();
    await WaitUtils.untilVisible(pickerCell);
    await this.waitAndClick(pickerCell, proppantName);
    await this.waitAndClick(this.addButton, 'Add');
  }

  async addProppantsFromCatalog(proppants: string[]): Promise<void> {
    await this.waitAndClick(this.proppantSelectionTab, 'Proppant Selection');

    for (const proppantName of proppants) {
      await this.addProppantFromCatalog(proppantName);
    }
  }

  async verifyProppantSelection(proppants: string[]): Promise<void> {
    for (let index = 0; index < proppants.length; index++) {
      await this.waitAndAssertContains(this.page.locator(`#cell-${index}-0`), proppants[index]);
    }

    for (const header of PROPPANT_TABLE_HEADERS) {
      await this.waitAndAssertContains(this.handsOnTable, header);
    }
  }

  /** Fluid + proppant selection after well is opened (no chemicals). */
  async runFluidAndProppantSelectionFlow(data: MaterialSelectionData): Promise<void> {
    await this.openMaterialSelection();
    await this.addFluidsFromCatalog(data.fluids);
    await this.verifyFluidSelection(data.fluids);
    await this.addProppantsFromCatalog(data.proppants);
    await this.verifyProppantSelection(data.proppants);
  }
}

export function createMaterialSelectionPage(page: Page): MaterialSelectionPage {
  return new MaterialSelectionPage(page);
}
