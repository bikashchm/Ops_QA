import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createHeatTransferParametersPage } from '../pages/HeatTransferParametersPage';
import { createLoginPage } from '../pages/LoginPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

test.describe.configure({ retries: 1 });

test('verify heat transfer parameters defaults and form controls @regression @job', async ({
  page,
  framework,
}) => {
  test.setTimeout(420_000);

  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const { padName, wellName, companyButtonName, defaults, fill, grid } =
    testData.getHeatTransferFlowData();

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const heatTransferPage = createHeatTransferParametersPage(page);

  // --- Login (current env URL + Excel Email/Password) ---
  await framework.navigation.gotoAndWait(URLS.authUrl);
  await loginPage.login(email, password);
  await loginPage.waitForAuthenticatedApp();
  await loginPage.openStimulationTab();
  await loginPage.clickContinue();

  // --- Excel: Padname + WellName → search → All → click pad → click well ---
  await wellSelectionPage.searchPadAndOpenWell({
    padName,
    wellName,
    companyButtonName,
  });

  await test.step('Open Heat Transfer Parameters from Inputs menu', async () => {
    await heatTransferPage.openFromInputsMenu();
  });

  await test.step('Verify Heat Transfer page chrome', async () => {
    await heatTransferPage.verifyPageLevelElements(padName, wellName);
  });

  await test.step('Reset form to Excel baseline values', async () => {
    await heatTransferPage.resetToExcelBaseline({ defaults, fill, grid });
  });

  await test.step('Verify temperature field labels and default values', async () => {
    await heatTransferPage.verifyTemperatureFieldDefaults(defaults);
  });

  await test.step('Verify Display Temperature and Use Fracture Center Depth checkbox', async () => {
    await heatTransferPage.verifyDisplayTemperatureAndFracCenterDepth();
  });

  await test.step('Verify multiplier fields', async () => {
    await heatTransferPage.verifyMultiplierFields(defaults);
  });

  await test.step('Verify Offshore Well section', async () => {
    await heatTransferPage.verifyOffshoreWellSection(defaults);
  });

  await test.step('Fill temperature fields', async () => {
    await heatTransferPage.fillTemperatureFields(fill);
  });

  await test.step('Validate multiplier required field errors', async () => {
    await heatTransferPage.validateMultiplierRequiredErrors(fill);
  });

  await test.step('Fill offshore fields and temperature grid', async () => {
    await heatTransferPage.fillOffshoreFields(fill);
    await heatTransferPage.fillTemperatureGrid(grid);
  });

  await test.step('Save and verify saved fill values', async () => {
    await heatTransferPage.save();
    await heatTransferPage.assertSavedFillValues(fill, grid);
  });

  testData.recordTestResult({
    testName: 'verify heat transfer parameters defaults and form controls',
    status: 'PASSED',
    notes: `pad=${padName}; well=${wellName}; heat-transfer=verified`,
  });
});
