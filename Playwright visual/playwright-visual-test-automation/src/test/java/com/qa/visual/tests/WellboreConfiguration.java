package com.qa.visual.tests;

import java.nio.file.Files;
import java.nio.file.StandardCopyOption;

import org.testng.Assert;
import org.testng.annotations.Test;

import com.qa.visual.base.BaseTest;
import com.qa.visual.utils.CommonUtils;

public class WellboreConfiguration extends BaseTest {

	@Test
	public void verifyWellboreConfigurationPageVisualRegression() throws Exception {

//		page.setViewportSize(1920, 1080);

		// Login to the application
		CommonUtils.performLogin(page, test);

		// Locater to the wellbore configuration page after login
		Thread.sleep(5000);
		navigateToTab("a.continue-btn");
		Thread.sleep(1000);
		CommonUtils.navigateToPadAndWellViaFilters(page, test);
		Thread.sleep(1000);

		page.locator("text=' Wellbore Configuration '").click();
		Thread.sleep(1000);
		page.reload();
		Thread.sleep(10000);
		CommonUtils.captureAndValidateVisualRegression(page, "wellboreConfiguration", "DrilledHole", 5, 0.5);

		// Drilled hole tab injection is down drop down visual regression
		page.locator(
				"//label[contains(text(),'Injection is Down')]/following::div[contains(@class,'ng-select-container')][1]")
				.click();
		Thread.sleep(5000);
		CommonUtils.captureAndValidateVisualRegression(page, "wellboreConfiguration", "DrilledHoleInjectionDown", 5,
				0.5);

		// Drilled hole tab compute drop down visual regression
		page.locator(
				"//label[contains(text(),'Injection is Down')]/following::div[contains(@class,'ng-select-container')][2]")
				.click();
		Thread.sleep(5000);
		CommonUtils.captureAndValidateVisualRegression(page, "wellboreConfiguration", "DrilledHoleCompute", 5, 0.5);

		// Schematic tab visual regression
		page.locator("text=' Schematic '").click();
		Thread.sleep(3000);
		CommonUtils.captureAndValidateVisualRegression(page, "wellboreConfiguration", "Schematic1D", 5, 0.5);
		page.locator("//img[@alt='full screen']").click();
		Thread.sleep(3000);
		CommonUtils.captureAndValidateVisualRegression(page, "wellboreConfiguration", "SchematicFullScreen", 5, 0.5);
		page.locator("//img[@alt='Exit screen']").click();
		page.locator("//img[@alt='close']").click();

		// Casing tab visual regression
		page.locator("(//span[text()='Casing'])[1]").click();
		Thread.sleep(10000);
		CommonUtils.captureAndValidateVisualRegression(page, "wellboreConfiguration", "Casing", 5, 0.5);

		// Surface line / tubing tab visual regression
		page.locator("(//span[text()='Surface Line/Tubing'])[1]").click();
		CommonUtils.captureAndValidateVisualRegression(page, "wellboreConfiguration", "SurfaceLineTubing", 5, 0.5);

		// Perforation Interval tab visual regression
		page.locator("text='Perforation Intervals'").click();
		CommonUtils.captureAndValidateVisualRegression(page, "wellboreConfiguration", "PerforationInterval", 5, 0.5);
		page.locator("//img[@alt='Edit Clusters']").click();
		Thread.sleep(3000);
		CommonUtils.captureAndValidateVisualRegression(page, "wellboreConfiguration", "PerforationIntervalEditCluster",
				5, 0.5);
		page.locator("//button[text()='Cancel']").click();
		Thread.sleep(3000);
		page.locator("text=' Copy & Paste '").click();
		Thread.sleep(3000);
		CommonUtils.captureAndValidateVisualRegression(page, "wellboreConfiguration", "PerforationIntervalCopyAndPaste",
				5, 0.5);
		page.locator("//button[text()='Cancel']").click();
		Thread.sleep(3000);
		page.locator("//button[text()=' Import Data ']").click();
		Thread.sleep(3000);
		CommonUtils.captureAndValidateVisualRegression(page, "wellboreConfiguration", "PerforationIntervalImportData",
				5, 0.5);
		page.locator("//button[@aria-label='Close']").click();

		// Path summary tab visual regression
		page.locator("(//span[text()='Path Summary'])[1]").click();
		CommonUtils.captureAndValidateVisualRegression(page, "wellboreConfiguration", "PathSummary", 5, 0.5);

		// Directional survey tab visual regression
		page.locator("(//span[text()='Directional Survey'])[1]").click();
		CommonUtils.captureAndValidateVisualRegression(page, "wellboreConfiguration", "DirectionalSurvey", 5, 0.5);

		// Directional survey specify dropdown tab visual regression
		page.locator("text='Directional Survey'").click();
		Thread.sleep(2000);
		page.locator("//ng-select[@id='specify']/div/div").click();
		CommonUtils.captureAndValidateVisualRegression(page, "wellboreConfiguration",
				"DirectionalSurveySpecifyDropdown", 5, 0.5);

		// Directional survey N-S, E-W, TVD tab visual regression
		page.locator("//div[text()='N-S, E-W, TVD']").click();
		CommonUtils.captureAndValidateVisualRegression(page, "wellboreConfiguration", "DirectionalSurveyNSEWTVD", 5,
				0.5);

		// Directional survey MD, TVD, Azimuth tab visual regression
		page.locator("//ng-select[@id='specify']/div/div").click();
		Thread.sleep(4000);
		page.locator("//div[text()='MD, TVD, Azimuth ']").click();
		Thread.sleep(4000);
		CommonUtils.captureAndValidateVisualRegression(page, "wellboreConfiguration", "DirectionalSurveyMDTVDAzimuth",
				5, 0.5);
		Thread.sleep(3000);
		// If reached here both checks either created baselines or passed comparisons
		System.out.println("✔ Wellbore configuration visual checks completed.");
	}
}
