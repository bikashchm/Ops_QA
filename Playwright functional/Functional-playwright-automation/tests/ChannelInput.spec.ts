import { test, expect } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createChannelInputPage } from '../pages/ChannelInputPage';
import { createLoginPage } from '../pages/LoginPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

test.describe.configure({ retries: 1 });

test('validate channel input model tab defaults and options @regression @job', async ({
  page,
  framework,
}) => {
  test.setTimeout(600_000);

  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const channelData = testData.getChannelInputFlowData();
  const { padName, wellName, companyButtonName, smoothChannels } = channelData;

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const channelInputPage = createChannelInputPage(page);
  channelInputPage.setTestData(channelData);

  // --- Login (current env URL + Excel Email/Password) ---
  await framework.navigation.gotoAndWait(URLS.authUrl);
  await loginPage.waitForLoginScreen();
  await loginPage.login(email, password);
  await loginPage.waitForAuthenticatedApp();
  await loginPage.openStimulationTab();
  await loginPage.clickContinue();

  // --- Excel: Padname + WellName ---
  await wellSelectionPage.searchPadAndOpenWell({
    padName,
    wellName,
    companyButtonName,
  });

  await test.step('Open Channel Inputs for Model', async () => {
    await channelInputPage.openChannelInputsForModel();
  });

  await test.step('Verify page chrome and model headers/units from Excel', async () => {
    await channelInputPage.verifyPageLevelElements();
    await channelInputPage.verifyModelInputHeadersAndUnits();
    await channelInputPage.verifyChannelOptionPanels();
    await channelInputPage.verifyNumberOfFlowmetersIsEditable();
  });

  await test.step('Verify Parameters, Channel Options, and Observed Net Pressure sections', async () => {
    await channelInputPage.verifyBottomPanelSectionsBeforeSmoothCheckbox();
  });

  const persistenceResults = await test.step(
    'Apply state-based smooth checkbox persistence',
    async () => channelInputPage.applySmoothCheckboxPersistence(smoothChannels),
  );

  await test.step('Validate Additives tab flow', async () => {
    await channelInputPage.validateAdditivesTabFlow();
  });

  await test.step('Validate Real-time Channel tab flow', async () => {
    await channelInputPage.validateRealTimeChannelTabFlow();
  });

  await test.step('Verify measured data panel after save', async () => {
    await channelInputPage.verifyMeasuredDataPanelAfterSave();
  });

  expect(persistenceResults.length).toBe(smoothChannels.length);

  await test.info().attach('smooth-checkbox-persistence', {
    body: JSON.stringify(persistenceResults, null, 2),
    contentType: 'application/json',
  });

  testData.recordTestResult({
    testName: 'validate channel input model tab defaults and options',
    status: 'PASSED',
    notes: `pad=${padName}; well=${wellName}; smoothCheckbox=${JSON.stringify(persistenceResults)}`,
  });
});
