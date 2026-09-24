import { test } from '../fixtures';
import { TestDataManager } from '../excel/TestDataManager';
import {
  MANAGE_USERS_COMPANY_OVERRIDES,
  runUserManagementFlow,
} from '../helpers/userManagementFlow';

test.describe.configure({ retries: 0 });

/** Carbo Company baseline — uses logged-in profile company (unchanged behavior). */
test('verify user management profile dropdown on digital solutions @regression @admin', async ({
  page,
  framework,
}) => {
  test.setTimeout(1_200_000);

  const testData = TestDataManager.getDefault();
  await runUserManagementFlow(page, framework, testData, {
    testName: 'verify user management profile dropdown on digital solutions',
  });
});

/** Same baseline flow with Manage Users company switched to ABC Service Company. */
test('verify user management for ABC Service Company @regression @admin', async ({
  page,
  framework,
}) => {
  test.setTimeout(1_200_000);

  const testData = TestDataManager.getDefault();
  await runUserManagementFlow(page, framework, testData, {
    testName: 'verify user management for ABC Service Company',
    manageCompany: MANAGE_USERS_COMPANY_OVERRIDES.ABC_SERVICE,
  });
});

/** Same baseline flow with Manage Users company switched to Operator Company. */
test('verify user management for Operator Company @regression @admin', async ({
  page,
  framework,
}) => {
  test.setTimeout(1_200_000);

  const testData = TestDataManager.getDefault();
  await runUserManagementFlow(page, framework, testData, {
    testName: 'verify user management for Operator Company',
    manageCompany: MANAGE_USERS_COMPANY_OVERRIDES.OPERATOR,
  });
});
