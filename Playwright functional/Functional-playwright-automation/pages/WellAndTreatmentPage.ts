import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { AssertionUtils } from '../utils/AssertionUtils';
import { step } from '../utils/step';
import { verifyStep } from '../utils/stepLabels';

export interface WellAndTreatmentExpected {
  padName: string;
  wellName: string;
  wellApi: string;
  companyRepresentative?: string;
  latitude?: string;
  longitude?: string;
  elevation?: string;
  kellyBushing?: string;
  fleet?: string;
  vanId?: string;
}

/**
 * Well & Treatment page — General / Location / Additional Info validations
 * using dynamic pad, well, and Well API values from Excel.
 */
export class WellAndTreatmentPage extends BasePage {
  private readonly padNameInput = this.page.locator('#padName');
  private readonly wellNameInput = this.page.locator('#wellName');
  private readonly wellApiInput = this.page.locator('#wellAPI');
  private readonly compRepInput = this.page.locator('#compRepresentative');
  private readonly latitudeInput = this.page.locator('#latitude');
  private readonly longitudeInput = this.page.locator('#longitude');
  private readonly elevationInput = this.page.locator('#elevation');
  private readonly kellyBushingInput = this.page.locator('#kellyBushing');
  private readonly fleetInput = this.page.locator('#fleet');
  private readonly ppVanIdInput = this.page.locator('#ppVanID');
  private readonly accordion = this.page.locator('accordion');
  private readonly subMenuBar = this.page.locator('app-sub-menubar');
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  private readonly nextButton = this.page.getByRole('button', { name: 'Next' });
  private readonly mqttCheckbox = this.page.getByRole('checkbox', { name: 'MQTT' });
  private readonly seismosCheckbox = this.page.getByRole('checkbox', { name: 'Seismos' });

  private headerWellSelect(): Locator {
    const inSubMenu = this.subMenuBar.locator('ng-select').first();
    const byWellLabel = this.page.locator(
      'xpath=//*[normalize-space()="Well:"]/following::ng-select[1]',
    );
    return inSubMenu.or(byWellLabel);
  }

  async openWellAndTreatmentLink(): Promise<void> {
    await this.click(
      this.page.getByRole('link', { name: 'Well & Treatment' }),
      'Well & Treatment',
    );
  }

  /** Dynamic assertions: pad / well / Well API from Excel (written by createwellandpad). */
  async assertGeneralInfoFromExcel(expected: WellAndTreatmentExpected): Promise<void> {
    await step('Verify General Info from Excel pad/well/WellAPI', async () => {
      await AssertionUtils.assertValue(
        this.padNameInput,
        expected.padName,
        `pad name matches Excel "${expected.padName}"`,
      );
      await AssertionUtils.assertValue(
        this.wellNameInput,
        expected.wellName,
        `well name matches Excel "${expected.wellName}"`,
      );
      await this.assertWellApiMatchesExcel(expected.wellApi);
      await AssertionUtils.assertTextContains(
        this.subMenuBar,
        expected.padName,
        `header pad text matches Excel "${expected.padName}"`,
      );
      await AssertionUtils.assertTextContains(
        this.headerWellSelect(),
        expected.wellName,
        `header Well dropdown shows Excel well "${expected.wellName}"`,
      );
      await AssertionUtils.assertValue(
        this.compRepInput,
        expected.companyRepresentative ?? 'Bikash',
        'company representative matches',
      );
    });
  }

  /** Compare Well API ignoring dash formatting (UI may display xx-xxx-xxxxx-xx-xx). */
  async assertWellApiMatchesExcel(expectedWellApi: string): Promise<void> {
    const title = verifyStep(`Well API matches Excel (digits)`);
    await step(title, async () => {
      await expect(this.wellApiInput).toBeVisible();
      const actual = await this.wellApiInput.inputValue();
      const normalize = (value: string) => value.replace(/\D/g, '');
      expect(
        normalize(actual),
        `Well API digits should match Excel. actual="${actual}" expected="${expectedWellApi}"`,
      ).toBe(normalize(expectedWellApi));
    });
  }

  async openLocationSection(): Promise<void> {
    await this.click(this.page.getByRole('button', { name: /Location/ }), 'Location');
  }

  async assertLocationDefaults(expected: WellAndTreatmentExpected): Promise<void> {
    await step('Verify Location field defaults', async () => {
      await AssertionUtils.assertValue(
        this.latitudeInput,
        expected.latitude ?? '34.54354',
        'latitude matches',
      );
      await AssertionUtils.assertValue(
        this.longitudeInput,
        expected.longitude ?? '33.8765',
        'longitude matches',
      );
      await AssertionUtils.assertValue(
        this.elevationInput,
        expected.elevation ?? '4.6',
        'elevation matches',
      );
      await AssertionUtils.assertValue(
        this.kellyBushingInput,
        expected.kellyBushing ?? '4.8',
        'kelly bushing matches',
      );
      await AssertionUtils.assertTextContains(this.accordion, 'Location', 'Location section label');
      await AssertionUtils.assertTextContains(this.accordion, 'Additional Info', 'Additional Info section label');
      await AssertionUtils.assertTextContains(this.accordion, 'General', 'General section label');
    });
  }

  async openAdditionalInfoSection(): Promise<void> {
    await this.click(
      this.page.getByRole('button', { name: /Additional Info/ }),
      'Additional Info',
    );
  }

  async assertFleetAndEnableMqttSeismos(expected: WellAndTreatmentExpected): Promise<void> {
    await step('Verify fleet and enable MQTT / Seismos', async () => {
      await AssertionUtils.assertValue(
        this.fleetInput,
        expected.fleet ?? 'liveplus fleet',
        'fleet matches',
      );
      await this.mqttCheckbox.check();
      await AssertionUtils.assertTextContains(this.accordion, 'MQTT', 'MQTT label visible');
      await AssertionUtils.assertTextContains(this.accordion, 'Seismos', 'Seismos label visible');
      await this.seismosCheckbox.check();
      await AssertionUtils.assertTextContains(this.accordion, 'Van ID', 'Van ID label visible');
    });
  }

  async assertVanIdRequiredThenFill(vanId: string): Promise<void> {
    await step(`Validate Van ID required then fill "${vanId}"`, async () => {
      await this.ppVanIdInput.click();
      await this.ppVanIdInput.fill('');
      await this.click(this.page.getByText('Zipper Group'), 'Zipper Group (blur Van ID)');
      await AssertionUtils.assertTextContains(
        this.accordion,
        'Van ID is required.',
        'Van ID required message',
      );
      await this.fill(this.ppVanIdInput, vanId, 'Van ID');
      await AssertionUtils.assertVisible(this.saveButton, 'Save button visible');
      await AssertionUtils.assertVisible(this.nextButton, 'Next button visible');
    });
  }

  async save(): Promise<void> {
    await this.click(this.saveButton, 'Save');
  }

  async assertVanIdPersisted(vanId: string): Promise<void> {
    await AssertionUtils.assertValue(this.ppVanIdInput, vanId, `Van ID persisted as "${vanId}"`);
  }

  async openTreatmentScheduleThenReturn(): Promise<void> {
    await step('Navigate to Treatment Schedule and back to Well & Treatment', async () => {
      await this.click(
        this.page.getByRole('link', { name: 'Treatment Schedule' }),
        'Treatment Schedule',
      );
      await this.openWellAndTreatmentLink();
    });
  }

  async disableMqttSeismosAndSave(): Promise<void> {
    await step('Uncheck MQTT / Seismos and save', async () => {
      await this.openAdditionalInfoSection();
      await this.mqttCheckbox.uncheck();
      await this.seismosCheckbox.uncheck();
      await this.save();
    });
  }
}

export function createWellAndTreatmentPage(page: Page): WellAndTreatmentPage {
  return new WellAndTreatmentPage(page);
}
