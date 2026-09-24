import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createLoginPage } from '../pages/LoginPage';
import { createPostJobDataPage } from '../pages/PostJobDataPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

/**
 * Results → Report → Post Job Data.
 * Padname / WellName from Excel; PostJobData_* keys written when missing.
 * Verifies defaults, Clear Data, fill from Excel, Save, and persistence.
 */
test('verify post job data fill clear and save @regression @job', async ({
  page,
  framework,
}) => {
  test.setTimeout(300_000);

  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const postJobData = testData.getPostJobDataFlowData();
  const { padName, wellName, companyButtonName } = postJobData;

  if (!padName || !wellName) {
    throw new Error(
      'Padname / WellName missing in Excel. Run createwellandpad.spec.ts first.',
    );
  }

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const postJobDataPage = createPostJobDataPage(page);

  await framework.navigation.gotoAndWait(URLS.authUrl);
  await loginPage.waitForLoginScreen();
  await loginPage.login(email, password);
  await loginPage.waitForAuthenticatedApp();
  await loginPage.openStimulationTab();
  await loginPage.clickContinue();

  await wellSelectionPage.searchPadAndOpenWell({
    padName,
    wellName,
    companyButtonName,
  });

  await test.step('Run Post Job Data flow (Excel-driven)', async () => {
    await postJobDataPage.runPostJobDataFlow(postJobData);
  });

  testData.recordTestResult({
    testName: 'verify post job data fill clear and save',
    status: 'PASSED',
    notes: `pad=${padName}; well=${wellName}; entry=results-report-post-job-data`,
  });
});
