import { type Locator, type Page } from '@playwright/test';
import { CommonActions } from '../utils/CommonActions';
import { DropdownUtils } from '../utils/DropdownUtils';
import { NavigationUtils } from '../utils/NavigationUtils';
import { PopupUtils } from '../utils/PopupUtils';
import { WaitUtils } from '../utils/WaitUtils';

/**
 * Abstract base for all Page Objects (POM).
 * Page classes hold locators + screen-level workflows only.
 */
export abstract class BasePage {
  protected readonly actions: CommonActions;
  protected readonly dropdown: DropdownUtils;
  protected readonly navigation: NavigationUtils;
  protected readonly popup: PopupUtils;

  constructor(protected readonly page: Page) {
    this.actions = new CommonActions(page);
    this.dropdown = new DropdownUtils(page);
    this.navigation = new NavigationUtils(page);
    this.popup = new PopupUtils(page);
  }

  protected async click(locator: Locator, label?: string): Promise<void> {
    await this.actions.click(locator, label);
  }

  protected async dblclick(locator: Locator, label?: string): Promise<void> {
    await this.actions.dblclick(locator, label);
  }

  protected async fill(locator: Locator, value: string, label?: string): Promise<void> {
    await this.actions.fill(locator, value, label);
  }

  /** Fast fill for grid/HOT editors — still a named report step. */
  protected async fillFast(locator: Locator, value: string, label?: string): Promise<void> {
    await this.actions.fillFast(locator, value, label);
  }

  protected async waitForVisible(locator: Locator, timeoutMs?: number): Promise<void> {
    await WaitUtils.untilVisible(locator, timeoutMs);
  }

  protected async selectFromOptionsList(value: string): Promise<void> {
    await this.dropdown.selectFromOptionsList(value);
  }
}
