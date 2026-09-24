import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { TIMEOUTS } from '../constants/timeouts';
import type { VersionControlTestConfig } from '../excel/versionControlTestData';
import { logger } from '../logger';
import { WaitUtils } from '../utils/WaitUtils';

const AVAILABLE_VERSION_COLUMNS = ['Version', 'Date & Time', 'Owner', 'Owner Email', 'Action'] as const;

/** Page object for Utilities → Version Control (codegen chrome + Excel owner). */
export class VersionControlPage extends BasePage {
  private readonly topbar = this.page.locator('#page-topbar');
  private readonly sideMenu = this.page.locator('#side-menu');
  private readonly utilitiesSectionIcon = this.sideMenu
    .getByRole('link', { name: /icon\s+Utilities/i })
    .first();
  private readonly utilitiesMenuLink = this.sideMenu.getByRole('link', { name: /Utilities/i }).first();
  private readonly versionControlNavLink = this.sideMenu.getByRole('link', { name: 'Version Control' });

  constructor(
    page: Page,
    private readonly config: VersionControlTestConfig,
  ) {
    super(page);
  }

  private root(): Locator {
    return this.page.locator('app-version-control');
  }

  private async isVisibleQuick(locator: Locator, timeout = 2000): Promise<boolean> {
    return locator.isVisible({ timeout }).catch(() => false);
  }

  private availableVersionsHeading(): Locator {
    return this.page.getByRole('heading', { name: /^Available Versions$/i });
  }

  private availableVersionsGrid(): Locator {
    return this.root()
      .getByRole('treegrid')
      .filter({ hasText: this.config.baseVersionName })
      .first();
  }

  private async confirmNavigationSaveIfPrompted(): Promise<void> {
    const yesSave = this.page.getByRole('button', { name: /Yes,\s*Save/i }).first();
    if (await this.isVisibleQuick(yesSave, 3000)) {
      await this.click(yesSave, 'Yes, Save (navigation)');
    }
  }

  async openUtilitiesMenu(): Promise<void> {
    if (await this.isVisibleQuick(this.versionControlNavLink)) {
      await expect(this.sideMenu).toContainText(/Utilities/i);
      return;
    }

    if (await this.isVisibleQuick(this.utilitiesSectionIcon)) {
      await this.click(this.utilitiesSectionIcon, 'Utilities menu');
    } else {
      await this.click(this.utilitiesMenuLink, 'Utilities menu');
    }

    await expect(this.versionControlNavLink).toBeVisible({ timeout: 10_000 });
    await expect(this.sideMenu).toContainText(/Utilities/i);
  }

  async openVersionControl(): Promise<void> {
    await expect(this.versionControlNavLink).toBeVisible();
    await expect(this.versionControlNavLink).toBeEnabled();
    await this.click(this.versionControlNavLink, 'Version Control');
    await this.confirmNavigationSaveIfPrompted();
    await expect(this.page).toHaveURL(/version-control/i, { timeout: TIMEOUTS.SLOW_UI_MS });
    await expect(this.topbar).toContainText(/Version Control/i, { timeout: TIMEOUTS.SLOW_UI_MS });
    await WaitUtils.untilVisible(this.availableVersionsHeading(), TIMEOUTS.SLOW_UI_MS);
    logger.info('Utilities → Version Control opened');
  }

  /** Codegen chrome: headings, columns, badges, Changes History, Comments. */
  async assertVersionControlPageLoaded(): Promise<void> {
    await expect(this.root()).toContainText('Available Versions');
    await expect(this.page.locator('h4')).toContainText('Version Control');
    for (const header of AVAILABLE_VERSION_COLUMNS) {
      await expect(this.root()).toContainText(header);
    }
    await expect(this.page.getByRole('img', { name: 'Import (Disabled)' })).toBeVisible();
    await expect(this.page.getByRole('img', { name: 'Master Version' })).toBeVisible();
    await expect(this.page.getByRole('img', { name: 'Current Version' })).toBeVisible();
    await expect(this.page.getByText('Base Version').nth(1)).toBeVisible();
    await expect(this.root()).toContainText('Changes History - Base Version');
    await expect(this.root()).toContainText('Comments - Base Version');
    await expect(this.root()).toContainText('Screen Name');
    await expect(this.root()).toContainText('Stage');
    await expect(this.root()).toContainText('Date & Time');
    await expect(this.root()).toContainText('Comment');
  }

  /** Owner / Owner Email from Excel VersionControlBaseOwner / VersionControlBaseOwnerEmail. */
  async assertExcelOwnerNameAndEmail(): Promise<void> {
    const grid = this.availableVersionsGrid();
    await expect(grid.locator('#cell-0-2')).toContainText(this.config.baseVersionOwner);
    await expect(grid.locator('#cell-0-3')).toContainText(this.config.baseVersionOwnerEmail);
  }

  async runVersionControlFlow(): Promise<void> {
    await this.openUtilitiesMenu();
    await this.openVersionControl();
    await this.assertVersionControlPageLoaded();
    await this.assertExcelOwnerNameAndEmail();
  }
}

export function createVersionControlPage(
  page: Page,
  config: VersionControlTestConfig,
): VersionControlPage {
  return new VersionControlPage(page, config);
}
