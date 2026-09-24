import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createLoginPage } from '../pages/LoginPage';
import { createPathSummaryPage } from '../pages/PathSummaryPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

test.describe.configure({ retries: 1 });

/**
 * Wellbore Configuration → Path Summary.
 * Padname / WellName from Excel (createwellandpad write-back).
 * Expected volume / MD values from Excel PathSummary_* keys (auto-written when empty).
 */
test('verify path summary wellbore configuration @regression @job', async ({
  page,
  framework,
}) => {
  test.setTimeout(240_000);

  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const flow = testData.getPathSummaryFlowData();

  if (!flow.padName || !flow.wellName) {
    throw new Error(
      'Padname / WellName missing in Excel. Run createwellandpad.spec.ts first.',
    );
  }

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const pathSummaryPage = createPathSummaryPage(page);

  await framework.navigation.gotoAndWait(URLS.authUrl);
  await loginPage.waitForLoginScreen();
  await loginPage.login(email, password);
  await loginPage.waitForAuthenticatedApp();
  await loginPage.openStimulationTab();
  await loginPage.clickContinue();

  await wellSelectionPage.searchPadAndOpenWell({
    padName: flow.padName,
    wellName: flow.wellName,
    companyButtonName: flow.companyButtonName,
  });

  await test.step('Run Path Summary flow', async () => {
    await pathSummaryPage.runPathSummaryFlow(flow);
  });

  testData.recordTestResult({
    testName: 'verify path summary wellbore configuration',
    status: 'PASSED',
    notes: `pad=${flow.padName}; well=${flow.wellName}; path=${flow.injectionPathOption}; md=${flow.expectedMdWellTransitTime}`,
  });
});
