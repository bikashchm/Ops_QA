package com.qa.visual.tests;

import org.testng.Assert;
import org.testng.annotations.Test;

import com.microsoft.playwright.options.LoadState;
import com.microsoft.playwright.options.WaitForSelectorState;
import com.microsoft.playwright.options.WaitUntilState;
import com.qa.visual.base.BaseTest;
import com.qa.visual.utils.CommonUtils;

public class Forget_Password extends BaseTest {

	private static final String LOGIN_URL = "https://liveplus-qa.linqx.io/";
	private static final String FORGOT_PASSWORD_LINK = "//*[text()='Forgot your password?']";
	private static final int PAGE_WAIT_TIMEOUT_MS = 60_000;
	private final String MODULE_NAME = "Forget_Password";
	private final double THRESHOLD = CommonUtils.DEFAULT_THRESHOLD;

	@Test
	public void verifyForget_PasswordscreenVisualRegression() throws Exception {
		page.navigate(LOGIN_URL,
				new com.microsoft.playwright.Page.NavigateOptions()
						.setWaitUntil(WaitUntilState.DOMCONTENTLOADED)
						.setTimeout(PAGE_WAIT_TIMEOUT_MS));

		page.waitForLoadState(LoadState.NETWORKIDLE,
				new com.microsoft.playwright.Page.WaitForLoadStateOptions()
						.setTimeout(PAGE_WAIT_TIMEOUT_MS));

		page.waitForSelector(FORGOT_PASSWORD_LINK,
				new com.microsoft.playwright.Page.WaitForSelectorOptions()
						.setState(WaitForSelectorState.VISIBLE)
						.setTimeout(PAGE_WAIT_TIMEOUT_MS));

		page.click(FORGOT_PASSWORD_LINK);

		page.waitForLoadState(LoadState.NETWORKIDLE,
				new com.microsoft.playwright.Page.WaitForLoadStateOptions()
						.setTimeout(PAGE_WAIT_TIMEOUT_MS));

		page.waitForSelector("input#email",
				new com.microsoft.playwright.Page.WaitForSelectorOptions()
						.setState(WaitForSelectorState.VISIBLE)
						.setTimeout(PAGE_WAIT_TIMEOUT_MS));

		page.waitForSelector("button:has-text('Send verification code')",
				new com.microsoft.playwright.Page.WaitForSelectorOptions()
						.setState(WaitForSelectorState.VISIBLE)
						.setTimeout(PAGE_WAIT_TIMEOUT_MS));

		double diffPercent = CommonUtils.performVisualStep(
				page, test, MODULE_NAME, "Forget_Password", null, THRESHOLD
		);
		if (diffPercent >= 0) {
			Assert.assertTrue(diffPercent <= THRESHOLD,
					"Visual Regression Difference found on Forget_Password screen! " + diffPercent + "% mismatch.");
		}
	}
}
