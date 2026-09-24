package com.qa.visual.tests;

import org.testng.annotations.Test;

import com.qa.visual.base.BaseTest;
import com.qa.visual.utils.CommonUtils;

public class EntryFriction  extends BaseTest { 

	@Test
	public void verifyEntryFrictionPageVisualRegression() throws Exception {

//		page.setViewportSize(1920, 1080);

		// Login to the application
		CommonUtils.performLogin(page, test);

		// Locater to the Treatment scheduled page after login
		Thread.sleep(5000);
		navigateToTab("a.continue-btn");
		Thread.sleep(1000);
		CommonUtils.navigateToPadAndWellViaFilters(page, test);
		Thread.sleep(3000);
		page.locator("//span[text()=' Analysis']").click();
		Thread.sleep(1000);
		page.locator("text=' Entry Friction '").click();
		Thread.sleep(1000);
		page.locator("input[id='cramerModel']").click();
		Thread.sleep(5000);
		
		// Entry friction tab visual regression
		CommonUtils.captureAndValidateVisualRegression(page, "EntryFriction", "EntryFriction", 5, 0.5);
		
		// If reached here both checks either created baselines or passed comparisons
		System.out.println("✔ Entry friction visual checks completed.");
   }
}