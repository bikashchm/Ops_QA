import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createActualTreatmentScheduledPage } from '../pages/ActualTreatmentScheduledPage';
import { createLoginPage } from '../pages/LoginPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

test.describe.configure({ retries: 1 });

test('verify actual treatment schedule import from design @regression @job', async ({
  page,
  framework,
}) => {
  test.setTimeout(600_000);

  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  // Pad/Well + imported Design values come from Liveplus_TestData.xlsx
  const designData = testData.getDesignTreatmentFlowData();
  const { padName, wellName, companyButtonName } = designData;

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const actualPage = createActualTreatmentScheduledPage(page);

  // --- Login (current env URL + Excel Email/Password) ---
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

  await test.step('Open Treatment Schedule → Actual tab and verify chrome', async () => {
    await actualPage.openTreatmentSchedule();
    await actualPage.openActualTreatmentTab();
    await actualPage.verifyActualChrome();
  });

  await test.step('Import from Design and confirm overwrite', async () => {
    await actualPage.importFromDesignAndConfirm();
  });

  await test.step('Assert imported Actual values from Excel Design data', async () => {
    await actualPage.assertImportedSchedule(designData);
    await actualPage.verifyTreatmentDetailsSection();
  });

  await test.step('Tab switch and Material Selection navigation', async () => {
    await actualPage.switchDesignThenActual();
    await actualPage.navigateMaterialThenBackToTreatment();
  });

  testData.recordTestResult({
    testName: 'verify actual treatment schedule import from design',
    status: 'PASSED',
    notes: `pad=${padName}; well=${wellName}; actual-treatment=import-verified`,
  });
});
