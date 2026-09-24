import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { TIMEOUTS } from '../constants/timeouts';
import type { DashboardFlowData } from '../excel/dashboardTestData';
import { logger } from '../logger';
import { WaitUtils } from '../utils/WaitUtils';

/**
 * Dashboard → + New Dashboad (codegen-aligned, Excel dashboard names).
 * Multi-match controls (fullscreen / refresh / menu / download) are resolved via
 * first-visible + tile-scoped locators — never brittle nth(N).
 */
export class DashboardPage extends BasePage {
  private readonly sideMenu = this.page.locator('#side-menu');
  private readonly topbar = this.page.locator('#page-topbar');
  private readonly plotDashboard = this.page.locator('#plot-dashboard');
  private readonly dashboardSectionIcon = this.sideMenu
    .getByRole('link', { name: /icon\s+Dashboard/i })
    .first();
  private readonly newDashboardLink = this.sideMenu.getByRole('link', {
    name: /\+\s*New\s+Dashboa?d/i,
  });
  private dropList(): Locator {
    // Id changes per render (cdk-drop-list-0, cdk-drop-list-5, …)
    return this.plotDashboard.locator('[id^="cdk-drop-list-"]').first();
  }
  private readonly saveButton = this.page.getByRole('button', { name: 'Save', exact: true }).first();
  private readonly chartModalLabel = this.page.locator('#chartModalLabel').first();
  private readonly dashboardNameInput = this.page
    .getByRole('textbox', { name: /Dashboard Name/i })
    .first();

  private async isVisibleQuick(locator: Locator, timeout = 2000): Promise<boolean> {
    return locator.isVisible({ timeout }).catch(() => false);
  }

  /** First currently visible match among duplicates (fullscreen×4, refresh×5, …). */
  private async firstVisible(
    candidates: Locator,
    timeoutMs = 8_000,
  ): Promise<Locator | null> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const count = await candidates.count();
      for (let i = 0; i < count; i++) {
        const item = candidates.nth(i);
        if (await item.isVisible().catch(() => false)) {
          return item;
        }
      }
      await this.page.waitForTimeout(150);
    }
    return null;
  }

  private async clickFirstVisible(candidates: Locator, label: string, timeoutMs = 8_000): Promise<void> {
    const target = await this.firstVisible(candidates, timeoutMs);
    expect(target, `${label} should have at least one visible match`).toBeTruthy();
    await this.click(target!, label);
  }

  private async expectAnyVisible(candidates: Locator, label: string, timeoutMs = 8_000): Promise<void> {
    const target = await this.firstVisible(candidates, timeoutMs);
    expect(target, `${label} should be visible`).toBeTruthy();
    await expect(target!).toBeVisible();
  }

  private async confirmNavigationIfPrompted(): Promise<void> {
    const yesSave = this.page.getByRole('button', { name: /Yes,\s*Save/i }).first();
    if (await this.isVisibleQuick(yesSave, 2500)) {
      await this.click(yesSave, 'Yes, Save (navigation)');
    }
  }

  private async closeOpenMenus(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
  }

  private dialog(): Locator {
    return this.page.getByRole('dialog').first();
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** Unique per run so re-runs do not collide with existing D1/Dashboard1. */
  private uniqueName(base: string): string {
    const stamp = Date.now().toString(36).slice(-5);
    return `${base}_${stamp}`;
  }

  async openDashboardSection(): Promise<void> {
    if (await this.isVisibleQuick(this.newDashboardLink, 2_000)) {
      await expect(this.sideMenu).toContainText(/Dashboard/i);
      return;
    }
    await this.click(this.dashboardSectionIcon, 'Dashboard menu');
    await expect(this.newDashboardLink).toBeVisible({ timeout: 10_000 });
  }

  async ensurePlotsPanelOpen(): Promise<void> {
    const hint = this.page
      .getByText(/Click on the plots and schematics you would like to add to the dashboard/i)
      .first();
    if (await this.isVisibleQuick(hint, 3_000)) {
      return;
    }

    const toggle = this.page.getByRole('button', { name: 'toggle-icon' });
    const expand = this.page.getByRole('button', { name: 'expand/collapse' });
    if (await this.firstVisible(toggle, 2_000)) {
      await this.clickFirstVisible(toggle, 'toggle-icon (open Plots panel)', 2_000);
    } else if (await this.firstVisible(expand, 2_000)) {
      await this.clickFirstVisible(expand, 'expand/collapse (open Plots panel)', 2_000);
    }
    await expect(hint).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });
  }

  async openNewDashboard(): Promise<void> {
    await this.openDashboardSection();
    await this.click(this.newDashboardLink, '+ New Dashboad');
    await this.confirmNavigationIfPrompted();
    await expect(this.topbar).toContainText(/Dashboard/i, { timeout: TIMEOUTS.SLOW_UI_MS });
    await WaitUtils.untilVisible(this.plotDashboard, TIMEOUTS.SLOW_UI_MS);
    await this.ensurePlotsPanelOpen();
    logger.info('Dashboard → + New Dashboad opened');
  }

  async assertNewDashboardChrome(): Promise<void> {
    await this.ensurePlotsPanelOpen();
    await expect(this.topbar).toContainText('Dashboard');
    await expect(this.plotDashboard).toContainText('Untitled');
    await expect(this.page.locator('h3').filter({ hasText: /^Plots$/i }).first()).toBeVisible();
    await expect(
      this.page
        .getByText(/Click on the plots and schematics you would like to add to the dashboard/i)
        .first(),
    ).toBeVisible();
    await expect(this.plotDashboard).toContainText(
      'Add your favourite plot and save your dashboard.',
    );

    for (const text of [
      'User-defined Plots',
      'Surf PRC',
      'Btm PRC',
      'Summary',
      'Chemicals',
      'Fracpro Live+',
      'Pad Plots',
      'Additional Plots',
      'Schematic',
    ]) {
      await expect(this.page.getByText(text, { exact: text !== 'Fracpro Live+' }).first()).toBeVisible();
    }
  }

  async toggleRightBarChrome(): Promise<void> {
    await this.ensurePlotsPanelOpen();
    const expand = this.page.getByRole('button', { name: 'expand/collapse' });
    const toggle = this.page.getByRole('button', { name: 'toggle-icon' });

    if (await this.firstVisible(expand, 2_000)) {
      await this.clickFirstVisible(expand, 'expand/collapse', 2_000);
    }
    if (await this.firstVisible(toggle, 2_000)) {
      await this.clickFirstVisible(toggle, 'toggle-icon', 2_000);
    }
    await this.ensurePlotsPanelOpen();
    await expect(this.page.getByText('User-defined Plots').first()).toBeVisible();
    await expect(this.page.getByText('Additional Plots').first()).toBeVisible();
  }

  private plotCheckbox(name: string): Locator {
    return this.page.getByRole('checkbox', { name, exact: true }).first();
  }

  async selectPlots(data: DashboardFlowData): Promise<string[]> {
    await this.ensurePlotsPanelOpen();
    const selected: string[] = [];
    const requiredSet = new Set(data.requiredPlots.map((name) => name.trim().toLowerCase()));
    const allNames = [...data.requiredPlots, ...data.optionalPlots];
    const builtIn = new Set([
      'surf prc',
      'btm prc',
      'summary',
      'schematic',
      'chemicals',
      'measured data',
    ]);
    const excelPlots = data.requiredPlots.filter(
      (name) => name.trim() && !builtIn.has(name.trim().toLowerCase()),
    );

    for (const name of allNames) {
      const isRequired = requiredSet.has(name.trim().toLowerCase());
      const checkbox = this.plotCheckbox(name);
      const waitMs = isRequired ? 8_000 : 2_500;
      if (!(await this.isVisibleQuick(checkbox, waitMs))) {
        if (isRequired && excelPlots.includes(name)) {
          throw new Error(
            `Dashboard Excel plot checkbox not found: "${name}". ` +
              'Run Plot.spec.ts first so PlotBaselineUserDefinedName / PlotBaselinePadPlotName exist.',
          );
        }
        logger.info(`Plot checkbox not present; skipped: ${name}`);
        continue;
      }
      if (await checkbox.isDisabled().catch(() => false)) {
        if (isRequired && excelPlots.includes(name)) {
          throw new Error(`Dashboard Excel plot checkbox is disabled: "${name}"`);
        }
        logger.info(`Plot checkbox disabled; skipped: ${name}`);
        continue;
      }
      await checkbox.check();
      selected.push(name);
      logger.info(`Plot checked: ${name}`);
    }

    expect(selected.length, 'At least one plot should be selected').toBeGreaterThan(0);
    for (const name of excelPlots) {
      expect(selected, `Excel plot "${name}" should be selected on Dashboard`).toContain(name);
    }
    const list = this.dropList();
    await expect(list).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });
    for (const name of selected) {
      await expect(list).toContainText(new RegExp(`${this.escapeRegex(name)}(\\s*\\d+)?`, 'i'));
    }
    return selected;
  }

  /** Single plot card (`#card-N`) — never use .or() unions (strict-mode multi-match). */
  private plotTile(plotName: string): Locator {
    return this.plotDashboard
      .locator('[id^="card-"]')
      .filter({ hasText: new RegExp(this.escapeRegex(plotName), 'i') })
      .first();
  }

  async assertTileActions(preferredPlot = 'Surf PRC'): Promise<void> {
    const tile = this.plotTile(preferredPlot);
    await expect(tile).toBeVisible({ timeout: 15_000 });

    // Tile-scoped first; fall back to first-visible page-wide duplicates.
    const refresh =
      (await this.firstVisible(tile.getByRole('button', { name: /Refresh/i }), 2_000)) ??
      (await this.firstVisible(this.page.getByRole('button', { name: /Refresh/i }), 5_000));
    const fullscreen =
      (await this.firstVisible(tile.getByRole('button', { name: /fullscreen/i }), 2_000)) ??
      (await this.firstVisible(this.page.getByRole('button', { name: /fullscreen/i }), 5_000));
    const download =
      (await this.firstVisible(tile.getByRole('button', { name: /download/i }), 2_000)) ??
      (await this.firstVisible(this.page.getByRole('button', { name: /download/i }), 5_000));

    expect(refresh, `${preferredPlot} Refresh`).toBeTruthy();
    expect(fullscreen, `${preferredPlot} fullscreen`).toBeTruthy();
    expect(download, `${preferredPlot} download`).toBeTruthy();
    await expect(refresh!).toBeVisible();
    await expect(fullscreen!).toBeVisible();
    await expect(download!).toBeVisible();
  }

  async exerciseFullscreenOnPlot(plotName: string): Promise<void> {
    const tile = this.plotTile(plotName);
    await expect(tile).toBeVisible({ timeout: 15_000 });

    const enterFs =
      (await this.firstVisible(tile.getByRole('button', { name: /fullscreen/i }), 3_000)) ??
      (await this.firstVisible(this.page.getByRole('button', { name: /fullscreen/i }), 5_000));
    expect(enterFs, `Fullscreen control for ${plotName}`).toBeTruthy();
    await this.click(enterFs!, `Fullscreen ${plotName}`);

    const plotTab = this.page.getByRole('tab').filter({ hasText: plotName });
    if (await this.firstVisible(plotTab, 5_000)) {
      await this.expectAnyVisible(plotTab, `${plotName} tab`);
    } else {
      await expect(this.plotDashboard).toContainText(plotName);
    }

    await this.expectAnyVisible(this.page.getByRole('button', { name: /Refresh/i }), 'Refresh');
    await this.expectAnyVisible(
      this.page.getByRole('button', { name: /fullscreen/i }),
      'fullscreen (active)',
    );
    await this.expectAnyVisible(this.page.getByRole('button', { name: /download/i }), 'download');

    await this.clickFirstVisible(
      this.page.getByRole('button', { name: /fullscreen/i }),
      'Exit fullscreen',
    );
    await this.closeOpenMenus();
  }

  async exerciseSchematicControls(): Promise<void> {
    const btn1d = this.page.getByRole('button', { name: '1D', exact: true });
    const btn2d = this.page.getByRole('button', { name: '2D', exact: true });

    if (!(await this.firstVisible(btn1d, 4_000)) && !(await this.firstVisible(btn2d, 1_000))) {
      logger.info('Schematic 1D/2D controls not found; skipping schematic exercise');
      return;
    }

    if (await this.firstVisible(btn1d, 1_500)) {
      await this.clickFirstVisible(btn1d, 'Schematic 1D');
    }
    if (await this.firstVisible(btn2d, 1_500)) {
      await this.clickFirstVisible(btn2d, 'Schematic 2D');
    }

    const toggleParams = this.page.getByRole('button', { name: /Toggle Show Parameters/i });
    if (await this.firstVisible(toggleParams, 3_000)) {
      await this.clickFirstVisible(toggleParams, 'Toggle Show Parameters');
      const allStages = this.page.getByRole('checkbox', { name: 'All Stages' }).first();
      if (await this.isVisibleQuick(allStages, 2_000)) {
        await allStages.check();
        await expect(this.page.locator('label').filter({ hasText: 'All Stages' }).first()).toBeVisible();
        if (await this.firstVisible(btn1d, 1_000)) {
          await this.clickFirstVisible(btn1d, 'Schematic 1D after All Stages');
        }
        await allStages.uncheck();
      }
      if (await this.firstVisible(toggleParams, 2_000)) {
        await this.clickFirstVisible(toggleParams, 'Close Show Parameters');
      }
    }
  }

  async saveDashboardAs(name: string): Promise<void> {
    await this.closeOpenMenus();
    await expect(this.saveButton).toBeVisible({ timeout: 15_000 });
    await this.click(this.saveButton, 'Save dashboard');
    await expect(this.chartModalLabel).toContainText(/Save Dashboard/i, {
      timeout: TIMEOUTS.SLOW_UI_MS,
    });
    const dialog = this.dialog();
    await expect(dialog).toContainText('Dashboard Name:');
    await expect(dialog.getByRole('button', { name: 'Close' }).first()).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' }).first()).toBeVisible();
    await this.click(this.dashboardNameInput, 'Dashboard Name');
    await this.dashboardNameInput.fill(name);
    await this.click(dialog.getByRole('button', { name: 'Save' }).first(), 'Save dialog');
    await expect(this.sideMenu.getByRole('link', { name, exact: true }).first()).toBeVisible({
      timeout: TIMEOUTS.SLOW_UI_MS,
    });
    logger.info(`Dashboard saved as ${name}`);
  }

  async openSavedDashboard(name: string): Promise<void> {
    await this.openDashboardSection();
    const link = this.sideMenu.getByRole('link', { name, exact: true }).first();
    await expect(link).toBeVisible({ timeout: 15_000 });
    await this.click(link, `Open dashboard ${name}`);
    await this.confirmNavigationIfPrompted();
    await expect(this.plotDashboard).toContainText(name, { timeout: TIMEOUTS.SLOW_UI_MS });
  }

  async renameDashboard(fromName: string, toName: string): Promise<void> {
    await this.closeOpenMenus();
    await this.clickFirstVisible(
      this.page.getByRole('button', { name: /^menu$/i }),
      'Dashboard menu',
    );
    const renameItem = this.page.getByText('Rename', { exact: true }).first();
    await expect(renameItem).toBeVisible({ timeout: 10_000 });
    await this.click(renameItem, 'Rename');
    await expect(this.chartModalLabel).toContainText(/Rename Dashboard/i, {
      timeout: TIMEOUTS.SLOW_UI_MS,
    });
    await this.click(this.dashboardNameInput, 'Dashboard Name');
    await this.dashboardNameInput.fill(toName);
    const renameBtn = this.page.getByRole('button', { name: 'Rename', exact: true }).first();
    await expect(renameBtn).toBeVisible();
    await this.click(renameBtn, 'Confirm rename');
    await expect(this.plotDashboard).toContainText(toName, { timeout: TIMEOUTS.SLOW_UI_MS });
    logger.info(`Dashboard renamed ${fromName} → ${toName}`);
  }

  async createMinimalDashboardAndDelete(name: string): Promise<void> {
    await this.openNewDashboard();
    const schematic = this.plotCheckbox('Schematic');
    await expect(schematic).toBeVisible({ timeout: 15_000 });
    if (!(await schematic.isDisabled().catch(() => false))) {
      await schematic.check();
    }
    await this.saveDashboardAs(name);
    await this.openSavedDashboard(name);

    await this.clickFirstVisible(
      this.page.getByRole('button', { name: /^menu$/i }),
      'Dashboard menu',
    );
    const deleteItem = this.page.getByText('Delete', { exact: true }).first();
    await expect(deleteItem).toBeVisible({ timeout: 10_000 });
    await this.click(deleteItem, 'Delete');
    await expect(this.chartModalLabel).toContainText(/Confirmation/i, {
      timeout: TIMEOUTS.SLOW_UI_MS,
    });
    await expect(this.dialog()).toContainText(
      new RegExp(`Are you sure you want to delete ${this.escapeRegex(name)}\\?`, 'i'),
    );
    await expect(this.page.getByRole('button', { name: 'No' }).first()).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Close' }).first()).toBeVisible();
    await this.click(
      this.page.getByRole('button', { name: 'Yes, Delete' }).first(),
      'Yes, Delete',
    );
    await expect(this.page.getByRole('alert').first()).toContainText(/Deleted successfully/i, {
      timeout: TIMEOUTS.SLOW_UI_MS,
    });
    logger.info(`Dashboard deleted: ${name}`);
  }

  async runDashboardFlow(data: DashboardFlowData): Promise<void> {
    // Unique names avoid collisions with leftover D1/Dashboard1/D2 from prior runs.
    const saveName = this.uniqueName(data.saveName);
    const renameName = this.uniqueName(data.renameName);
    const deleteName = this.uniqueName(data.deleteName);

    await this.openNewDashboard();
    await this.assertNewDashboardChrome();
    await this.toggleRightBarChrome();
    const selected = await this.selectPlots(data);
    const primaryPlot = selected.includes('Surf PRC') ? 'Surf PRC' : selected[0];
    await this.assertTileActions(primaryPlot);
    await this.exerciseFullscreenOnPlot(primaryPlot);
    if (selected.some((name) => /schematic/i.test(name))) {
      await this.exerciseSchematicControls();
    }
    await this.saveDashboardAs(saveName);
    await this.openSavedDashboard(saveName);
    await this.renameDashboard(saveName, renameName);
    await this.createMinimalDashboardAndDelete(deleteName);
    await expect(this.topbar).toContainText('Dashboard');
  }
}

export function createDashboardPage(page: Page): DashboardPage {
  return new DashboardPage(page);
}
