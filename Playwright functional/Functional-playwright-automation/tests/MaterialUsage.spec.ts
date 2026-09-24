import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createLoginPage } from '../pages/LoginPage';
import { createMaterialUsagePage } from '../pages/MaterialUsagePage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

/**
 * Results → Report → Material Usage.
 * Padname / WellName from Excel.
 * Asserts chemical/proppant rows (screenshot values), controls, and WITSML/Word downloads.
 */
test('verify material usage report tab and downloads @regression @job', async ({
  page,
  framework,
}) => {
  test.setTimeout(300_000);

  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const usageData = testData.getMaterialUsageFlowData();
  const { padName, wellName, companyButtonName } = usageData;

  if (!padName || !wellName) {
    throw new Error(
      'Padname / WellName missing in Excel. Run createwellandpad.spec.ts first.',
    );
  }

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const materialUsagePage = createMaterialUsagePage(page);

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

  await test.step('Open Material Usage, refresh, reopen tab, assert chemical & proppant', async () => {
    await materialUsagePage.runMaterialUsageFlow(usageData);
  });

  testData.recordTestResult({
    testName: 'verify material usage report tab and downloads',
    status: 'PASSED',
    notes: `pad=${padName}; well=${wellName}; chemicals=${usageData.chemicals.length}; proppant=${usageData.proppant.name}`,
  });
});
