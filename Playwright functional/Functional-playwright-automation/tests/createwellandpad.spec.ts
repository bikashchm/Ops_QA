import { test } from '../fixtures';
import { createLoginPage } from '../pages/LoginPage';
import { createPadWellPage } from '../pages/PadWellPage';
import { TestDataManager } from '../excel/TestDataManager';
import { generatePadWellNames } from '../helpers/testDataHelper';
import { URLS } from '../constants/urls';

test('create new pad and well with unique names @smoke @regression @admin', async ({ page, framework }) => {
  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const { padName, wellName, wellApi14Digits } = generatePadWellNames();

  // UAT Company Name / Service Company Name (separate dropdowns)
  const companyName = testData.get('CompanyName', {
    fallback: testData.get('Operator', { fallback: 'QA Operator' }),
  });
  const serviceCompanyName = testData.get('ServiceCompanyName', {
    fallback: testData.get('ServiceCompany', { fallback: 'QA service' }),
  });
  const prospect = testData.get('Prospect', { fallback: 'live plus field' });

  const loginPage = createLoginPage(page);
  const padWellPage = createPadWellPage(page);

  // --- Business flow (data from Excel + runtime generated names) ---
  await framework.navigation.gotoAndWait(URLS.authUrl);
  await loginPage.login(email, password);
  await loginPage.waitForAuthenticatedApp();
  await loginPage.openStimulationTab();
  await loginPage.clickContinue();

  await padWellPage.createPadAndWell({
    padName,
    wellName,
    wellApi14Digits,
    prospect,
    operator: companyName,
    serviceCompany: serviceCompanyName,
  });

  // --- Validations ---
  await padWellPage.verifySavedOnDashboard(padName, wellName);
  await padWellPage.openSavedPadAndWell(padName, wellName);
  await padWellPage.verifyFormValues({
    padName,
    wellName,
    prospect,
    operator: companyName,
    serviceCompany: serviceCompanyName,
    compRepresentative: 'Bikash',
    supervisor: 'Kumar',
    treatmentAnalyst: 'Bikash',
  });

  // --- Write-back for downstream tests (Plot, Version Control, WellAndTreatment, etc.) ---
  testData.writeCreatedPadAndWell(padName, wellName, wellApi14Digits);
  testData.setMany({
    CompanyName: companyName,
    Operator: companyName,
    ServiceCompanyName: serviceCompanyName,
    ServiceCompany: serviceCompanyName,
  });
  testData.recordTestResult({
    testName: 'create new pad and well with unique names',
    status: 'PASSED',
    notes:
      `pad=${padName}; well=${wellName}; wellApi=${wellApi14Digits}; ` +
      `company=${companyName}; serviceCompany=${serviceCompanyName}`,
  });
});
