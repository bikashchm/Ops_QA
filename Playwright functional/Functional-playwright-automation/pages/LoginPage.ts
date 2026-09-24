import { expect, type Page } from '@playwright/test';
import { TIMEOUTS } from '../constants/timeouts';
import { URLS } from '../constants/urls';
import { BasePage } from '../base/BasePage';
import { generateSecurePassword } from '../helpers/yopmailHelper';
import { logger } from '../logger';
import { step } from '../utils/step';
import { waitStep } from '../utils/stepLabels';
import { WaitUtils } from '../utils/WaitUtils';

/**
 * Login & authentication page object.
 */
export class LoginPage extends BasePage {
  private readonly emailField = this.page.getByRole('textbox', { name: 'Email Address' });
  private readonly passwordField = this.page.getByRole('textbox', { name: 'Password' });
  private readonly signInButton = this.page.getByRole('button', { name: 'Sign in' });
  private readonly stimulationTab = this.page.getByRole('tab', { name: 'Stimulation' });
  private readonly continueLink = this.page.getByRole('link', { name: 'Continue' });

  // User Management (YOPmail temp password → set new password) — from Playwright_Rohan
  private readonly userDetailsHeading = this.page.getByRole('heading', { name: 'User Details' });
  private readonly expiredPasswordMessage = this.page.getByText(
    /Your password has expired, please change to a new password/i,
  );
  private readonly currentPasswordOnChangeScreen = this.page.getByRole('textbox', {
    name: 'Password',
    exact: true,
  });
  private readonly newPasswordField = this.page.getByRole('textbox', {
    name: 'New Password',
    exact: true,
  });
  private readonly confirmNewPasswordField = this.page.getByRole('textbox', {
    name: 'Confirm New Password',
    exact: true,
  });
  private readonly continueButton = this.page.getByRole('button', { name: 'Continue' });

  async waitForLoginScreen(timeoutMs = TIMEOUTS.SLOW_UI_MS): Promise<void> {
    await step(waitStep('login screen'), async () => {
      await WaitUtils.untilVisible(this.emailField, timeoutMs);
      await WaitUtils.untilVisible(this.passwordField, timeoutMs);
      await WaitUtils.untilVisible(this.signInButton, timeoutMs);
    });
  }

  async login(email: string, password: string): Promise<void> {
    await step('Login with credentials', async () => {
      await this.waitForLoginScreen();
      await this.fill(this.emailField, email, 'email address');
      await this.fill(this.passwordField, password, 'password');
      await this.click(this.signInButton, 'Sign in');
    });
  }

  /**
   * After first login with YOPmail temp password, B2C shows "User Details" to set a new password.
   * @returns The newly set password (unique every run).
   */
  async completeExpiredPasswordChange(
    temporaryPassword: string,
    newPassword?: string,
  ): Promise<string> {
    return step('Complete expired password change', async () => {
      const resolvedNewPassword = newPassword ?? generateSecurePassword();

      await WaitUtils.untilVisible(this.userDetailsHeading, TIMEOUTS.SLOW_UI_MS);
      await WaitUtils.untilVisible(this.expiredPasswordMessage, TIMEOUTS.SLOW_UI_MS);
      await WaitUtils.untilVisible(this.currentPasswordOnChangeScreen, TIMEOUTS.SLOW_UI_MS);
      await WaitUtils.untilVisible(this.newPasswordField, TIMEOUTS.SLOW_UI_MS);
      await WaitUtils.untilVisible(this.confirmNewPasswordField, TIMEOUTS.SLOW_UI_MS);
      await WaitUtils.untilVisible(this.continueButton, TIMEOUTS.SLOW_UI_MS);

      await this.fill(this.currentPasswordOnChangeScreen, temporaryPassword, 'Password (YOPmail temp)');
      await this.fill(this.newPasswordField, resolvedNewPassword, 'New Password');
      await this.fill(this.confirmNewPasswordField, resolvedNewPassword, 'Confirm New Password');

      await expect(this.newPasswordField).toHaveValue(resolvedNewPassword);
      await expect(this.confirmNewPasswordField).toHaveValue(resolvedNewPassword);
      await expect(this.continueButton).toBeEnabled();
      await this.click(this.continueButton, 'Continue');
      await expect(this.userDetailsHeading).toBeHidden({ timeout: TIMEOUTS.SLOW_UI_MS });

      return resolvedNewPassword;
    });
  }

  /**
   * After B2C forces a password change, MSAL state on the leftover authorize page is stale.
   * Clear auth storage, open a fresh login, and sign in with the new password.
   */
  private async signInAgainIfReturnedToLoginAfterPasswordChange(
    email: string,
    newPassword: string,
  ): Promise<void> {
    await step('Fresh login after B2C password change', async () => {
      if (await this.isDigitalSolutionsVisible()) {
        return;
      }

      for (let attempt = 1; attempt <= 3; attempt++) {
        await this.page.context().clearCookies();
        await this.page
          .evaluate(() => {
            localStorage.clear();
            sessionStorage.clear();
          })
          .catch(() => undefined);

        await this.page.goto(URLS.authUrl, { waitUntil: 'domcontentloaded' });
        await this.waitForLoginScreen();
        await this.signInOnB2cLoginForm(email, newPassword);
        await this.waitForB2cRedirectToApp(25_000);

        if (await this.waitForDigitalSolutions(45_000)) {
          return;
        }

        logger.info(
          `New-user Digital Solutions not visible after attempt ${attempt}/3; url=${this.page.url()}`,
        );
      }

      const body = (await this.page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 1500);
      logger.error(
        `New-user login after password change did not reach Digital Solutions. url=${this.page.url()} body=${body}`,
      );
      throw new Error(
        `New-user login after password change did not reach Digital Solutions. url=${this.page.url()}; body=${body}`,
      );
    });
  }

  private async isDigitalSolutionsVisible(): Promise<boolean> {
    const heading = this.page.getByRole('heading', { name: /Explore Our Digital Solutions/i });
    return (
      (await this.stimulationTab.isVisible().catch(() => false)) ||
      (await heading.isVisible().catch(() => false)) ||
      (await this.continueLink.isVisible().catch(() => false))
    );
  }

  /**
   * Poll visibility instead of locator.waitFor — Playwright waitFor blocks on in-flight
   * MSAL hash navigations to /auth/login#... and never sees the Digital Solutions shell.
   */
  private async waitForDigitalSolutions(timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await this.page.waitForLoadState('domcontentloaded').catch(() => undefined);
      if (await this.isDigitalSolutionsVisible()) {
        return true;
      }
      await this.page.waitForTimeout(500);
    }
    return this.isDigitalSolutionsVisible();
  }

  /** B2C Sign in returns to Live+ via a hash redirect; wait for commit, not full load. */
  private async waitForB2cRedirectToApp(timeoutMs = TIMEOUTS.SLOW_UI_MS): Promise<boolean> {
    try {
      await this.page.waitForURL((url) => !url.hostname.includes('b2clogin.com'), {
        timeout: timeoutMs,
        waitUntil: 'commit',
      });
      await this.page.waitForLoadState('domcontentloaded').catch(() => undefined);
      return true;
    } catch {
      return false;
    }
  }

  /** Prefer B2C native #email/#password/#next so leftover User Details fields are not filled. */
  private async signInOnB2cLoginForm(email: string, password: string): Promise<void> {
    const emailInput = this.page.locator('#email, #signInName').or(this.emailField).first();
    const passwordInput = this.page
      .locator('form')
      .filter({ has: this.page.locator('#email, #signInName') })
      .locator('#password, input[type="password"]')
      .first()
      .or(this.passwordField);
    const submit = this.page.locator('#next').or(this.signInButton).first();

    await WaitUtils.untilVisible(emailInput, TIMEOUTS.SLOW_UI_MS);
    await this.fillFast(emailInput, email, 'email address');
    await this.fillFast(passwordInput, password, 'password');
    await expect(submit).toBeEnabled();
    await this.page.waitForTimeout(300);
    await submit.click({ force: true, noWaitAfter: true });
  }

  /** Sign in with YOPmail temp password, then complete mandatory password change when shown. */
  async loginWithTemporaryPasswordAndSetNewPassword(
    email: string,
    temporaryPassword: string,
  ): Promise<string> {
    await this.login(email, temporaryPassword);
    const newPassword = await this.completeExpiredPasswordChange(temporaryPassword);
    await this.signInAgainIfReturnedToLoginAfterPasswordChange(email, newPassword);
    return newPassword;
  }

  async waitForAuthenticatedApp(timeoutMs = TIMEOUTS.SLOW_UI_MS): Promise<void> {
    await step(waitStep('home page after login'), async () => {
      if (await this.waitForDigitalSolutions(timeoutMs)) {
        return;
      }
      const stillOnLogin = await this.signInButton.isVisible().catch(() => false);
      const invalidLogin = await this.page
        .getByText(/invalid|incorrect|wrong email|wrong password|account locked|try again/i)
        .first()
        .isVisible()
        .catch(() => false);
      const url = this.page.url();
      const b2cHint = await this.page
        .locator('.error, #claimVerificationServerError, .pageLevel, [role="alert"]')
        .first()
        .innerText()
        .catch(() => '');
      throw new Error(
        `Home page (Stimulation tab) not visible after Sign in within ${timeoutMs}ms. ` +
          `url=${url}; stillOnLogin=${stillOnLogin}; invalidLoginHint=${invalidLogin}; ` +
          `b2cHint=${b2cHint.slice(0, 200)}. ` +
          `Check Excel Email/Password for STAGE (pipeline uses Excel first).`,
      );
    });
  }

  async openStimulationTab(): Promise<void> {
    await this.click(this.stimulationTab, 'Stimulation tab');
  }

  async clickContinue(timeoutMs = 90_000): Promise<void> {
    await step(waitStep('Continue link'), async () => {
      await WaitUtils.untilVisible(this.continueLink, timeoutMs);
      await WaitUtils.untilEnabled(this.continueLink, timeoutMs);
    });
    await this.click(this.continueLink, 'Continue');
  }
}

export function createLoginPage(page: Page): LoginPage {
  return new LoginPage(page);
}
