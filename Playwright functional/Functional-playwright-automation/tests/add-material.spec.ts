import { test } from '../fixtures';
import { createLoginPage } from '../pages/LoginPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';
import { createMaterialSelectionPage } from '../pages/MaterialSelectionPage';
import { TestDataManager } from '../excel/TestDataManager';
import { URLS } from '../constants/urls';

test('add fluids and proppants on material selection @regression @job', async ({ page, framework }) => {
  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const { padName, wellName, companyButtonName } = testData.getPadWellData();

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const materialSelectionPage = createMaterialSelectionPage(page);

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

  // --- Material selection: fluids + proppants only (Excel-driven) ---
  const materialData = testData.getMaterialSelectionData();
  await materialSelectionPage.runFluidAndProppantSelectionFlow(materialData);

  testData.recordTestResult({
    testName: 'add fluids and proppants on material selection',
    status: 'PASSED',
    notes: `pad=${padName}; well=${wellName}`,
  });
});
