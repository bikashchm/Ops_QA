package com.qa.visual.tests;

import org.testng.annotations.Test;

import com.qa.visual.base.BaseTest;
import com.qa.visual.utils.CommonUtils;

public class RunModelTest extends BaseTest {

	@Test
	public void verifyRunModelPageVisualRegression() throws Exception {
		
		// Maximize browser window (consistent visual size)
//		page.setViewportSize(1920, 1080);

		// Login to the application
		CommonUtils.performLogin(page, test);

		// Wait for page to load
		Thread.sleep(15000);

		// Navigate to Run model tab 
		navigateToTab("a.continue-btn");
		Thread.sleep(2000);
		CommonUtils.navigateToPadAndWellViaFilters(page, test);
		Thread.sleep(2000);
		page.locator("//a[text()=' Well & Treatment ']").click();
		Thread.sleep(1000);
		page.locator("//img[@alt='play']").click();
		Thread.sleep(3000);

		// Run Model tab visual regression
		CommonUtils.captureAndValidateVisualRegression(page, "welltreatment", "RunModel", 5, 0.5);
	}
}
