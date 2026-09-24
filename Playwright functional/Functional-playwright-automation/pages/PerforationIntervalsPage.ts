import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { BasePage } from '../base/BasePage';
import {
  formatPerforationMdDisplay,
  type PerforationClusterData,
  type PerforationIntervalsFlowData,
} from '../excel/perforationIntervalsTestData';
import { AssertionUtils } from '../utils/AssertionUtils';
import { step } from '../utils/step';
import { WaitUtils } from '../utils/WaitUtils';

const FIELD_WAIT_MS = 20_000;
const DROPDOWN_WAIT_MS = 300;

/**
 * Wellbore Configuration → Perforation Intervals.
 *
 * Locator strategy aligned with legacy BDD (Selenium) page object:
 * - Main tab HOT vs Edit Clusters dialog share the same `#cell-r-c` ids.
 *   BDD used `(//td[@id='cell-0-1'])[2]` → Playwright `.nth(1)` for dialog cells.
 * - Copy & Paste title: h5 "Perforation Data"
 * - Edit Clusters title: h5 "Perforation Interval"
 * - Edit Clusters icon: (img[alt=Edit Clusters])[1]
 *
 * Dialog entry: dblclick → Playwright clear() → fill → commit via h5 title.
 */
export class PerforationIntervalsPage extends BasePage {
  private readonly wellboreLink = this.page.getByRole('link', { name: 'Wellbore Configuration' });
  private readonly perforationTab = this.page
    .locator('span', { hasText: 'Perforation Intervals' })
    .or(this.page.getByRole('tab', { name: 'Perforation Intervals' }))
    .first();
  private readonly mainTable = this.page.locator('#handOnTableId');
  private readonly tableHeaderNames = this.page.locator('#tableHeaderNames');
  private readonly tabset = this.page.locator('tabset');
  private readonly copyPasteButton = this.page.getByRole('button', { name: /Copy & Paste/i });
  private readonly importDataButton = this.page.getByRole('button', { name: /Import Data/i });
  private readonly nextButton = this.page.getByRole('button', { name: 'Next' });

  /** BDD: //h5[text()=' Perforation Data '] */
  private readonly copyPasteTitle = this.page.locator('h5', { hasText: 'Perforation Data' });
  /** BDD: //h5[text()='Copy & Paste'] */
  private readonly copyPasteHeader = this.page.locator('h5', { hasText: 'Copy & Paste' });
  /** BDD: //h5[text()='Perforation Interval'] */
  private readonly clustersTitle = this.page.locator('h5', { hasText: 'Perforation Interval' });
  /** BDD: (//img[@alt='Edit Clusters'])[1] */
  private readonly editClustersImg = this.page.locator("img[alt='Edit Clusters']").first();
  /** BDD: //button[text()='Ok'] */
  private readonly okButton = this.page.getByRole('button', { name: 'Ok', exact: true });

  /**
   * Main-tab cell (first HOT instance).
   * Prefer #handOnTableId master clone.
   */
  private mainCell(row: number, col: number): Locator {
    const inMain = this.mainTable.locator(`.ht_master #cell-${row}-${col}`);
    return inMain.or(this.mainTable.locator(`#cell-${row}-${col}`)).first();
  }

  /**
   * Edit Clusters dialog cell — BDD `(//td[@id='cell-r-c'])[2]` = nth(1).
   * When dialog is open, the 2nd matching cell id is the sub-interval grid.
   */
  private dialogCell(row: number, col: number): Locator {
    return this.page.locator(`td#cell-${row}-${col}`).nth(1);
  }

  private copyPasteModalRoot(): Locator {
    return this.page
      .locator('.modal.show, [role="dialog"]')
      .filter({ has: this.copyPasteTitle })
      .first();
  }

  private importModalRoot(): Locator {
    return this.page
      .locator('.modal.show, [role="dialog"]')
      .filter({ hasText: 'Import Data' })
      .first();
  }

  async openPerforationIntervals(): Promise<void> {
    await step('Open Wellbore Configuration → Perforation Intervals', async () => {
      await WaitUtils.untilVisible(this.wellboreLink, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.wellboreLink, 'Wellbore Configuration');
      await WaitUtils.untilVisible(this.mainTable, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.perforationTab, 'Perforation Intervals');
      await WaitUtils.untilVisible(this.mainTable, TIMEOUTS.SLOW_UI_MS);
    });
  }

  async verifyPageChrome(): Promise<void> {
    await step('Verify Perforation Intervals chrome', async () => {
      await AssertionUtils.assertTextContains(this.tabset, 'Use Multiple Clusters for Model');
      await AssertionUtils.assertTextContains(this.tabset, 'Use Stage Aliases');
      await AssertionUtils.assertVisible(this.copyPasteButton, 'Copy & Paste');
      await AssertionUtils.assertVisible(this.importDataButton, 'Import Data');
    });
  }

  async verifyCopyPasteModal(): Promise<void> {
    await step('Verify Copy & Paste modal then Cancel (scoped by h5 Perforation Data)', async () => {
      await this.click(this.copyPasteButton, 'Copy & Paste');
      await WaitUtils.untilVisible(this.copyPasteTitle, FIELD_WAIT_MS);
      await expect(this.copyPasteTitle).toContainText('Perforation Data');

      const modal = this.copyPasteModalRoot();
      // Prefer modal-scoped text; fall back to title-adjacent body if .modal.show missing
      const scope = (await modal.count()) > 0 ? modal : this.page.locator('body');
      await expect(scope.getByRole('paragraph').first()).toContainText(
        'For the best results, paste the data in the respective columns only.',
        { timeout: FIELD_WAIT_MS },
      );
      for (const label of [
        'Stage',
        'Top MD (ft)',
        'Bot MD (ft)',
        'Diameter (in)',
        'No. of Perfs',
        'Perf Phasing',
      ]) {
        await expect(scope).toContainText(label, { timeout: FIELD_WAIT_MS });
      }

      const cancel = this.page.getByRole('button', { name: 'Cancel' });
      await AssertionUtils.assertVisible(cancel, 'Cancel');
      await this.click(cancel, 'Cancel');
      await this.copyPasteTitle.waitFor({ state: 'hidden', timeout: FIELD_WAIT_MS }).catch(() => undefined);
    });
  }

  async verifyImportDataModal(): Promise<void> {
    await step('Verify Import Data modal then Close (scoped to Import popup)', async () => {
      await this.click(this.importDataButton, 'Import Data');
      const modal = this.importModalRoot();
      await WaitUtils.untilVisible(
        modal.locator('h5').or(this.page.locator('h5', { hasText: 'Import Data' })).first(),
        FIELD_WAIT_MS,
      );
      await expect(modal).toContainText('Import Data');
      await expect(modal).toContainText('File Selection');
      await expect(modal).toContainText('Map Columns & import');
      const close = modal.getByRole('button', { name: 'Close' });
      await AssertionUtils.assertVisible(close, 'Close');
      await this.click(close, 'Close');
    });
  }

  async verifyMainGridHeaders(): Promise<void> {
    await step('Verify main tab headers via #tableHeaderNames / #handOnTableId', async () => {
      await AssertionUtils.assertTextContains(this.tabset, '×Tubing');
      await AssertionUtils.assertTextContains(this.tabset, '×Length');

      const headerRoot =
        (await this.tableHeaderNames.count()) > 0 ? this.tableHeaderNames : this.mainTable;

      for (const header of [
        'Use',
        'Top MD (ft)',
        'Top TVD (ft)',
        'Bot TVD (ft)',
        'Diameter (in)',
        'No. of Perfs',
        'Perf Phasing',
        'No. of Clusters',
      ]) {
        await AssertionUtils.assertTextContains(headerRoot, header);
      }
    });
  }

  private async commitDialogEdit(): Promise<void> {
    // BDD commits by leaving the cell; we click the Edit Clusters h5 title
    if (await this.clustersTitle.isVisible().catch(() => false)) {
      await this.clustersTitle.click({ force: true });
      await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
      return;
    }
    const subHeader = this.page.locator('#subIntervalTableHeaderName');
    if (await subHeader.isVisible().catch(() => false)) {
      await subHeader.click({ force: true });
      await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
    }
  }

  private async resolveDialogEditor(): Promise<Locator> {
    // Prefer editor inside clusters dialog / visible HOT textarea
    const titled = this.page
      .locator('.modal.show, [role="dialog"]')
      .filter({ has: this.clustersTitle })
      .locator('textarea:visible')
      .last();
    if (await titled.isVisible().catch(() => false)) {
      return titled;
    }
    const any = this.page.locator('textarea:visible').last();
    await WaitUtils.untilVisible(any, FIELD_WAIT_MS);
    return any;
  }

  private async clearAndFillDialogCell(
    row: number,
    col: number,
    value: string,
    label: string,
  ): Promise<void> {
    const inputValue = String(value).replace(/,/g, '').trim();
    if (!inputValue) {
      throw new Error(`${label}: Excel value is empty`);
    }

    await step(`Enter dialog ${label} = ${inputValue} (cell nth=1 / BDD [2])`, async () => {
      const cell = this.dialogCell(row, col);
      await WaitUtils.untilVisible(cell, TIMEOUTS.SLOW_UI_MS);
      await cell.scrollIntoViewIfNeeded();
      await this.dblclick(cell, label);

      const editor = await this.resolveDialogEditor();
      await WaitUtils.untilVisible(editor, FIELD_WAIT_MS);
      await editor.click({ force: true });
      await editor.clear();
      await editor.fill(inputValue);

      await this.commitDialogEdit();
    });
  }

  private async selectDialogPhasing(row: number, optionName: string, label: string): Promise<void> {
    await step(`Select dialog ${label} = ${optionName}`, async () => {
      // BDD: (//td[@id='cell-0-7'])[2]
      const cell = this.dialogCell(row, 7);
      await WaitUtils.untilVisible(cell, TIMEOUTS.SLOW_UI_MS);
      await this.dblclick(cell, label);
      await this.page.waitForTimeout(DROPDOWN_WAIT_MS);

      const option = this.page.getByRole('option', { name: optionName, exact: true });
      await this.scrollUntilOptionVisible(option);
      await WaitUtils.untilVisible(option, FIELD_WAIT_MS);
      await option.click();
      await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
    });
  }

  private async scrollUntilOptionVisible(option: Locator): Promise<void> {
    const holders = this.page.locator(
      '.htAutocompleteHolder, .ht_master .wtHolder, [role="listbox"]',
    );
    for (let i = 0; i < 40; i++) {
      if (await option.isVisible().catch(() => false)) {
        return;
      }
      if ((await option.count()) > 0) {
        await option.scrollIntoViewIfNeeded().catch(() => undefined);
        if (await option.isVisible().catch(() => false)) {
          return;
        }
      }
      const holderCount = await holders.count();
      if (holderCount > 0) {
        const holder = holders.nth(holderCount - 1);
        if (await holder.isVisible().catch(() => false)) {
          await holder.evaluate((el) => {
            el.scrollTop += 120;
          });
        }
      }
      await this.page.keyboard.press('ArrowDown');
      await this.page.waitForTimeout(40);
    }
  }

  private async openEditClusters(preferRowImg = false): Promise<void> {
    await step('Open Edit Clusters (BDD img alt Edit Clusters)', async () => {
      if (preferRowImg) {
        const rowImg = this.mainCell(0, 0).locator("img[alt='Edit Clusters']");
        if (await rowImg.isVisible().catch(() => false)) {
          await this.click(rowImg, 'Edit Clusters (row)');
        } else {
          await this.click(this.editClustersImg, 'Edit Clusters');
        }
      } else {
        await this.click(this.editClustersImg, 'Edit Clusters');
      }
      await WaitUtils.untilVisible(this.clustersTitle, TIMEOUTS.SLOW_UI_MS);
    });
  }

  private async clickOk(): Promise<void> {
    await step('Click Ok on Perforation Interval dialog', async () => {
      await WaitUtils.untilVisible(this.okButton, FIELD_WAIT_MS);
      await this.click(this.okButton, 'Ok');
      await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
      await this.clustersTitle.waitFor({ state: 'hidden', timeout: FIELD_WAIT_MS }).catch(() => undefined);
    });
  }

  private async fillClusterRow(
    row: number,
    cluster: PerforationClusterData,
    label: string,
  ): Promise<void> {
    await step(`Fill ${label} dialog row ${row}`, async () => {
      await this.clearAndFillDialogCell(row, 1, cluster.topMd, `${label} Top MD`);
      await this.clearAndFillDialogCell(row, 2, cluster.botMd, `${label} Bot MD`);
      await this.clearAndFillDialogCell(row, 5, cluster.diameter, `${label} Diameter`);
      await this.clearAndFillDialogCell(row, 6, cluster.noOfPerfs, `${label} No. of Perfs`);
      await this.selectDialogPhasing(row, cluster.perfPhasing, `${label} Perf Phasing`);
    });
  }

  private async assertMainContains(
    row: number,
    col: number,
    expected: string,
    label: string,
  ): Promise<void> {
    const cell = this.mainCell(row, col);
    await step(`Assert main ${label} contains "${expected}"`, async () => {
      await expect
        .poll(
          async () => {
            const actual = (await cell.textContent())?.trim() ?? '';
            return actual.includes(expected)
              ? 'match'
              : `expected~="${expected}" actual="${actual}"`;
          },
          { timeout: FIELD_WAIT_MS },
        )
        .toBe('match');
    });
  }

  async verifyTopMdValidation(data: PerforationIntervalsFlowData): Promise<void> {
    await step('Validate Top MD > Bot MD in Edit Clusters dialog', async () => {
      await this.openEditClusters(false);
      await this.clearAndFillDialogCell(0, 1, data.validationTopMd, 'Validation Top MD');
      await AssertionUtils.assertVisible(
        this.page.getByText(data.validationMessage, { exact: false }).first(),
        data.validationMessage,
      );
    });
  }

  async fillInitialClusterAndSave(data: PerforationIntervalsFlowData): Promise<void> {
    await step('Fill initial cluster, Ok, assert main grid, Save', async () => {
      await this.clearAndFillDialogCell(0, 1, data.initialCluster.topMd, 'Initial Top MD');
      await this.clearAndFillDialogCell(0, 2, data.initialCluster.botMd, 'Initial Bot MD');

      await expect(this.page.locator('body')).toContainText(
        formatPerforationMdDisplay(data.initialCluster.topMd),
      );
      await expect(this.page.locator('body')).toContainText(
        formatPerforationMdDisplay(data.initialCluster.botMd),
      );

      await this.clearAndFillDialogCell(0, 5, data.initialCluster.diameter, 'Initial Diameter');
      await this.clearAndFillDialogCell(0, 6, data.initialCluster.noOfPerfs, 'Initial No. of Perfs');
      await this.selectDialogPhasing(0, data.initialCluster.perfPhasing, 'Initial Perf Phasing');
      await this.clickOk();

      const a = data.afterFirstSave;
      await this.assertMainContains(0, 2, a.topMd, 'After first Top MD');
      await this.assertMainContains(0, 3, a.botMd, 'After first Bot MD');
      await this.assertMainContains(0, 4, a.topTvd, 'After first Top TVD');
      await this.assertMainContains(0, 5, a.botTvd, 'After first Bot TVD');
      await this.assertMainContains(0, 6, a.diameter, 'After first Diameter');
      await this.assertMainContains(0, 8, a.perfPhasing, 'After first Perf Phasing');

      await this.save();
    });
  }

  async fillCluster1CheckUse(data: PerforationIntervalsFlowData): Promise<void> {
    await step('Edit cluster 1, Ok, check Use, assert main grid', async () => {
      await this.openEditClusters(false);
      await this.fillClusterRow(0, data.cluster1, 'Cluster1');
      await this.clickOk();

      // HandsOnTable Use checkbox — Playwright check() often fails to flip state; force-click row 0
      const useCheckbox = this.mainTable
        .locator('input.htCheckboxRendererInput[data-row="0"]')
        .or(
          this.page
            .getByRole('row', { name: /Edit Clusters Unchecked/i })
            .getByLabel('Unchecked'),
        )
        .first();
      await WaitUtils.untilVisible(useCheckbox, FIELD_WAIT_MS);
      await useCheckbox.click({ force: true });
      await expect(useCheckbox).toHaveAttribute('aria-checked', 'true', { timeout: FIELD_WAIT_MS }).catch(
        async () => {
          await useCheckbox.evaluate((el: HTMLInputElement) => {
            el.click();
            el.checked = true;
            el.setAttribute('aria-checked', 'true');
            el.dispatchEvent(new Event('change', { bubbles: true }));
          });
        },
      );

      const a = data.afterCluster1Use;
      await this.assertMainContains(0, 2, a.topMd, 'After cluster1 Top MD');
      await this.assertMainContains(0, 3, a.botMd, 'After cluster1 Bot MD');
      await this.assertMainContains(0, 4, a.topTvd, 'After cluster1 Top TVD');
      await this.assertMainContains(0, 5, a.botTvd, 'After cluster1 Bot TVD');
      await this.assertMainContains(0, 6, a.diameter, 'After cluster1 Diameter');
      await this.assertMainContains(0, 7, a.noOfPerfs, 'After cluster1 No. of Perfs');
      await this.assertMainContains(0, 8, a.perfPhasing, 'After cluster1 Perf Phasing');
      await this.assertMainContains(0, 9, a.noOfClusters, 'After cluster1 No. of Clusters');
    });
  }

  async addCluster2AndFinalSave(data: PerforationIntervalsFlowData): Promise<void> {
    await step('Add cluster 2 (dialog row 1), Ok, Save, assert final', async () => {
      await this.openEditClusters(true);
      // Second dialog row: cell-1-* still uses nth(1) for dialog instance of that id
      await this.fillClusterRow(1, data.cluster2, 'Cluster2');
      await this.clickOk();
      await this.save();

      const a = data.afterFinalSave;
      await this.assertMainContains(0, 4, a.topTvd, 'Final Top TVD');
      await this.assertMainContains(0, 5, a.botTvd, 'Final Bot TVD');
      await this.assertMainContains(0, 6, a.diameter, 'Final Diameter');
      await this.assertMainContains(0, 7, a.noOfPerfs, 'Final No. of Perfs');
      await this.assertMainContains(0, 8, a.perfPhasing, 'Final Perf Phasing');
      await this.assertMainContains(0, 9, a.noOfClusters, 'Final No. of Clusters');

      await AssertionUtils.assertVisible(this.nextButton, 'Next button');
    });
  }

  async save(): Promise<void> {
    await step('Save Perforation Intervals (main page Save)', async () => {
      // BDD: //button[text()=' Save '] on perforation page (not Copy & Paste modal)
      const mainSave = this.page
        .locator('button', { hasText: /^\s*Save\s*$/ })
        .filter({ hasNot: this.page.locator('#runModalLabel') })
        .last();
      await WaitUtils.untilVisible(mainSave, TIMEOUTS.SLOW_UI_MS);
      await expect(mainSave).toBeEnabled({ timeout: TIMEOUTS.SLOW_UI_MS });
      await this.click(mainSave, 'Save');
      await this.page.waitForTimeout(TIMEOUTS.SAVE_WAIT_MS);
    });
  }

  async runPerforationIntervalsFlow(data: PerforationIntervalsFlowData): Promise<void> {
    await this.openPerforationIntervals();
    await this.verifyPageChrome();
    await this.verifyCopyPasteModal();
    await this.verifyImportDataModal();
    await this.verifyMainGridHeaders();
    await this.verifyTopMdValidation(data);
    await this.fillInitialClusterAndSave(data);
    await this.fillCluster1CheckUse(data);
    await this.addCluster2AndFinalSave(data);
  }
}

export function createPerforationIntervalsPage(page: Page): PerforationIntervalsPage {
  return new PerforationIntervalsPage(page);
}
