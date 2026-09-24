package com.qa.visual.tests;

import org.testng.annotations.Test;

import com.qa.visual.base.BaseTest;
import com.qa.visual.utils.CommonUtils;

public class VersionControlTest extends BaseTest {

	@Test
	public void verifyVersionControlPageVisualRegression() throws Exception {

//		page.setViewportSize(1920, 1080);

		// Login to the application
		CommonUtils.performLogin(page, test);

		// Locater to the Navigate the Version control screen page after login
		Thread.sleep(5000);
		navigateToTab("a.continue-btn");
		Thread.sleep(1000);
		CommonUtils.navigateToPadAndWellViaFilters(page, test);
		Thread.sleep(3000);
		page.locator("//span[text()=' Utilities']").click();
		Thread.sleep(1000);
		page.locator("//a[text()=' Version Control ']").click();
		Thread.sleep(3000);
		
		
		// Version control tab visual regression
		CommonUtils.captureAndValidateVisualRegression(page, "VersionControl", "Versioncontrol", 5, 0.5);
		
		// If reached here both checks either created baselines or passed comparisons
		System.out.println("✔ User-definedChannels screen visual checks completed.");
   }
}
