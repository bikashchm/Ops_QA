import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { URLS } from '../constants/urls';
import { BasePage } from '../base/BasePage';
import type { GeneratedYopmailUser } from '../helpers/yopmailHelper';
import { logger } from '../logger';
import type { LoginPage } from './LoginPage';
import { AssertionUtils } from '../utils/AssertionUtils';
import { WaitUtils } from '../utils/WaitUtils';

/**
 * Allowed profile dropdown options on the Digital Solutions (LINQX) app page.
 * Exactly these two — any additional option is a bug.
 */
export const USER_MANAGEMENT_MENU_OPTIONS = ['My Profile', 'Sign Out'] as const;

/**
 * Allowed profile dropdown options on Live+ (well-pad homepage) after Continue.
 * Exactly these four — any additional option is a bug.
 */
export const LIVEPLUS_PROFILE_MENU_OPTIONS = [
  'My Profile',
  'Manage',
  'Settings',
  'Sign Out',
] as const;

export interface UserManagementProfileDetails {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  displayName: string;
}

/** Optional Manage Users company selection (ABC Service / Operator). Carbo uses profile default. */
export interface ManageUsersCompanyOverride {
  name: string;
  searchHint: string;
}

/** Non-Carbo company flows — selected via #selectedApplication on Manage Users. */
export const MANAGE_USERS_COMPANY_OVERRIDES = {
  ABC_SERVICE: { name: 'ABC Service Company', searchHint: 'service' },
  OPERATOR: { name: 'Operator Company', searchHint: 'operator' },
} as const;

/**
 * User Management — post-login Digital Solutions header profile menu
 * and My Profile → Personal Information screen.
 * Does not replace UserAccountPage (Live+ My Profile / Manage flows).
 */
export class UserManagementPage extends BasePage {
  /** When set, Manage Users company is switched after each navigation to the screen. */
  private manageUsersCompanyOverride: ManageUsersCompanyOverride | null = null;

  private readonly linqxLogo = this.page.getByRole('img', { name: 'linqx-logo' });
  private readonly solutionsHeading = this.page.getByRole('heading', {
    name: 'Explore Our Digital Solutions',
  });
  private readonly solutionsTagline = this.page.getByText('From basic functionality to');
  private readonly solutionsTabs = this.page.getByRole('tablist', { name: 'Tabs' });
  private readonly stimulationTab = this.page.getByRole('tab', { name: 'Stimulation' });
  private readonly appDefault = this.page.locator('app-default');

  private readonly myProfileLink = this.page.locator('a').filter({ hasText: /^My Profile$/i });
  private readonly manageLink = this.page.locator('a').filter({ hasText: /^Manage$/ });
  private readonly settingsLink = this.page.locator('a').filter({ hasText: /^Settings$/i });
  private readonly signOutLink = this.page
    .getByRole('link', { name: /sign out/i })
    .or(this.page.locator('a').filter({ hasText: /^Sign Out$/i }));

  private readonly continueLink = this.page.getByRole('link', { name: 'Continue' });
  private readonly activeCompletedText = this.page.getByText('Active Completed');
  private readonly measurementIconButton = this.page.getByRole('button', {
    name: 'Measurement Icon',
  });

  private readonly manageUsersHeading = this.page.getByRole('heading', { name: 'Manage Users' });
  private readonly searchNameLabel = this.page.getByText('Search Name');
  private readonly createNewUserButton = this.page.getByRole('button', { name: 'Create New User' });
  private readonly manageSearchTextbox = this.page.getByRole('textbox', { name: 'Search' });
  private readonly selectedApplicationSelect = this.page.locator('#selectedApplication').first();
  private readonly fallbackCompanyNgSelect = this.page
    .locator('ng-select')
    .filter({
      hasText: /Choose Company|Company/i,
    })
    .first();

  private readonly personalInformationSection = this.page
    .getByText(/Personal Information/i)
    .first();
  private readonly firstNameLabel = this.page.getByText('First Name', { exact: true });
  private readonly lastNameLabel = this.page.getByText('Last Name', { exact: true });
  private readonly emailLabel = this.page.getByText('Email', { exact: true });
  private readonly firstNameField = this.page.getByRole('textbox', { name: 'First Name' });
  private readonly lastNameField = this.page.getByRole('textbox', { name: 'Last Name' });
  private readonly emailField = this.page.getByRole('textbox', { name: 'Email' });
  private readonly companyNameField = this.page.getByRole('textbox', { name: 'Company Name' });
  private readonly saveButton = this.page.getByRole('button', { name: 'Save' });
  private readonly resetComputeResourcesButton = this.page.getByRole('button', {
    name: 'Reset Compute Resources',
  });
  private readonly actionRequiredDialog = this.page.getByRole('dialog', { name: 'Action Required' });
  private readonly actionRequiredNoButton = this.actionRequiredDialog.getByRole('button', {
    name: 'No',
  });
  private readonly actionRequiredYesButton = this.actionRequiredDialog.getByRole('button', {
    name: 'Yes',
  });

  private readonly addUserDialog = this.page
    .getByRole('dialog', { name: /Add User/i })
    .or(this.page.locator('.modal-content, .modal-dialog').filter({ hasText: /Add User/i }).first());
  private readonly addUserCancelButton = this.page.getByRole('button', { name: 'Cancel' });
  private readonly addUserCreateButton = this.page.getByRole('button', { name: 'Create', exact: true });
  private readonly editUserDialog = this.page
    .getByRole('dialog', { name: /Edit User/i })
    .or(this.page.locator('.modal-content, .modal-dialog').filter({ hasText: /Edit User/i }).first());
  private readonly editUserHeading = this.page.getByRole('heading', { name: 'Edit User' });
  private readonly editUserCancelButton = this.editUserDialog.getByRole('button', { name: 'Cancel' });
  private readonly editUserUpdateButton = this.editUserDialog.getByRole('button', {
    name: 'Update',
    exact: true,
  });
  private readonly userUpdatedAlert = this.page.getByRole('alert', {
    name: /User updated successfully/i,
  });
  private readonly userDeletedAlert = this.page.getByRole('alert', {
    name: /User deleted successfully|deleted successfully/i,
  });
  private readonly deleteConfirmPopup = this.page.locator('.swal2-popup').filter({
    hasText: /Confirm Action/i,
  });
  private readonly deleteConfirmHeading = this.deleteConfirmPopup.getByRole('heading', {
    name: 'Confirm Action',
  });
  private readonly deleteConfirmHtml = this.page.locator('#swal2-html-container');
  private readonly deleteConfirmIcon = this.deleteConfirmPopup.getByRole('img', {
    name: 'Delete Icon',
  });
  private readonly deleteConfirmNoButton = this.deleteConfirmPopup.getByRole('button', {
    name: 'No',
    exact: true,
  });
  private readonly deleteConfirmYesButton = this.deleteConfirmPopup.getByRole('button', {
    name: 'Yes, Delete',
  });
  private readonly deleteConfirmCloseButton = this.page.getByRole('button', {
    name: 'Close this dialog',
  });
  private readonly lastNameMinLengthError = this.page.getByText(/Last Name must be at least 2/i);
  private readonly lastNameInvalidCharsError = this.page.getByText(
    /Last Name should not contain special characters, numbers/i,
  );

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Profile / user menu button in the header.
   * Resolved from the current page chrome only — never by a hardcoded user name or initials.
   */
  private profileMenuButton(): Locator {
    const inTopbar = this.page.locator('#page-topbar');
    const inNavbar = this.page.locator('header, .navbar, .navbar-header, .topnav').first();

    const topbarButton = inTopbar
      .getByRole('button')
      .filter({ hasNotText: /applications|notification|bell/i })
      .filter({ hasText: /\S/ })
      .last();

    const navbarButton = inNavbar
      .getByRole('button')
      .filter({ hasNotText: /Contact Sales|phone-call|Continue|applications|notification/i })
      .filter({ hasText: /\S/ })
      .last();

    // Fallback: initials (1–3 letters) + first name from whatever account is logged in
    const initialsNameButton = this.page
      .getByRole('button')
      .filter({ hasText: /^[A-Z]{1,3}\s+\S+/ })
      .first();

    return topbarButton.or(navbarButton).or(initialsNameButton).first();
  }

  /** Builds expected avatar initials from first + last name of the logged-in user. */
  private expectedInitials(firstName: string, lastName: string): string {
    const first = firstName.trim().charAt(0).toUpperCase();
    const last = lastName.trim().charAt(0).toUpperCase();
    return `${first}${last}`;
  }

  /**
   * Open profile dropdown container.
   * Located by My Profile only — Sign Out / extras are asserted afterward so
   * missing or unexpected options surface as failures (bugs), not locator misses.
   */
  private userDropdownMenu(): Locator {
    const bootstrapMenu = this.page
      .locator('.dropdown-menu.show, .dropdown-menu')
      .filter({ hasText: /My Profile/i })
      .last();
    const roleMenu = this.page
      .locator('[role="menu"], .profile-dropdown')
      .filter({ hasText: /My Profile/i })
      .last();
    const sharedParent = this.myProfileLink
      .locator(
        'xpath=ancestor::*[self::div or self::ul or self::nav or @role="menu"][1]',
      )
      .first();
    return bootstrapMenu.or(roleMenu).or(sharedParent).first();
  }

  /** Actionable menu rows inside the open profile dropdown. */
  private dropdownMenuItems(): Locator {
    return this.userDropdownMenu()
      .locator('a, button, [role="menuitem"]')
      .filter({ hasText: /\S/ });
  }

  private normalizeDisplayText(raw: string): string {
    return raw
      .replace(/[^\w\s@.-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Assert Digital Solutions landing page after successful login. */
  async waitForDigitalSolutionsScreen(timeoutMs = TIMEOUTS.SLOW_UI_MS): Promise<void> {
    await WaitUtils.untilVisible(this.linqxLogo, timeoutMs);
    await WaitUtils.untilVisible(this.solutionsHeading, timeoutMs);
    await WaitUtils.untilVisible(this.stimulationTab, timeoutMs);
  }

  async verifyDigitalSolutionsLanding(): Promise<void> {
    await AssertionUtils.assertVisible(
      this.linqxLogo,
      'LINQX logo should be visible after successful login',
    );
    await AssertionUtils.assertVisible(
      this.solutionsHeading,
      'Explore Our Digital Solutions heading should be visible after login',
    );
    await AssertionUtils.assertVisible(
      this.solutionsTagline,
      'Digital Solutions tagline should be visible after login',
    );
    await AssertionUtils.assertVisible(
      this.solutionsTabs,
      'Solutions Tabs (Well Construction / Stimulation) should be visible after login',
    );
    await expect(
      this.stimulationTab,
      'Stimulation tab should be selected / visible after login',
    ).toBeVisible();
    await AssertionUtils.assertVisible(
      this.appDefault,
      'app-default Digital Solutions shell should be visible after login',
    );
    logger.info('Digital Solutions landing page verified after login');
  }

  async captureProfileDisplayName(): Promise<string> {
    const button = this.profileMenuButton();
    await WaitUtils.untilVisible(button, TIMEOUTS.SLOW_UI_MS);
    const displayName = this.normalizeDisplayText((await button.innerText()).trim());
    expect(
      displayName,
      'Profile icon should show a dynamic logged-in user display name (not empty / not hardcoded)',
    ).not.toBe('');
    return displayName;
  }

  /**
   * Asserts the profile icon is visible/enabled and — when known — matches the
   * logged-in user's first name (and initials from first+last). Never uses a fixed name.
   */
  async assertProfileIconMatchesLoggedInUser(
    firstName?: string,
    lastName?: string,
  ): Promise<string> {
    const button = this.profileMenuButton();
    await AssertionUtils.assertVisible(
      button,
      'Profile / user icon in the header should be visible',
    );
    await expect(
      button,
      'Profile / user icon in the header should be enabled before clicking',
    ).toBeEnabled();

    const displayName = await this.captureProfileDisplayName();

    if (firstName?.trim()) {
      expect(
        displayName,
        `Profile icon label "${displayName}" must include First Name "${firstName}" ` +
          `from the logged-in credentials (dynamic — not a hardcoded user)`,
      ).toMatch(new RegExp(this.escapeRegex(firstName.trim()), 'i'));
    }

    if (firstName?.trim() && lastName?.trim()) {
      const initials = this.expectedInitials(firstName, lastName);
      expect(
        displayName,
        `Profile icon label "${displayName}" should start with initials "${initials}" ` +
          `derived from First="${firstName}" Last="${lastName}"`,
      ).toMatch(new RegExp(`^${this.escapeRegex(initials)}\\b`, 'i'));
    }

    logger.info(
      `Profile icon verified dynamically: "${displayName}"` +
        (firstName ? ` (expected firstName=${firstName})` : ''),
    );
    return displayName;
  }

  async assertProfileIconReady(firstName?: string, lastName?: string): Promise<string> {
    return this.assertProfileIconMatchesLoggedInUser(firstName, lastName);
  }

  async openProfileDropdown(firstName?: string, lastName?: string): Promise<string> {
    const displayName = await this.assertProfileIconMatchesLoggedInUser(firstName, lastName);
    const button = this.profileMenuButton();
    await this.click(button, 'Profile / user menu');

    await AssertionUtils.assertVisible(
      this.myProfileLink,
      'Profile dropdown should open and show My Profile',
    );
    await AssertionUtils.assertVisible(
      this.userDropdownMenu(),
      'Profile dropdown menu should be displayed after clicking the profile icon',
    );
    logger.info(`Profile dropdown opened for dynamic user "${displayName}"`);
    return displayName;
  }

  /**
   * On the app Digital Solutions page, profile dropdown must show ONLY:
   * 1) My Profile  2) Sign Out
   * Any extra, missing, or reordered option fails the test (treated as a UI bug).
   */
  async verifyProfileDropdownOptions(
    expectedOptions: readonly string[] = USER_MANAGEMENT_MENU_OPTIONS,
  ): Promise<void> {
    const items = this.dropdownMenuItems();
    await WaitUtils.untilVisible(items.first(), TIMEOUTS.SLOW_UI_MS);

    const count = await items.count();
    const actualLabels: string[] = [];
    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      await expect(
        item,
        `Profile dropdown option at index ${i} should be visible`,
      ).toBeVisible();
      await expect(
        item,
        `Profile dropdown option at index ${i} should be enabled`,
      ).toBeEnabled();
      actualLabels.push(this.normalizeDisplayText((await item.innerText()).trim()));
    }

    const expectedList = expectedOptions.join(', ');
    const actualList = actualLabels.join(', ') || '(none)';

    expect(
      count,
      `BUG: Profile dropdown must contain exactly ${expectedOptions.length} options ` +
        `[${expectedList}]. Found ${count}: [${actualList}]. ` +
        `Extra options are not allowed.`,
    ).toBe(expectedOptions.length);

    for (let i = 0; i < expectedOptions.length; i++) {
      const expected = expectedOptions[i];
      const actual = actualLabels[i] ?? '';
      expect(
        actual,
        `BUG: Profile dropdown option at position ${i + 1} must be "${expected}" ` +
          `(order: ${expectedList}). Found "${actual}". Full menu: [${actualList}]`,
      ).toMatch(new RegExp(`^${this.escapeRegex(expected)}$`, 'i'));
    }

    const expectedNormalized = expectedOptions.map((o) => o.toLowerCase());
    const extras = actualLabels.filter(
      (label) => !expectedNormalized.includes(label.toLowerCase()),
    );
    expect(
      extras,
      `BUG: Unexpected profile dropdown option(s): [${extras.join(', ')}]. ` +
        `Only [${expectedList}] are allowed. Full menu: [${actualList}]`,
    ).toEqual([]);

    await AssertionUtils.assertVisible(
      this.myProfileLink,
      'My Profile must be visible in the profile dropdown',
    );
    await expect(
      this.myProfileLink,
      'My Profile must be enabled in the profile dropdown',
    ).toBeEnabled();

    await AssertionUtils.assertVisible(
      this.signOutLink.first(),
      'Sign Out must be visible in the profile dropdown',
    );
    await expect(
      this.signOutLink.first(),
      'Sign Out must be enabled in the profile dropdown',
    ).toBeEnabled();

    logger.info(
      `Profile dropdown OK (exactly ${count}): ${actualLabels.join(' → ')}`,
    );
  }

  /** Clicks My Profile from an already-open profile dropdown. */
  async openMyProfile(): Promise<void> {
    const menuOpen = await this.myProfileLink.isVisible({ timeout: 2000 }).catch(() => false);
    if (!menuOpen) {
      await this.openProfileDropdown();
      await this.verifyProfileDropdownOptions();
    }

    await expect(
      this.myProfileLink,
      'My Profile should be visible before navigating to Personal Information',
    ).toBeVisible();
    await expect(
      this.myProfileLink,
      'My Profile should be enabled before clicking',
    ).toBeEnabled();
    await this.click(this.myProfileLink, 'My Profile');
    await this.waitForPersonalInformationScreen();
    logger.info('My Profile → Personal Information opened');
  }

  async waitForPersonalInformationScreen(timeoutMs = TIMEOUTS.SLOW_UI_MS): Promise<void> {
    await WaitUtils.untilVisible(this.personalInformationSection, timeoutMs);
    await WaitUtils.untilVisible(this.firstNameField, timeoutMs);
    await WaitUtils.untilVisible(this.lastNameField, timeoutMs);
    await WaitUtils.untilVisible(this.emailField, timeoutMs);
    await WaitUtils.untilVisible(this.companyNameField, timeoutMs);
  }

  /**
   * Asserts Personal Information fields for the logged-in credentials:
   * - First Name / Last Name: populated dynamically and editable
   * - Email: matches login email and is non-editable
   * - Company Name: populated dynamically and is non-editable
   * Values are never hardcoded — they come from whatever account is logged in.
   */
  async verifyPersonalInformationFields(
    loginEmail: string,
  ): Promise<UserManagementProfileDetails> {
    await AssertionUtils.assertVisible(
      this.page.getByRole('img').first(),
      'Header / brand image should be visible on Personal Information',
    );
    await AssertionUtils.assertVisible(
      this.personalInformationSection,
      'Personal Information section should be visible after opening My Profile',
    );

    await AssertionUtils.assertVisible(this.firstNameLabel, 'First Name label should be visible');
    await AssertionUtils.assertVisible(
      this.firstNameField,
      'First Name textbox should be visible',
    );
    await AssertionUtils.assertVisible(this.lastNameLabel, 'Last Name label should be visible');
    await AssertionUtils.assertVisible(
      this.lastNameField,
      'Last Name textbox should be visible',
    );
    await AssertionUtils.assertVisible(this.emailLabel, 'Email label should be visible');
    await AssertionUtils.assertVisible(this.emailField, 'Email textbox should be visible');
    await AssertionUtils.assertVisible(
      this.companyNameField,
      'Company Name textbox should be visible',
    );

    // Editable: First Name, Last Name
    await expect(
      this.firstNameField,
      'BUG: First Name must be editable for the logged-in user',
    ).toBeEditable();
    await expect(
      this.lastNameField,
      'BUG: Last Name must be editable for the logged-in user',
    ).toBeEditable();

    // Non-editable: Email, Company Name
    await expect(
      this.emailField,
      'BUG: Email must be non-editable on Personal Information',
    ).not.toBeEditable();
    await expect(
      this.companyNameField,
      'BUG: Company Name must be non-editable on Personal Information',
    ).not.toBeEditable();

    await expect(
      this.emailField,
      `Email should match login credentials (${loginEmail})`,
    ).toHaveValue(loginEmail);

    const firstName = (await this.firstNameField.inputValue()).trim();
    const lastName = (await this.lastNameField.inputValue()).trim();
    const companyName = (await this.companyNameField.inputValue()).trim();

    expect(
      firstName,
      'First Name should be populated dynamically for the logged-in credentials (not empty)',
    ).not.toBe('');
    expect(
      lastName,
      'Last Name should be populated dynamically for the logged-in credentials (not empty)',
    ).not.toBe('');
    expect(
      companyName,
      'Company Name should be populated dynamically for the logged-in credentials (not empty)',
    ).not.toBe('');

    const displayName = `${firstName} ${lastName}`.trim();
    await this.assertProfileIconMatchesLoggedInUser(firstName, lastName);

    if (await this.saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await AssertionUtils.assertVisible(
        this.saveButton,
        'Save button should be visible on Personal Information',
      );
      // Save stays disabled until the user edits an editable field — expected default state.
      await expect(
        this.saveButton,
        'Save should remain disabled until First/Last Name are changed',
      ).toBeDisabled();
    }

    logger.info(
      `Personal Information verified for credentials email=${loginEmail}; ` +
        `name=${displayName}; company=${companyName}; editable=First/Last; readonly=Email/Company`,
    );

    return {
      email: loginEmail,
      firstName,
      lastName,
      companyName,
      displayName,
    };
  }

  /** Opens My Profile (from dropdown if needed) and verifies Personal Information. */
  async openMyProfileAndVerifyPersonalInformation(
    loginEmail: string,
  ): Promise<UserManagementProfileDetails> {
    await this.openMyProfile();
    return this.verifyPersonalInformationFields(loginEmail);
  }

  /**
   * Personal Information → Reset Compute Resources:
   * 1) Open dialog and cancel with No
   * 2) Open again and confirm with Yes
   */
  async verifyResetComputeResourcesFlow(): Promise<void> {
    await AssertionUtils.assertVisible(
      this.resetComputeResourcesButton,
      'Reset Compute Resources button should be visible on Personal Information',
    );
    await expect(
      this.resetComputeResourcesButton,
      'Reset Compute Resources button should be enabled before clicking',
    ).toBeEnabled();

    await this.click(this.resetComputeResourcesButton, 'Reset Compute Resources');
    await AssertionUtils.assertVisible(
      this.actionRequiredDialog,
      'Action Required dialog should appear after clicking Reset Compute Resources',
    );
    await expect(
      this.actionRequiredNoButton,
      'Action Required No button should be enabled',
    ).toBeEnabled();
    await this.click(this.actionRequiredNoButton, 'Action Required — No');
    await expect(
      this.actionRequiredDialog,
      'Action Required dialog should close after clicking No',
    ).toBeHidden();

    await AssertionUtils.assertVisible(
      this.resetComputeResourcesButton,
      'Reset Compute Resources should still be visible after cancelling with No',
    );
    await this.click(this.resetComputeResourcesButton, 'Reset Compute Resources (confirm)');
    await AssertionUtils.assertVisible(
      this.actionRequiredDialog,
      'Action Required dialog should appear again before confirming Yes',
    );
    await expect(
      this.actionRequiredYesButton,
      'Action Required Yes button should be enabled',
    ).toBeEnabled();
    await this.click(this.actionRequiredYesButton, 'Action Required — Yes');
    await expect(
      this.actionRequiredDialog,
      'Action Required dialog should close after clicking Yes',
    ).toBeHidden();

    logger.info('Reset Compute Resources flow verified (No cancel, then Yes confirm)');
  }

  /**
   * Reloads the page and re-runs Personal Information assertions.
   * Values must match the previously captured profile for the same credentials.
   */
  async refreshAndReverifyPersonalInformation(
    loginEmail: string,
    previous: UserManagementProfileDetails,
  ): Promise<UserManagementProfileDetails> {
    logger.info('Refreshing page to re-verify Personal Information persistence');
    // Profile page can hang on full "load"; domcontentloaded is enough to re-assert fields.
    await this.page.reload({ waitUntil: 'domcontentloaded', timeout: TIMEOUTS.SLOW_UI_MS });
    await WaitUtils.forLoadState(this.page, 'domcontentloaded');

    const personalInfoVisible = await this.personalInformationSection
      .isVisible({ timeout: 15_000 })
      .catch(() => false);

    if (!personalInfoVisible) {
      logger.info('Personal Information not visible after refresh — reopening My Profile');
      await this.openMyProfile();
    } else {
      await this.waitForPersonalInformationScreen();
    }

    const afterRefresh = await this.verifyPersonalInformationFields(loginEmail);

    expect(
      afterRefresh.email,
      `After refresh, Email must still match login credentials and previous value (${previous.email})`,
    ).toBe(previous.email);
    expect(
      afterRefresh.firstName,
      `After refresh, First Name must remain "${previous.firstName}"`,
    ).toBe(previous.firstName);
    expect(
      afterRefresh.lastName,
      `After refresh, Last Name must remain "${previous.lastName}"`,
    ).toBe(previous.lastName);
    expect(
      afterRefresh.companyName,
      `After refresh, Company Name must remain "${previous.companyName}"`,
    ).toBe(previous.companyName);

    logger.info(
      `Personal Information unchanged after refresh: ${afterRefresh.displayName}; ` +
        `email=${afterRefresh.email}; company=${afterRefresh.companyName}`,
    );
    return afterRefresh;
  }

  /** Login landing → open profile → assert screenshot dropdown options. */
  async verifyPostLoginProfileMenu(): Promise<string> {
    await this.waitForDigitalSolutionsScreen();
    await this.verifyDigitalSolutionsLanding();
    const displayName = await this.openProfileDropdown();
    await this.verifyProfileDropdownOptions();
    return displayName;
  }

  /**
   * Ensures Digital Solutions is available, clicks Continue into Live+ well-pad homepage,
   * and asserts homepage chrome loaded. Profile icon is checked against dynamic user names when provided.
   */
  async continueToLivePlusHomepage(firstName?: string, lastName?: string): Promise<void> {
    const continueVisible = await this.continueLink
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!continueVisible) {
      logger.info('Continue not visible — returning to Digital Solutions before Live+ entry');
      await this.navigation.gotoAndWait(URLS.baseUrl);
      await WaitUtils.untilVisible(this.stimulationTab, TIMEOUTS.SLOW_UI_MS);
      await this.click(this.stimulationTab, 'Stimulation');
    }

    await AssertionUtils.assertVisible(
      this.continueLink,
      'Continue link should be visible before entering Live+',
    );
    await expect(this.continueLink, 'Continue link should be enabled').toBeEnabled();
    await this.click(this.continueLink, 'Continue');
    await this.verifyLivePlusHomepage(firstName, lastName);
    logger.info('Live+ well-pad homepage opened via Continue');
  }

  async verifyLivePlusHomepage(firstName?: string, lastName?: string): Promise<void> {
    await AssertionUtils.assertVisible(
      this.page.getByRole('img').first(),
      'Live+ homepage logo / image should be visible after Continue',
    );
    await AssertionUtils.assertVisible(
      this.activeCompletedText,
      'Active Completed controls should be visible on Live+ homepage',
    );
    await AssertionUtils.assertVisible(
      this.measurementIconButton,
      'Measurement Icon button should be visible on Live+ homepage',
    );
    await this.assertProfileIconMatchesLoggedInUser(firstName, lastName);
  }

  /** Opens Live+ profile menu and asserts My Profile / Manage / Settings / Sign Out only. */
  async openLivePlusProfileMenuAndAssertOptions(
    firstName?: string,
    lastName?: string,
  ): Promise<string> {
    const displayName = await this.openProfileDropdown(firstName, lastName);
    await this.verifyProfileDropdownOptions(LIVEPLUS_PROFILE_MENU_OPTIONS);

    await AssertionUtils.assertVisible(
      this.manageLink,
      'Manage must be visible in the Live+ profile dropdown',
    );
    await expect(this.manageLink, 'Manage must be enabled in the Live+ profile dropdown').toBeEnabled();
    await AssertionUtils.assertVisible(
      this.settingsLink,
      'Settings must be visible in the Live+ profile dropdown',
    );

    logger.info(`Live+ profile dropdown verified for dynamic user "${displayName}"`);
    return displayName;
  }

  async openManageUsers(): Promise<void> {
    const manageVisible = await this.manageLink.isVisible({ timeout: 2000 }).catch(() => false);
    if (!manageVisible) {
      await this.openProfileDropdown();
    }

    await AssertionUtils.assertVisible(
      this.manageLink,
      'Manage option should be visible before opening Manage Users',
    );
    await expect(this.manageLink, 'Manage option should be enabled before clicking').toBeEnabled();
    await this.click(this.manageLink, 'Manage');
    await this.waitForManageUsersScreen();
    logger.info('Profile → Manage Users opened');
  }

  /**
   * Signs out the current user (Live+ map or app screen) and re-logs in with Excel QA admin,
   * then opens Manage Users. Credentials must come from TestDataManager — never hardcoded.
   */
  async signOutAndReloginExcelAdminAndOpenManageUsers(
    sessionFirstName: string,
    sessionLastName: string,
    adminEmail: string,
    adminPassword: string,
    adminProfile: UserManagementProfileDetails,
    loginPage: LoginPage,
  ): Promise<void> {
    await this.signOutFromLivePlus(sessionFirstName, sessionLastName);
    await loginPage.waitForLoginScreen();
    await loginPage.login(adminEmail, adminPassword);
    await loginPage.waitForAuthenticatedApp();
    await this.continueToLivePlusHomepage(adminProfile.firstName, adminProfile.lastName);
    await this.openManageUsers();
    logger.info(`Signed out → re-login Excel QA admin (${adminEmail}) → Manage Users`);
  }

  /**
   * App screen → Continue → profile → Manage. If Manage is missing, signs out and re-logs in
   * with Excel admin credentials from TestDataManager.
   * @returns true when Excel admin fallback login was used.
   */
  async navigateToManageUsersForNextRole(
    sessionFirstName: string,
    sessionLastName: string,
    adminEmail: string,
    adminPassword: string,
    adminProfile: UserManagementProfileDetails,
    loginPage: LoginPage,
  ): Promise<boolean> {
    await this.verifyDigitalSolutionsLanding();
    await this.continueToLivePlusHomepage(sessionFirstName, sessionLastName);
    await this.openProfileDropdown(sessionFirstName, sessionLastName);

    const manageVisible = await this.manageLink.isVisible({ timeout: 5000 }).catch(() => false);
    if (manageVisible) {
      await expect(this.manageLink, 'Manage must be enabled when visible in profile menu').toBeEnabled();
      await this.click(this.manageLink, 'Manage');
      await this.waitForManageUsersScreen();
      logger.info('Manage option found — opened Manage Users via profile menu');
      return false;
    }

    logger.info(
      `Manage not shown for "${sessionFirstName} ${sessionLastName}" — signing out and re-login with Excel admin (${adminEmail})`,
    );
    await this.signOutAndReloginExcelAdminAndOpenManageUsers(
      sessionFirstName,
      sessionLastName,
      adminEmail,
      adminPassword,
      adminProfile,
      loginPage,
    );
    return true;
  }

  async waitForManageUsersScreen(timeoutMs = TIMEOUTS.SLOW_UI_MS): Promise<void> {
    await WaitUtils.untilVisible(this.manageUsersHeading, timeoutMs);
    await WaitUtils.untilVisible(this.createNewUserButton, timeoutMs);
    await WaitUtils.untilVisible(this.searchNameLabel, timeoutMs);
    await this.applyManageUsersCompanyOverrideIfSet();
  }

  /**
   * Carbo Company flow: leave unset — Manage Users uses the logged-in profile company.
   * ABC Service / Operator: set before openManageUsers so the same baseline flow runs per company.
   */
  setManageUsersCompanyOverride(override: ManageUsersCompanyOverride | null): void {
    this.manageUsersCompanyOverride = override;
  }

  getManageUsersCompanyOverride(): ManageUsersCompanyOverride | null {
    return this.manageUsersCompanyOverride;
  }

  private async applyManageUsersCompanyOverrideIfSet(): Promise<void> {
    if (!this.manageUsersCompanyOverride) {
      return;
    }
    const companySelect = await this.tryResolveVisibleManageUsersCompanySelect();
    if (!companySelect) {
      // Company dropdown not on this screen (e.g. no-Manage session for created user).
      // Silently skip — the override will be applied on the next real Manage Users navigation.
      logger.info(
        `Manage Users company dropdown not visible on this screen — skipping override (will apply on next Manage Users navigation)`,
      );
      return;
    }
    const current = this.normalizeDisplayText(
      (await companySelect.innerText().catch(() => '')).trim(),
    );
    if (
      current &&
      new RegExp(this.escapeRegex(this.manageUsersCompanyOverride.name), 'i').test(current)
    ) {
      logger.info(`Manage Users company already selected: ${this.manageUsersCompanyOverride.name}`);
      return;
    }
    await this.selectManageUsersCompanyWithLocator(
      companySelect,
      this.manageUsersCompanyOverride.name,
      this.manageUsersCompanyOverride.searchHint,
    );
  }

  /**
   * Returns the visible company selector locator or null if it is not on screen.
   * Never throws — safe to call in any navigation context.
   * Polls for up to ~6 seconds across both candidates before giving up.
   */
  private async tryResolveVisibleManageUsersCompanySelect(): Promise<Locator | null> {
    const candidates: Locator[] = [this.selectedApplicationSelect, this.fallbackCompanyNgSelect];
    for (let attempt = 0; attempt < 4; attempt++) {
      for (const candidate of candidates) {
        const visible = await candidate.isVisible({ timeout: 1500 }).catch(() => false);
        if (visible) {
          return candidate;
        }
      }
      await this.page.waitForTimeout(500);
    }
    return null;
  }

  /**
   * Resolves the visible company selector or throws a clear error.
   * Use only when the selector is guaranteed to be present (e.g. after a confirmed Manage Users load).
   */
  private async resolveVisibleManageUsersCompanySelect(): Promise<Locator> {
    const locator = await this.tryResolveVisibleManageUsersCompanySelect();
    if (!locator) {
      throw new Error(
        'Manage Users company selector is not visible. ' +
          'Ensure Manage Users is fully loaded before selecting a company.',
      );
    }
    return locator;
  }

  /**
   * Switches Manage Users company via #selectedApplication (Codegen: arrow → search → option).
   * Resolves the visible selector dynamically — safe for pipeline use.
   */
  async selectManageUsersCompany(companyName: string, searchHint: string): Promise<void> {
    await AssertionUtils.assertVisible(
      this.manageUsersHeading,
      'Manage Users heading must be visible before selecting company',
    );
    const companySelect = await this.resolveVisibleManageUsersCompanySelect();
    await this.selectManageUsersCompanyWithLocator(companySelect, companyName, searchHint);
  }

  private async selectManageUsersCompanyWithLocator(
    companySelect: Locator,
    companyName: string,
    searchHint: string,
  ): Promise<void> {
    const arrow = companySelect.locator('.ng-arrow-wrapper').first();
    await AssertionUtils.assertVisible(
      arrow,
      'Manage Users company dropdown arrow should be visible before selection',
    );
    await this.click(arrow, 'Manage Users company dropdown');

    const searchBox = companySelect
      .getByRole('textbox')
      .first();
    await WaitUtils.untilVisible(searchBox);
    await searchBox.click();
    await searchBox.fill('');
    await searchBox.fill(searchHint);

    const companyOption = this.page
      .getByRole('option', { name: companyName, exact: true })
      .or(this.page.getByText(companyName, { exact: true }))
      .first();

    await AssertionUtils.assertVisible(
      companyOption,
      `Company option "${companyName}" should be visible after searching "${searchHint}"`,
    );
    await this.click(companyOption, companyName);

    await this.page.keyboard.press('Escape').catch(() => undefined);
    await expect(
      companySelect,
      `Manage Users company dropdown should show "${companyName}" after selection`,
    ).toContainText(new RegExp(this.escapeRegex(companyName), 'i'));

    logger.info(`Manage Users company selected: ${companyName}`);
  }

  /**
   * Verifies Manage Users page: heading, search, Create New User, table headers,
   * and that the company ng-select defaults to the logged-in user's company
   * (dynamic — never hardcoded to "Carbo Company").
   */
  async verifyManageUsersPage(
    expectedCompanyName: string,
    firstName?: string,
    lastName?: string,
  ): Promise<void> {
    expect(
      expectedCompanyName,
      'Expected company name from profile must be provided (dynamic from credentials)',
    ).not.toBe('');

    await this.assertProfileIconMatchesLoggedInUser(firstName, lastName);
    await AssertionUtils.assertVisible(
      this.manageUsersHeading,
      'Manage Users heading should be visible',
    );
    await AssertionUtils.assertVisible(
      this.searchNameLabel,
      'Search Name label should be visible on Manage Users',
    );
    await AssertionUtils.assertVisible(
      this.createNewUserButton,
      'Create New User button should be visible on Manage Users',
    );
    await AssertionUtils.assertVisible(
      this.manageSearchTextbox,
      'Search textbox should be visible on Manage Users',
    );

    const companySelect = await this.resolveVisibleManageUsersCompanySelect();
    await AssertionUtils.assertVisible(companySelect, 'Choose Company dropdown should be visible on Manage Users');
    await expect(
      companySelect,
      `BUG: Choose Company must default to logged-in company "${expectedCompanyName}"`,
    ).toContainText(new RegExp(this.escapeRegex(expectedCompanyName), 'i'));

    await this.openCompanyDropdownAndAssertDefault(expectedCompanyName, companySelect);

    await this.verifyManageUsersTableHeaders();

    logger.info(
      `Manage Users page verified; default company="${expectedCompanyName}" (dynamic)`,
    );
  }

  /** Asserts Manage Users grid column headers are visible (after company panel is closed). */
  private async verifyManageUsersTableHeaders(): Promise<void> {
    const headerNames = ['#', 'User Name', 'First Name', 'Last Name', 'Role', 'Email', 'Actions'] as const;

    for (const header of headerNames) {
      const byRole = this.page.getByRole('columnheader', { name: header, exact: true });

      const roleVisible = await byRole.isVisible({ timeout: 3000 }).catch(() => false);
      if (roleVisible) {
        await AssertionUtils.assertVisible(
          byRole,
          `Manage Users table header "${header}" should be visible`,
        );
        continue;
      }

      // Fallback: prefer a visible text node (avoids hidden template spans for "#")
      const candidates = this.page.getByText(header, { exact: true });
      const count = await candidates.count();
      let foundVisible = false;
      for (let i = 0; i < count; i++) {
        const candidate = candidates.nth(i);
        if (await candidate.isVisible().catch(() => false)) {
          await AssertionUtils.assertVisible(
            candidate,
            `Manage Users table header "${header}" should be visible`,
          );
          foundVisible = true;
          break;
        }
      }
      expect(
        foundVisible,
        `Manage Users table header "${header}" should be visible on the users grid`,
      ).toBe(true);
    }
  }

  /** Opens company ng-select and asserts the logged-in company is listed/selected. */
  async openCompanyDropdownAndAssertDefault(
    expectedCompanyName: string,
    companySelect?: Locator,
  ): Promise<void> {
    const select = companySelect ?? (await this.resolveVisibleManageUsersCompanySelect());
    const companyDropdownArrow = select.locator('.ng-arrow-wrapper').first();
    await AssertionUtils.assertVisible(
      companyDropdownArrow,
      'Company dropdown arrow should be visible before opening',
    );
    await this.click(companyDropdownArrow, 'Choose Company dropdown');

    const optionsList = this.page
      .getByLabel('Options list')
      .or(this.page.locator('.ng-dropdown-panel'))
      .last();
    const optionInPanel = optionsList
      .getByText(expectedCompanyName, { exact: false })
      .or(
        this.page.getByRole('option', {
          name: new RegExp(this.escapeRegex(expectedCompanyName), 'i'),
        }),
      )
      .first();

    await AssertionUtils.assertVisible(
      optionInPanel,
      `BUG: Company dropdown must list logged-in company "${expectedCompanyName}"`,
    );

    // Close panel so table headers are not obscured
    await this.page.keyboard.press('Escape');
    const panelStillOpen = await optionsList.isVisible({ timeout: 2000 }).catch(() => false);
    if (panelStillOpen) {
      await this.click(companyDropdownArrow, 'Choose Company dropdown close');
    }
    await expect(
      this.page.locator('.ng-dropdown-panel'),
      'Company options panel should close before asserting Manage Users table',
    ).toBeHidden({ timeout: 10_000 });

    logger.info(`Company dropdown lists default company "${expectedCompanyName}"`);
  }

  /** Live+ homepage → profile (4 options) → Manage Users with dynamic default company. */
  async openManageUsersAndVerify(
    expectedCompanyName: string,
    firstName?: string,
    lastName?: string,
  ): Promise<void> {
    await this.openLivePlusProfileMenuAndAssertOptions(firstName, lastName);
    await this.openManageUsers();
    await this.verifyManageUsersPage(expectedCompanyName, firstName, lastName);
  }

  async openCreateNewUserDialog(): Promise<void> {
    await this.dismissOpenManageUsersDialogs();
    await this.ensureCreateNewUserAvailable();

    await AssertionUtils.assertVisible(
      this.createNewUserButton,
      'Create New User button should be visible before opening Add User dialog',
    );
    await expect(
      this.createNewUserButton,
      'Create New User button should be enabled before clicking',
    ).toBeEnabled();
    await this.click(this.createNewUserButton, 'Create New User');
    await WaitUtils.untilVisible(this.addUserDialog, TIMEOUTS.SLOW_UI_MS);
    await AssertionUtils.assertVisible(
      this.addUserCancelButton,
      'Cancel button should be visible on Add User dialog',
    );
    await AssertionUtils.assertVisible(
      this.addUserCreateButton,
      'Create button should be visible on Add User dialog',
    );
    logger.info('Add User dialog opened');
  }

  private addUserFieldByLabel(label: string): Locator {
    // Prefer the input inside the same form column/group as the label (avoids
    // overwriting Email when filling User Name / First Name / Last Name).
    const group = this.addUserDialog
      .locator('.form-group, .mb-3, .col-md-6, .col-md-12, .row > [class*="col"]')
      .filter({ has: this.page.getByText(new RegExp(`^${this.escapeRegex(label)}\\s*\\*?$`, 'i')) })
      .first();

    return group
      .locator('input.form-control, input[type="text"], input[type="email"], input')
      .first();
  }

  private addUserEmailField(): Locator {
    return this.addUserDialog.locator('input[type="email"]').first();
  }

  private async fillAddUserTextField(label: string, value: string): Promise<void> {
    const field = this.addUserFieldByLabel(label);
    await WaitUtils.untilVisible(field);
    await field.click();
    await field.fill('');
    await field.fill(value);
    await expect(field, `Add User "${label}" should contain "${value}"`).toHaveValue(value);
  }

  /**
   * Fills Add User using a randomly generated Yopmail identity (never hardcoded names).
   * Exercises Last Name min-length validation, then selects Role Admin + LINQX Software Live+.
   */
  async fillAndSubmitCreateUser(user: GeneratedYopmailUser): Promise<void> {
    expect(user.email, 'Create user email must include @yopmail.com').toMatch(/@yopmail\.com$/i);
    expect(user.lastName, 'Create user last name must be letters-only (≥2)').toMatch(/^[a-z]{2,}$/i);

    await this.openCreateNewUserDialog();

    // Fill in form order: User Name → Email → First Name → Last Name
    await this.fillAddUserTextField('User Name', user.userName);

    const emailField = this.addUserEmailField();
    await WaitUtils.untilVisible(emailField);
    await emailField.click();
    await emailField.fill('');
    await emailField.fill(user.email);
    await expect(
      emailField,
      `Email must be full address "${user.email}" (not local-part only)`,
    ).toHaveValue(user.email);
    expect(await emailField.inputValue(), 'Email value must contain @yopmail.com').toContain(
      '@yopmail.com',
    );
    await expect(
      this.addUserDialog.getByText(/Enter a valid email address/i),
      'Email validation error should not show for a valid yopmail address',
    ).toBeHidden();

    await this.fillAddUserTextField('First Name', user.firstName);

    // Last Name: always ≥ 2 letters (UI rejects 1-char names like "k")
    const lastNameField = this.addUserFieldByLabel('Last Name');
    await WaitUtils.untilVisible(lastNameField);
    await lastNameField.click();
    await lastNameField.fill('');
    const lastNameValue =
      user.lastName.length >= 2 ? user.lastName : `${user.lastName}x`.slice(0, 2);
    await lastNameField.fill(lastNameValue);
    await expect(
      lastNameField,
      `Last Name must have at least 2 letters (got "${lastNameValue}")`,
    ).toHaveValue(lastNameValue);
    expect(
      (await lastNameField.inputValue()).trim().length,
      'Last Name length must be ≥ 2',
    ).toBeGreaterThanOrEqual(2);
    await expect(
      this.lastNameMinLengthError,
      'Last Name min-length error should not show when ≥ 2 letters are entered',
    ).toBeHidden();
    await expect(
      this.lastNameInvalidCharsError,
      'Last Name must be letters-only (no numbers/special characters)',
    ).toBeHidden();

    // Re-assert Email was not overwritten by other field fills
    await expect(
      emailField,
      `Email must still be "${user.email}" after filling name fields`,
    ).toHaveValue(user.email);

    // Role → Admin (screenshot: Data Engineer / Field Engineer / Admin)
    await this.selectRoleOnAddUser(user.role);

    // LINQX Software → Live+
    await this.selectLinqxSoftwareOnAddUser(user.linqxSoftware);

    await expect(
      emailField,
      `Add User form Email must remain "${user.email}" before Create`,
    ).toHaveValue(user.email);

    await expect(
      this.addUserCreateButton,
      'Create button should be enabled after required fields are filled',
    ).toBeEnabled();
    await this.click(this.addUserCreateButton, 'Create');
    await expect(
      this.page.getByRole('alert', { name: /User added successfully/i }),
      'Success alert "User added successfully." should appear after Create',
    ).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });
    await expect(
      this.addUserDialog,
      'Add User dialog should close after successful Create',
    ).toBeHidden({ timeout: TIMEOUTS.SLOW_UI_MS });

    await this.applyManageUsersCompanyOverrideIfSet();
    await this.searchManageUsers('');
    await expect(
      this.page.getByRole('gridcell', { name: user.email, exact: true }),
      `Created user "${user.email}" should appear in the current company grid after Create (without search)`,
    ).toBeVisible({ timeout: 20_000 });

    logger.info(
      `Created user userName=${user.userName}; email=${user.email}; role=${user.role}; software=${user.linqxSoftware}`,
    );
  }

  /** Signs out from Live+ and waits for the B2C login screen on the same tab (no extra browser window). */
  async signOutFromLivePlus(firstName?: string, lastName?: string): Promise<void> {
    await this.openProfileDropdown(firstName, lastName);
    await AssertionUtils.assertVisible(
      this.signOutLink.first(),
      'Sign Out must be visible before signing out',
    );
    await this.click(this.signOutLink.first(), 'Sign Out');

    const loginEmail = this.page.getByRole('textbox', { name: 'Email Address' });
    const loginVisible = await loginEmail
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);

    if (!loginVisible) {
      // MSAL/SSO can keep the admin session — clear storage and reopen login on this tab
      await this.page.context().clearCookies();
      await this.page
        .evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        })
        .catch(() => undefined);
      await this.page.goto(URLS.authUrl, { waitUntil: 'domcontentloaded' });
      await WaitUtils.untilVisible(loginEmail, TIMEOUTS.SLOW_UI_MS);
    }

    logger.info('Signed out from Live+ — login screen ready on same tab');
  }

  /**
   * Opens Role dropdown and selects the given role (screenshot: choose Admin).
   * Visible options typically include Data Engineer, Field Engineer, Admin.
   */
  private async selectRoleOnAddUser(roleName: string): Promise<void> {
    const roleNgSelect = this.addUserDialog.locator('ng-select').first();
    const roleArrow = roleNgSelect.locator('.ng-arrow-wrapper');
    await AssertionUtils.assertVisible(roleArrow, 'Role dropdown arrow should be visible');
    await this.click(roleArrow, 'Role dropdown');

    const optionsPanel = this.page.locator('.ng-dropdown-panel').last();
    await AssertionUtils.assertVisible(
      optionsPanel,
      'Role options panel should open after clicking Role dropdown',
    );

    const roleOption = optionsPanel
      .getByRole('option', { name: roleName, exact: true })
      .or(optionsPanel.getByText(roleName, { exact: true }))
      .first();

    await AssertionUtils.assertVisible(
      roleOption,
      `Role option "${roleName}" should be visible (screenshot: Admin)`,
    );
    await expect(roleOption, `Role option "${roleName}" should be enabled`).toBeEnabled();
    await this.click(roleOption, `Role ${roleName}`);

    await expect(
      roleNgSelect,
      `Add User Role should show selected value "${roleName}"`,
    ).toContainText(new RegExp(this.escapeRegex(roleName), 'i'));
    logger.info(`Add User Role selected: ${roleName}`);
  }

  private async selectLinqxSoftwareOnAddUser(softwareName: string): Promise<void> {
    const multiSelectArrow = this.addUserDialog
      .locator('.ng-select-multiple > .ng-select-container > .ng-arrow-wrapper')
      .or(this.addUserDialog.locator('ng-select.ng-select-multiple .ng-arrow-wrapper'))
      .first();
    await this.click(multiSelectArrow, 'LINQX Software dropdown');
    await this.click(this.page.getByRole('option', { name: softwareName, exact: true }), softwareName);
  }

  /** Searches Manage Users grid and asserts the created user row. */
  async searchAndAssertCreatedUser(user: GeneratedYopmailUser): Promise<void> {
    await AssertionUtils.assertVisible(
      this.manageSearchTextbox,
      'Search textbox should be visible before searching created user',
    );

    await this.applyManageUsersCompanyOverrideIfSet();

    const emailCell = this.page.getByRole('gridcell', { name: user.email, exact: true });
    const foundUnfiltered = await emailCell.isVisible({ timeout: 5_000 }).catch(() => false);
    if (!foundUnfiltered) {
      await this.searchManageUsers(user.email);
    }
    const foundByEmail = await emailCell.isVisible({ timeout: 8_000 }).catch(() => false);
    if (!foundByEmail) {
      await this.searchManageUsers(user.userName);
    }

    await expect(
      emailCell,
      `Created user email "${user.email}" should appear in Manage Users grid for the selected company`,
    ).toBeVisible({ timeout: 15_000 });

    const userRow = this.page.getByRole('row').filter({ hasText: user.email }).first();
    await expect(
      userRow.getByRole('gridcell', { name: user.lastName, exact: true }),
      `Created user last name "${user.lastName}" should appear in Manage Users grid`,
    ).toBeVisible();
    await expect(
      userRow.getByRole('gridcell', { name: user.role, exact: true }),
      `Created user role "${user.role}" should appear in Manage Users grid`,
    ).toBeVisible();

    await AssertionUtils.assertVisible(
      userRow.getByRole('img', { name: 'Edit' }),
      'Edit action should be visible for created user row',
    );
    await AssertionUtils.assertVisible(
      userRow.getByRole('img', { name: 'Delete' }),
      'Delete action should be visible for created user row',
    );

    logger.info(`Created user verified in Manage Users grid: ${user.email}`);
  }

  private editUserFieldByLabel(label: string): Locator {
    const group = this.editUserDialog
      .locator('.form-group, .mb-3, .col-md-6, .col-md-12, .row > [class*="col"]')
      .filter({ has: this.page.getByText(new RegExp(`^${this.escapeRegex(label)}\\s*\\*?$`, 'i')) })
      .first();

    return group
      .locator('input.form-control, input[type="text"], input[type="email"], input')
      .first();
  }

  /** Letters-only first name that differs from the current value (still ≥ 2 chars). */
  private nextEditableFirstName(current: string): string {
    const letters = current.replace(/[^a-z]/gi, '').toLowerCase() || 'ab';
    const suffix = letters.endsWith('z') ? 'y' : 'z';
    return `${letters}${suffix}`;
  }

  /** Sets an Angular reactive-form input and triggers dirty-state detection. */
  private async setAngularFormInputValue(field: Locator, value: string): Promise<void> {
    await field.scrollIntoViewIfNeeded();
    await field.click();

    // Native value setter + input/change events — most reliable for Angular reactive forms.
    await field.evaluate((el, val) => {
      const input = el as HTMLInputElement;
      input.focus();
      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(input, val);
      } else {
        input.value = val;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);

    await field.blur();
  }

  /** Retry First Name edit until Angular enables Update (avoids partial keystroke / stale form state). */
  private async setEditUserFirstNameAndWaitForUpdate(
    firstNameField: Locator,
    updatedFirstName: string,
  ): Promise<void> {
    for (let attempt = 1; attempt <= 3; attempt++) {
      await this.setAngularFormInputValue(firstNameField, updatedFirstName);

      const current = await firstNameField.inputValue().catch(() => '');
      if (current !== updatedFirstName) {
        await firstNameField.click();
        await firstNameField.press('ControlOrMeta+A');
        await firstNameField.pressSequentially(updatedFirstName, { delay: 30 });
        await firstNameField.dispatchEvent('input');
        await firstNameField.dispatchEvent('change');
        await firstNameField.blur();
      }

      await expect(
        firstNameField,
        `Edit User First Name should now be "${updatedFirstName}" (attempt ${attempt})`,
      ).toHaveValue(updatedFirstName);

      const updateEnabled = await this.editUserUpdateButton.isEnabled({ timeout: 3000 }).catch(() => false);
      if (updateEnabled) {
        return;
      }

      logger.info(`Edit User Update still disabled after attempt ${attempt} — retrying First Name input`);
    }

    await expect(
      this.editUserUpdateButton,
      'Update must be enabled after changing First Name',
    ).toBeEnabled({ timeout: TIMEOUTS.SLOW_UI_MS });
  }

  /** Close any open Manage Users modal so Create New User is not blocked. */
  private async dismissOpenManageUsersDialogs(): Promise<void> {
    const editOpen = await this.editUserDialog.isVisible({ timeout: 500 }).catch(() => false);
    if (editOpen) {
      await this.editUserCancelButton.click().catch(() => undefined);
      await expect(this.editUserDialog).toBeHidden({ timeout: TIMEOUTS.SLOW_UI_MS }).catch(() => undefined);
    }

    const addOpen = await this.addUserDialog.isVisible({ timeout: 500 }).catch(() => false);
    if (addOpen) {
      await this.addUserCancelButton.click().catch(() => undefined);
      await expect(this.addUserDialog).toBeHidden({ timeout: TIMEOUTS.SLOW_UI_MS }).catch(() => undefined);
    }
  }

  private async isCreateNewUserEnabledNow(): Promise<boolean> {
    return this.createNewUserButton.evaluate((el) => !(el as HTMLButtonElement).disabled).catch(() => false);
  }

  /**
   * When company user limit is reached (e.g. Operator 10/10), delete stale rocky* YOPmail
   * users left from prior runs so Create New User becomes available again.
   * Needs 3 free slots (Admin + Data Engineer + Field Engineer created in one run).
   */
  async ensureCreateNewUserAvailable(maxStaleDeletes = 12): Promise<void> {
    if (await this.isCreateNewUserEnabledNow()) {
      return;
    }

    logger.info(
      'Create New User is disabled — removing stale rocky* @yopmail.com test users from prior runs',
    );

    await this.searchManageUsers('rocky');
    await this.page.waitForTimeout(500);

    const minSlotsNeeded = 3;
    let deleted = 0;
    while (deleted < maxStaleDeletes) {
      const staleRow = this.page
        .getByRole('row')
        .filter({ hasText: /rocky/i })
        .filter({ hasText: /@yopmail\.com/i })
        .nth(0);

      if (!(await staleRow.isVisible({ timeout: 2000 }).catch(() => false))) {
        break;
      }

      const removed = await this.deleteManageUsersRowIfAllowed(staleRow);
      if (!removed) {
        logger.info('Could not delete next stale rocky user — stopping cleanup');
        break;
      }
      deleted += 1;
      logger.info(`Removed stale rocky test user (${deleted})`);
      await this.page.waitForTimeout(400);

      if (deleted >= minSlotsNeeded && (await this.isCreateNewUserEnabledNow())) {
        break;
      }
    }

    await this.fill(this.manageSearchTextbox, '', 'Clear search after stale user cleanup');
    await this.page.waitForTimeout(400);

    expect(
      deleted,
      `Create New User is disabled (company user limit). Removed ${deleted} stale rocky user(s); ` +
        `need at least one free slot before creating users.`,
    ).toBeGreaterThan(0);

    await expect(
      this.createNewUserButton,
      'Create New User should be enabled after freeing stale rocky test users',
    ).toBeEnabled({ timeout: 15_000 });
  }

  private async isDeleteActionDisabled(deleteIcon: Locator): Promise<boolean> {
    return deleteIcon.evaluate((img) => {
      const hasDisabledClass = (el: Element) =>
        /\bdisabled?\b/i.test((el as HTMLElement).className ?? '');
      const hasDisabledAttr = (el: Element) =>
        el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
      const hasPointerBlock = (el: Element) =>
        window.getComputedStyle(el as HTMLElement).pointerEvents === 'none';

      let cur: Element | null = img;
      while (cur) {
        if (hasDisabledAttr(cur) || hasDisabledClass(cur) || hasPointerBlock(cur)) {
          return true;
        }
        cur = cur.parentElement;
      }
      return false;
    });
  }

  private async deleteManageUsersRowIfAllowed(row: Locator): Promise<boolean> {
    const deleteIcon = row.getByRole('img', { name: 'Delete' }).first();
    if (!(await deleteIcon.isVisible({ timeout: 2000 }).catch(() => false))) {
      return false;
    }

    await deleteIcon.click({ force: true });
    const confirmVisible = await this.deleteConfirmPopup.isVisible({ timeout: 8_000 }).catch(() => false);
    if (!confirmVisible) {
      logger.info('Delete confirm did not appear for stale user row');
      return false;
    }
    await this.click(this.deleteConfirmYesButton, 'Yes, Delete stale test user');
    await expect(this.deleteConfirmPopup, 'Delete confirm should close after stale user removal').toBeHidden({
      timeout: TIMEOUTS.SLOW_UI_MS,
    });
    await this.page.waitForTimeout(300);
    return true;
  }

  /**
   * Edit User: Update is disabled until a field changes; then First Name is updated and
   * the Manage Users grid is re-asserted. Mutates user.firstName to the saved value.
   */
  async editCreatedUserFirstNameAndAssert(user: GeneratedYopmailUser): Promise<string> {
    const userRow = this.page.getByRole('row').filter({ hasText: user.email }).first();
    const editIcon = userRow.getByRole('img', { name: 'Edit' });
    await AssertionUtils.assertVisible(editIcon, 'Edit icon should be visible before opening Edit User');
    await this.click(editIcon, 'Edit user');

    await WaitUtils.untilVisible(this.editUserDialog, TIMEOUTS.SLOW_UI_MS);
    await AssertionUtils.assertVisible(this.editUserHeading, 'Edit User heading should be visible');
    await AssertionUtils.assertVisible(
      this.editUserCancelButton,
      'Cancel button should be visible on Edit User',
    );
    await AssertionUtils.assertVisible(
      this.editUserUpdateButton,
      'Update button should be visible on Edit User',
    );

    const userNameField = this.editUserFieldByLabel('User Name');
    const emailField = this.editUserDialog.locator('input[type="email"]').first();
    const firstNameField = this.editUserFieldByLabel('First Name');
    const lastNameField = this.editUserFieldByLabel('Last Name');

    await expect(userNameField, 'User Name should be disabled on Edit User').toBeDisabled();
    await expect(userNameField, `User Name should remain "${user.userName}"`).toHaveValue(
      user.userName,
    );
    await expect(emailField, 'Email should be disabled on Edit User').toBeDisabled();
    await expect(emailField, `Email should remain "${user.email}"`).toHaveValue(user.email);
    await expect(firstNameField, 'First Name should be editable on Edit User').toBeEnabled();
    await expect(firstNameField, `First Name should show created value "${user.firstName}"`).toHaveValue(
      user.firstName,
    );
    await expect(lastNameField, `Last Name should show created value "${user.lastName}"`).toHaveValue(
      user.lastName,
    );

    await expect(
      this.editUserUpdateButton,
      'Update must be disabled when no Edit User field has changed',
    ).toBeDisabled();

    const updatedFirstName = this.nextEditableFirstName(user.firstName);
    expect(updatedFirstName, 'Edited First Name must differ from the created value').not.toBe(
      user.firstName,
    );
    expect(updatedFirstName, 'Edited First Name must be letters-only (≥2)').toMatch(/^[a-z]{2,}$/i);

    await this.setEditUserFirstNameAndWaitForUpdate(firstNameField, updatedFirstName);

    await this.editUserUpdateButton.click({ noWaitAfter: true });
    logger.info('Clicked Update on Edit User');

    const updatedAlertVisible = await this.userUpdatedAlert
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    if (updatedAlertVisible) {
      logger.info('User updated successfully alert appeared after Update');
    }

    await expect(
      this.editUserDialog,
      'Edit User dialog should close after successful Update',
    ).toBeHidden({ timeout: TIMEOUTS.SLOW_UI_MS });

    await expect(
      userRow.getByRole('gridcell', { name: updatedFirstName, exact: true }),
      `Manage Users grid First Name should update to "${updatedFirstName}"`,
    ).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });
    await expect(
      this.page.getByRole('gridcell', { name: user.email, exact: true }),
      'Created user email should still appear in the grid after Update',
    ).toBeVisible();

    user.firstName = updatedFirstName;
    logger.info(`Edited user ${user.email}: First Name updated to "${updatedFirstName}"`);
    return updatedFirstName;
  }

  private createdUserRow(user: GeneratedYopmailUser): Locator {
    return this.page.getByRole('row').filter({ hasText: user.email }).first();
  }

  private async searchManageUsers(query: string): Promise<void> {
    await AssertionUtils.assertVisible(
      this.manageSearchTextbox,
      'Search textbox should be visible on Manage Users',
    );
    await this.manageSearchTextbox.click();
    await this.manageSearchTextbox.fill('');
    if (query) {
      await this.manageSearchTextbox.fill(query);
    }
    await this.manageSearchTextbox.press('Enter');
    await this.page.waitForTimeout(500);
  }

  private async assertDeleteConfirmForUser(user: GeneratedYopmailUser): Promise<void> {
    await expect(
      this.deleteConfirmPopup,
      'Delete Confirm Action popup should be visible',
    ).toBeVisible({ timeout: TIMEOUTS.SLOW_UI_MS });
    await AssertionUtils.assertVisible(
      this.deleteConfirmIcon,
      'Delete Icon should be visible on Confirm Action',
    );
    await AssertionUtils.assertVisible(
      this.deleteConfirmHeading,
      'Confirm Action heading should be visible',
    );
    await expect(
      this.deleteConfirmHtml,
      `Confirm Action must ask to delete the created user "${user.userName}" (not a hardcoded name)`,
    ).toContainText(new RegExp(`Would you like to delete\\s+${this.escapeRegex(user.userName)}\\s*\\?`, 'i'));
    await AssertionUtils.assertVisible(this.deleteConfirmNoButton, 'No button should be visible');
    await AssertionUtils.assertVisible(
      this.deleteConfirmYesButton,
      'Yes, Delete button should be visible',
    );
    await expect(this.deleteConfirmNoButton, 'No button should be enabled').toBeEnabled();
    await expect(
      this.deleteConfirmYesButton,
      'Yes, Delete button should be enabled',
    ).toBeEnabled();
  }

  private async openDeleteConfirmForCreatedUser(user: GeneratedYopmailUser): Promise<void> {
    const userRow = this.createdUserRow(user);
    const deleteIcon = userRow.getByRole('img', { name: 'Delete' });
    await AssertionUtils.assertVisible(
      userRow.getByRole('img', { name: 'Edit' }),
      `Edit icon should be visible on created user row ${user.email}`,
    );
    await AssertionUtils.assertVisible(
      deleteIcon,
      `Delete icon should be visible on created user row ${user.email}`,
    );
    await this.click(deleteIcon, `Delete ${user.userName}`);
    await this.assertDeleteConfirmForUser(user);
  }

  /**
   * Searches Manage Users for the user created in this run and asserts they are not listed.
   */
  async searchAndAssertUserNotListed(user: GeneratedYopmailUser): Promise<void> {
    await this.searchManageUsers(user.userName);

    await expect(
      this.page.getByRole('gridcell', { name: user.email, exact: true }),
      `Deleted user email "${user.email}" must not appear in Manage Users after search`,
    ).toHaveCount(0, { timeout: TIMEOUTS.SLOW_UI_MS });

    await expect(
      this.page.getByRole('row').filter({ hasText: user.email }),
      `Deleted user row "${user.userName}" / "${user.email}" must not be listed in the table`,
    ).toHaveCount(0, { timeout: TIMEOUTS.SLOW_UI_MS });

    logger.info(`Deleted user is not listed after search: ${user.email}`);
  }

  /**
   * Delete the user created in this run (row located by email — never a hardcoded cell/user).
   * Exercises No, dialog Close, then Yes, Delete. Then searches and asserts the user is gone.
   */
  async deleteCreatedUserAndAssertRemoved(user: GeneratedYopmailUser): Promise<void> {
    await this.searchAndAssertCreatedUser(user);

    await this.openDeleteConfirmForCreatedUser(user);
    await this.click(this.deleteConfirmNoButton, 'Delete Confirm — No');
    await expect(
      this.deleteConfirmPopup,
      'Confirm Action should close after clicking No',
    ).toBeHidden({ timeout: TIMEOUTS.SLOW_UI_MS });
    await expect(
      this.page.getByRole('gridcell', { name: user.email, exact: true }),
      `Created user "${user.email}" must still be listed after cancelling Delete with No`,
    ).toBeVisible();

    await this.openDeleteConfirmForCreatedUser(user);
    await AssertionUtils.assertVisible(
      this.deleteConfirmCloseButton,
      'Close this dialog should be visible on Confirm Action',
    );
    await this.click(this.deleteConfirmCloseButton, 'Delete Confirm — Close this dialog');
    await expect(
      this.deleteConfirmPopup,
      'Confirm Action should close after clicking Close this dialog',
    ).toBeHidden({ timeout: TIMEOUTS.SLOW_UI_MS });
    await expect(
      this.page.getByRole('gridcell', { name: user.email, exact: true }),
      `Created user "${user.email}" must still be listed after closing the Delete dialog`,
    ).toBeVisible();

    await this.openDeleteConfirmForCreatedUser(user);
    await this.click(this.deleteConfirmYesButton, 'Yes, Delete');
    await expect(
      this.deleteConfirmPopup,
      'Confirm Action should close after Yes, Delete',
    ).toBeHidden({ timeout: TIMEOUTS.SLOW_UI_MS });

    await expect(
      this.page.getByRole('gridcell', { name: user.email, exact: true }),
      `Created user "${user.email}" should disappear from the grid after Yes, Delete`,
    ).toHaveCount(0, { timeout: TIMEOUTS.SLOW_UI_MS });

    const deletedAlertVisible = await this.userDeletedAlert
      .isVisible({ timeout: 3_000 })
      .catch(() => false);
    if (deletedAlertVisible) {
      await expect(
        this.userDeletedAlert,
        'Success alert should appear after Yes, Delete when the app shows one',
      ).toBeVisible();
    }

    await AssertionUtils.assertVisible(
      this.manageUsersHeading,
      'Manage Users heading should remain visible after deleting the created user',
    );

    await this.searchAndAssertUserNotListed(user);
    logger.info(`Deleted created user ${user.userName} (${user.email}) and verified they are not listed`);
  }

  /**
   * Asserts that the currently logged-in user's Delete action is disabled/not available
   * in the Manage Users grid (self-delete protection).
   *
   * Skips when the logged-in user belongs to a different company than the currently
   * selected Manage Users company (e.g. Carbo admin viewing Operator Company users).
   */
  async assertLoggedInUserDeleteIconDisabled(
    loggedInEmail: string,
    firstName?: string,
    lastName?: string,
    options?: {
      profileCompanyName?: string;
      selectedManageCompanyName?: string;
    },
  ): Promise<void> {
    const profileCompany = options?.profileCompanyName?.trim() ?? '';
    const selectedCompany = options?.selectedManageCompanyName?.trim() ?? '';

    if (
      profileCompany &&
      selectedCompany &&
      !new RegExp(this.escapeRegex(profileCompany), 'i').test(selectedCompany) &&
      !new RegExp(this.escapeRegex(selectedCompany), 'i').test(profileCompany)
    ) {
      logger.info(
        `Self-delete check skipped — logged-in user company "${profileCompany}" is not listed ` +
          `under selected Manage Users company "${selectedCompany}"`,
      );
      await this.fill(this.manageSearchTextbox, '', 'Clear Manage Users search after self-delete skip');
      return;
    }

    const emailPrefix = loggedInEmail.split('@')[0]?.trim();
    const searchCandidates = Array.from(
      new Set([loggedInEmail, emailPrefix, firstName?.trim()].map((v) => (v ?? '').trim()).filter(Boolean)),
    );

    expect(
      searchCandidates.length,
      'Self-delete assertion requires at least one dynamic user identifier',
    ).toBeGreaterThan(0);

    let loggedInUserRow: Locator | null = null;
    let matchedBy = '';

    for (const candidate of searchCandidates) {
      await this.searchManageUsers(candidate);
      await this.page.waitForTimeout(120);

      const rowByEmail = this.page
        .getByRole('row')
        .filter({ hasText: new RegExp(this.escapeRegex(loggedInEmail), 'i') })
        .first();

      const emailMatchCount = await rowByEmail.count().catch(() => 0);
      if (emailMatchCount > 0) {
        loggedInUserRow = rowByEmail;
        matchedBy = `email=${loggedInEmail}`;
        break;
      }

      await this.fill(this.manageSearchTextbox, '', 'Clear unmatched Manage Users self-delete search');
    }

    if (!loggedInUserRow) {
      logger.info(
        `Self-delete check skipped — logged-in user "${loggedInEmail}" is not listed ` +
          `in the current Manage Users company view`,
      );
      await this.fill(this.manageSearchTextbox, '', 'Clear Manage Users search after self-delete skip');
      return;
    }

    const userRow = loggedInUserRow!;
    const deleteIconImg = userRow.getByRole('img', { name: 'Delete' }).first();

    await expect(
      deleteIconImg,
      `Delete icon should be present for logged-in user row (${matchedBy})`,
    ).toBeVisible({ timeout: 5_000 });

    // Validate that delete action is NOT available for current user.
    const deleteDisabledState = await deleteIconImg.evaluate((img) => {
      const hasDisabledClass = (el: Element) =>
        /\bdisabled?\b/i.test((el as HTMLElement).className ?? '');
      const hasDisabledAttr = (el: Element) =>
        el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true';
      const hasPointerBlock = (el: Element) =>
        window.getComputedStyle(el as HTMLElement).pointerEvents === 'none';

      let cur: Element | null = img;
      while (cur) {
        if (hasDisabledAttr(cur) || hasDisabledClass(cur) || hasPointerBlock(cur)) {
          return true;
        }
        cur = cur.parentElement;
      }
      return false;
    });

    expect(
      deleteDisabledState,
      `BUG: Logged-in user "${loggedInEmail}" must NOT be deletable. ` +
        `Delete action is enabled/available on the logged-in user's row (${matchedBy}).`,
    ).toBe(true);

    logger.info(`Self-delete protection verified for logged-in user "${loggedInEmail}" via ${matchedBy}`);

    await this.fill(this.manageSearchTextbox, '', 'Clear Manage Users search after self-delete assertion');
  }
}

export function createUserManagementPage(page: Page): UserManagementPage {
  return new UserManagementPage(page);
}
