import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createDashboardPage } from '../pages/DashboardPage';
import { createLoginPage } from '../pages/LoginPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

/**
 * Dashboard → + New Dashboad.
 * Padname / WellName from Excel; Dashboard_* names written when missing.
 * Selects Surf PRC, Btm PRC, plus PlotBaselineUserDefinedName / PlotBaselinePadPlotName from Excel.
 */
test('verify dashboard create rename and delete @regression @job', async ({
  page,
  framework,
}) => {
  test.setTimeout(360_000);

  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const flowData = testData.getDashboardFlowData();
  const { padName, wellName, companyButtonName } = flowData;

  if (!padName || !wellName) {
    throw new Error(
      'Padname / WellName missing in Excel. Run createwellandpad.spec.ts first.',
    );
  }

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const dashboard = createDashboardPage(page);

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

  await test.step('Run Dashboard flow (Excel-driven names)', async () => {
    await dashboard.runDashboardFlow(flowData);
  });

  testData.recordTestResult({
    testName: 'verify dashboard create rename and delete',
    status: 'PASSED',
    notes:
      `pad=${padName}; well=${wellName}; save=${flowData.saveName}; rename=${flowData.renameName}; ` +
      `delete=${flowData.deleteName}; plots=${flowData.requiredPlots.join('|')}`,
  });
});
