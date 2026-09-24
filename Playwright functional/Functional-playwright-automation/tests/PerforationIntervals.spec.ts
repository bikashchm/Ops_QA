import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createLoginPage } from '../pages/LoginPage';
import { createPerforationIntervalsPage } from '../pages/PerforationIntervalsPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

test.describe.configure({ retries: 1 });

/**
 * Wellbore Configuration → Perforation Intervals.
 * Padname / WellName from Excel (createwellandpad write-back).
 * Grid/dialog values from Excel PI_* keys (auto-written when empty).
 * Edit Clusters dialog uses Playwright clear() before fill (same pattern as Casing / Surface Line).
 */
test('verify perforation intervals wellbore configuration @regression @job', async ({
  page,
  framework,
}) => {
  test.setTimeout(360_000);

  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const flow = testData.getPerforationIntervalsFlowData();

  if (!flow.padName || !flow.wellName) {
    throw new Error(
      'Padname / WellName missing in Excel. Run createwellandpad.spec.ts first.',
    );
  }

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const perforationPage = createPerforationIntervalsPage(page);

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

  await test.step('Run Perforation Intervals flow', async () => {
    await perforationPage.runPerforationIntervalsFlow(flow);
  });

  testData.recordTestResult({
    testName: 'verify perforation intervals wellbore configuration',
    status: 'PASSED',
    notes:
      `pad=${flow.padName}; well=${flow.wellName}; ` +
      `c1=${flow.cluster1.topMd}-${flow.cluster1.botMd}|perfs=${flow.cluster1.noOfPerfs}; ` +
      `c2=${flow.cluster2.topMd}-${flow.cluster2.botMd}|perfs=${flow.cluster2.noOfPerfs}`,
  });
});
