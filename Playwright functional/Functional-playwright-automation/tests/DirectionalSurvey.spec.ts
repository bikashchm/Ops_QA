import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createDirectionalSurveyPage } from '../pages/DirectionalSurveyPage';
import { createLoginPage } from '../pages/LoginPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

test.describe.configure({ retries: 1 });

/**
 * Wellbore Configuration → Directional Survey.
 * Padname / WellName from Excel (createwellandpad write-back).
 * Survey rows from Excel sheet `directionalSurvey` (auto-created from screenshot defaults).
 * Paste TSV into HandsOnTable after clear() on start cell, then Save + assert.
 */
test('verify directional survey wellbore configuration @regression @job', async ({
  page,
  framework,
}) => {
  test.setTimeout(300_000);

  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const flow = testData.getDirectionalSurveyFlowData();

  if (!flow.padName || !flow.wellName) {
    throw new Error(
      'Padname / WellName missing in Excel. Run createwellandpad.spec.ts first.',
    );
  }

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const surveyPage = createDirectionalSurveyPage(page);

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

  await test.step('Run Directional Survey paste flow', async () => {
    await surveyPage.runDirectionalSurveyFlow(flow);
  });

  testData.recordTestResult({
    testName: 'verify directional survey wellbore configuration',
    status: 'PASSED',
    notes: `pad=${flow.padName}; well=${flow.wellName}; rows=${flow.rows.length}; mode=${flow.surveyMode}`,
  });
});
