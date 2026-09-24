import { test, expect, type Locator, type Page } from '@playwright/test';
import { ConfigManager } from '../config/ConfigManager';
import { TestDataManager } from '../excel/TestDataManager';

const ACTION_WAIT_MS = 400;
const SAVE_WAIT_MS = 1200;
const ASSERT_WAIT_MS = 0;

async function waitAndClick(locator: Locator) {
  await locator.waitFor({ state: 'visible' });
  await locator.page().waitForTimeout(ASSERT_WAIT_MS);
  await expect(locator).toBeEnabled();
  await locator.click();
  await locator.page().waitForTimeout(ACTION_WAIT_MS);
}

async function waitAndClearAndType(locator: Locator, value: string) {
  await locator.waitFor({ state: 'visible' });
  await locator.page().waitForTimeout(ASSERT_WAIT_MS);
  await expect(locator).toBeEditable();
  await locator.click();
  await locator.press('ControlOrMeta+a');
  await locator.press('Backspace');
  // Some Angular-controlled inputs keep stale text unless events are fired explicitly.
  await locator.evaluate((el) => {
    const input = el as HTMLInputElement | HTMLTextAreaElement;
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await locator.fill('');
  await locator.pressSequentially(value, { delay: 70 });
  await locator.page().waitForTimeout(ASSERT_WAIT_MS);
  await expect(locator).toHaveValue(value);
  await locator.page().waitForTimeout(ACTION_WAIT_MS);
}

async function waitAndClearAndTypeGridCell(page: Page, cellLocator: Locator, value: string) {
  await cellLocator.waitFor({ state: 'visible' });
  await page.waitForTimeout(ASSERT_WAIT_MS);
  await expect(cellLocator).toBeVisible();

  let typed = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    await cellLocator.dblclick();
    await page.waitForTimeout(ACTION_WAIT_MS);

    const editor = page.locator('textarea').last();
    await editor.waitFor({ state: 'visible' });
    await editor.click();
    await editor.press('ControlOrMeta+a');
    await editor.press('Backspace');
    await editor.fill('');
    await editor.pressSequentially(value, { delay: 70 });

    const current = await editor.inputValue();
    if (current === value) {
      await editor.press('Enter');
      await page.waitForTimeout(ACTION_WAIT_MS);
      typed = true;
      break;
    }

    await page.waitForTimeout(500);
  }

  expect(typed).toBeTruthy();
}

async function waitAndForceSetValue(locator: Locator, value: string) {
  await locator.waitFor({ state: 'visible' });
  await locator.click();
  await locator.press('ControlOrMeta+a');
  await locator.press('Backspace');
  await locator.fill('');
  await locator.pressSequentially(value, { delay: 70 });

  let current = await locator.inputValue();
  if (current !== value) {
    await locator.evaluate((el, nextValue) => {
      const input = el as HTMLInputElement | HTMLTextAreaElement;
      const prototype = Object.getPrototypeOf(input);
      const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      input.focus();
      if (valueSetter) {
        valueSetter.call(input, String(nextValue));
      } else {
        input.value = String(nextValue);
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));
    }, value);
    current = await locator.inputValue();
  }

  if (current !== value) {
    await locator.fill('');
    await locator.fill(value);
  }

  await locator.page().waitForTimeout(ASSERT_WAIT_MS);
  await expect(locator).toHaveValue(value);
  await locator.page().waitForTimeout(ACTION_WAIT_MS);
}

async function waitAndSave(page: Page, buttonName: string) {
  const saveButton = page.getByRole('button', { name: new RegExp(buttonName, 'i') }).first();
  const fallbackYesSaveButton = page.getByRole('button', { name: /Yes,\s*Save/i }).first();

  const saveVisible = await saveButton.isVisible({ timeout: 15000 }).catch(() => false);
  const fallbackVisible = saveVisible ? false : await fallbackYesSaveButton.isVisible({ timeout: 5000 }).catch(() => false);

  const targetButton = saveVisible ? saveButton : fallbackVisible ? fallbackYesSaveButton : null;
  if (!targetButton) {
    // In some transitions, the app autosaves and does not show the confirm modal.
    await page.waitForTimeout(SAVE_WAIT_MS);
    return;
  }

  await page.waitForTimeout(ASSERT_WAIT_MS);
  await expect(targetButton).toBeEnabled();
  await targetButton.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  try {
    await targetButton.click({ timeout: 10000 });
  } catch {
    await targetButton.click({ force: true });
  }
  await page.waitForTimeout(SAVE_WAIT_MS);
}

async function maximizeBrowserWindow(page: Page) {
  // Equivalent of Selenium driver.manage().window().maximize() for Chromium.
  const cdpSession = await page.context().newCDPSession(page);
  const { windowId } = await cdpSession.send('Browser.getWindowForTarget');
  await cdpSession.send('Browser.setWindowBounds', {
    windowId,
    bounds: { windowState: 'maximized' },
  });
}

test('save and next flow with post-save assertions @regression @job', async ({ page }) => {
  test.setTimeout(360000);

  await maximizeBrowserWindow(page);
  await page.goto(ConfigManager.getAuthUrl());
  await page.waitForLoadState('domcontentloaded');

  const { email, password } = TestDataManager.getDefault().getCredentials();
  await waitAndClearAndType(page.getByRole('textbox', { name: 'Email Address' }), email);
  await waitAndClearAndType(page.getByRole('textbox', { name: 'Password' }), password);
  await waitAndClick(page.getByRole('button', { name: 'Sign in' }));

  await waitAndClick(page.getByRole('tab', { name: 'Stimulation' }));
  await waitAndClick(page.getByRole('link', { name: 'Continue' }));

  await waitAndClearAndType(page.getByRole('textbox', { name: 'Search Pad or Well' }), 'Liveplus playwright automation pad4077');
  await waitAndClick(page.getByRole('img', { name: 'img' }));
  await waitAndClick(page.getByRole('radio', { name: 'All' }));
  await waitAndClick(page.getByRole('combobox').getByRole('textbox'));
  await waitAndClick(page.getByLabel('Options list').getByText('All'));
  await waitAndClick(page.getByRole('button', { name: ' Liveplus playwright' }).first());
  await waitAndClick(page.locator('#padDropZone').getByText('liveplus playwright automation well4077'));

  await waitAndForceSetValue(page.locator('#prospect'), 'field2');
  await waitAndClick(page.getByRole('tab', { name: 'Comments' }));
  await waitAndSave(page, 'Yes, Save');

  await waitAndClick(page.getByRole('tab', { name: 'General Information' }));
  await page.waitForTimeout(ASSERT_WAIT_MS);
  await expect(page.locator('#prospect')).toHaveValue('field2');

  await waitAndClick(page.getByRole('tab', { name: 'Comments' }));
  await waitAndClearAndTypeGridCell(page, page.locator('#cell-1-1'), '10');
  await waitAndClearAndTypeGridCell(page, page.locator('#cell-1-2'), 'Well open');

  await waitAndClick(page.getByRole('link', { name: 'Channel Inputs for Model' }));
  await waitAndSave(page, 'Yes, Save');

  await waitAndClick(page.getByRole('link', { name: 'Well & Treatment' }));
  await waitAndClick(page.getByRole('tab', { name: 'Comments' }));
  await page.waitForTimeout(ASSERT_WAIT_MS);
  await expect(page.getByRole('gridcell', { name: '10:' })).toBeVisible();
  await page.waitForTimeout(ASSERT_WAIT_MS);
  await expect(page.getByRole('gridcell', { name: 'Well open' })).toBeVisible();

  await waitAndClick(page.getByRole('link', { name: 'Channel Inputs for Model' }));
  const treatingPressureCheck = page
    .getByRole('row', { name: /Treating Pressure psi/ })
    .locator('input[type="checkbox"]')
    .first();
  await waitAndClick(treatingPressureCheck);
  await waitAndSave(page, 'Yes, Save');

  await waitAndClick(page.getByText('Channel Inputs', { exact: true }));
  await page.waitForTimeout(ASSERT_WAIT_MS);
  await expect(treatingPressureCheck).toBeChecked();

  const bottomholePressureCheck = page
    .getByRole('row', { name: /Bottomhole Pressure psi/ })
    .locator('input[type="checkbox"]')
    .first();
  await waitAndClick(bottomholePressureCheck);

  await waitAndClick(page.getByRole('link', { name: 'Wellbore Configuration' }));
  await waitAndClick(page.getByRole('link', { name: 'Channel Inputs for Model' }));
  await page.waitForTimeout(ASSERT_WAIT_MS);
  await expect(bottomholePressureCheck).toBeChecked();

  await waitAndClick(page.getByRole('link', { name: 'Wellbore Configuration' }));
  await waitAndClearAndTypeGridCell(page, page.locator('#cell-0-1'), '100');
  await waitAndClearAndTypeGridCell(page, page.locator('#cell-0-2'), '1000');
  await waitAndClick(page.locator('#cell-0-4'));
  await waitAndClick(page.getByRole('tab', { name: 'Casing' }));
  await waitAndSave(page, 'Yes, Save');

  await waitAndClick(page.getByRole('tab', { name: 'Drilled Hole' }));
  await page.waitForTimeout(ASSERT_WAIT_MS);
  await expect(page.getByRole('gridcell', { name: '100.0' })).toBeVisible();
  await page.waitForTimeout(ASSERT_WAIT_MS);
  await expect(page.getByRole('gridcell', { name: '1,000.0' })).toBeVisible();

  await waitAndClick(page.getByRole('tab', { name: 'Casing' }));
  await waitAndClearAndTypeGridCell(page, page.locator('#cell-0-1'), '200');
  await waitAndClearAndTypeGridCell(page, page.locator('#cell-0-2'), '2000');
  await waitAndClick(page.locator('#cell-0-4'));
  await page.locator('#cell-0-4').dblclick();
  await page.waitForTimeout(ACTION_WAIT_MS);
  await waitAndClick(page.getByRole('option', { name: '4', exact: true }));
  await page.locator('#cell-0-5').dblclick();
  await page.waitForTimeout(ACTION_WAIT_MS);
  await waitAndClick(page.getByRole('option', { name: '5.65' }));

  await waitAndClick(page.getByRole('link', { name: 'Heat Transfer Parameters' }));
  await waitAndSave(page, 'Yes, Save');

  await waitAndClick(page.getByRole('link', { name: 'Wellbore Configuration' }));
  await waitAndClick(page.getByRole('tab', { name: 'Casing' }));
  await page.waitForTimeout(ASSERT_WAIT_MS);
  await expect(page.getByRole('gridcell', { name: '200.0' })).toBeVisible();
  await page.waitForTimeout(ASSERT_WAIT_MS);
  await expect(page.getByRole('gridcell', { name: '2,000.0' })).toBeVisible();

  await waitAndClick(page.getByRole('link', { name: 'Heat Transfer Parameters' }));
  await waitAndClearAndType(page.getByRole('textbox', { name: 'Surface Fluid Temperature*' }), '100');
  await waitAndClick(page.locator('#Table'));
  await waitAndClearAndTypeGridCell(page, page.locator('#cell-0-0'), '300');
  await waitAndClearAndTypeGridCell(page, page.locator('#cell-0-1'), '400');

  await waitAndClick(page.getByRole('link', { name: 'Reservoir Parameters' }));
  await waitAndSave(page, 'Yes, Save');

  await waitAndClick(page.getByRole('link', { name: 'Heat Transfer Parameters' }));
  await page.waitForTimeout(ASSERT_WAIT_MS);
  await expect(page.getByRole('textbox', { name: 'Surface Fluid Temperature*' })).toHaveValue('100.00');
  await page.waitForTimeout(ASSERT_WAIT_MS);
  await expect(page.getByRole('gridcell', { name: '300' })).toBeVisible();
  await page.waitForTimeout(ASSERT_WAIT_MS);
  await expect(page.getByRole('gridcell', { name: '400' })).toBeVisible();

  await waitAndClick(page.getByRole('link', { name: 'Reservoir Parameters' }));
  await waitAndClearAndType(page.getByRole('textbox', { name: 'Fracture Height (Gross Pay)*' }), '200');
  await waitAndClick(page.getByRole('link', { name: 'Material Selection' }));
  await waitAndSave(page, 'Yes, Save');

  await waitAndClick(page.getByRole('link', { name: 'Reservoir Parameters' }));
  await page.waitForTimeout(ASSERT_WAIT_MS);
  await expect(page.getByRole('textbox', { name: 'Fracture Height (Gross Pay)*' })).toHaveValue('200');
  await waitAndClick(page.getByRole('link', { name: 'Material Selection' }));
});
