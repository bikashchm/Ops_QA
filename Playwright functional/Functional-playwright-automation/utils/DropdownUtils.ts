import { type Locator, type Page } from '@playwright/test';
import { CommonActions } from './CommonActions';
import { ElementUtils } from './ElementUtils';
import { selectStep, humanizeLabel } from './stepLabels';
import { step } from './step';
import { WaitUtils } from './WaitUtils';

/**
 * Dropdown / combobox / ng-select interactions for LivePlus UI.
 */
export class DropdownUtils {
  private readonly actions: CommonActions;
  private readonly elements: ElementUtils;

  constructor(private readonly page: Page) {
    this.actions = new CommonActions(page);
    this.elements = new ElementUtils(page);
  }

  private optionsList(): Locator {
    return this.page.getByLabel('Options list');
  }

  async selectFromOptionsList(value: string, exact = true, fieldLabel?: string): Promise<void> {
    await step(selectStep(value, fieldLabel), async () => {
      const option = this.optionsList().getByText(value, { exact });
      await WaitUtils.untilVisible(option);
      await option.click();
    });
  }

  async selectComboboxOption(value: string, exact = true, fieldLabel?: string): Promise<void> {
    await this.selectFromOptionsList(value, exact, fieldLabel);
  }

  async openNgSelectAndSelect(containerSelector: string, value: string): Promise<void> {
    const field = humanizeLabel(containerSelector.replace('#', ''));
    await this.actions.click(this.elements.ngSelectInput(containerSelector), `${field} dropdown`);
    await this.selectFromOptionsList(value, true, field);
  }

  async openNgSelectDirectAndSelect(containerSelector: string, value: string): Promise<void> {
    const field = humanizeLabel(containerSelector.replace('#', ''));
    await this.actions.click(this.elements.ngSelectInputDirect(containerSelector), `${field} dropdown`);
    await this.selectFromOptionsList(value, true, field);
  }

  /** Open an ng-select Locator (no container id) and pick an option. */
  async openNgSelectLocatorAndSelect(
    ngSelect: Locator,
    value: string,
    fieldLabel = 'dropdown',
  ): Promise<void> {
    const input = ngSelect.locator('.ng-select-container .ng-input input, .ng-input input').first();
    await this.actions.click(input, `${fieldLabel} dropdown`);
    await this.selectFromOptionsList(value, true, fieldLabel);
  }

  async selectRoleOption(name: string | RegExp, exact = false): Promise<void> {
    const option = this.page.getByRole('option', { name, exact });
    await this.actions.click(option, `option ${name.toString()}`);
  }
}
