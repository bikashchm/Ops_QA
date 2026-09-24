package com.qa.visual.tests;

import org.testng.annotations.Test;

import com.qa.visual.base.BaseTest;
import com.qa.visual.utils.CommonUtils;

public class ReportTest extends BaseTest { 

	@Test
	public void verifyReportPageVisualRegression() throws Exception {

//		page.setViewportSize(1920, 1080);

		// Login to the application
		CommonUtils.performLogin(page, test);

		// Locater to the Report page after login
		Thread.sleep(5000);
		navigateToTab("a.continue-btn");
		Thread.sleep(1000);
		CommonUtils.navigateToPadAndWellViaFilters(page, test);
		Thread.sleep(3000);
		page.locator("//span[text()=' Results']").click();
		Thread.sleep(1000);
		page.locator("text=' Report '").click();
		Thread.sleep(1000);
		page.locator("a[aria-controls='PlotInWord']").click();
		Thread.sleep(3000);
		// Plots In Word Report tab visual regression
		CommonUtils.captureAndValidateVisualRegression(page, "Report", "PlotsInWordReport", 5, 0.5);
		
		page.locator("a[aria-controls='MaterialUsage']").click();
		Thread.sleep(3000);
		// Material Usage tab visual regression
		CommonUtils.captureAndValidateVisualRegression(page, "Report", "MaterialUsage", 5, 0.5);
		
		page.locator("a[aria-controls='PostJobData']").click();
		Thread.sleep(3000);
		// Post job data  tab visual regression
		CommonUtils.captureAndValidateVisualRegression(page, "Report", "PostJobData", 5, 0.5);
		
		// If reached here both checks either created baselines or passed comparisons
		System.out.println("✔ Result >> Report screen visual checks completed.");
   }
}
