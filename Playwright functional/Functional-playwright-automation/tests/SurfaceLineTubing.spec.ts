import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createLoginPage } from '../pages/LoginPage';
import { createSurfaceLineTubingPage } from '../pages/SurfaceLineTubingPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

test.describe.configure({ retries: 1 });

/**
 * Wellbore Configuration → Surface Line/Tubing.
 * Padname / WellName from Excel (createwellandpad write-back).
 * Grid values from Excel SLT_* keys (auto-written when empty).
 * Row 2 Surf Line/Tubing type = Packer. OD/Weight scroll + Weight re-enter after ID (Casing pattern).
 */
test('verify surface line tubing wellbore configuration @regression @job', async ({
  page,
  framework,
}) => {
  test.setTimeout(300_000);

  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const flow = testData.getSurfaceLineTubingFlowData();

  if (!flow.padName || !flow.wellName) {
    throw new Error(
      'Padname / WellName missing in Excel. Run createwellandpad.spec.ts first.',
    );
  }

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const surfacePage = createSurfaceLineTubingPage(page);

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

  await test.step('Run Surface Line/Tubing HandsOnTable flow', async () => {
    await surfacePage.runSurfaceLineTubingFlow(flow);
  });

  testData.recordTestResult({
    testName: 'verify surface line tubing wellbore configuration',
    status: 'PASSED',
    notes:
      `pad=${flow.padName}; well=${flow.wellName}; ` +
      `rows=${flow.rows.map((r) => `${r.topMd}-${r.botMd}|type=${r.typeDisplay}|od=${r.od}|wt=${r.weight}`).join(';')}`,
  });
});
