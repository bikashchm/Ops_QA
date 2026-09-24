import { test } from '../fixtures';
import { createLoginPage } from '../pages/LoginPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';
import { createEditFluidPage } from '../pages/EditFluidPage';
import { TestDataManager } from '../excel/TestDataManager';
import { URLS } from '../constants/urls';

test('edit fluid rheology, thermal properties and chemicals @regression @job', async ({ page, framework }) => {
  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const { padName, wellName, companyButtonName } = testData.getPadWellData();

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const editFluidPage = createEditFluidPage(page);

  // --- Login (credentials from Excel + UAT env) ---
  await framework.navigation.gotoAndWait(URLS.authUrl);
  await loginPage.login(email, password);
  await loginPage.waitForAuthenticatedApp();
  await loginPage.openStimulationTab();
  await loginPage.clickContinue();

  // --- Excel: search pad → All filter → pad → well ---
  await wellSelectionPage.searchPadAndOpenWell({
    padName,
    wellName,
    companyButtonName,
  });

  // --- Edit fluid: wellbore, rheology, thermal properties, chemicals (Excel-driven) ---
  const editFluidData = testData.getEditFluidTestData();
  await editFluidPage.runEditFluidFlow(editFluidData);

  testData.recordTestResult({
    testName: 'edit fluid rheology, thermal properties and chemicals',
    status: 'PASSED',
    notes: `pad=${padName}; well=${wellName}`,
  });
});
