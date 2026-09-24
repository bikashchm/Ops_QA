import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createLoginPage } from '../pages/LoginPage';
import { createPlotInWordReportPage } from '../pages/PlotInWordReportPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

test.describe.configure({ retries: 1 });

/**
 * Results → Report → Plots in Word Report.
 * Padname / WellName from Excel (createwellandpad write-back).
 * Verifies Available Plots (Surf/Btm PRC), report buttons, Surf PRC checkbox, ASCII Report dialog.
 */
test('verify plots in word report and ascii dialog @regression @job', async ({
  page,
  framework,
}) => {
  test.setTimeout(300_000);

  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const { padName, wellName, companyButtonName } = testData.getPadWellData();

  if (!padName || !wellName) {
    throw new Error(
      'Padname / WellName missing in Excel. Run createwellandpad.spec.ts first.',
    );
  }

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const plotInWordReportPage = createPlotInWordReportPage(page);

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

  await test.step('Run Plots in Word Report flow', async () => {
    await plotInWordReportPage.runPlotInWordReportFlow();
  });

  testData.recordTestResult({
    testName: 'verify plots in word report and ascii dialog',
    status: 'PASSED',
    notes: `pad=${padName}; well=${wellName}; entry=results-report-plots-in-word-report`,
  });
});
