import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createLoginPage } from '../pages/LoginPage';
import { createUserDefinedChannelsPage } from '../pages/UserDefinedChannelsPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

test('validate user-defined channels editor flow @regression @job', async ({ page, framework }) => {
  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const { padName, wellName, companyButtonName } = testData.getPadWellData();

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const userDefinedChannelsPage = createUserDefinedChannelsPage(page);

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

  await test.step('Run User-defined Channels editor flow', async () => {
    await userDefinedChannelsPage.runUserDefinedChannelsFlow();
  });

  await test.step('Prevent duplicate channel with same name and criteria', async () => {
    await userDefinedChannelsPage.verifyDuplicateChannelPrevention();
  });

  testData.recordTestResult({
    testName: 'validate user-defined channels editor flow',
    status: 'PASSED',
    notes: `pad=${padName}; well=${wellName}; duplicate-prevention=verified`,
  });
});
