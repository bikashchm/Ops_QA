package com.qa.visual.tests;

import org.testng.Assert;
import org.testng.annotations.Test;

import com.qa.visual.base.BaseTest;
import com.qa.visual.utils.CommonUtils;

import java.nio.file.Files;
import java.nio.file.StandardCopyOption;

public class WellAndTreatmentLocation extends BaseTest {

    @Test
    public void verifyWelltreatmentLocationAdditionalInfoPageVisualRegression() throws Exception {

        // Consistent viewport
//        page.setViewportSize(1920, 1080);

        // Login to the application
        CommonUtils.performLogin(page, test);

        // Give the page time to load (you can replace Thread.sleep with explicit waits)
        Thread.sleep(15000);

        // Navigate and open filters / select pad & VR
        navigateToTab("a.continue-btn");
        Thread.sleep(5000);
        CommonUtils.navigateToPadAndWellViaFilters(page, test);
        Thread.sleep(2000);

        // ---------- LOCATION screenshot ----------
        page.locator("text='Location'").click();
        Thread.sleep(5000); // wait for location panel to load
     // Location  tab visual regression
        CommonUtils.captureAndValidateVisualRegression(page, "welltreatment", "location", 20, 3);
        Thread.sleep(2000);
        // ---------- ADDITIONAL INFO screenshot ----------
        page.locator("text='Location'").click();
        Thread.sleep(2000); // wait for location panel to load
        page.locator("text='Additional Info'").click();
        Thread.sleep(1000); // wait for additional info section to load

        CommonUtils.captureAndValidateVisualRegression(page, "welltreatment", "additionalInfo", 20, 3);
        
// If reached here both checks either created baselines or passed comparisons
        System.out.println("✔ Well & Treatment Location visual checks completed.");
    }
}
