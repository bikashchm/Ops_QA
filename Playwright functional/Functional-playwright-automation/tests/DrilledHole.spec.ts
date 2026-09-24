import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createDrilledHolePage } from '../pages/DrilledHolePage';
import { createLoginPage } from '../pages/LoginPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

test.describe.configure({ retries: 1 });

/**
 * Wellbore Configuration → Drilled Hole.
 * Padname / WellName always from Excel (createwellandpad write-back).
 * Grid values from Excel DrilledHole_* keys (auto-written when empty).
 */
test('verify drilled hole wellbore configuration @regression @job', async ({ page, framework }) => {
  test.setTimeout(300_000);

  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const flow = testData.getDrilledHoleFlowData();

  if (!flow.padName || !flow.wellName) {
    throw new Error(
      'Padname / WellName missing in Excel. Run createwellandpad.spec.ts first.',
    );
  }

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const drilledHolePage = createDrilledHolePage(page);

  await framework.navigation.gotoAndWait(URLS.authUrl);
  await loginPage.waitForLoginScreen();
  await loginPage.login(email, password);
  await loginPage.waitForAuthenticatedApp();
  await loginPage.openStimulationTab();
  await loginPage.clickContinue();

  // --- Excel Padname + WellName (same navigation as WellAndTreatment.spec.ts) ---
  await wellSelectionPage.searchPadAndOpenWell({
    padName: flow.padName,
    wellName: flow.wellName,
    companyButtonName: flow.companyButtonName,
  });

  await test.step('Run Drilled Hole HandsOnTable flow', async () => {
    await drilledHolePage.runDrilledHoleFlow(flow);
  });

  testData.recordTestResult({
    testName: 'verify drilled hole wellbore configuration',
    status: 'PASSED',
    notes:
      `pad=${flow.padName}; well=${flow.wellName}; ` +
      `rows=${flow.rows.map((r) => `${r.topMd}-${r.botMd}`).join('|')}; ` +
      `validation=${flow.validationMessage}`,
  });
});
