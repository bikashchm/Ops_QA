import { type Page, type TestInfo } from '@playwright/test';
import { getEnvironmentConfig } from '../config/environment';
import { LogHelper } from '../logger/LogHelper';
import { AssertionUtils } from '../utils/AssertionUtils';
import { BrowserManager } from '../utils/BrowserManager';
import { CommonActions } from '../utils/CommonActions';
import { DropdownUtils } from '../utils/DropdownUtils';
import { ElementUtils } from '../utils/ElementUtils';
import { NavigationUtils } from '../utils/NavigationUtils';
import { PopupUtils } from '../utils/PopupUtils';
import { RetryUtils } from '../utils/RetryUtils';
import { ScreenshotUtils } from '../utils/ScreenshotUtils';
import { TableUtils } from '../utils/TableUtils';
import { ToastUtils } from '../utils/ToastUtils';
import { WaitUtils } from '../utils/WaitUtils';

/**
 * Central test context — aggregates all framework utilities.
 * Playwright equivalent of a TestNG base test class via fixtures.
 */
export class BaseTest {
  readonly browser: BrowserManager;
  readonly actions: CommonActions;
  readonly wait: typeof WaitUtils;
  readonly dropdown: DropdownUtils;
  readonly table: TableUtils;
  readonly toast: ToastUtils;
  readonly screenshot: ScreenshotUtils;
  readonly navigation: NavigationUtils;
  readonly popup: PopupUtils;
  readonly element: ElementUtils;
  readonly assert: typeof AssertionUtils;
  readonly retry: typeof RetryUtils;

  constructor(
    readonly page: Page,
    private readonly testInfo?: TestInfo,
  ) {
    this.browser = new BrowserManager(page);
    this.actions = new CommonActions(page);
    this.wait = WaitUtils;
    this.dropdown = new DropdownUtils(page);
    this.table = new TableUtils(page);
    this.toast = new ToastUtils(page);
    this.screenshot = new ScreenshotUtils(page, testInfo);
    this.navigation = new NavigationUtils(page);
    this.popup = new PopupUtils(page);
    this.element = new ElementUtils(page);
    this.assert = AssertionUtils;
    this.retry = RetryUtils;
  }

  async setup(): Promise<void> {
    await this.browser.maximize();
    const env = getEnvironmentConfig();
    LogHelper.logStep('BaseTest setup', {
      environment: env.name,
      test: this.testInfo?.title ?? 'n/a',
    });
  }

  async captureFailureScreenshot(): Promise<void> {
    if (this.testInfo) {
      await this.screenshot.captureOnFailure(this.testInfo);
    }
  }
}
