import { expect, type Locator, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { BasePage } from '../base/BasePage';
import { AssertionUtils } from '../utils/AssertionUtils';
import { WaitUtils } from '../utils/WaitUtils';

export interface LoggedInUserDetails {
  email: string;
  firstName: string;
  lastName: string;
  /** Topbar / profile display name derived from the logged-in account. */
  displayName: string;
}

/**
 * User menu / My Profile / Manage — display name is resolved dynamically
 * from the topbar / profile for whatever credentials were used to login.
 */
export class UserAccountPage extends BasePage {
  private readonly pageTopbar = this.page.locator('#page-topbar');
  private readonly myProfileLink = this.page.locator('a').filter({ hasText: 'My Profile' });
  /** Dropdown label is "Manage" (not "Manage Users"). */
  private readonly manageLink = this.page.locator('a').filter({ hasText: /^Manage$/ });
  private readonly personalInformationText = this.page.getByText(/Personal Information/i);
  private readonly firstNameField = this.page.getByRole('textbox', { name: /First Name/i });
  private readonly lastNameField = this.page.getByRole('textbox', { name: /Last Name/i });
  private readonly emailField = this.page.getByRole('textbox', { name: /^Email$/i });

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /** Account dropdown in the header — independent of any hardcoded user name. */
  private accountMenuButton(): Locator {
    return this.pageTopbar
      .getByRole('button')
      .filter({ hasNotText: /applications|notification|bell/i })
      .filter({ hasText: /\S/ })
      .last();
  }

  private normalizeDisplayText(raw: string): string {
    return raw
      .replace(/[^\w\s@.-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Reads the currently logged-in user's label from the topbar
   * (works for any credential — no hardcoded display name).
   */
  async captureLoggedInDisplayNameFromTopbar(): Promise<string> {
    const menuButton = this.accountMenuButton();
    await WaitUtils.untilVisible(menuButton, TIMEOUTS.SLOW_UI_MS);
    const raw = (await menuButton.innerText()).trim();
    const displayName = this.normalizeDisplayText(raw);
    expect(displayName, 'Topbar should show a logged-in user display name').not.toBe('');
    return displayName;
  }

  async openUserMenu(): Promise<void> {
    const menuButton = this.accountMenuButton();
    await WaitUtils.untilVisible(menuButton, TIMEOUTS.SLOW_UI_MS);
    await this.click(menuButton, 'User menu');
  }

  /**
   * Opens My Profile and asserts Personal Information matches the login email.
   * Returns first/last/display name from the profile for the current credentials.
   */
  async openAndVerifyMyProfile(loginEmail: string): Promise<LoggedInUserDetails> {
    await this.openUserMenu();
    await this.click(this.myProfileLink, 'My Profile');

    await expect(
      this.personalInformationText,
      'My Profile Personal Information section should be visible',
    ).toBeVisible();
    await WaitUtils.untilVisible(this.emailField);
    await expect(
      this.emailField,
      `Profile email should match login credentials (${loginEmail})`,
    ).toHaveValue(loginEmail);

    const firstName = (await this.firstNameField.inputValue()).trim();
    const lastName = (await this.lastNameField.inputValue()).trim();
    expect(firstName, 'Profile First Name should be populated for the logged-in user').not.toBe('');
    expect(lastName, 'Profile Last Name should be populated for the logged-in user').not.toBe('');

    const displayName = `${firstName} ${lastName}`.trim();
    return {
      email: loginEmail,
      firstName,
      lastName,
      displayName,
    };
  }

  /**
   * Opens Manage and asserts the same logged-in user (by login email, and name when available)
   * is present in the Manage list.
   */
  async openManageAndAssertLoggedInUser(user: LoggedInUserDetails): Promise<void> {
    await this.openUserMenu();
    await this.click(this.manageLink, 'Manage');

    const manageHeading = this.page
      .getByRole('heading', { name: /Manage/i })
      .or(this.page.getByText(/Manage Users|User Management|Users/i).first());
    await WaitUtils.untilVisible(manageHeading.first(), TIMEOUTS.SLOW_UI_MS);

    const searchBox = this.page
      .getByRole('textbox', { name: /search/i })
      .or(this.page.getByPlaceholder(/search/i))
      .first();

    if (await searchBox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.fill(searchBox, user.email, 'Manage search');
    }

    const userRow = this.page.getByRole('row').filter({ hasText: user.email }).first();

    await AssertionUtils.assertVisible(
      userRow,
      `Logged-in user email "${user.email}" should be present in Manage`,
    );

    await expect(
      userRow.getByRole('gridcell', { name: user.email }),
      `Manage row should show email "${user.email}"`,
    ).toBeVisible();

    if (user.firstName) {
      await expect(
        userRow,
        `Manage row for "${user.email}" should include first name "${user.firstName}"`,
      ).toContainText(new RegExp(this.escapeRegex(user.firstName), 'i'));
    }
  }
}

export function createUserAccountPage(page: Page): UserAccountPage {
  return new UserAccountPage(page);
}
