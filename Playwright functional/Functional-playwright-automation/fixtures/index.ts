import { test as base } from '@playwright/test';
import { BaseTest } from '../base/BaseTest';
import { TIMEOUTS } from '../constants/timeouts';

export type FrameworkFixtures = {
  /** Full framework context with all utilities + auto maximize */
  framework: BaseTest;
};

/**
 * Enterprise test entry point.
 * Usage: import { test, expect } from '../fixtures';
 */
export const test = base.extend<FrameworkFixtures>({
  framework: async ({ page }, use, testInfo) => {
    const framework = new BaseTest(page, testInfo);
    await framework.setup();

    try {
      await use(framework);
    } finally {
      await framework.captureFailureScreenshot();
    }
  },
});

test.beforeEach(async ({}, testInfo) => {
  testInfo.setTimeout(TIMEOUTS.TEST_DEFAULT_MS);
});

export { expect } from '@playwright/test';
export { BaseTest } from '../base/BaseTest';
