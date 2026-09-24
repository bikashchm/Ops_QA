import { expect, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { BasePage } from '../base/BasePage';
import { AssertionUtils } from '../utils/AssertionUtils';
import { step } from '../utils/step';
import { WaitUtils } from '../utils/WaitUtils';

const FIELD_WAIT_MS = 20_000;

/**
 * Wellbore Configuration → Schematic (1D / 2D) chrome verification.
 * Codegen-aligned; empty aria snapshots omitted in favor of visible-button asserts.
 */
export class Schematic2DPage extends BasePage {
  private readonly wellboreLink = this.page.getByRole('link', { name: 'Wellbore Configuration' });
  private readonly schematicButton = this.page.getByRole('button', { name: /Schematic/i });
  private readonly button2D = this.page.getByRole('button', { name: '2D', exact: true });
  private readonly button1D = this.page.getByRole('button', { name: '1D', exact: true });
  private readonly refreshButton = this.page.getByRole('button', { name: 'refresh' });
  private readonly fullScreenButton = this.page.getByRole('button', {
    name: /full screen|Full Screen/i,
  });
  private readonly closeButton = this.page.getByRole('button', { name: 'close', exact: true });
  private readonly exitScreenButton = this.page.getByRole('button', { name: /Exit screen/i });
  private readonly plotParameterButton = this.page.getByRole('button', {
    name: 'plot-parameter-active',
  });
  private readonly allStagesCheckbox = this.page.getByRole('checkbox', { name: 'All Stages' });
  private readonly tabset = this.page.locator('tabset');

  async openWellboreConfiguration(): Promise<void> {
    await step('Open Wellbore Configuration', async () => {
      await WaitUtils.untilVisible(this.wellboreLink, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.wellboreLink, 'Wellbore Configuration');
      await WaitUtils.untilVisible(this.schematicButton, TIMEOUTS.SLOW_UI_MS);
    });
  }

  async openSchematicPanel(): Promise<void> {
    await step('Open Schematic panel', async () => {
      await this.click(this.schematicButton.first(), 'Schematic');
      await WaitUtils.untilVisible(this.button2D, FIELD_WAIT_MS);
      await WaitUtils.untilVisible(this.button1D, FIELD_WAIT_MS);
    });
  }

  async verifySchematicChrome(): Promise<void> {
    await step('Verify Schematic chrome (2D / 1D / refresh / Full Screen / close)', async () => {
      await AssertionUtils.assertVisible(this.button2D, '2D');
      await AssertionUtils.assertVisible(this.button1D, '1D');
      await AssertionUtils.assertTextContains(this.tabset, 'Schematic:');
      await AssertionUtils.assertVisible(this.refreshButton.first(), 'refresh');
      await AssertionUtils.assertVisible(this.fullScreenButton.first(), 'Full Screen');
      await AssertionUtils.assertVisible(this.closeButton.first(), 'close');
    });
  }

  async verifyFullscreenChrome(): Promise<void> {
    await step('Verify fullscreen chrome', async () => {
      await AssertionUtils.assertVisible(this.plotParameterButton.first(), 'plot-parameter-active');
      await AssertionUtils.assertVisible(this.refreshButton.first(), 'refresh');
      await AssertionUtils.assertVisible(this.exitScreenButton.first(), 'Exit screen');
    });
  }

  private async togglePlotParameterTwice(): Promise<void> {
    await step('Toggle plot-parameter-active twice', async () => {
      const btn = this.plotParameterButton.first();
      await WaitUtils.untilVisible(btn, FIELD_WAIT_MS);
      await this.click(btn, 'plot-parameter-active');
      await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
      await this.click(btn, 'plot-parameter-active (again)');
      await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
    });
  }

  async run1DFullscreenFlow(): Promise<void> {
    await step('1D → Full Screen → All Stages → plot param → Exit', async () => {
      await this.click(this.button1D, '1D');
      await this.click(this.fullScreenButton.first(), 'Full Screen');

      await WaitUtils.untilVisible(this.allStagesCheckbox, FIELD_WAIT_MS);
      await this.allStagesCheckbox.check({ force: true });
      await expect(this.allStagesCheckbox).toBeChecked({ timeout: FIELD_WAIT_MS });

      await this.verifyFullscreenChrome();
      await this.togglePlotParameterTwice();

      await this.click(this.exitScreenButton.first(), 'Exit screen');
      await WaitUtils.untilVisible(this.button1D, FIELD_WAIT_MS);
    });
  }

  async run2DFullscreenFlow(): Promise<void> {
    await step('2D → Full Screen → plot param → Exit', async () => {
      await this.click(this.button2D, '2D');
      await this.click(this.fullScreenButton.first(), 'Full Screen');

      await this.verifyFullscreenChrome();
      await this.togglePlotParameterTwice();

      await this.click(this.exitScreenButton.first(), 'Exit screen');
      await WaitUtils.untilVisible(this.button2D, FIELD_WAIT_MS);
    });
  }

  async closeSchematicPanel(): Promise<void> {
    await step('Close Schematic panel', async () => {
      // Codegen toggles Schematic button again to dismiss
      await this.click(this.schematicButton.first(), 'Schematic (close)');
      await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
    });
  }

  async runSchematic2DFlow(): Promise<void> {
    await this.openWellboreConfiguration();
    await this.openSchematicPanel();
    await this.verifySchematicChrome();
    await this.run1DFullscreenFlow();
    await this.run2DFullscreenFlow();
    await this.closeSchematicPanel();
  }
}

export function createSchematic2DPage(page: Page): Schematic2DPage {
  return new Schematic2DPage(page);
}
