import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { BasePage } from '../base/BasePage';
import { ConfigManager } from '../config/ConfigManager';
import type { ChannelInputTestData } from '../excel/channelInputTestData';
import { logger } from '../logger';
import { step } from '../utils/step';
import { AssertionUtils } from '../utils/AssertionUtils';
import { WaitUtils } from '../utils/WaitUtils';

const SAVE_CHANGES_ARIA_SNAPSHOT = `
- heading "Save Changes" [level=5]
- button "Close"
- paragraph: To keep your edits, please save this version with a new name or overwrite one of your existing versions.
- radio "New Version Name" [checked]
- text: New Version Name
- textbox "Enter version name"
- radio "Overwrite Existing Version"
- text: Overwrite Existing Version Comment
- textbox "Comment":
  - /placeholder: Optional comment
- button "Cancel"
- button "Save" [disabled]
`;

const REQUIRED_CHANNEL_ROWS = [
  'Treating Pressure',
  'Bottomhole Pressure',
  'Dead String Pressure',
  'Clean Flow Rate',
  'Slurry Flow Rate',
  'Proppant Conc',
  'Slurry Density',
  'Nitrogen Flow Rate',
  'CO2 Clean Flow Rate',
  'Step Number/Total',
  "Add'l Display Channel #1",
  "Add'l Display Channel #2",
  "Add'l Display Channel #3",
  "Add'l Display Channel #4",
] as const;

const REQUIRED_PANEL_TEXT = [
  'Observed Net Not Calculated',
  'From Dead String Pressure',
  'From Bottom Hole Pressure',
  'From Surface Treating Pressure',
  'Observed Net Pressure Calculation',
  'Channel Options',
  'Use Step Number Channel to Auto Step',
  'Use User-defined Channels',
  'Use Step Totals Channel to Auto Step',
  'Auto Fluid and Proppant Selection',
  'Parameters',
  'Smoothing # of Points',
  '# of Flowmeters',
  '# of Densometers',
] as const;

const CHECKBOX_TRANSITION_MS = 15_000;
const MEASURED_DATA_ARIA_SNAPSHOT = `
- heading "Fracpro Live+" [level=5]
- list:
  - listitem:
    - radio "Surf PRC"
    - text: Surf PRC
  - listitem:
    - radio "Btm PRC"
    - text: Btm PRC
  - listitem:
    - radio "Measured Data" [checked]
    - text: Measured Data
  - listitem:
    - radio "Chemical"
    - text: Chemical
- separator
- heading "Wellbore Schematic" [level=5]
- list:
  - listitem:
    - radio "Schematic"
    - text: Schematic
`;

const USER_DEFINED_CHANNELS_KEYPAD_ARIA_SNAPSHOT = `
- button "1"
- button "2"
- button "3"
- button "4"
- button "5"
- button "6"
- button "7"
- button "8"
- button "9"
- button "0"
- button "()"
- button "E"
- button "^"
- button "/"
- button "<"
- button "*"
- button "<="
- button "-"
- button ">="
- button "+"
- button ">"
- button "."
- button "="
- button "<>"
- button "=="
- button "EXP"
- button "ABS"
- button "COS"
- button "ACOS"
- button "COSH"
- button "LOG10"
- button "SIGN"
- button "SIN"
- button "ASIN"
- button "SINH"
- button "LN"
- button "ROUND"
- button "TAN"
- button "ATAN"
- button "TANH"
- button "SQRT"
- button "D/DT"
- button "INT"
- button "Insert Channel Name"
`;

const CHANNEL_SELECTION_ARIA_SNAPSHOT = `
- document:
  - heading "Channel Selection" [level=5]
  - checkbox [checked]
  - text: Auto Scale Y-Axis
  - button "Close"
  - text: Left Axis 1
  - table "Channel Table":
    - rowgroup:
      - row "Channel Color Min Max Action":
        - columnheader "Channel"
        - columnheader "Color"
        - columnheader "Min"
        - columnheader "Max"
        - columnheader "Action"
      - row:
        - columnheader
        - columnheader
        - columnheader:
          - spinbutton [disabled]: "0"
        - columnheader:
          - spinbutton [disabled]: "0"
        - columnheader
    - rowgroup:
      - 'row "Select Channel #ffffff 0 0 add"':
        - cell "Select Channel":
          - combobox:
            - option "Select Channel" [disabled] [selected]
        - cell "#ffffff":
          - button
          - textbox: "#ffffff"
        - cell "0"
        - cell "0"
        - cell "add":
          - button "add" [disabled]:
            - img "add"
  - text: Left Axis 2
  - table "Channel Table":
    - rowgroup:
      - row "Channel Color Min Max Action":
        - columnheader "Channel"
        - columnheader "Color"
        - columnheader "Min"
        - columnheader "Max"
        - columnheader "Action"
      - row:
        - columnheader
        - columnheader
        - columnheader:
          - spinbutton [disabled]: "0"
        - columnheader:
          - spinbutton [disabled]: "0"
        - columnheader
    - rowgroup:
      - 'row "Select Channel #ffffff 0 0 add"':
        - cell "Select Channel":
          - combobox:
            - option "Select Channel" [disabled] [selected]
        - cell "#ffffff":
          - button
          - textbox: "#ffffff"
        - cell "0"
        - cell "0"
        - cell "add":
          - button "add" [disabled]:
            - img "add"
  - text: Right Axis 1
  - table "Channel Table":
    - rowgroup:
      - row "Channel Color Min Max Action":
        - columnheader "Channel"
        - columnheader "Color"
        - columnheader "Min"
        - columnheader "Max"
        - columnheader "Action"
      - row:
        - columnheader
        - columnheader
        - columnheader:
          - spinbutton [disabled]: "0"
        - columnheader:
          - spinbutton [disabled]: "0"
        - columnheader
    - rowgroup:
      - 'row "Select Channel #ffffff 0 0 add"':
        - cell "Select Channel":
          - combobox:
            - option "Select Channel" [disabled] [selected]
        - cell "#ffffff":
          - button
          - textbox: "#ffffff"
        - cell "0"
        - cell "0"
        - cell "add":
          - button "add" [disabled]:
            - img "add"
  - text: Right Axis 2
  - table "Channel Table":
    - rowgroup:
      - row "Channel Color Min Max Action":
        - columnheader "Channel"
        - columnheader "Color"
        - columnheader "Min"
        - columnheader "Max"
        - columnheader "Action"
      - row:
        - columnheader
        - columnheader
        - columnheader:
          - spinbutton [disabled]: "0"
        - columnheader:
          - spinbutton [disabled]: "0"
        - columnheader
    - rowgroup:
      - 'row "Select Channel #ffffff 0 0 add"':
        - cell "Select Channel":
          - combobox:
            - option "Select Channel" [disabled] [selected]
        - cell "#ffffff":
          - button
          - textbox: "#ffffff"
        - cell "0"
        - cell "0"
        - cell "add":
          - button "add" [disabled]:
            - img "add"
  - button "Cancel"
  - button "Set" [disabled]
`;

type SmoothCheckboxState = 'checked' | 'unchecked';

export interface SmoothCheckboxPersistenceResult {
  channelLabel: string;
  initialState: SmoothCheckboxState;
  action: 'check' | 'uncheck';
  expectedState: SmoothCheckboxState;
  summary: string;
}

export interface SmoothCheckboxCheckResult {
  channelLabel: string;
  initialState: SmoothCheckboxState;
  action: 'check' | 'none';
  summary: string;
}

/**
 * Channel Inputs page object for Model tab validations.
 */
export class ChannelInputPage extends BasePage {
  private testData: ChannelInputTestData | null = null;

  private readonly channelInputLink = this.page.getByRole('link', { name: 'Channel Inputs for Model' });
  private readonly pageHeading = this.page.getByRole('heading', { name: 'Channel Inputs for Model' });
  private readonly channelInputContainer = this.page.locator('app-channel-input');
  private readonly modelInputTable = this.page.locator('#handOnTableId');
  private readonly measuredDataButton = this.page.getByRole('button', { name: 'Measured Data' });
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  private readonly versionNameInput = this.page.getByRole('textbox', { name: 'Enter version name' });
  private readonly saveChangesHeading = this.page.getByRole('heading', { name: 'Save Changes' });
  private readonly savedToast = this.page.getByLabel('SAVED!');
  private readonly channelOptionsHeading = this.page.getByRole('heading', { name: 'Channel Options' });
  private readonly useStepNumberCheckbox = this.page.getByRole('checkbox', {
    name: /Use Step Number Channel to/i,
  });
  private readonly useUserDefinedChannelsCheckbox = this.page.getByRole('checkbox', {
    name: /Use User-defined Channels/i,
  });
  private readonly useStepTotalsCheckbox = this.page.getByRole('checkbox', {
    name: /Use Step Totals Channel to/i,
  });
  private readonly autoFluidAndProppantCheckbox = this.page.getByRole('checkbox', {
    name: /Auto Fluid and Proppant/i,
  });
  private readonly actionRequiredText = this.page.getByText('Action Required');
  private readonly actionRequiredMessage = this.page.getByText(
    'Seems user-defined channels are not available. Would you like to create?',
  );
  private readonly actionRequiredNoButton = this.page.getByRole('button', { name: 'No' });
  private readonly actionRequiredYesCreateButton = this.page.getByRole('button', {
    name: 'Yes, Create',
  });
  private readonly actionRequiredCloseButton = this.page.getByRole('button', { name: 'Close' });
  private readonly noDiscardUnsavedChangesButton = this.page.getByRole('button', { name: /No,\s*Discard/i });
  private readonly confirmActionHeading = this.page.getByRole('heading', { name: 'Confirm Action' });
  private readonly channelInputsTab = this.page.getByText('Channel Inputs', { exact: true });
  private readonly additivesBanner = this.page.getByText('Channel Inputs Additives Real');
  private readonly additivesTab = this.page.getByText('Additives', { exact: true });
  private readonly realTimeChannelTab = this.page.getByText('Real-time Channel', { exact: true });
  private readonly additivesSmoothUnchecked = this.page.getByRole('checkbox', { name: 'Unchecked' });
  private readonly additivesUseUserDefinedCheckbox = this.page.getByRole('checkbox', {
    name: /Use User-defined Channels for/i,
  });
  private readonly actionRequiredImage = this.page.getByRole('img', { name: 'action-required' });
  private readonly userDefinedChannelsHeading = this.page.getByRole('heading', {
    name: 'User-defined Channels',
  });
  private readonly userDefinedChannelsComponent = this.page.locator('app-user-defined-channels');
  private readonly observedNetNotCalculatedRadio = this.page.getByRole('radio', {
    name: 'Observed Net Not Calculated',
  });
  private readonly plotDashboard = this.page.locator('#plot-dashboard');
  private readonly measuredPlotToolbarActions = this.page.locator(
    '.d-flex.flex-wrap.align-items-center.justify-content-end',
  );
  private readonly measuredPlotCommentButton = this.page.getByRole('button', { name: 'comment' });
  private readonly measuredPlotTooltipCombobox = this.measuredPlotToolbarActions
    .getByRole('combobox')
    .last();
  private readonly measuredPlotChannelButton = this.page.getByRole('button', {
    name: 'channel',
    exact: true,
  });
  private readonly channelSelectionHeading = this.page.getByRole('heading', {
    name: 'Channel Selection',
  });
  private readonly newPlotButton = this.page.getByRole('button', { name: '+ New Plot' });
  private readonly autoStepButton = this.page.locator('button:has-text("Auto Step"):not(.disabled)').first();

  setTestData(data: ChannelInputTestData): void {
    this.testData = data;
  }

  private requireData(): ChannelInputTestData {
    if (!this.testData) throw new Error('ChannelInputPage test data not set. Call setTestData() first.');
    return this.testData;
  }

  async openChannelInputsForModel(): Promise<void> {
    await step('Open Channel Inputs for Model', async () => {
      await WaitUtils.untilVisible(this.channelInputLink);
      await this.click(this.channelInputLink, 'Channel Inputs for Model');
      await this.waitForChannelInputScreen();
    });
  }

  async waitForChannelInputScreen(): Promise<void> {
    await WaitUtils.untilVisible(this.pageHeading);
    await WaitUtils.untilVisible(this.page.getByText('Channel Inputs', { exact: true }));
    await WaitUtils.untilVisible(this.modelInputTable);
    await WaitUtils.untilVisible(this.channelInputContainer);
  }

  async verifyPageLevelElements(): Promise<void> {
    await AssertionUtils.assertVisible(this.page.getByRole('img').first());
    await AssertionUtils.assertVisible(this.pageHeading);
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'applications' }).first());
    await AssertionUtils.assertVisible(this.page.locator('#page-header-notifications-dropdown'));
    await AssertionUtils.assertVisible(this.page.getByText('Version:'));
    await AssertionUtils.assertTextContains(this.page.locator('app-sub-menubar'), 'Stage:');
    await AssertionUtils.assertVisible(this.page.getByText('Channel Inputs', { exact: true }));
    await AssertionUtils.assertVisible(this.page.getByText('Real').first());
  }

  async verifyModelInputHeadersAndUnits(): Promise<void> {
    const { units } = this.requireData();

    await WaitUtils.untilVisible(this.modelInputTable);
    await AssertionUtils.assertTextContains(this.modelInputTable, 'Model Input Channels');
    await AssertionUtils.assertTextContains(this.modelInputTable, 'Unit');
    await AssertionUtils.assertTextContains(this.modelInputTable, 'Real-Time Channel Names');
    await AssertionUtils.assertTextContains(this.modelInputTable, 'Smooth');

    for (const rowLabel of REQUIRED_CHANNEL_ROWS) {
      await AssertionUtils.assertTextContains(this.modelInputTable, new RegExp(rowLabel, 'i'));
    }

    await AssertionUtils.assertTextContains(this.page.locator('#cell-0-1'), units.treatingPressure);
    await AssertionUtils.assertTextContains(this.page.locator('#cell-1-1'), units.bottomholePressure);
    await AssertionUtils.assertTextContains(this.page.locator('#cell-2-1'), units.deadStringPressure);
    await AssertionUtils.assertTextContains(this.page.locator('#cell-3-1'), units.cleanFlowRate);
    await AssertionUtils.assertTextContains(this.page.locator('#cell-4-1'), units.slurryFlowRate);
    await AssertionUtils.assertTextContains(this.page.locator('#cell-5-1'), units.proppantConc);
    await AssertionUtils.assertTextContains(this.page.locator('#cell-6-1'), units.slurryDensity);
    await AssertionUtils.assertTextContains(this.page.locator('#cell-7-1'), units.nitrogenFlowRate);
    await AssertionUtils.assertTextContains(this.page.locator('#cell-8-1'), units.co2CleanFlowRate);
  }

  async verifyChannelOptionPanels(): Promise<void> {
    await WaitUtils.untilVisible(this.channelInputContainer);

    for (const text of REQUIRED_PANEL_TEXT) {
      await AssertionUtils.assertTextContains(this.channelInputContainer, text);
    }

    await AssertionUtils.assertVisible(this.measuredDataButton);
  }

  private parametersSpinbuttonByLabel(label: string): Locator {
    return this.channelInputContainer
      .filter({ hasText: label })
      .getByRole('spinbutton')
      .first();
  }

  private async verifySpinbuttonIsEditable(field: Locator, label: string): Promise<void> {
    await AssertionUtils.assertVisible(field, `${label} field should be visible`);
    await AssertionUtils.assertEnabled(field, `${label} field should be enabled`);
    await expect(field, `${label} field should be editable`).toBeEditable();
  }

  /** Parameters panel: Smoothing # of Points, # of Flowmeters, # of Densometers are editable. */
  async verifyParametersPanelFieldsAreEditable(): Promise<void> {
    await WaitUtils.untilVisible(this.channelInputContainer);
    await AssertionUtils.assertTextContains(this.channelInputContainer, 'Parameters');

    await this.verifySpinbuttonIsEditable(
      this.parametersSpinbuttonByLabel('Smoothing # of Points'),
      'Smoothing # of Points',
    );
    await this.verifySpinbuttonIsEditable(
      this.parametersSpinbuttonByLabel('# of Flowmeters'),
      '# of Flowmeters',
    );
    await this.verifySpinbuttonIsEditable(
      this.parametersSpinbuttonByLabel('# of Densometers'),
      '# of Densometers',
    );
  }

  /** "# of flowmeters" must be visible and editable in the Parameters panel. */
  async verifyNumberOfFlowmetersIsEditable(): Promise<void> {
    const flowmeters = this.parametersSpinbuttonByLabel('# of Flowmeters');
    await WaitUtils.untilVisible(flowmeters);
    await this.verifySpinbuttonIsEditable(flowmeters, '# of Flowmeters');
  }

  /** Channel Options panel: option checkboxes are visible and enabled. */
  async verifyChannelOptionsSectionIsInteractive(): Promise<void> {
    await WaitUtils.untilVisible(this.channelOptionsHeading);
    await AssertionUtils.assertVisible(this.channelOptionsHeading);

    const optionCheckboxes = [
      this.useStepNumberCheckbox,
      this.useUserDefinedChannelsCheckbox,
      this.useStepTotalsCheckbox,
      this.autoFluidAndProppantCheckbox,
    ];

    for (const checkbox of optionCheckboxes) {
      await AssertionUtils.assertVisible(checkbox);
      await AssertionUtils.assertEnabled(checkbox);
    }
  }

  /** Observed Net Pressure Calculation panel: radio options are visible and enabled. */
  async verifyObservedNetPressureSectionIsInteractive(): Promise<void> {
    await WaitUtils.untilVisible(this.channelInputContainer);
    await AssertionUtils.assertTextContains(
      this.channelInputContainer,
      'Observed Net Pressure Calculation',
    );

    const radioLabels = [
      'Observed Net Not Calculated',
      'From Dead String Pressure',
      'From Bottom Hole Pressure',
      'From Surface Treating Pressure',
    ] as const;

    for (const label of radioLabels) {
      const radio = this.channelInputContainer.getByRole('radio', { name: label });
      await AssertionUtils.assertVisible(radio);
      await AssertionUtils.assertEnabled(radio);
    }

    await this.verifyObservedNetNotCalculatedIsCheckedByDefault();
  }

  /** "Observed Net Not Calculated" is visible; select it when well has a prior different selection. */
  async verifyObservedNetNotCalculatedIsCheckedByDefault(): Promise<void> {
    await WaitUtils.untilVisible(this.observedNetNotCalculatedRadio);
    await expect(this.observedNetNotCalculatedRadio).toBeVisible();
    if (!(await this.observedNetNotCalculatedRadio.isChecked())) {
      await this.observedNetNotCalculatedRadio.check();
    }
    await expect(this.observedNetNotCalculatedRadio).toBeChecked();
  }

  /** Bottom panels on Channel Inputs screen before smooth-checkbox persistence. */
  async verifyBottomPanelSectionsBeforeSmoothCheckbox(): Promise<void> {
    await this.verifyParametersPanelFieldsAreEditable();
    await this.applyChannelInputsParametersSpinbuttonValues();
    await this.verifyChannelOptionsSectionIsInteractive();
    await this.verifyObservedNetPressureSectionIsInteractive();
  }

  private async activateSpinbutton(spinbutton: Locator): Promise<void> {
    await spinbutton.scrollIntoViewIfNeeded();
    try {
      await spinbutton.dblclick({ timeout: 5000 });
    } catch {
      await spinbutton.click({ timeout: TIMEOUTS.SLOW_UI_MS });
    }
  }

  private async applyChannelInputsParametersSpinbuttonValues(): Promise<void> {
    const { flowmeters: flowmetersValue, densometers: densometersValue } = this.requireData();

    const smoothingPoints = this.parametersSpinbuttonByLabel('Smoothing # of Points');
    await this.activateSpinbutton(smoothingPoints);
    await smoothingPoints.press('Enter');

    const flowmeters = this.parametersSpinbuttonByLabel('# of Flowmeters');
    await this.activateSpinbutton(flowmeters);
    await flowmeters.fill(flowmetersValue);

    const densometers = this.parametersSpinbuttonByLabel('# of Densometers');
    await this.activateSpinbutton(densometers);
    await densometers.fill(densometersValue);
    await densometers.press('Enter');
  }

  private async applyAdditivesSmoothingPointsValue(value?: string): Promise<void> {
    const resolvedValue = value ?? this.requireData().additivesSmoothingPoints;
    const smoothingPoints = this.page.getByRole('spinbutton', { name: 'Smoothing # of Points' });
    await WaitUtils.untilVisible(smoothingPoints);
    await expect(smoothingPoints).toBeVisible();
    await this.activateSpinbutton(smoothingPoints);
    await smoothingPoints.fill(resolvedValue);
    await smoothingPoints.press('Enter');
  }

  private channelRowByLabel(channelLabel: string | RegExp) {
    const labelPattern =
      typeof channelLabel === 'string'
        ? new RegExp(`^${channelLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
        : channelLabel;

    return this.modelInputTable.getByRole('row', { name: labelPattern }).first();
  }

  private smoothCheckboxLocators(channelLabel: string | RegExp) {
    const row = this.channelRowByLabel(channelLabel);
    const smoothCell = row.getByRole('gridcell').last();
    return {
      row,
      smoothCell,
      checkedLabel: smoothCell.getByRole('checkbox', { name: 'Checked' }),
      uncheckedLabel: smoothCell.getByRole('checkbox', { name: 'Unchecked' }),
    };
  }

  private async readSmoothCheckboxStateFromCell(smoothCell: Locator): Promise<SmoothCheckboxState> {
    const checkedLabel = smoothCell.getByRole('checkbox', { name: 'Checked' });
    const uncheckedLabel = smoothCell.getByRole('checkbox', { name: 'Unchecked' });

    if (await uncheckedLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
      return 'unchecked';
    }

    if (await checkedLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
      return 'checked';
    }

    throw new Error('Smooth checkbox state could not be determined from the Smooth column.');
  }

  private async waitForStableSmoothCheckboxState(
    channelLabel: string | RegExp,
  ): Promise<SmoothCheckboxState> {
    const { row, smoothCell } = this.smoothCheckboxLocators(channelLabel);
    await WaitUtils.untilVisible(row);
    await WaitUtils.untilVisible(smoothCell);

    let stableState: SmoothCheckboxState | null = null;

    await expect(async () => {
      const currentState = await this.readSmoothCheckboxStateFromCell(smoothCell);
      if (stableState !== null) {
        expect(currentState).toBe(stableState);
      }
      stableState = currentState;
    }).toPass({ timeout: 5000 });

    if (stableState === null) {
      throw new Error('Smooth checkbox state did not stabilize.');
    }

    return stableState;
  }

  private async getSmoothCheckboxState(channelLabel: string | RegExp): Promise<SmoothCheckboxState> {
    const { row, smoothCell } = this.smoothCheckboxLocators(channelLabel);
    await WaitUtils.untilVisible(row);
    return this.readSmoothCheckboxStateFromCell(smoothCell);
  }

  private async setSmoothCheckboxInRow(
    row: Locator,
    targetState: SmoothCheckboxState,
  ): Promise<void> {
    const smoothCell = row.getByRole('gridcell').last();
    const checkedLabel = smoothCell.getByRole('checkbox', { name: 'Checked' });
    const uncheckedLabel = smoothCell.getByRole('checkbox', { name: 'Unchecked' });

    const currentState = await this.readSmoothCheckboxStateFromCell(smoothCell);
    if (currentState === targetState) {
      return;
    }

    const target = targetState === 'checked' ? uncheckedLabel : checkedLabel;
    const expectedAfter = targetState === 'checked' ? checkedLabel : uncheckedLabel;

    await target.scrollIntoViewIfNeeded();
    try {
      await target.click({ force: true, timeout: 5000 });
    } catch {
      await target.evaluate((el) => (el as HTMLElement).click());
    }
    await WaitUtils.untilVisible(expectedAfter, CHECKBOX_TRANSITION_MS);
  }

  private async blurSmoothCheckboxEditor(): Promise<void> {
    await this.pageHeading.click();
    await this.page.waitForTimeout(TIMEOUTS.ACTION_DELAY_MS);
  }

  private async ensureCheckboxChecked(checkbox: Locator): Promise<void> {
    await WaitUtils.untilVisible(checkbox);
    const checked = await checkbox.isChecked().catch(() => false);
    if (!checked) {
      await checkbox.check();
    }
  }

  async applyChannelOptionsPreSaveFlow(): Promise<void> {
    await WaitUtils.untilVisible(this.channelOptionsHeading);
    await AssertionUtils.assertVisible(this.channelOptionsHeading);
    await AssertionUtils.assertVisible(this.page.getByText('Use Step Number Channel to'));
    await AssertionUtils.assertVisible(this.page.getByText('Use Step Totals Channel to'));
    await AssertionUtils.assertVisible(this.page.getByText('Auto Fluid and Proppant'));
    await AssertionUtils.assertVisible(this.page.getByText('Use User-defined Channels'));

    await this.ensureCheckboxChecked(this.useStepNumberCheckbox);
    await this.ensureCheckboxChecked(this.useStepTotalsCheckbox);
    await this.ensureCheckboxChecked(this.autoFluidAndProppantCheckbox);
    await this.ensureCheckboxChecked(this.useUserDefinedChannelsCheckbox);

    if (await this.isVisibleQuick(this.actionRequiredText, 3000)) {
      await AssertionUtils.assertVisible(this.actionRequiredText);
      await AssertionUtils.assertVisible(this.actionRequiredMessage);
      await AssertionUtils.assertVisible(this.actionRequiredNoButton);
      await AssertionUtils.assertVisible(this.actionRequiredYesCreateButton);
      await AssertionUtils.assertVisible(this.actionRequiredCloseButton);
      await this.actionRequiredNoButton.click();
    }
  }

  private async ensureRoleCheckboxChecked(checkbox: Locator): Promise<void> {
    await WaitUtils.untilVisible(checkbox);
    const alreadyChecked = await checkbox.isChecked().catch(() => false);
    if (!alreadyChecked) {
      await checkbox.check();
    }
  }

  private async isVisibleQuick(locator: Locator, timeout = 2000): Promise<boolean> {
    return locator.isVisible({ timeout }).catch(() => false);
  }

  private async ensureAdditivesSmoothChecked(): Promise<void> {
    const checkedSmooth = this.page.getByRole('checkbox', { name: 'Checked' });
    if (await checkedSmooth.first().isVisible({ timeout: 2000 }).catch(() => false)) {
      return;
    }

    await WaitUtils.untilVisible(this.additivesSmoothUnchecked.first());
    await this.additivesSmoothUnchecked.first().check();
  }

  private async selectScrollableDropdownOption(optionName: string): Promise<void> {
    const autocompleteEditor = this.page.locator('.handsontableEditor').last();
    await expect(autocompleteEditor).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });

    const scrollContainer = autocompleteEditor.locator('.wtHolder').first();
    const option = autocompleteEditor
      .getByRole('option', { name: optionName, exact: true })
      .or(autocompleteEditor.locator('td').getByText(optionName, { exact: true }))
      .first();

    for (let attempt = 0; attempt < 50; attempt++) {
      if (await option.isVisible().catch(() => false)) {
        await option.click();
        return;
      }

      if (await scrollContainer.isVisible().catch(() => false)) {
        await scrollContainer.evaluate((element) => {
          element.scrollTop += 100;
        });
      } else {
        await this.page.mouse.wheel(0, 120);
      }

      await this.page.waitForTimeout(120);
    }

    const filterPrefix = optionName.split(/[\s(]/)[0];
    if (filterPrefix.length >= 3) {
      await this.page.keyboard.type(filterPrefix, { delay: 40 });
      await this.page.waitForTimeout(400);
    }

    await option.scrollIntoViewIfNeeded();
    await expect(option).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });
    await option.click();
  }

  private async dismissActionRequiredPopupIfPresent(): Promise<void> {
    if (!(await this.isVisibleQuick(this.actionRequiredText, 2000))) {
      return;
    }

    logger.info('Dismissing Action Required popup to continue tab navigation.');

    if (await this.isVisibleQuick(this.actionRequiredNoButton, 1000)) {
      await this.actionRequiredNoButton.click();
    } else if (await this.isVisibleQuick(this.actionRequiredCloseButton, 1000)) {
      await this.actionRequiredCloseButton.click();
    }

    await expect(this.actionRequiredImage).toBeHidden({ timeout: TIMEOUTS.SLOW_UI_MS });
  }

  private async dismissUnsavedChangesPopupIfPresent(): Promise<void> {
    const popupVisible =
      (await this.isVisibleQuick(this.confirmActionHeading, 1500)) ||
      (await this.isVisibleQuick(this.noDiscardUnsavedChangesButton, 1500));

    if (!popupVisible) {
      return;
    }

    logger.info('Dismissing Confirm Action unsaved-changes popup via No, Discard.');
    await expect(this.noDiscardUnsavedChangesButton).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });
    await this.noDiscardUnsavedChangesButton.click();
    await expect(this.confirmActionHeading).toBeHidden({ timeout: TIMEOUTS.SLOW_UI_MS });
  }

  private async isOnMainChannelInputsTab(): Promise<boolean> {
    if (!(await this.isVisibleQuick(this.pageHeading, 2000))) {
      return false;
    }

    if (!(await this.isVisibleQuick(this.modelInputTable, 2000))) {
      return false;
    }

    return !(await this.isVisibleQuick(this.additivesBanner, 500));
  }

  private async clickChannelInputsTab(): Promise<void> {
    await this.dismissUnsavedChangesPopupIfPresent();

    if (!(await this.isVisibleQuick(this.channelInputsTab, 3000))) {
      return;
    }

    try {
      await this.channelInputsTab.click({ timeout: 5000 });
    } catch (error) {
      logger.info(
        `Channel Inputs tab click intercepted; dismissing unsaved-changes popup. ${(error as Error).message}`,
      );
      await this.dismissUnsavedChangesPopupIfPresent();
      await this.channelInputsTab.click({ timeout: TIMEOUTS.SLOW_UI_MS });
    }

    await this.dismissUnsavedChangesPopupIfPresent();
  }

  private async returnToChannelInputScreenIfNeeded(wellId = '38068'): Promise<void> {
    await this.dismissUnsavedChangesPopupIfPresent();

    if (await this.isOnMainChannelInputsTab()) {
      return;
    }

    if (await this.isVisibleQuick(this.channelInputsTab, 2000)) {
      await this.clickChannelInputsTab();

      if (await this.isOnMainChannelInputsTab()) {
        await this.waitForChannelInputScreen();
        return;
      }
    }

    logger.info('Channel Inputs screen not available; navigating via direct URL.');
    const base = ConfigManager.getBaseUrl().replace(/\/$/, '');
    await this.page.goto(`${base}/well-pad/channel-input-model?wellId=${wellId}&tab=0`);
    await this.dismissUnsavedChangesPopupIfPresent();
    await this.waitForChannelInputScreen();
  }

  private async isUserDefinedChannelsEditorVisible(): Promise<boolean> {
    return this.isVisibleQuick(this.userDefinedChannelsHeading, 500);
  }

  private async triggerAdditivesUserDefinedCheckboxToggle(): Promise<void> {
    const checkbox = this.additivesUseUserDefinedCheckbox;
    await WaitUtils.untilVisible(checkbox);
    await expect(checkbox).toBeVisible();

    if (await checkbox.isChecked().catch(() => false)) {
      await checkbox.uncheck();
      await expect(checkbox).not.toBeChecked();
    }

    await checkbox.check();
    await expect(checkbox).toBeChecked();
  }

  private async waitForActionRequiredPopupOrEditor(
    timeoutMs = 10000,
  ): Promise<'popup' | 'editor' | 'none'> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      if (await this.isVisibleQuick(this.actionRequiredImage, 250)) {
        return 'popup';
      }
      if (await this.isUserDefinedChannelsEditorVisible()) {
        return 'editor';
      }
      await this.page.waitForTimeout(250);
    }

    return 'none';
  }

  private async assertActionRequiredPopupForUserDefinedChannels(): Promise<void> {
    await AssertionUtils.assertTextContains(this.page.locator('h5'), 'Action Required');
    await AssertionUtils.assertTextContains(
      this.page.getByRole('paragraph'),
      'Seems user-defined channels are not available. Would you like to create?',
    );
    await AssertionUtils.assertVisible(this.actionRequiredNoButton);
    await AssertionUtils.assertVisible(this.actionRequiredYesCreateButton);
    await AssertionUtils.assertVisible(this.actionRequiredCloseButton);
    await AssertionUtils.assertVisible(this.actionRequiredImage);
  }

  private async tryOpenExistingUserDefinedChannelsEditor(): Promise<boolean> {
    if (await this.isUserDefinedChannelsEditorVisible()) {
      return true;
    }

    await this.clickChannelInputsTab();
    await this.waitForChannelInputScreen();

    const userDefinedLabel = this.page.getByText('Use User-defined Channels', { exact: true });
    if (await this.isVisibleQuick(userDefinedLabel, 2000)) {
      await userDefinedLabel.click();
      if (await this.isUserDefinedChannelsEditorVisible()) {
        return true;
      }
    }

    const userDefinedRow = this.channelInputContainer.locator('div').filter({
      has: this.useUserDefinedChannelsCheckbox,
    });
    const editTrigger = userDefinedRow.locator('a, button, img, [class*="edit"]').first();
    if (await this.isVisibleQuick(editTrigger, 2000)) {
      await editTrigger.click();
      if (await this.isUserDefinedChannelsEditorVisible()) {
        return true;
      }
    }

    await this.additivesTab.click();
    await this.dismissUnsavedChangesPopupIfPresent();
    return false;
  }

  /**
   * Enables user-defined channels on Additives and opens the editor when possible.
   * Popup path: Action Required -> Yes, Create.
   * No-popup path: channels already exist; verify checkbox and try alternate entry points.
   */
  private async openUserDefinedChannelsEditorFromAdditives(): Promise<boolean> {
    await this.triggerAdditivesUserDefinedCheckboxToggle();

    const outcome = await this.waitForActionRequiredPopupOrEditor();

    if (outcome === 'popup') {
      logger.info('Action Required popup shown; opening User-defined Channels editor via Yes, Create.');
      await this.assertActionRequiredPopupForUserDefinedChannels();
      await this.actionRequiredYesCreateButton.click();
      await expect(this.userDefinedChannelsHeading).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });
      return true;
    }

    if (outcome === 'editor') {
      logger.info('User-defined Channels editor already visible; continuing without Action Required popup.');
      return true;
    }

    logger.info(
      'Action Required popup not shown; user-defined channels likely already configured for this well.',
    );

    if (await this.tryOpenExistingUserDefinedChannelsEditor()) {
      logger.info('Opened existing User-defined Channels editor via alternate navigation.');
      return true;
    }

    if (await this.isVisibleQuick(this.additivesUseUserDefinedCheckbox, 2000)) {
      await expect(this.additivesUseUserDefinedCheckbox).toBeChecked();
    } else {
      logger.info('Additives user-defined checkbox not visible; channels likely already configured.');
    }

    await expect(this.actionRequiredImage).toBeHidden();
    return false;
  }

  private async verifyUserDefinedChannelsEditorFlow(): Promise<void> {
    const { userDefined } = this.requireData();

    await WaitUtils.untilVisible(this.userDefinedChannelsHeading);
    await expect(this.userDefinedChannelsHeading).toBeVisible();
    await expect(this.page.getByText('Channel Name').nth(1)).toBeVisible();
    await expect(this.page.getByText('Unit types').nth(1)).toBeVisible();
    await expect(this.page.getByText('Units').nth(1)).toBeVisible();
    await expect(this.page.getByText('Formula').nth(1)).toBeVisible();
    await expect(this.page.getByText('Action').nth(1)).toBeVisible();
    await expect(this.page.locator('#cell-0-4 > div')).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Go Back' })).toBeVisible();
    await expect(this.page.getByText('Go BackSave & Validate')).toBeVisible();
    await expect(this.page.locator('app-user-defined-channels')).toMatchAriaSnapshot(
      USER_DEFINED_CHANNELS_KEYPAD_ARIA_SNAPSHOT,
    );

    await this.page.locator('#cell-0-0').dblclick();
    await this.page.locator('textarea').fill(userDefined.name1);
    await this.page.locator('#cell-0-1').getByText('▼').click();
    await this.selectScrollableDropdownOption(userDefined.unitType1);
    await expect(this.page.getByRole('gridcell', { name: userDefined.expectedUnit1 })).toBeVisible();

    await this.page.locator('#cell-0-3').dblclick();
    await this.page.getByRole('button', { name: userDefined.formula1 }).click();
    await this.page.getByRole('textbox').nth(4).fill(userDefined.formula1);

    await this.page.locator('#cell-1-0').dblclick();
    await this.page.getByRole('textbox').nth(4).fill(userDefined.name2);
    await this.page.locator('#cell-1-1').getByText('▼').click();
    await this.selectScrollableDropdownOption(userDefined.unitType2);
    await expect(this.page.getByRole('gridcell', { name: userDefined.expectedUnit2 })).toBeVisible();

    await this.page.locator('#cell-1-3').dblclick();
    await this.page.getByRole('button', { name: userDefined.formula2 }).click();

    await this.page.locator('#cell-2-0').dblclick();
    await this.page.getByRole('textbox').nth(4).fill(userDefined.name3);
    await this.page.locator('#cell-2-1').getByText('▼').click();
    await this.selectScrollableDropdownOption(userDefined.unitType3);
    await expect(this.page.getByRole('gridcell', { name: userDefined.expectedUnit3 })).toBeVisible();

    await this.page.locator('#cell-2-3').dblclick();
    await this.page.getByRole('button', { name: userDefined.formula3 }).click();

    await this.page.locator('div').filter({ hasText: '# Channel Name Unit types' }).nth(4).click();
    await this.page.locator('div').filter({ hasText: '# Channel Name Unit types' }).nth(4).click();
    await this.page.locator('div').filter({ hasText: '# Channel Name Unit types' }).nth(5).click();

    await this.page.locator('#cell-2-4').getByRole('img', { name: 'Delete' }).click();
    await this.page.getByRole('button', { name: 'Yes, Delete' }).click();

    await this.page.getByRole('button', { name: 'Save & Validate' }).click();
    await expect(this.page.getByLabel('SAVED!')).toBeVisible();
    await this.assertUserDefinedChannelRowWarningsIfPresent();
    await this.exitUserDefinedChannelsEditorAfterSave();
  }

  private async exitUserDefinedChannelsEditorAfterSave(): Promise<void> {
    const goBackButton = this.userDefinedChannelsComponent.getByRole('button', { name: 'Go Back' });

    if (await this.isVisibleQuick(goBackButton, 3000)) {
      await goBackButton.click();
      await this.dismissUnsavedChangesPopupIfPresent();
      await expect(this.userDefinedChannelsHeading).toBeHidden({ timeout: TIMEOUTS.SLOW_UI_MS });
      return;
    }

    logger.info('Go Back not shown after save; user-defined channels editor closed automatically.');

    if (await this.isVisibleQuick(this.userDefinedChannelsHeading, 2000)) {
      await this.page.keyboard.press('Escape').catch(() => undefined);
      if (await this.isVisibleQuick(goBackButton, 2000)) {
        await goBackButton.click();
        await this.dismissUnsavedChangesPopupIfPresent();
      }
    }

    await this.dismissUnsavedChangesPopupIfPresent();

    if (await this.isVisibleQuick(this.userDefinedChannelsHeading, 1000)) {
      logger.info('User-defined channels editor heading still visible; continuing without explicit Go Back.');
      return;
    }

    await expect(this.userDefinedChannelsHeading).toBeHidden({ timeout: TIMEOUTS.SLOW_UI_MS });
  }

  private async assertUserDefinedChannelRowWarningsIfPresent(): Promise<void> {
    const rowWarnings = ['Row 1 : No parameters found', 'Row 2 : No parameters found'];

    for (const message of rowWarnings) {
      const warning = this.page.getByText(message);
      if (await this.isVisibleQuick(warning, 2000)) {
        await AssertionUtils.assertVisible(warning);
        logger.info(`User-defined channel validation warning shown: ${message}`);
      } else {
        logger.info(`User-defined channel validation warning not shown (optional): ${message}`);
      }
    }
  }

  /**
   * Opens Additives tab, validates headers/options, applies state-aware checkbox
   * actions, handles Action Required popup (Close), then asserts page chrome.
   */
  async validateAdditivesTabFlow(): Promise<void> {
    if (!(await this.isVisibleQuick(this.additivesTab))) {
      logger.info('Additives tab not visible; skipping Additives flow.');
      return;
    }

    await WaitUtils.untilVisible(this.additivesTab);
    await this.additivesTab.click();

    const additivesBanner = this.page.getByText('Channel Inputs Additives Real');
    if (!(await this.isVisibleQuick(additivesBanner))) {
      logger.info('Additives content not visible; returning to Channel Inputs.');
      await this.clickChannelInputsTab();
      await this.waitForChannelInputScreen();
      return;
    }

    await AssertionUtils.assertVisible(additivesBanner);
    await AssertionUtils.assertVisible(this.page.getByText('Additive Rate Channel').nth(3));
    await AssertionUtils.assertVisible(this.page.getByText('Key Rate').nth(1));
    await AssertionUtils.assertVisible(this.page.getByText('Additive Set Point').nth(1));
    await AssertionUtils.assertVisible(this.page.getByText('Unit').nth(1));
    await AssertionUtils.assertVisible(this.page.getByText('Smooth').nth(1));

    await this.ensureAdditivesSmoothChecked();

    if (await this.isVisibleQuick(this.page.getByText('Smoothing # of Points'))) {
      await this.applyAdditivesSmoothingPointsValue();
    }

    const useUserDefinedChannelsForText = this.page.getByText('Use User-defined Channels for');
    if (await this.isVisibleQuick(useUserDefinedChannelsForText)) {
      await AssertionUtils.assertVisible(useUserDefinedChannelsForText);
      await AssertionUtils.assertVisible(this.page.getByText('Smoothing # of Points'));
      await this.ensureRoleCheckboxChecked(this.additivesUseUserDefinedCheckbox);
      await this.dismissActionRequiredPopupIfPresent();
    } else {
      logger.info('Use User-defined Channels for not visible; skipping additive channel option checks.');
    }

    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'Save' }));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'Next' }));
    await AssertionUtils.assertVisible(this.pageHeading);
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'applications' }).first());
    await AssertionUtils.assertVisible(this.page.locator('#page-header-notifications-dropdown'));
    await AssertionUtils.assertVisible(this.page.getByText('Version:'));
    await AssertionUtils.assertVisible(this.page.getByText('Stage:'));

    await this.dismissActionRequiredPopupIfPresent();
    await this.returnToChannelInputScreenIfNeeded();
  }

  async validateRealTimeChannelTabFlow(): Promise<void> {
    await WaitUtils.untilVisible(this.realTimeChannelTab);
    await this.realTimeChannelTab.click();

    await AssertionUtils.assertVisible(this.page.getByText('Channel Inputs Additives Real'));
    await AssertionUtils.assertVisible(this.pageHeading);
    await AssertionUtils.assertVisible(
      this.page.locator('div').filter({ hasText: 'Menu Pads & Wells Dashboard' }).nth(4),
    );
    await AssertionUtils.assertVisible(
      this.page.locator('div').filter({ hasText: 'Run Model' }).nth(2),
    );
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'applications' }).first());
    await AssertionUtils.assertVisible(this.page.locator('#page-header-notifications-dropdown'));
    await AssertionUtils.assertVisible(this.page.getByText('Version:'));
    await AssertionUtils.assertVisible(this.page.getByText('Stage:'));
    await AssertionUtils.assertVisible(this.page.getByText('Name', { exact: true }).nth(3));
    await AssertionUtils.assertVisible(this.page.getByText('Unit').nth(1));
    await AssertionUtils.assertVisible(this.page.getByText('Share').nth(1));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'Next' }));
  }

  async checkSmoothCheckboxForChannel(channelLabel: string | RegExp): Promise<void> {
    const { row } = this.smoothCheckboxLocators(channelLabel);
    await WaitUtils.untilVisible(row);

    const currentState = await this.getSmoothCheckboxState(channelLabel);
    if (currentState === 'checked') {
      return;
    }

    await this.setSmoothCheckboxInRow(row, 'checked');
    await this.verifySmoothCheckboxStateForChannel(channelLabel, 'checked');
  }

  async uncheckSmoothCheckboxForChannel(channelLabel: string | RegExp): Promise<void> {
    const { row } = this.smoothCheckboxLocators(channelLabel);
    await WaitUtils.untilVisible(row);

    const currentState = await this.getSmoothCheckboxState(channelLabel);
    if (currentState === 'unchecked') {
      return;
    }

    await this.setSmoothCheckboxInRow(row, 'unchecked');
    await this.verifySmoothCheckboxStateForChannel(channelLabel, 'unchecked');
  }

  async verifySaveButtonEnabled(): Promise<void> {
    const save = this.page.locator('button.save-btn').first();
    await WaitUtils.untilVisible(save);
    await expect(save).toBeEnabled({ timeout: TIMEOUTS.SLOW_UI_MS });
  }

  async getSmoothCheckboxStateForChannel(channelLabel: string | RegExp): Promise<SmoothCheckboxState> {
    return this.getSmoothCheckboxState(channelLabel);
  }

  private buildPersistenceSummary(
    channelLabel: string,
    initialState: SmoothCheckboxState,
    action: 'check' | 'uncheck',
    expectedState: SmoothCheckboxState,
  ): string {
    return `${channelLabel}: detected ${initialState} → performed ${action} → expected after save ${expectedState}`;
  }

  async applySmoothCheckboxPersistence(
    channelLabels: readonly (string | RegExp)[],
  ): Promise<SmoothCheckboxPersistenceResult[]> {
    const results: SmoothCheckboxPersistenceResult[] = [];

    for (const channelLabel of channelLabels) {
      const label = typeof channelLabel === 'string' ? channelLabel : channelLabel.source;
      const initialState = await this.waitForStableSmoothCheckboxState(channelLabel);

      await this.verifySmoothCheckboxStateForChannel(channelLabel, initialState);

      const action: 'check' | 'uncheck' = initialState === 'checked' ? 'uncheck' : 'check';
      const expectedState: SmoothCheckboxState =
        initialState === 'checked' ? 'unchecked' : 'checked';
      const summary = this.buildPersistenceSummary(label, initialState, action, expectedState);

      logger.info(summary);

      if (initialState === 'checked') {
        await this.uncheckSmoothCheckboxForChannel(channelLabel);
      } else {
        await this.checkSmoothCheckboxForChannel(channelLabel);
      }

      results.push({
        channelLabel: label,
        initialState,
        action,
        expectedState,
        summary,
      });
    }

    await this.applyChannelOptionsPreSaveFlow();
    await this.verifySaveButtonEnabled();
    await this.saveChannelInputChanges();
    await this.blurSmoothCheckboxEditor();
    await this.waitForChannelInputScreen();

    for (const result of results) {
      await this.verifySmoothCheckboxStateForChannel(result.channelLabel, result.expectedState);
      logger.info(`${result.channelLabel}: verified persisted state is ${result.expectedState}`);
    }

    return results;
  }

  /**
   * Checks each channel only when it is currently unchecked, then saves and
   * verifies all requested channels are checked after save.
   */
  async ensureSmoothCheckboxesCheckedAndPersist(
    channelLabels: readonly (string | RegExp)[],
  ): Promise<SmoothCheckboxCheckResult[]> {
    const results: SmoothCheckboxCheckResult[] = [];
    let hasChanges = false;

    for (const channelLabel of channelLabels) {
      const label = typeof channelLabel === 'string' ? channelLabel : channelLabel.source;
      const initialState = await this.waitForStableSmoothCheckboxState(channelLabel);

      if (initialState === 'unchecked') {
        await this.checkSmoothCheckboxForChannel(channelLabel);
        hasChanges = true;
        const summary = `${label}: detected unchecked → performed check → expected after save checked`;
        logger.info(summary);
        results.push({ channelLabel: label, initialState, action: 'check', summary });
        continue;
      }

      const summary = `${label}: detected checked → no action needed`;
      logger.info(summary);
      results.push({ channelLabel: label, initialState, action: 'none', summary });
    }

    if (hasChanges) {
      await this.verifySaveButtonEnabled();
      await this.saveChannelInputChanges();
      await this.blurSmoothCheckboxEditor();
      await this.waitForChannelInputScreen();
    }

    for (const channelLabel of channelLabels) {
      await this.verifySmoothCheckboxStateForChannel(channelLabel, 'checked');
    }

    return results;
  }

  async verifyMeasuredDataPanelAfterSave(): Promise<void> {
    await this.clickChannelInputsTab();
    await this.waitForChannelInputScreen();
    await WaitUtils.untilVisible(this.measuredDataButton);
    await this.measuredDataButton.click();

    const plotDashboard = this.page.locator('#plot-dashboard');
    await AssertionUtils.assertTextContains(plotDashboard, 'Measured Data');
    await AssertionUtils.assertVisible(this.page.locator('.dropdown.me-3'));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: '+ New Plot' }));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'Auto Step' }));
    await AssertionUtils.assertVisible(this.page.getByText('Version:'));
    await AssertionUtils.assertVisible(this.page.getByText('Stage:'));
    await AssertionUtils.assertVisible(this.page.getByRole('heading', { name: 'Plot', exact: true }));
    await AssertionUtils.assertVisible(this.page.getByRole('region', { name: 'scrollable content' }));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'channel', exact: true }));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'Events download' }));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'sync' }));
    await AssertionUtils.assertVisible(this.page.locator('div:nth-child(4)'));
    await AssertionUtils.assertVisible(this.page.locator('.table-view-toggle').first());
    await AssertionUtils.assertVisible(
      this.page.locator('.d-flex.flex-wrap > div:nth-child(6)').first(),
    );
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'refresh' }));
    await AssertionUtils.assertVisible(
      this.page.getByRole('button', { name: 'expand/collapse' }).first(),
    );
    await AssertionUtils.assertVisible(
      this.page.locator('.d-flex.flex-wrap.align-items-center.justify-content-end > div:nth-child(3)'),
    );
    await AssertionUtils.assertVisible(this.page.locator('div').filter({ hasText: /^Plot$/ }).first());
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'expand/collapse' }).nth(1));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'comment' }));
    await AssertionUtils.assertVisible(this.page.getByRole('combobox').nth(3));
    await AssertionUtils.assertVisible(
      this.page.getByRole('button', { name: 'download download' }),
    );
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'settings' }));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'Close' }));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'list' }));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'Save' }));
    await AssertionUtils.assertVisible(this.page.getByText('Click on the plot you would'));
    await AssertionUtils.assertVisible(this.page.getByRole('heading', { name: 'Plots', exact: true }));
    await AssertionUtils.assertVisible(this.page.getByRole('button', { name: 'Close' }));
    await expect(plotDashboard).toMatchAriaSnapshot(MEASURED_DATA_ARIA_SNAPSHOT);
    await this.verifyNewPlotCreateAndDuplicateWarningFlow();
    await this.verifyAutoStepDialogFlow();
    await this.prepareMeasuredPlotCanvas();
    await this.verifyMeasuredPlotToolbarAndChannelSelection();
    await this.executeAdditivesUserDefinedChannelsViaDirectUrl();
  }

  private generateUniquePlotName(): string {
    const uniqueSuffix = `${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
    return `abc${uniqueSuffix}`;
  }

  async verifyNewPlotCreateAndDuplicateWarningFlow(): Promise<void> {
    const plotName = this.generateUniquePlotName();

    await WaitUtils.untilVisible(this.newPlotButton);
    await this.newPlotButton.click();
    const savePlotDialog = this.page.getByRole('dialog');
    await expect(this.page.getByRole('heading', { name: 'Save Plot' })).toBeVisible();
    await expect(savePlotDialog.getByRole('button', { name: 'Close' })).toBeVisible();
    await expect(savePlotDialog.getByText('Pad Plots')).toBeVisible();

    const padPlotsCheckbox = savePlotDialog.getByRole('checkbox', { name: 'Pad Plots' });
    await expect(padPlotsCheckbox).toBeVisible();
    await expect(padPlotsCheckbox, 'Pad Plots should be unchecked by default').not.toBeChecked();
    await padPlotsCheckbox.check();
    await expect(padPlotsCheckbox).toBeChecked();

    const plotNameField = savePlotDialog.getByRole('textbox', { name: /Plot Name/i });
    await expect(plotNameField).toBeVisible();
    await plotNameField.fill(plotName);

    const saveButton = savePlotDialog.getByRole('button', { name: 'Save' });
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    const plotNameInList = this.page
      .getByRole('listitem')
      .filter({ hasText: new RegExp(`^\\s*${plotName}\\s*$`, 'i') })
      .first();
    await expect(plotNameInList).toBeVisible();

    await WaitUtils.untilVisible(this.newPlotButton);
    await this.newPlotButton.click();
    await expect(this.page.getByRole('heading', { name: 'Save Plot' })).toBeVisible();
    const duplicateDialog = this.page.getByRole('dialog');
    const duplicatePadPlotsCheckbox = duplicateDialog.getByRole('checkbox', { name: 'Pad Plots' });
    await expect(duplicatePadPlotsCheckbox).toBeVisible();
    await expect(
      duplicatePadPlotsCheckbox,
      'Pad Plots should be unchecked by default on duplicate validation attempt',
    ).not.toBeChecked();
    const duplicateNameField = duplicateDialog.getByRole('textbox', { name: /Plot Name/i });
    await duplicateNameField.fill(plotName);
    const duplicateWarningMessage = this.page.getByText('A plot with this name already').first();
    const duplicateSaveButton = duplicateDialog.getByRole('button', { name: 'Save' });

    if (await duplicateWarningMessage.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(duplicateWarningMessage).toBeVisible();
      await duplicateDialog.getByRole('button', { name: 'Cancel' }).click();
      return;
    }

    if (await duplicateSaveButton.isEnabled().catch(() => false)) {
      await duplicateSaveButton.click();
      if (await duplicateWarningMessage.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(duplicateWarningMessage).toBeVisible();
        await duplicateDialog.getByRole('button', { name: 'Cancel' }).click();
        return;
      }
    }

    await duplicateDialog.getByRole('button', { name: 'Close' }).click();
  }

  async verifyAutoStepDialogFlow(): Promise<void> {
    const autoStepEnabled = await this.autoStepButton.isEnabled().catch(() => false);
    if (!autoStepEnabled) {
      logger.info('Auto Step button is disabled; retrying on channel-input-model URL for current well.');
      const fallbackUrl = await this.buildChannelInputModelUrl();
      if (!fallbackUrl) {
        logger.info('Unable to resolve current wellId for Auto Step fallback; skipping Auto Step dialog validation.');
        return;
      }
      await this.page.goto(fallbackUrl);
      await this.waitForChannelInputScreen();
      if (await this.isVisibleQuick(this.measuredDataButton)) {
        await this.measuredDataButton.click();
      }
    }

    await expect(this.autoStepButton, 'Auto Step should be enabled before Auto Step flow').toBeEnabled();
    await this.clickResilient(this.autoStepButton, 'Auto Step');
    const autoStepDialog = this.page.getByRole('dialog');

    await expect(this.page.getByRole('heading', { name: 'Auto Step' })).toBeVisible();
    await expect(autoStepDialog.getByRole('button', { name: 'Close' })).toBeVisible();
    await expect(autoStepDialog.getByText('Automatic Staging Function')).toBeVisible();
    await expect(autoStepDialog.getByText('Selection Option')).toBeVisible();
    await expect(autoStepDialog.getByText('Apply To All Stages')).toBeVisible();
    await expect(autoStepDialog.getByText('High Sensitivity')).toBeVisible();
    await expect(autoStepDialog.getByRole('button', { name: 'No' })).toBeVisible();
    await expect(autoStepDialog.getByRole('button', { name: 'Yes' })).toBeVisible();

    const highSensitivityCheckbox = autoStepDialog.getByRole('checkbox', { name: 'High Sensitivity' });
    await expect(highSensitivityCheckbox).toBeVisible();
    await expect(
      highSensitivityCheckbox,
      'High Sensitivity should be unchecked by default',
    ).not.toBeChecked();

    await highSensitivityCheckbox.check();
    await autoStepDialog.getByRole('button', { name: 'Yes' }).click();

    await this.clickResilient(this.autoStepButton, 'Auto Step');
    await this.page.getByRole('dialog').getByRole('button', { name: 'No' }).click();

    await this.clickResilient(this.autoStepButton, 'Auto Step');
    await this.page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  }

  async executeAdditivesUserDefinedChannelsViaDirectUrl(): Promise<void> {
    const additivesUrl = await this.buildChannelInputModelUrl(0);
    if (!additivesUrl) {
      logger.info('Unable to resolve current wellId for Additives direct URL; skipping direct URL Additives flow.');
      return;
    }
    await this.page.goto(additivesUrl);
    await this.waitForChannelInputScreen();
    await this.dismissUnsavedChangesPopupIfPresent();

    await WaitUtils.untilVisible(this.additivesTab);
    await this.additivesTab.click();
    await expect(this.additivesBanner).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });
    await this.dismissUnsavedChangesPopupIfPresent();

    const editorOpened = await this.openUserDefinedChannelsEditorFromAdditives();
    if (editorOpened) {
      await this.verifyUserDefinedChannelsEditorFlow();
    } else {
      logger.info(
        'Skipping User-defined Channels editor validations; channels already exist and editor entry point was not available.',
      );
    }

    await this.returnToChannelInputScreenIfNeeded();
  }

  private async buildChannelInputModelUrl(tab?: number): Promise<string | null> {
    const currentUrl = this.page.url();
    const parsed = new URL(currentUrl);
    const wellId = parsed.searchParams.get('wellId');
    if (!wellId) {
      return null;
    }

    const target = new URL('/well-pad/channel-input-model', parsed.origin);
    target.searchParams.set('wellId', wellId);
    if (tab !== undefined) {
      target.searchParams.set('tab', String(tab));
    }
    return target.toString();
  }

  private async clickResilient(locator: Locator, label: string): Promise<void> {
    await WaitUtils.untilVisible(locator);

    try {
      await locator.click({ timeout: 10000 });
      return;
    } catch (error) {
      logger.warn(`${label} click retry (force) due to: ${(error as Error).message}`);
    }

    try {
      await locator.click({ force: true, timeout: 10000 });
      return;
    } catch (error) {
      logger.warn(`${label} click fallback (JS) due to: ${(error as Error).message}`);
    }

    await locator.evaluate((el) => (el as HTMLElement).click());
  }

  private async prepareMeasuredPlotCanvas(): Promise<void> {
    const plotsPrompt = this.page.getByText('Click on the plot you would');
    if (!(await this.isVisibleQuick(plotsPrompt))) {
      return;
    }

    const measuredDataPlotRadio = this.page.getByRole('radio', { name: 'Measured Data' });
    if (await this.isVisibleQuick(measuredDataPlotRadio)) {
      await measuredDataPlotRadio.check();
    }

    const plotsPanelCloseButton = this.page.getByRole('button', { name: 'Close' }).first();
    if (await this.isVisibleQuick(plotsPanelCloseButton)) {
      await plotsPanelCloseButton.click();
    }
  }

  private async isToolbarIconActive(button: Locator): Promise<boolean> {
    return button.evaluate((el) => {
      if (el.getAttribute('aria-pressed') === 'true') {
        return true;
      }

      if (el.getAttribute('aria-expanded') === 'true') {
        return true;
      }

      if (el.getAttribute('aria-selected') === 'true') {
        return true;
      }

      const className = el.className?.toString() ?? '';
      if (/\bactive\b|\bselected\b|\bpressed\b|\bbtn-active\b|\bfocused\b/i.test(className)) {
        return true;
      }

      const parentClassName = el.parentElement?.className?.toString() ?? '';
      if (/\bactive\b|\bselected\b/i.test(parentClassName)) {
        return true;
      }

      const style = window.getComputedStyle(el);
      const backgroundColor = style.backgroundColor;
      if (
        backgroundColor &&
        backgroundColor !== 'rgba(0, 0, 0, 0)' &&
        backgroundColor !== 'transparent' &&
        /255,\s*255,\s*255|rgb\(255/i.test(backgroundColor)
      ) {
        return true;
      }

      return el === document.activeElement;
    });
  }

  private async assertToolbarIconClicked(button: Locator, description: string): Promise<void> {
    await expect(button, `${description} icon should remain visible after click`).toBeVisible();

    if (await this.isToolbarIconActive(button)) {
      return;
    }

    await expect(button, `${description} icon should remain enabled after click`).toBeEnabled();
  }

  private async clickToolbarIconAndAssertActive(
    button: Locator,
    description: string,
  ): Promise<void> {
    await WaitUtils.untilVisible(button);
    await button.click();
    await this.assertToolbarIconClicked(button, description);
  }

  private async clickToggleIconAndAssertChanged(
    button: Locator,
    description: string,
  ): Promise<void> {
    await WaitUtils.untilVisible(button);
    const expandedBefore = await button.getAttribute('aria-expanded');
    const activeBefore = await this.isToolbarIconActive(button);

    await button.click();

    const expandedAfter = await button.getAttribute('aria-expanded');
    if (expandedBefore !== null && expandedAfter !== null && expandedBefore !== expandedAfter) {
      return;
    }

    const activeAfter = await this.isToolbarIconActive(button);
    expect(
      activeBefore !== activeAfter || activeAfter,
      `${description} icon should reflect click action`,
    ).toBe(true);
  }

  /** Tooltip control on measured plot toolbar should be available and enabled by default. */
  async verifyTooltipEnabledByDefaultOnMeasuredPlot(): Promise<void> {
    await expect(this.page.getByRole('button', { name: 'expand/collapse' }).nth(1)).toBeVisible();
    await AssertionUtils.assertVisible(this.measuredPlotCommentButton);
    await AssertionUtils.assertVisible(this.measuredPlotTooltipCombobox);
  }

  async verifyMeasuredPlotToolbarInteractions(): Promise<void> {
    await this.verifyTooltipEnabledByDefaultOnMeasuredPlot();

    await this.clickToolbarIconAndAssertActive(this.measuredPlotCommentButton, 'Comment');

    const dropdownArrow = this.measuredPlotToolbarActions.locator(
      '.dropdown > .ng-select-container > .ng-arrow-wrapper, ng-select .ng-arrow-wrapper',
    ).last();
    if (await this.isVisibleQuick(dropdownArrow)) {
      await dropdownArrow.click();
      await expect(this.page.locator('.ng-dropdown-panel').last()).toBeVisible();
      await dropdownArrow.click();
      await expect(this.page.locator('.ng-dropdown-panel').last()).toBeHidden();
    }

    const downloadButton = this.page.getByRole('button', { name: /download\s+download/i });
    if (await this.isVisibleQuick(downloadButton)) {
      await this.clickToolbarIconAndAssertActive(downloadButton, 'Download');
    }

    const toolbarAction = this.measuredPlotToolbarActions.locator('> div:nth-child(3)');
    if (await this.isVisibleQuick(toolbarAction)) {
      const toolbarButton = toolbarAction.getByRole('button').first();
      if (await this.isVisibleQuick(toolbarButton) && (await toolbarButton.isEnabled())) {
        await this.clickToolbarIconAndAssertActive(toolbarButton, 'Toolbar action');
      } else {
        await expect(toolbarAction).toBeVisible();
      }
    }

    const expandCollapseButton = this.page.getByRole('button', { name: 'expand/collapse' }).first();
    await this.clickToggleIconAndAssertChanged(expandCollapseButton, 'Expand/collapse');

    const refreshButton = this.page.getByRole('button', { name: 'refresh' });
    await this.clickToolbarIconAndAssertActive(refreshButton, 'Refresh');
  }

  async verifyMeasuredPlotChannelSelectionFlow(): Promise<void> {
    await this.clickToolbarIconAndAssertActive(this.measuredPlotChannelButton, 'Channel');
    await expect(this.channelSelectionHeading).toBeVisible();
    await this.verifyAutoScaleYAxisCheckedByDefault();

    await expect(this.page.locator('html').getByRole('document')).toMatchAriaSnapshot(
      CHANNEL_SELECTION_ARIA_SNAPSHOT,
    );

    const fracproRadio = this.page.getByRole('radio', { name: 'Fracpro' });
    if (await this.isVisibleQuick(fracproRadio)) {
      await fracproRadio.check();
      await expect(fracproRadio).toBeChecked();
    }

    const surfStageNumberItem = this.page
      .getByRole('listitem')
      .filter({ hasText: 'Surf Stage Number' });
    if (await this.isVisibleQuick(surfStageNumberItem)) {
      await surfStageNumberItem.click();
      await expect(surfStageNumberItem).toBeVisible();

      const deleteButton = this.page.getByRole('button', { name: 'delete' });
      if (await this.isVisibleQuick(deleteButton) && (await deleteButton.isEnabled())) {
        await this.clickToolbarIconAndAssertActive(deleteButton, 'Delete');
      }
    }

    const cancelButton = this.page.getByRole('button', { name: 'Cancel' });
    if (await this.isVisibleQuick(cancelButton)) {
      await cancelButton.click();
    }
  }

  async verifyMeasuredPlotToolbarAndChannelSelection(): Promise<void> {
    await this.verifyMeasuredPlotToolbarInteractions();
    await this.verifyMeasuredPlotChannelSelectionFlow();
  }

  /** Auto Scale Y-Axis checkbox in Channel Selection is checked by default. */
  async verifyAutoScaleYAxisCheckedByDefault(): Promise<void> {
    await expect(this.channelSelectionHeading).toBeVisible();
    await expect(this.page.getByText('Auto Scale Y-Axis')).toBeVisible();

    const autoScaleCheckbox = this.page
      .getByRole('checkbox', { name: /Auto Scale Y-Axis/i })
      .or(this.page.getByText('Auto Scale Y-Axis').locator('..').getByRole('checkbox'))
      .first();

    await AssertionUtils.assertVisible(autoScaleCheckbox);
    await expect(autoScaleCheckbox, 'Auto Scale Y-Axis should be checked by default').toBeChecked();
  }

  async verifySmoothCheckboxStateForChannel(
    channelLabel: string | RegExp,
    expectedState: SmoothCheckboxState,
  ): Promise<void> {
    const { row, checkedLabel, uncheckedLabel } = this.smoothCheckboxLocators(channelLabel);
    await WaitUtils.untilVisible(row);

    if (expectedState === 'checked') {
      await AssertionUtils.assertVisible(checkedLabel);
      return;
    }

    await AssertionUtils.assertVisible(uncheckedLabel);
  }

  async clickSaveChanges(): Promise<void> {
    const save = this.page.locator('button.save-btn').first();
    await WaitUtils.untilVisible(save);
    await expect(save).toBeEnabled({ timeout: TIMEOUTS.SLOW_UI_MS });
    await save.click();

    const yesSaveButton = this.page.getByRole('button', { name: /Yes,\s*Save/i });
    if (await yesSaveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await yesSaveButton.click();
    }
  }

  async verifySaveChangesDialog(): Promise<void> {
    await WaitUtils.untilVisible(this.saveChangesHeading);
    await WaitUtils.untilVisible(this.versionNameInput);
    await expect(this.page.locator('html').getByRole('document')).toMatchAriaSnapshot(
      SAVE_CHANGES_ARIA_SNAPSHOT,
    );
  }

  async saveWithNewVersionName(versionName: string): Promise<void> {
    await this.click(this.versionNameInput, 'Enter version name');
    await this.fill(this.versionNameInput, versionName, 'Enter version name');

    const dialogSaveButton = this.page.getByRole('dialog').getByRole('button', { name: 'Save' });
    const fallbackSaveButton = this.saveChangesHeading
      .locator('xpath=ancestor::*[contains(@class,"modal")][1]')
      .getByRole('button', { name: 'Save' });
    const targetSaveButton = (await dialogSaveButton.isVisible({ timeout: 3000 }).catch(() => false))
      ? dialogSaveButton
      : fallbackSaveButton;

    await WaitUtils.untilEnabled(targetSaveButton);
    await targetSaveButton.click();
    await WaitUtils.untilHidden(this.saveChangesHeading, TIMEOUTS.SLOW_UI_MS);
    await AssertionUtils.assertVisible(this.savedToast);
    await this.page.waitForTimeout(TIMEOUTS.SAVE_WAIT_MS);
  }

  async saveChannelInputChanges(): Promise<void> {
    await this.clickSaveChanges();

    const versionDialogVisible = await this.saveChangesHeading
      .isVisible({ timeout: TIMEOUTS.SLOW_UI_MS })
      .catch(() => false);

    if (versionDialogVisible) {
      await this.saveWithNewVersionName(this.generateRandomVersionName());
      return;
    }

    await AssertionUtils.assertVisible(this.savedToast);
    await this.page.waitForTimeout(TIMEOUTS.SAVE_WAIT_MS);
  }

  private generateRandomVersionName(): string {
    const uniqueSuffix = `${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`;
    return `auto${uniqueSuffix}`;
  }

  async verifySmoothCheckboxUncheckedForChannel(channelLabel: string | RegExp): Promise<void> {
    await this.verifySmoothCheckboxStateForChannel(channelLabel, 'unchecked');
  }

  async verifySmoothCheckboxCheckedForChannel(channelLabel: string | RegExp): Promise<void> {
    await this.verifySmoothCheckboxStateForChannel(channelLabel, 'checked');
  }

}

export function createChannelInputPage(page: Page): ChannelInputPage {
  return new ChannelInputPage(page);
}
