import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createLoginPage } from '../pages/LoginPage';
import { createTreatmentTotalsPage } from '../pages/TreatmentTotalsPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

test.describe.configure({ retries: 1 });

test('verify treatment totals tab values and chrome @regression @job', async ({
  page,
  framework,
}) => {
  test.setTimeout(600_000);

  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const totalsData = testData.getTreatmentTotalsFlowData();
  const { padName, wellName, companyButtonName } = totalsData;

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const totalsPage = createTreatmentTotalsPage(page);

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

  await test.step('Open Treatment Schedule → Treatment Totals and verify Excel values', async () => {
    await totalsPage.openTreatmentSchedule();
    await totalsPage.openTreatmentTotalsTab();
    await totalsPage.verifyTreatmentTotalsFromExcel(totalsData);
  });

  testData.recordTestResult({
    testName: 'verify treatment totals tab values and chrome',
    status: 'PASSED',
    notes: `pad=${padName}; well=${wellName}; treatment-totals=verified`,
  });
});
