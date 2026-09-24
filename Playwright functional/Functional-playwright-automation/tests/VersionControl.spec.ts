import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createLoginPage } from '../pages/LoginPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';
import { createVersionControlPage } from '../pages/VersionControlPage';

/**
 * Utilities → Version Control.
 * Padname / WellName from Excel.
 * Owner name/email from VersionControlBaseOwner / VersionControlBaseOwnerEmail
 * (written when missing).
 */
test('verify version control page and owner details @regression @job', async ({
  page,
  framework,
}) => {
  test.setTimeout(180_000);

  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const { padName, wellName, companyButtonName } = testData.getPadWellData();
  const versionConfig = {
    ...testData.getVersionControlTestConfig(),
    padName,
    wellName,
    companyButtonName,
  };

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const versionControl = createVersionControlPage(page, versionConfig);

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

  await test.step('Open Version Control and assert chrome + Excel owner', async () => {
    await versionControl.runVersionControlFlow();
  });

  testData.recordTestResult({
    testName: 'verify version control page and owner details',
    status: 'PASSED',
    notes: `pad=${padName}; well=${wellName}; owner=${versionConfig.baseVersionOwner}; email=${versionConfig.baseVersionOwnerEmail}`,
  });
});
