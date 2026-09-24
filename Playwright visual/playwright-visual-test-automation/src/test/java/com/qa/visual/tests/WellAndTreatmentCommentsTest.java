package com.qa.visual.tests;

import org.testng.annotations.Test;

import com.qa.visual.base.BaseTest;
import com.qa.visual.utils.CommonUtils;

public class WellAndTreatmentCommentsTest extends BaseTest {

	@Test
	public void verifyWelltreatmentCommentPageVisualRegression() throws Exception {
		
		// Maximize browser window (consistent visual size)
//		page.setViewportSize(1920, 1080);

		// Login to the application
		CommonUtils.performLogin(page, test);

		// Wait for page to load
		Thread.sleep(15000);

		// Navigate to Comments tab 
		navigateToTab("a.continue-btn");
		Thread.sleep(2000);
		CommonUtils.navigateToPadAndWellViaFilters(page, test);
		Thread.sleep(2000);
		page.locator("//a[text()=' Well & Treatment ']").click();
		Thread.sleep(1000);
		page.locator("text='Comments'").click();
		Thread.sleep(5000);

		// Comments hole tab visual regression
		CommonUtils.captureAndValidateVisualRegression(page, "welltreatment", "Comments", 5, 0.5);
	}
}