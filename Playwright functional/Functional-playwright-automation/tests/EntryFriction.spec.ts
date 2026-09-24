import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createEntryFrictionPage } from '../pages/EntryFrictionPage';
import { createLoginPage } from '../pages/LoginPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

/**
 * Analysis → Entry Friction.
 * Padname / WellName from Excel; EntryFriction_* keys written when missing.
 * Asserts page chrome, perforation data, fluid select, step-down, Cramer params.
 */
test('verify entry friction analysis page and cramer params @regression @job', async ({
  page,
  framework,
}) => {
  test.setTimeout(300_000);

  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const flowData = testData.getEntryFrictionFlowData();
  const { padName, wellName, companyButtonName } = flowData;

  if (!padName || !wellName) {
    throw new Error(
      'Padname / WellName missing in Excel. Run createwellandpad.spec.ts first.',
    );
  }

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const entryFriction = createEntryFrictionPage(page);

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

  await test.step('Run Entry Friction flow (Excel-driven)', async () => {
    await entryFriction.runEntryFrictionFlow(flowData);
  });

  testData.recordTestResult({
    testName: 'verify entry friction analysis page and cramer params',
    status: 'PASSED',
    notes: `pad=${padName}; well=${wellName}; fluid=${flowData.fluidName}`,
  });
});
