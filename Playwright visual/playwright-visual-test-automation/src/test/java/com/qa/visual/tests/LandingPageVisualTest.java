package com.qa.visual.tests;

import com.qa.visual.base.BaseTest;
import com.qa.visual.utils.CommonUtils;
import org.testng.Assert;
import org.testng.annotations.Test;

public class LandingPageVisualTest extends BaseTest {

    private final String MODULE_NAME = "Landing_Page";
    private final double THRESHOLD = CommonUtils.DEFAULT_THRESHOLD;

    @Test
    public void verifyLandingScreenVisualRegression() throws Exception {
//        page.setViewportSize(1920, 1080);
        CommonUtils.performLogin(page, test);
        Thread.sleep(20000);

        double diffPercent = CommonUtils.performVisualStep(
            page, test, MODULE_NAME, "Landing_Page-Stimulations_Section", null, THRESHOLD
        );
        if (diffPercent >= 0) {
            Assert.assertTrue(diffPercent <= THRESHOLD,
                "Visual regression found on Home screen! " + diffPercent + "% mismatch.");
        }
        CommonUtils.click(page, "//*[text()='Well Construction']", test);
        double diffPercent1 = CommonUtils.performVisualStep(
            page, test, MODULE_NAME, "Landing_Page-Well_Construction_Section", null, THRESHOLD
        );
        if (diffPercent1 >= 0) {
            Assert.assertTrue(diffPercent1 <= THRESHOLD,
                "Visual regression found on Home screen! " + diffPercent1 + "% mismatch.");
        }
        CommonUtils.click(page, "//*[contains(@class,'sales-contact')]", test);
        Thread.sleep(3000);
        double diffPercent2 = CommonUtils.performVisualStep(
            page, test, MODULE_NAME, "Landing_Page-Well_Sales_Contact_Button", null, THRESHOLD
        );
        if (diffPercent2 >= 0) {
            Assert.assertTrue(diffPercent2 <= THRESHOLD,
                "Visual regression found on Home screen! " + diffPercent2 + "% mismatch.");
        }
    }
}