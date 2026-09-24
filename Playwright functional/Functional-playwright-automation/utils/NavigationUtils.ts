import { type Page } from '@playwright/test';
import { URLS } from '../constants/urls';
import { CommonActions } from './CommonActions';
import { openStep } from './stepLabels';
import { step } from './step';
import { WaitUtils } from './WaitUtils';
import { logger } from '../logger';

/**
 * Navigation helpers — goto, tabs, links, breadcrumbs.
 */
export class NavigationUtils {
  private readonly actions: CommonActions;

  constructor(private readonly page: Page) {
    this.actions = new CommonActions(page);
  }

  async goto(
    url: string = URLS.authUrl,
    waitUntil: 'load' | 'domcontentloaded' | 'networkidle' | 'commit' = 'domcontentloaded',
  ): Promise<void> {
    const label = url.includes('linqx.io') ? 'login page' : url;
    await step(openStep(label), async () => {
      await this.page.goto(url, { waitUntil });
      logger.info(`Navigated to: ${url}`);
    });
  }

  async gotoAndWait(
    url: string = URLS.authUrl,
    waitUntil: 'load' | 'domcontentloaded' | 'networkidle' = 'domcontentloaded',
  ): Promise<void> {
    await this.goto(url, waitUntil);
  }

  async clickTab(name: string | RegExp): Promise<void> {
    await this.actions.click(this.page.getByRole('tab', { name }), `${name} tab`);
  }

  async clickLink(name: string | RegExp): Promise<void> {
    await this.actions.click(this.page.getByRole('link', { name }), `${name} link`);
  }

  async clickButton(name: string | RegExp): Promise<void> {
    await this.actions.click(this.page.getByRole('button', { name }), `${name}`);
  }

  async reload(): Promise<void> {
    await step('Reload page', async () => {
      await this.page.reload();
      await WaitUtils.forLoadState(this.page);
    });
  }
}
