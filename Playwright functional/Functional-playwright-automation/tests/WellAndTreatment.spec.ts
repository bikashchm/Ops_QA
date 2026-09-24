import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createLoginPage } from '../pages/LoginPage';
import { createWellAndTreatmentPage } from '../pages/WellAndTreatmentPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

test.describe.configure({ retries: 0 });

/**
 * Runs after createwellandpad.
 * Padname, WellName, and WellAPI are ALWAYS read from Excel (never hardcoded).
 */
test('verify Well & Treatment general, location, and additional info @smoke @regression @job', async ({
  page,
  framework,
}) => {
  test.setTimeout(180_000);

  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();

  // --- Always from Excel (written by createwellandpad) ---
  const { padName, wellName, wellApi, companyButtonName } = testData.getPadWellData();

  if (!padName || !wellName) {
    throw new Error(
      'Padname / WellName missing in Excel. Run createwellandpad.spec.ts first.',
    );
  }
  if (!wellApi) {
    throw new Error(
      'WellAPI not found in Excel. Run createwellandpad.spec.ts first so WellAPI is written.',
    );
  }

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const wellAndTreatmentPage = createWellAndTreatmentPage(page);
  const vanId = testData.get('VanID', { fallback: 'LP_01' });

  // --- Login ---
  await framework.navigation.gotoAndWait(URLS.authUrl);
  await loginPage.waitForLoginScreen();
  await loginPage.login(email, password);
  await loginPage.waitForAuthenticatedApp();
  await loginPage.openStimulationTab();
  await loginPage.clickContinue();

  // --- Excel Padname → search → All → expand pad → Excel WellName ---
  await wellSelectionPage.searchPadAndOpenWell({
    padName,
    wellName,
    companyButtonName,
  });

  await test.step('Open Well & Treatment', async () => {
    await wellAndTreatmentPage.openWellAndTreatmentLink();
  });

  await test.step('Assert pad, well, and Well API from Excel (dynamic)', async () => {
    await wellAndTreatmentPage.assertGeneralInfoFromExcel({
      padName,
      wellName,
      wellApi,
      companyRepresentative: testData.get('CompRepresentative', { fallback: 'Bikash' }),
    });
  });

  await test.step('Verify Location defaults and section labels', async () => {
    await wellAndTreatmentPage.openLocationSection();
    await wellAndTreatmentPage.assertLocationDefaults({
      padName,
      wellName,
      wellApi,
      latitude: testData.get('Latitude', { fallback: '34.54354' }),
      longitude: testData.get('Longitude', { fallback: '33.8765' }),
      elevation: testData.get('Elevation', { fallback: '4.6' }),
      kellyBushing: testData.get('KellyBushing', { fallback: '4.8' }),
    });
  });

  await test.step('Additional Info — MQTT / Seismos / Van ID validation', async () => {
    await wellAndTreatmentPage.openAdditionalInfoSection();
    await wellAndTreatmentPage.assertFleetAndEnableMqttSeismos({
      padName,
      wellName,
      wellApi,
      fleet: testData.get('Fleet', { fallback: 'liveplus fleet' }),
    });
    await wellAndTreatmentPage.assertVanIdRequiredThenFill(vanId);
    await wellAndTreatmentPage.save();
    await wellAndTreatmentPage.assertVanIdPersisted(vanId);
  });

  await test.step('Round-trip Treatment Schedule and disable MQTT / Seismos', async () => {
    await wellAndTreatmentPage.openTreatmentScheduleThenReturn();
    await wellAndTreatmentPage.disableMqttSeismosAndSave();
  });

  testData.recordTestResult({
    testName: 'verify Well & Treatment general, location, and additional info',
    status: 'PASSED',
    notes: `pad=${padName}; well=${wellName}; wellApi=${wellApi}; vanId=${vanId}`,
  });
});
