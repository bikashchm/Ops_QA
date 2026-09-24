import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createDesignTreatmentScheduledPage } from '../pages/DesignTreatmentScheduledPage';
import { createLoginPage } from '../pages/LoginPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

test('verify design treatment schedule fill and persistence @regression @job', async ({
  page,
  framework,
}) => {
  test.setTimeout(360_000);

  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const designData = testData.getDesignTreatmentFlowData();
  const { padName, wellName, companyButtonName } = designData;

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const designPage = createDesignTreatmentScheduledPage(page);

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

  await test.step('Open Treatment Schedule → Design tab and verify chrome', async () => {
    await designPage.openTreatmentSchedule();
    await designPage.openDesignTreatmentTab();
    await designPage.verifyDesignChrome();
  });

  await test.step('Select custom columns and enter Edit Schedule', async () => {
    await designPage.selectAllCustomColumns();
    await designPage.enterEditScheduleMode();
  });

  await test.step('Fill Excel row 1 and row 2 values', async () => {
    await designPage.fillRow1(designData.row1);
    await designPage.fillRow2(designData.row2);
  });

  await test.step('Save and assert Excel values', async () => {
    await designPage.saveSchedule();
    await designPage.assertRow1Values(designData.row1);
    await designPage.assertRow2Values(designData.row2, true);
    await designPage.assertTotals(designData);
  });

  await test.step('Tab switch and refresh', async () => {
    await designPage.switchActualThenDesign();
    await designPage.refreshPage();
    await designPage.stopEditing();
  });

  await test.step('Switch Ramped → Staged and stop editing', async () => {
    await designPage.enterEditScheduleMode();
    await designPage.switchPropMode(designData.propModeRamped);
    await designPage.saveSchedule();
    await designPage.assertRampedMode(designData);
    await designPage.switchPropMode(designData.propModeStaged);
    await designPage.saveSchedule();
    await designPage.assertStagedChipVisible();
    await designPage.stopEditing();
  });

  testData.recordTestResult({
    testName: 'verify design treatment schedule fill and persistence',
    status: 'PASSED',
    notes: `pad=${padName}; well=${wellName}; design-treatment=verified`,
  });
});
