import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createJobCommentPage } from '../pages/JobCommentPage';
import { createLoginPage } from '../pages/LoginPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

test.describe.configure({ retries: 1 });

test('verify job comments entry and persistence @regression @job', async ({ page, framework }) => {
  test.setTimeout(300_000);

  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const { padName, wellName, companyButtonName } = testData.getPadWellData();

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const jobCommentPage = createJobCommentPage(page);

  // --- Login (current env URL + Excel Email/Password; window maximized via fixtures) ---
  await framework.navigation.gotoAndWait(URLS.authUrl);
  await loginPage.waitForLoginScreen();
  await loginPage.login(email, password);
  await loginPage.waitForAuthenticatedApp();
  await loginPage.openStimulationTab();
  await loginPage.clickContinue();

  // --- Excel: Padname + WellName → search → All → company → pad → well ---
  await wellSelectionPage.searchPadAndOpenWell({
    padName,
    wellName,
    companyButtonName,
  });

  await test.step('Open Comments tab and verify headers', async () => {
    await jobCommentPage.openCommentsTab();
    await jobCommentPage.verifyCommentsTableHeaders();
  });

  await test.step('Fill hardcoded comment rows and save', async () => {
    await jobCommentPage.fillHardcodedCommentRows();
    await jobCommentPage.saveComments();
    await jobCommentPage.assertAllSavedCommentRows();
  });

  await test.step('Verify comments persist after tab switch', async () => {
    await jobCommentPage.openGeneralInformationTab();
    await jobCommentPage.openCommentsTab();
    await jobCommentPage.assertPersistedCommentsAfterTabSwitch();
  });

  await test.step('Refresh page and verify comments + Next button', async () => {
    await jobCommentPage.refreshPage();
    await jobCommentPage.openCommentsTab();
    await jobCommentPage.assertPersistedCommentsAfterRefresh();
    await jobCommentPage.verifyNextButtonVisible();
  });

  testData.recordTestResult({
    testName: 'verify job comments entry and persistence',
    status: 'PASSED',
    notes: `pad=${padName}; well=${wellName}; job-comments=verified`,
  });
});
