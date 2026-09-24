import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createLoginPage } from '../pages/LoginPage';
import { createSchematic2DPage } from '../pages/Schematic2DPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

test.describe.configure({ retries: 1 });

/**
 * Wellbore Configuration → Schematic (1D / 2D).
 * Padname / WellName from Excel (createwellandpad write-back).
 * Verifies Schematic chrome, 1D/2D fullscreen, All Stages, plot-parameter, Exit.
 */
test('verify wellbore schematic 1D and 2D @regression @job', async ({ page, framework }) => {
  test.setTimeout(240_000);

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
  const schematicPage = createSchematic2DPage(page);

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

  await test.step('Run Schematic 1D / 2D flow', async () => {
    await schematicPage.runSchematic2DFlow();
  });

  testData.recordTestResult({
    testName: 'verify wellbore schematic 1D and 2D',
    status: 'PASSED',
    notes: `pad=${padName}; well=${wellName}`,
  });
});
