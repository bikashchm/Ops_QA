import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createCasingPage } from '../pages/CasingPage';
import { createLoginPage } from '../pages/LoginPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

test.describe.configure({ retries: 1 });

/**
 * Wellbore Configuration → Casing.
 * Padname / WellName always from Excel (createwellandpad write-back).
 * Grid values from Excel Casing_* keys (auto-written when empty).
 * Navigation matches DrilledHole / WellAndTreatment (searchPadAndOpenWell).
 */
test('verify casing wellbore configuration @regression @job', async ({ page, framework }) => {
  test.setTimeout(300_000);

  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const flow = testData.getCasingFlowData();

  if (!flow.padName || !flow.wellName) {
    throw new Error(
      'Padname / WellName missing in Excel. Run createwellandpad.spec.ts first.',
    );
  }

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const casingPage = createCasingPage(page);

  await framework.navigation.gotoAndWait(URLS.authUrl);
  await loginPage.waitForLoginScreen();
  await loginPage.login(email, password);
  await loginPage.waitForAuthenticatedApp();
  await loginPage.openStimulationTab();
  await loginPage.clickContinue();

  // --- Excel Padname + WellName (same navigation as DrilledHole / WellAndTreatment) ---
  await wellSelectionPage.searchPadAndOpenWell({
    padName: flow.padName,
    wellName: flow.wellName,
    companyButtonName: flow.companyButtonName,
  });

  await test.step('Run Casing HandsOnTable flow', async () => {
    await casingPage.runCasingFlow(flow);
  });

  testData.recordTestResult({
    testName: 'verify casing wellbore configuration',
    status: 'PASSED',
    notes:
      `pad=${flow.padName}; well=${flow.wellName}; ` +
      `rows=${flow.rows.map((r) => `${r.topMd}-${r.botMd}|od=${r.od}|wt=${r.weight}`).join(';')}`,
  });
});
