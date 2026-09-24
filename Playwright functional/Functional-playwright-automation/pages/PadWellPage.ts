import { type Locator, type Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { AssertionUtils } from '../utils/AssertionUtils';
import { step } from '../utils/step';
import { clickStep, waitStep } from '../utils/stepLabels';
import { WaitUtils } from '../utils/WaitUtils';

export interface PadWellFormData {
  padName: string;
  wellName: string;
  wellApi14Digits: string;
  prospect?: string;
  operator?: string;
  compRepresentative?: string;
  serviceCompany?: string;
  supervisor?: string;
  treatmentAnalyst?: string;
  latitude?: string;
  longitude?: string;
  elevation?: string;
  kellyBushing?: string;
  country?: string;
  zipperGroup?: string;
  landingPoint?: string;
  fleet?: string;
  tag?: string;
  afe?: string;
}

export interface PadWellVerificationData {
  padName: string;
  wellName: string;
  prospect: string;
  /** Company Name dropdown (#operatorCompany) */
  operator: string;
  /** Service Company Name dropdown (#serviceCompany) */
  serviceCompany: string;
  compRepresentative: string;
  supervisor: string;
  treatmentAnalyst: string;
}

/**
 * Pad & Well creation page object — encapsulates all locators and form actions.
 */
export class PadWellPage extends BasePage {
  private readonly newPadButton = this.page.getByRole('button', { name: /New Pad/ });
  private readonly padNameInput = this.page.locator('#padName');
  private readonly prospectInput = this.page.locator('#prospect');
  private readonly wellNameInput = this.page.locator('#wellName');
  private readonly wellApiInput = this.page.locator('#wellAPI');
  private readonly compRepInput = this.page.locator('#compRepresentative');
  private readonly supervisorInput = this.page.locator('#supervisor');
  private readonly treatmentAnalystInput = this.page.locator('#treatmentAnalyst');
  private readonly latitudeInput = this.page.locator('#latitude');
  private readonly longitudeInput = this.page.locator('#longitude');
  private readonly elevationInput = this.page.locator('#elevation');
  private readonly kellyBushingInput = this.page.locator('#kellyBushing');
  private readonly zipperGroupInput = this.page.locator('#zipperGroup');
  private readonly landingPointInput = this.page.locator('#landingPoint');
  private readonly fleetInput = this.page.locator('#fleet');
  private readonly tagInput = this.page.locator('#tag');
  private readonly afeInput = this.page.locator('#afe');
  private readonly layoutWrapper = this.page.locator('#layout-wrapper');
  private readonly operatorCompany = this.page.locator('#operatorCompany');
  private readonly serviceCompany = this.page.locator('#serviceCompany');
  private readonly subMenuBar = this.page.locator('app-sub-menubar');

  /**
   * Header Well dropdown (ng-select) next to Pad text.
   * UI change: Well used to be plain text; created wells now populate this dropdown.
   */
  private headerWellSelect(): Locator {
    const inSubMenu = this.subMenuBar.locator('ng-select').first();
    const byWellLabel = this.page.locator(
      'xpath=//*[normalize-space()="Well:"]/following::ng-select[1]',
    );
    return inSubMenu.or(byWellLabel);
  }

  async clickNewPad(): Promise<void> {
    await this.click(this.newPadButton, 'New Pad');
  }

  async fillGeneralInfo(data: PadWellFormData): Promise<void> {
    await step('Fill pad and well general info', async () => {
      await this.fill(this.padNameInput, data.padName, 'pad name');
      await this.fill(this.prospectInput, data.prospect ?? 'live plus field', 'prospect');
      await this.fill(this.wellNameInput, data.wellName, 'well name');
      await this.fill(this.wellApiInput, data.wellApi14Digits, 'well API number');

      // Company Name * (staging: Centennial Resources — distinct from Service Company)
      await this.dropdown.openNgSelectAndSelect(
        '#operatorCompany',
        data.operator ?? 'QA Operator',
      );
      await this.fill(this.compRepInput, data.compRepresentative ?? 'Bikash', 'company representative');

      // Service Company Name (UAT: QA service)
      await this.dropdown.openNgSelectDirectAndSelect(
        '#serviceCompany',
        data.serviceCompany ?? 'QA service',
      );
      await this.fill(this.supervisorInput, data.supervisor ?? 'Kumar', 'supervisor');
      await this.fill(this.treatmentAnalystInput, data.treatmentAnalyst ?? 'Bikash', 'treatment analyst');
    });
  }

  async fillLocationInfo(data: PadWellFormData): Promise<void> {
    await step('Fill location details', async () => {
      await this.click(this.page.getByRole('button', { name: /Location/ }), 'Location tab');
      await this.fill(this.latitudeInput, data.latitude ?? '34.54354', 'latitude');
      await this.fill(this.longitudeInput, data.longitude ?? '33.8765', 'longitude');
      await this.fill(this.elevationInput, data.elevation ?? '4.6', 'elevation');
      await this.fill(this.kellyBushingInput, data.kellyBushing ?? '4.8', 'kelly bushing');

      await this.dropdown.openNgSelectDirectAndSelect(
        '#country',
        data.country ?? 'United States',
      );
    });
  }

  async fillAdditionalInfo(data: PadWellFormData): Promise<void> {
    await step('Fill additional info', async () => {
      await this.click(this.page.getByRole('button', { name: /Additional Info/ }), 'Additional Info tab');
      await this.fill(this.zipperGroupInput, data.zipperGroup ?? 'Z343', 'zipper group');
      await this.fill(this.landingPointInput, data.landingPoint ?? 'g453', 'landing point');
      await this.fill(this.fleetInput, data.fleet ?? 'liveplus fleet', 'fleet');
      await this.fill(this.tagInput, data.tag ?? 'W343', 'tag');
      await this.fill(this.afeInput, data.afe ?? 'AFE45', 'AFE number');
    });
  }

  async save(): Promise<void> {
    await this.click(this.page.getByRole('button', { name: 'Save' }), 'Save pad and well');
  }

  async createPadAndWell(data: PadWellFormData): Promise<void> {
    await this.clickNewPad();
    await this.fillGeneralInfo(data);
    await this.fillLocationInfo(data);
    await this.fillAdditionalInfo(data);
    await this.save();
  }

  async verifySavedOnDashboard(padName: string, wellName: string): Promise<void> {
    await step('Verify pad and well saved on dashboard', async () => {
      await AssertionUtils.assertVisible(
        this.page.getByRole('heading', { name: 'Well & Treatment' }),
        'Well & Treatment heading is visible',
      );

      // Pad name remains plain text in the header
      await AssertionUtils.assertTextContains(
        this.layoutWrapper,
        padName,
        `pad "${padName}" is shown as text`,
      );
      await AssertionUtils.assertTextContains(
        this.layoutWrapper,
        `Pad: ${padName}`,
        `header shows "Pad: ${padName}"`,
      );

      // Well name is now a header dropdown — created well must appear there
      await this.assertWellInHeaderDropdown(wellName);
    });
  }

  /** Assert the header Well ng-select is visible and contains the created well. */
  async assertWellInHeaderDropdown(wellName: string): Promise<void> {
    await step(`Verify well "${wellName}" in Well dropdown`, async () => {
      const wellSelect = this.headerWellSelect();
      await AssertionUtils.assertVisible(wellSelect, 'Well dropdown is visible');

      const selectedValue = wellSelect.locator('.ng-value, .ellipses-text').filter({ hasText: wellName });
      if ((await selectedValue.count()) > 0) {
        await AssertionUtils.assertTextContains(
          wellSelect,
          wellName,
          `Well dropdown shows created well "${wellName}"`,
        );
        return;
      }

      // Not selected yet — open options and assert the created well is listed
      const input = wellSelect.locator('.ng-select-container .ng-input input, .ng-input input').first();
      await this.click(input, 'Well dropdown');
      await AssertionUtils.assertVisible(
        this.page.getByLabel('Options list').getByText(wellName, { exact: true }),
        `well "${wellName}" is listed in Well dropdown options`,
      );
      await this.page.keyboard.press('Escape');
    });
  }

  async selectWellFromHeaderDropdown(wellName: string): Promise<void> {
    await step(`Select well "${wellName}" from Well dropdown`, async () => {
      await this.dropdown.openNgSelectLocatorAndSelect(
        this.headerWellSelect(),
        wellName,
        'Well',
      );
      await this.assertWellInHeaderDropdown(wellName);
    });
  }

  async openSavedPadAndWell(padName: string, wellName: string): Promise<void> {
    await step(`Open saved pad "${padName}" and well "${wellName}"`, async () => {
      // Pad name remains clickable text (header "Pad: {name}")
      await this.click(this.layoutWrapper.getByText(padName).first(), `pad "${padName}"`);
      // Well name is now selected from the header dropdown
      await this.selectWellFromHeaderDropdown(wellName);
    });
  }

  async verifyFormValues(expected: PadWellVerificationData): Promise<void> {
    await step('Verify saved pad and well form values', async () => {
      await AssertionUtils.assertValue(this.padNameInput, expected.padName, 'pad name matches');
      await AssertionUtils.assertValue(this.prospectInput, expected.prospect, 'prospect matches');
      await AssertionUtils.assertValue(this.wellNameInput, expected.wellName, 'well name matches');
      await AssertionUtils.assertTextContains(
        this.operatorCompany,
        expected.operator,
        `Company Name matches "${expected.operator}"`,
      );
      await AssertionUtils.assertTextContains(
        this.serviceCompany,
        expected.serviceCompany,
        `Service Company Name matches "${expected.serviceCompany}"`,
      );
      await AssertionUtils.assertValue(
        this.compRepInput,
        expected.compRepresentative,
        'company representative matches',
      );
      await AssertionUtils.assertValue(this.supervisorInput, expected.supervisor, 'supervisor matches');
      await AssertionUtils.assertValue(
        this.treatmentAnalystInput,
        expected.treatmentAnalyst,
        'treatment analyst matches',
      );
    });
  }
}

export function createPadWellPage(page: Page): PadWellPage {
  return new PadWellPage(page);
}
