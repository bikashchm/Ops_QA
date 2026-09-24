import { type Page } from '@playwright/test';
import { test } from '../fixtures';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import { createLoginPage } from '../pages/LoginPage';
import { createPlotPage, FRACPRO_LIVE_PLOT_TYPES } from '../pages/PlotPage';
import { createWellSelectionPage } from '../pages/WellSelectionPage';

test.describe.configure({ retries: 1 });

const STEP_DELAY_MS = 5_000;

async function pauseAfterStep(page: Page): Promise<void> {
  await page.waitForTimeout(STEP_DELAY_MS);
}

test('verify plot page layout and default elements @regression @job', async ({ page, framework }) => {
  test.setTimeout(720_000);

  const testData = TestDataManager.getDefault();
  const { email, password } = testData.getCredentials();
  const { padName, wellName, companyButtonName } = testData.getPadWellData();
  const { treatmentId } = testData.getPlotDirectNavData();

  const loginPage = createLoginPage(page);
  const wellSelectionPage = createWellSelectionPage(page);
  const plotPage = createPlotPage(page);
  plotPage.setTreatmentId(treatmentId);

  await framework.navigation.gotoAndWait(URLS.authUrl);
  await loginPage.waitForLoginScreen();
  await loginPage.login(email, password);
  await loginPage.waitForAuthenticatedApp();
  await loginPage.openStimulationTab();
  await loginPage.clickContinue();
  await pauseAfterStep(page);

  await wellSelectionPage.searchPadAndOpenWell({
    padName,
    wellName,
    companyButtonName,
  });
  await pauseAfterStep(page);

  await test.step('Open Plot from Results menu', async () => {
    await plotPage.openFromResultsMenu();
    await pauseAfterStep(page);
  });

  await test.step('Open Plot List once and keep it open', async () => {
    await plotPage.openPlotList();
    await pauseAfterStep(page);
  });

  const baseline = await test.step('Create baseline plots and save names to Excel', async () => {
    const created = await plotPage.createBaselinePlotsIfRequired(testData);
    await pauseAfterStep(page);
    return created;
  });

  await test.step('Validate Plots header, Fracpro Live+ categories, selection, and + New Plot', async () => {
    await plotPage.verifyPlotsMenuHeader();
    await plotPage.validateFracProPlots();
    for (const plotName of FRACPRO_LIVE_PLOT_TYPES) {
      await plotPage.selectPlot(plotName);
      await plotPage.validatePlotHeader(plotName);
      await plotPage.validateNewPlotAvailability(plotName);
    }
    await plotPage.selectPlot('Surf PRC');
    await pauseAfterStep(page);
  });

  await test.step('Validate Save Plot popup, default names, and duplicate name', async () => {
    await plotPage.validateSavePlotPopup();
    await plotPage.verifyDefaultPlotNameForEnabledCategories();
    await plotPage.validateDuplicatePlotName();
    await pauseAfterStep(page);
  });

  const tempUserDefined = await test.step('Create temporary user-defined plot', async () => {
    const name = plotPage.generateUniquePlotName('UD Plot');
    await plotPage.createUserDefinedPlot(name);
    await pauseAfterStep(page);
    return name;
  });

  const tempPadPlot = await test.step('Create temporary pad plot', async () => {
    const name = plotPage.generateUniquePlotName('Pad Plot');
    await plotPage.createPadPlot(name);
    await pauseAfterStep(page);
    return name;
  });

  const renamedUserDefined = await test.step('Rename temporary user-defined plot', async () => {
    const newName = plotPage.generateUniquePlotName('Renamed UD');
    await plotPage.renamePlot(tempUserDefined, newName, 'User-defined Plots');
    await pauseAfterStep(page);
    return newName;
  });

  const renamedPadPlot = await test.step('Rename temporary pad plot', async () => {
    const newName = plotPage.generateUniquePlotName('Renamed Pad');
    await plotPage.renamePlot(tempPadPlot, newName, 'Pad Plots');
    await pauseAfterStep(page);
    return newName;
  });

  await test.step('Close and reopen Plot List — verify persistence', async () => {
    await plotPage.verifyPlotPersistenceAfterReopen({
      userDefined: [baseline.userDefinedName, renamedUserDefined],
      padPlots: [baseline.padPlotName, renamedPadPlot],
    });
    await pauseAfterStep(page);
  });

  await test.step('Delete only temporary user-defined plot — keep baseline', async () => {
    await plotPage.deletePlot(renamedUserDefined, 'User-defined Plots');
    await plotPage.validatePlotNotExists(renamedUserDefined);
    await plotPage.validatePlotExists(baseline.userDefinedName, 'User-defined Plots');
    await pauseAfterStep(page);
  });

  await test.step('Delete only temporary pad plot — keep baseline', async () => {
    await plotPage.deletePlot(renamedPadPlot, 'Pad Plots');
    await plotPage.validatePlotNotExists(renamedPadPlot);
    await plotPage.validatePlotExists(baseline.padPlotName, 'Pad Plots');
    await pauseAfterStep(page);
  });

  testData.recordTestResult({
    testName: 'verify plot page layout and default elements',
    status: 'PASSED',
    notes:
      `pad=${padName}; well=${wellName}; baselineUd=${baseline.userDefinedName}; ` +
      `baselinePad=${baseline.padPlotName}; tempRenameDelete=user-defined|pad-plot`,
  });
});
