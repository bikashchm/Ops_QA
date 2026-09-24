import { expect, test, type Page } from '@playwright/test';
import type { BaseTest } from '../base/BaseTest';
import { URLS } from '../constants/urls';
import { TestDataManager } from '../excel/TestDataManager';
import {
  CREATE_USER_ROLES,
  generateYopmailUser,
  type GeneratedYopmailUser,
} from './yopmailHelper';
import { createYopmailPage } from './yopmailPage';
import { focusTab, showYopmailThenLivePlus } from './tabVisualHelper';
import { createLoginPage } from '../pages/LoginPage';
import {
  createUserManagementPage,
  LIVEPLUS_PROFILE_MENU_OPTIONS,
  MANAGE_USERS_COMPANY_OVERRIDES,
  USER_MANAGEMENT_MENU_OPTIONS,
  type ManageUsersCompanyOverride,
  type UserManagementProfileDetails,
} from '../pages/UserManagementPage';

export { MANAGE_USERS_COMPANY_OVERRIDES };
export type { ManageUsersCompanyOverride };

export interface UserManagementFlowOptions {
  /** When omitted, Manage Users uses the logged-in profile company (Carbo baseline). */
  manageCompany?: ManageUsersCompanyOverride;
  testName: string;
}

export interface UserManagementFlowResult {
  email: string;
  profile: UserManagementProfileDetails;
  createdUsers: GeneratedYopmailUser[];
  manageCompanyName: string;
}

/**
 * Shared User Management E2E flow — Carbo baseline plus optional company override
 * for ABC Service Company and Operator Company.
 */
export async function runUserManagementFlow(
  page: Page,
  framework: BaseTest,
  testData: TestDataManager,
  options: UserManagementFlowOptions,
): Promise<UserManagementFlowResult> {
  const { email, password } = testData.getCredentials();
  const loginPage = createLoginPage(page);
  const userManagementPage = createUserManagementPage(page);

  if (options.manageCompany) {
    userManagementPage.setManageUsersCompanyOverride(options.manageCompany);
  }

  let profile: UserManagementProfileDetails | undefined;
  const createdUsers: GeneratedYopmailUser[] = [];
  let sessionFirstName = '';
  let sessionLastName = '';

  await test.step('Login using existing login flow', async () => {
    await framework.navigation.gotoAndWait(URLS.authUrl);
    await loginPage.waitForLoginScreen();
    await loginPage.login(email, password);
    await loginPage.waitForAuthenticatedApp();
    await expect(
      page.getByRole('tab', { name: 'Stimulation' }),
      'Login should succeed and Stimulation tab should be visible',
    ).toBeVisible();
  });

  await test.step('Verify Digital Solutions landing after login', async () => {
    await userManagementPage.verifyDigitalSolutionsLanding();
  });

  await test.step(
    'On app page, profile dropdown must show only My Profile and Sign Out',
    async () => {
      const displayName = await userManagementPage.openProfileDropdown();
      expect(
        displayName,
        'Profile icon label should be dynamic from the logged-in user (not hardcoded)',
      ).not.toBe('');
      await userManagementPage.verifyProfileDropdownOptions(USER_MANAGEMENT_MENU_OPTIONS);
    },
  );

  await test.step(
    'Open My Profile and verify Personal Information for logged-in credentials',
    async () => {
      profile = await userManagementPage.openMyProfileAndVerifyPersonalInformation(email);

      expect(profile.email, 'Personal Information email must match the login credentials').toBe(
        email,
      );
      expect(
        profile.firstName,
        'First Name must be dynamic from the logged-in account (not hardcoded)',
      ).not.toBe('');
      expect(
        profile.lastName,
        'Last Name must be dynamic from the logged-in account (not hardcoded)',
      ).not.toBe('');
      expect(
        profile.companyName,
        'Company Name must be dynamic from the logged-in account (not hardcoded)',
      ).not.toBe('');

      sessionFirstName = profile.firstName;
      sessionLastName = profile.lastName;

      await test.step(
        'Reset Compute Resources — cancel with No, then confirm with Yes',
        async () => {
          await userManagementPage.verifyResetComputeResourcesFlow();
        },
      );

      await test.step(
        'Refresh page and re-assert Personal Information is unchanged',
        async () => {
          const afterRefresh = await userManagementPage.refreshAndReverifyPersonalInformation(
            email,
            profile!,
          );
          expect(afterRefresh.email, 'Email after refresh must still match login').toBe(email);
          expect(
            afterRefresh.firstName,
            'First Name after refresh must match before refresh',
          ).toBe(profile!.firstName);
          expect(afterRefresh.lastName, 'Last Name after refresh must match before refresh').toBe(
            profile!.lastName,
          );
          expect(
            afterRefresh.companyName,
            'Company Name after refresh must match before refresh',
          ).toBe(profile!.companyName);
          profile = afterRefresh;
          sessionFirstName = profile.firstName;
          sessionLastName = profile.lastName;
        },
      );
    },
  );

  await test.step(
    'Continue to Live+ homepage and verify shell + dynamic profile icon',
    async () => {
      expect(profile, 'Profile details required before Live+ navigation').toBeTruthy();
      await userManagementPage.continueToLivePlusHomepage(profile!.firstName, profile!.lastName);
    },
  );

  await test.step(
    'Live+ profile dropdown must show My Profile, Manage, Settings, Sign Out',
    async () => {
      await userManagementPage.openLivePlusProfileMenuAndAssertOptions(
        profile!.firstName,
        profile!.lastName,
      );
    },
  );

  const manageCompanyName = options.manageCompany?.name ?? profile!.companyName;

  await test.step('Open Manage Users and assert default company + dynamic profile icon', async () => {
    expect(
      manageCompanyName,
      'Manage Users company name is required (profile default or explicit override)',
    ).not.toBe('');
    await userManagementPage.openManageUsers();
    await userManagementPage.verifyManageUsersPage(
      manageCompanyName,
      profile!.firstName,
      profile!.lastName,
    );
  });

  await test.step(
    'Assert logged-in user Delete icon is disabled (user must not delete their own account)',
    async () => {
      await userManagementPage.assertLoggedInUserDeleteIconDisabled(
        email,
        profile!.firstName,
        profile!.lastName,
        {
          profileCompanyName: profile!.companyName,
          selectedManageCompanyName: manageCompanyName,
        },
      );
    },
  );

  for (let i = 0; i < CREATE_USER_ROLES.length; i++) {
    const role = CREATE_USER_ROLES[i];

    await test.step(`Create New User as ${role} — full YOPmail + login flow`, async () => {
      expect(profile, 'Admin profile required for create-user flows').toBeTruthy();

      if (i > 0) {
        const previousRole = CREATE_USER_ROLES[i - 1];
        const loggedInAsDataOrFieldEngineer =
          previousRole === 'Data Engineer' || previousRole === 'Field Engineer';

        if (loggedInAsDataOrFieldEngineer) {
          await focusTab(page, `Live+ — Sign Out ${previousRole} → Excel QA re-login (${email})`);
          await userManagementPage.signOutAndReloginExcelAdminAndOpenManageUsers(
            sessionFirstName,
            sessionLastName,
            email,
            password,
            profile!,
            loginPage,
          );
          sessionFirstName = profile!.firstName;
          sessionLastName = profile!.lastName;
        } else {
          await focusTab(page, `Live+ — app screen → Continue → Manage (${role})`);
          const usedAdminFallback = await userManagementPage.navigateToManageUsersForNextRole(
            sessionFirstName,
            sessionLastName,
            email,
            password,
            profile!,
            loginPage,
          );
          if (usedAdminFallback) {
            sessionFirstName = profile!.firstName;
            sessionLastName = profile!.lastName;
          }
        }
      }

      const newUser = generateYopmailUser('rocky', role);

      expect(newUser.email, `[${role}] Generated email must be a yopmail address`).toMatch(
        /@yopmail\.com$/i,
      );
      expect(newUser.role, `[${role}] Role must match`).toBe(role);
      expect(newUser.firstName, `[${role}] First Name must be random letters`).toMatch(
        /^[a-z]{2,}$/i,
      );
      expect(newUser.lastName, `[${role}] Last Name must be letters-only (≥2)`).toMatch(
        /^[a-z]{2,}$/i,
      );

      const yopmailTab = await page.context().newPage();
      const yopmail = createYopmailPage(yopmailTab);
      await yopmail.openInbox(newUser.email);

      await showYopmailThenLivePlus(yopmailTab, page);
      await focusTab(page, `Live+ — Create New User (${role})`);

      await userManagementPage.fillAndSubmitCreateUser(newUser);
      await userManagementPage.searchAndAssertCreatedUser(newUser);

      await focusTab(yopmailTab, `YOPmail — verify same email as Live+ (${newUser.email})`);
      await yopmail.assertInboxEmailMatches(newUser.email);
      await yopmail.refreshInbox();

      const welcomeEmailFirstName = newUser.firstName;
      await focusTab(page, `Live+ — Edit User (${role})`);
      await userManagementPage.editCreatedUserFirstNameAndAssert(newUser);
      expect(
        newUser.firstName,
        `[${role}] First Name after Edit User must differ from the created value`,
      ).not.toBe(welcomeEmailFirstName);

      await focusTab(yopmailTab, `YOPmail — refresh for welcome email (${role})`);

      const tempPassword = await yopmail.waitForLivePlusWelcomePassword(
        welcomeEmailFirstName,
        newUser.lastName,
        newUser.email,
      );
      expect(tempPassword, `[${role}] YOPmail welcome password must be non-empty`).toMatch(/\S+/);

      await focusTab(page, `Live+ — sign out before ${role} user login`);
      await userManagementPage.signOutFromLivePlus(sessionFirstName, sessionLastName);
      await focusTab(page, `Live+ — ${role} new user sign-in`);

      await loginPage.waitForLoginScreen();
      const newPassword = await loginPage.loginWithTemporaryPasswordAndSetNewPassword(
        newUser.email,
        tempPassword,
      );
      expect(
        newPassword,
        `[${role}] New password must differ from YOPmail temp password`,
      ).not.toBe(tempPassword);
      await loginPage.waitForAuthenticatedApp();
      await focusTab(page, `Live+ — ${role} created user logged in`);

      const displayName = await userManagementPage.assertProfileIconMatchesLoggedInUser(
        newUser.firstName,
        newUser.lastName,
      );
      expect(
        displayName,
        `[${role}] Created-user profile icon must be dynamic from First/Last Name`,
      ).toMatch(new RegExp(newUser.firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

      await yopmailTab.close();
      createdUsers.push(newUser);

      sessionFirstName = newUser.firstName;
      sessionLastName = newUser.lastName;
    });
  }

  await test.step('Delete users created in this run and assert they are not listed', async () => {
    expect(createdUsers.length, 'Users created in this run are required before Delete').toBe(
      CREATE_USER_ROLES.length,
    );

    await focusTab(page, `Live+ — Sign Out → Excel QA re-login (${email}) for Delete`);
    await userManagementPage.signOutAndReloginExcelAdminAndOpenManageUsers(
      sessionFirstName,
      sessionLastName,
      email,
      password,
      profile!,
      loginPage,
    );
    sessionFirstName = profile!.firstName;
    sessionLastName = profile!.lastName;

    await test.step(
      'Assert logged-in user Delete icon is disabled before deletion loop (self-delete protection)',
      async () => {
        await userManagementPage.assertLoggedInUserDeleteIconDisabled(
          email,
          profile!.firstName,
          profile!.lastName,
          {
            profileCompanyName: profile!.companyName,
            selectedManageCompanyName: manageCompanyName,
          },
        );
      },
    );

    for (const created of createdUsers) {
      await focusTab(page, `Live+ — Delete created ${created.role} (${created.email})`);
      await userManagementPage.deleteCreatedUserAndAssertRemoved(created);
    }
  });

  testData.recordTestResult({
    testName: options.testName,
    status: 'PASSED',
    notes:
      `email=${email}; user=${profile?.displayName}; manageCompany=${manageCompanyName}; ` +
      `profileCompany=${profile?.companyName}; created=${createdUsers.map((u) => `${u.role}:${u.email}`).join('|')}; ` +
      `deleted=${createdUsers.map((u) => u.email).join('|')}; linqxMenu=${USER_MANAGEMENT_MENU_OPTIONS.join('|')}; ` +
      `livePlusMenu=${LIVEPLUS_PROFILE_MENU_OPTIONS.join('|')}; refresh=reverified; resetCompute=verified; ` +
      `manageUsers=verified; selfDeleteProtection=verified; createUser=Admin|DataEngineer|FieldEngineer; editUser=verified; deleteUser=verified; profileIcon=dynamic`,
  });

  return {
    email,
    profile: profile!,
    createdUsers,
    manageCompanyName,
  };
}
