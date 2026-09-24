package com.qa.visual.tests;

import com.qa.visual.base.BaseTest;
import com.qa.visual.utils.CommonUtils;
import org.testng.Assert;
import org.testng.annotations.Test;

public class HomePageVisualTest extends BaseTest {

    private final String MODULE_NAME = "Homepage";
    private final double THRESHOLD = CommonUtils.DEFAULT_THRESHOLD;

    @Test
    public void verifyHomeScreenVisualRegression() throws Exception {
//        page.setViewportSize(1920, 1080);
        CommonUtils.performLogin(page, test);
        Thread.sleep(3000);
        CommonUtils.click(page, "a.continue-btn", test);
        Thread.sleep(8000);
        double diffPercent = CommonUtils.performVisualStep(
            page, test, MODULE_NAME, "HomePagePadsSection", null, THRESHOLD
        );
        if (diffPercent >= 0) {
            Assert.assertTrue(diffPercent <= THRESHOLD,
                "Visual Regression Difference found on Home screen! " + diffPercent + "% mismatch.");
        }    
        CommonUtils.click(page, "//*[text()=' Expand All ']", test);
        Thread.sleep(4000);
        double diff1Percent = CommonUtils.performVisualStep(
            page, test, MODULE_NAME, "PadsSection_ExpandedView", null,
            THRESHOLD
        );
        if (diff1Percent >= 0) {
            Assert.assertTrue(diff1Percent <= THRESHOLD,
                    "Visual Regression Difference found on PadsSection_ExpandedView " + diff1Percent + "% mismatch.");
        }
        CommonUtils.click(page, "//*[@tooltip='Filters']", test);
        Thread.sleep(4000);
        double diff2Percent = CommonUtils.performVisualStep(
                page, test, MODULE_NAME, "PadsSection_FilterView", null,
                THRESHOLD
        );

        if (diff2Percent >= 0) {
            Assert.assertTrue(diff2Percent <= THRESHOLD,
                    "Visual Regression Difference found on Home screen! " + diff2Percent + "% mismatch.");
        }
    }
}