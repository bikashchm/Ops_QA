package com.qa.visual.tests;

import org.testng.annotations.Test;

import com.qa.visual.base.BaseTest;
import com.qa.visual.utils.CommonUtils;

public class ReservoirParametersTest extends BaseTest{

	@Test
	public void verifyReservoirParametersPageVisualRegression() throws Exception {

//		page.setViewportSize(1920, 1080);

		// Login to the application
		CommonUtils.performLogin(page, test);

		// Locater to the Heat transfer parameters page after login
		Thread.sleep(5000);
		navigateToTab("a.continue-btn");
		Thread.sleep(1000);
		CommonUtils.navigateToPadAndWellViaFilters(page, test);
		Thread.sleep(1000);

		page.locator("text=' Reservoir Parameters '").click();
		Thread.sleep(5000);

		// Drilled hole tab visual regression
		CommonUtils.captureAndValidateVisualRegression(page, "ReservoirParameters", "ReservoirParameters", 5, 0.5);
		
		// If reached here both checks either created baselines or passed comparisons
				System.out.println("✔ Wellbore configuration visual checks completed.");
}
}
