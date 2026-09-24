package com.qa.visual.tests;

import org.testng.annotations.Test;

import com.microsoft.playwright.options.LoadState;
import com.microsoft.playwright.options.WaitForSelectorState;
import com.microsoft.playwright.options.WaitUntilState;
import com.qa.visual.base.BaseTest;
import com.qa.visual.utils.CommonUtils;

public class Login extends BaseTest {

	private static final String LOGIN_URL = "https://liveplus-qa.linqx.io/";
	private static final int PAGE_WAIT_TIMEOUT_MS = 60_000;

	@Test
	public void verifyLogInPageVisualRegression() throws Exception {

		page.navigate(LOGIN_URL,
				new com.microsoft.playwright.Page.NavigateOptions()
						.setWaitUntil(WaitUntilState.DOMCONTENTLOADED)
						.setTimeout(PAGE_WAIT_TIMEOUT_MS));

		page.waitForLoadState(LoadState.NETWORKIDLE,
				new com.microsoft.playwright.Page.WaitForLoadStateOptions()
						.setTimeout(PAGE_WAIT_TIMEOUT_MS));

		waitForLoginScreen();

		CommonUtils.captureAndValidateVisualRegression(
				page,
				"Signin",
				"signin",
				5,      // tolerance
				0.5     // threshold %
		);
	}

	private void waitForLoginScreen() {
		page.waitForSelector("input[name='Email Address']",
				new com.microsoft.playwright.Page.WaitForSelectorOptions()
						.setState(WaitForSelectorState.VISIBLE)
						.setTimeout(PAGE_WAIT_TIMEOUT_MS));

		page.waitForSelector("input[name='Password']",
				new com.microsoft.playwright.Page.WaitForSelectorOptions()
						.setState(WaitForSelectorState.VISIBLE)
						.setTimeout(PAGE_WAIT_TIMEOUT_MS));

		page.waitForSelector("button[type='submit']",
				new com.microsoft.playwright.Page.WaitForSelectorOptions()
						.setState(WaitForSelectorState.VISIBLE)
						.setTimeout(PAGE_WAIT_TIMEOUT_MS));
	}
}
