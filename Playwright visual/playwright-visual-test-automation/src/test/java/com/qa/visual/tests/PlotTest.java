package com.qa.visual.tests;

import org.testng.annotations.Test;

import com.qa.visual.base.BaseTest;
import com.qa.visual.utils.CommonUtils;

public class PlotTest extends BaseTest {

	@Test
	public void verifyPlotPageVisualRegression() throws Exception {

//		page.setViewportSize(1920, 1080);

		// Login to the application
		CommonUtils.performLogin(page, test);

		// Navigate to Plot page after login
		Thread.sleep(5000);
		navigateToTab("a.continue-btn");
		Thread.sleep(1000);
		CommonUtils.navigateToPadAndWellViaFilters(page, test);
		Thread.sleep(3000);
		page.locator("//span[text()=' Results']").click();
		Thread.sleep(1000);
		page.locator("text=' Plot '").click();
		Thread.sleep(5000);
		// Plots tab visual regression
		CommonUtils.captureAndValidateVisualRegression(page, "Plots", "Plot", 5, 0.5);

		// Open Channel Selection via channel icon (replaces old "Add Channels to Continue" button)
		page.locator("img[alt='channel']").first().click(
				new com.microsoft.playwright.Locator.ClickOptions().setTimeout(60000));
		Thread.sleep(5000);
		CommonUtils.captureAndValidateVisualRegression(page, "Plots", "ChannelSelection", 5, 0.5);

		page.locator("select[formcontrolname='channel']").first().click();
		Thread.sleep(5000);
		CommonUtils.captureAndValidateVisualRegression(page, "Plots", "SelectChannelDropdown", 5, 0.5);

		page.locator("button:has-text('Cancel')").first().click();
		Thread.sleep(5000);
		page.locator("img[alt='expand/collapse']").first().click();
		Thread.sleep(5000);
		CommonUtils.captureAndValidateVisualRegression(page, "Plots", "PlotViewExpand", 5, 0.5);
		Thread.sleep(5000);
		page.locator("img[alt='expand/collapse']").first().click();
		Thread.sleep(5000);
		CommonUtils.captureAndValidateVisualRegression(page, "Plots", "PlotViewCollapsed", 5, 0.5);

		System.out.println("✔ Plot screen visual checks completed.");
	}
}
