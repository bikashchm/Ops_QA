import { type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { BasePage } from '../base/BasePage';
import { step } from '../utils/step';
import { clickStep, waitStep } from '../utils/stepLabels';
import { WaitUtils } from '../utils/WaitUtils';

export interface WellSelectionData {
  padName: string;
  wellName: string;
  companyButtonName: string;
}

/**
 * Pad / well search and open — Excel-driven, aligned with SaveandNext / DesignTreatment.
 */
export class WellSelectionPage extends BasePage {
  private readonly searchPadOrWell = this.page.getByRole('textbox', { name: 'Search Pad or Well' });
  private readonly searchIcon = this.page.getByRole('img', { name: 'img' });
  private readonly filterAllRadio = this.page.getByRole('radio', { name: 'All' });
  private readonly filterCombobox = this.page.getByRole('combobox').getByRole('textbox');
  private readonly optionsList = this.page.getByLabel('Options list');
  private readonly padDropZone = this.page.locator('#padDropZone');
  private readonly mapOverlay = this.page.locator('.map-overlay-panel');
  private readonly layoutWrapper = this.page.locator('#layout-wrapper');

  /** Short-timeout click — fail in ~20s instead of hanging on overlays. */
  private async clickResilient(
    locator: Locator,
    label: string,
    timeoutMs = TIMEOUTS.SHORT_UI_MS,
  ): Promise<void> {
    await step(clickStep(label), async () => {
      await WaitUtils.untilVisible(locator, timeoutMs);
      try {
        await locator.scrollIntoViewIfNeeded({ timeout: 3_000 }).catch(() => undefined);
        await locator.click({ timeout: Math.min(8_000, timeoutMs) });
      } catch {
        try {
          await locator.click({ force: true, timeout: 5_000 });
        } catch {
          await locator.evaluate((el) => (el as HTMLElement).click());
        }
      }
    });
  }

  async waitForSearchScreen(timeoutMs = TIMEOUTS.SHORT_UI_MS): Promise<void> {
    await step(waitStep('pad/well search screen'), async () => {
      await WaitUtils.untilVisible(this.searchPadOrWell, timeoutMs);
    });
  }

  async searchPadByName(padName: string): Promise<void> {
    await step(`Search for pad "${padName}"`, async () => {
      await this.waitForSearchScreen();
      await this.fill(this.searchPadOrWell, padName, 'pad search');
      await this.clickResilient(this.searchIcon, 'search icon');
    });
  }

  async searchWellByName(wellName: string): Promise<void> {
    await step(`Search for well "${wellName}"`, async () => {
      await this.waitForSearchScreen();
      await this.fill(this.searchPadOrWell, wellName, 'well search');
      await this.clickResilient(this.searchIcon, 'search icon');
    });
  }

  async selectAllTimeFilter(): Promise<void> {
    await step('Apply All time filter', async () => {
      await this.clickResilient(this.filterAllRadio, 'All filter');
      await this.clickResilient(this.filterCombobox, 'time filter dropdown');
      await this.clickResilient(this.optionsList.getByText('All'), 'All time range');
    });
  }

  async selectCompanyOnMap(companyButtonName: string): Promise<void> {
    const namePattern = companyButtonName.replace(/^[^\w]+/, '').trim() || 'Liveplus playwright';
    // Match fleet/company chip (e.g. " Liveplus playwright"), not map pad/well markers
    // whose aria-label also contains "Liveplus playwright automation pad…".
    const companyButton = this.page
      .getByRole('button', { name: new RegExp(`^[^\\w]*${this.escapeRegex(namePattern)}\\s*$`, 'i') })
      .first();

    if (await companyButton.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await this.clickResilient(companyButton, `company "${companyButtonName}"`);
      return;
    }

    // Fallback: visible company/fleet button that is NOT a pad/well map marker
    const fallback = this.page
      .getByRole('button', { name: new RegExp(this.escapeRegex(namePattern), 'i') })
      .filter({ hasNot: this.page.locator('[title*="Pad Name"], [aria-label*="Pad Name"]') })
      .first();
    await this.clickResilient(fallback, `company "${companyButtonName}" (fallback)`);
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** Expand Excel pad in the Pads sidebar. */
  async clickPadByName(padName: string): Promise<void> {
    await step(`Click Excel pad "${padName}" in Pads list`, async () => {
      const padInList = this.mapOverlay.getByText(padName, { exact: false }).first();
      await WaitUtils.untilVisible(padInList, TIMEOUTS.SLOW_UI_MS);
      await this.clickResilient(padInList, `pad "${padName}"`);
    });
  }

  /**
   * Click Excel well name — padDropZone first, then Pads panel under the expanded pad.
   */
  async clickWellByName(wellName: string): Promise<void> {
    await step(`Click Excel well "${wellName}"`, async () => {
      const wellInDropZone = this.padDropZone
        .getByText(wellName, { exact: false })
        .filter({ visible: true })
        .first();
      const wellInPanel = this.mapOverlay
        .getByText(wellName, { exact: false })
        .filter({ visible: true })
        .first();

      await this.page.waitForTimeout(1_500);

      if (await wellInDropZone.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await this.clickResilient(wellInDropZone, `well "${wellName}" in pad drop zone`);
        return;
      }

      if (await wellInPanel.isVisible({ timeout: 15_000 }).catch(() => false)) {
        await this.clickResilient(wellInPanel, `well "${wellName}" in Pads panel`);
        return;
      }

      // Attached but collapsed/hidden under pad — force-click first match in Pads panel
      const wellAttached = this.mapOverlay.getByText(wellName, { exact: false }).first();
      if ((await wellAttached.count()) > 0) {
        await wellAttached.click({ force: true, timeout: 5_000 });
        return;
      }

      // Last resort: any visible well text on page
      const wellAnywhere = this.page
        .getByText(wellName, { exact: false })
        .filter({ visible: true })
        .last();
      await WaitUtils.untilVisible(wellAnywhere, TIMEOUTS.SHORT_UI_MS);
      await this.clickResilient(wellAnywhere, `well "${wellName}" (fallback)`);
    });
  }

  /**
   * Excel-driven open (always use Padname + WellName from Excel):
   * search pad → All filter → expand pad (only if well not visible) → click well → inside well.
   */
  async searchPadAndOpenWell(data: WellSelectionData): Promise<void> {
    await step(
      `Open Excel pad "${data.padName}" and well "${data.wellName}"`,
      async () => {
        await this.searchPadByName(data.padName);
        await this.selectAllTimeFilter();
        await this.page.waitForTimeout(1_000);

        const wellAlreadyVisible = await this.mapOverlay
          .getByText(data.wellName, { exact: false })
          .first()
          .isVisible({ timeout: 3_000 })
          .catch(() => false);

        if (!wellAlreadyVisible) {
          await this.clickPadByName(data.padName);
          await this.page.waitForTimeout(2_000);
        }

        await this.clickWellByName(data.wellName);
        await this.waitForInsideWell(data.wellName, TIMEOUTS.SLOW_UI_MS);
      },
    );
  }

  async waitForInsideWell(wellName: string, timeoutMs = TIMEOUTS.SLOW_UI_MS): Promise<void> {
    await step(waitStep(`well "${wellName}" workspace`), async () => {
      await WaitUtils.untilVisible(this.layoutWrapper, timeoutMs);
      await WaitUtils.untilVisible(
        this.layoutWrapper.getByText(wellName, { exact: false }),
        timeoutMs,
      );
      await WaitUtils.untilVisible(
        this.page.getByRole('link', { name: 'Material Selection' }),
        timeoutMs,
      );
    });
  }
}

export function createWellSelectionPage(page: Page): WellSelectionPage {
  return new WellSelectionPage(page);
}
