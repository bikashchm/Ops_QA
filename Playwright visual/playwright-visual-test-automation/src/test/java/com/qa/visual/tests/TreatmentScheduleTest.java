package com.qa.visual.tests;

import org.testng.annotations.Test;

import com.qa.visual.base.BaseTest;
import com.qa.visual.utils.CommonUtils;

public class TreatmentScheduleTest extends BaseTest {

	@Test
	public void verifyTreatmentScheduledPageVisualRegression() throws Exception {

//		page.setViewportSize(1920, 1080);

		// Login to the application
		CommonUtils.performLogin(page, test);

		// Locater to the Treatment scheduled page after login
		Thread.sleep(5000);
		navigateToTab("a.continue-btn");
		Thread.sleep(1000);
		CommonUtils.navigateToPadAndWellViaFilters(page, test);
		Thread.sleep(5000);
		page.locator("text=' Treatment Schedule '").click();
		page.locator("text=' Actual Treatment Schedule '").click();
		Thread.sleep(5000);

		// Treatment scheduled >> Actual tab tab visual regression
		CommonUtils.captureAndValidateVisualRegression(page, "TreatmentScheduled", "ActualTreatmentScheduled", 5, 0.5);

		// Treatment scheduled >> Design tab tab visual regression
		page.locator("text=' Design Treatment Schedule '").click();
		CommonUtils.captureAndValidateVisualRegression(page, "TreatmentScheduled", "DesignTreatmentScheduled", 5, 0.5);

		// Treatment scheduled >> Total tab visual regression
		page.locator("text=' Treatment Totals '").click();
		CommonUtils.captureAndValidateVisualRegression(page, "TreatmentScheduled", "TreatmentTotal", 5, 0.5);

		// If reached here both checks either created baselines or passed comparisons
				System.out.println("✔ Treatment scheduled visual checks completed.");
	}
}
