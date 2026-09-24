import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createLoginPage } from '../pages/LoginPage';
import { createReportPage } from '../pages/ReportPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

test.describe.configure({ retries: 1 });

test('verify report page layout and default elements @regression @job', async ({
  page,
  framework,
}) => {
  test.setTimeout(420_000);

  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const { padName, wellName, companyButtonName } = testData.getPadWellData();

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const reportPage = createReportPage(page);

  await framework.navigation.gotoAndWait(URLS.authUrl);
  await loginPage.waitForLoginScreen();
  await loginPage.login(email, password);
  await loginPage.waitForAuthenticatedApp();
  await loginPage.openStimulationTab();
  await loginPage.clickContinue();

  // --- Excel Padname + WellName (same navigation as WellAndTreatment.spec.ts) ---
  await wellSelectionPage.searchPadAndOpenWell({
    padName,
    wellName,
    companyButtonName,
  });

  await test.step('Open Report from Results menu', async () => {
    await reportPage.openFromResultsMenu();
  });

  await test.step('Verify page header with pad, well, version, and stage', async () => {
    await reportPage.verifyPageLevelElements(padName, wellName);
  });

  await test.step('Verify Report tabs', async () => {
    await reportPage.verifyReportTabs();
  });

  await test.step('Verify Available Plots grid headers', async () => {
    await reportPage.verifyAvailablePlotsGrid();
  });

  await test.step('Verify Save and download report buttons', async () => {
    await reportPage.verifyReportActionButtons();
  });

  await test.step('Verify Material Usage tab grid headers and controls', async () => {
    await reportPage.openMaterialUsageTab();
    await reportPage.verifyMaterialUsageGridHeaders();
    await reportPage.verifyMaterialUsageControls();
  });

  await test.step('Verify Post Job Data tab fields, controls, and plot selection', async () => {
    await reportPage.openPostJobDataTab();
    await reportPage.verifyPostJobDataFields();
    await reportPage.verifyPostJobDataControls();
    await reportPage.verifyPostJobDataPlotSelection();
  });

  testData.recordTestResult({
    testName: 'verify report page layout and default elements',
    status: 'PASSED',
    notes: `pad=${padName}; well=${wellName}; entry=results-report; tabs=plots|material-usage|post-job-data`,
  });
});
