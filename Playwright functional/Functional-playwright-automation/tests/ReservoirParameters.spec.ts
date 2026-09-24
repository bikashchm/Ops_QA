import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createLoginPage } from '../pages/LoginPage';
import { createReservoirParametersPage } from '../pages/ReservoirParametersPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

test.describe.configure({ retries: 1 });

test('verify reservoir parameters defaults, fill and persistence @regression @job', async ({
  page,
  framework,
}) => {
  test.setTimeout(420_000);

  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const { padName, wellName, companyButtonName, defaults, fill } =
    testData.getReservoirParametersFlowData();

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const reservoirPage = createReservoirParametersPage(page);

  // --- Login (current env URL + Excel Email/Password; window maximized via fixtures) ---
  await framework.navigation.gotoAndWait(URLS.authUrl);
  await loginPage.waitForLoginScreen();
  await loginPage.login(email, password);
  await loginPage.waitForAuthenticatedApp();
  await loginPage.openStimulationTab();
  await loginPage.clickContinue();

  // --- Excel: Padname + WellName ---
  await wellSelectionPage.searchPadAndOpenWell({
    padName,
    wellName,
    companyButtonName,
  });

  await test.step('Open Reservoir Parameters from Inputs menu', async () => {
    await reservoirPage.openFromInputsMenu();
  });

  await test.step('Verify field labels, units and Next button', async () => {
    await reservoirPage.verifyFieldLabels();
    await reservoirPage.verifyUnits();
    await reservoirPage.verifyNextButtonVisible();
  });

  await test.step('Fill Excel values, select lithology, save and assert', async () => {
    await reservoirPage.fillReservoirFields(fill);
    await reservoirPage.selectLithology(fill.lithology);
    await reservoirPage.save();
    await reservoirPage.assertSavedFillValues(fill, defaults.closureStressDisplay);
  });

  await test.step('Refresh and re-assert saved Excel values', async () => {
    await reservoirPage.refreshPage();
    await reservoirPage.assertSavedFillValues(fill, defaults.closureStressDisplay);
  });

  testData.recordTestResult({
    testName: 'verify reservoir parameters defaults, fill and persistence',
    status: 'PASSED',
    notes: `pad=${padName}; well=${wellName}; reservoir-parameters=verified`,
  });
});
