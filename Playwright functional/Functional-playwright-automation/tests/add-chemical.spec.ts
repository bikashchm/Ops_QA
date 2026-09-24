import { test } from '../fixtures';
import { createLoginPage } from '../pages/LoginPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';
import { createChemicalSelectionPage } from '../pages/ChemicalSelectionPage';
import { TestDataManager } from '../excel/TestDataManager';
import { URLS } from '../constants/urls';

test('add chemicals on material selection @regression @job', async ({ page, framework }) => {
  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const { padName, wellName, companyButtonName } = testData.getPadWellData();

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const chemicalSelectionPage = createChemicalSelectionPage(page);

  // --- Login ---
  await framework.navigation.gotoAndWait(URLS.authUrl);
  await loginPage.login(email, password);
  await loginPage.waitForAuthenticatedApp();
  await loginPage.openStimulationTab();
  await loginPage.clickContinue();

  // --- Excel: Padname + WellName → search → All → click pad → click well ---
  await wellSelectionPage.searchPadAndOpenWell({
    padName,
    wellName,
    companyButtonName,
  });

  // --- Chemical Selection (Excel Chemical1-4, Unitcolumn, TypeColumn) ---
  const { chemicals } = testData.getMaterialSelectionData();
  await chemicalSelectionPage.runChemicalSelectionFlow(chemicals);

  testData.recordTestResult({
    testName: 'add chemicals on material selection',
    status: 'PASSED',
    notes: `pad=${padName}; well=${wellName}`,
  });
});
