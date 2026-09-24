package com.qa.visual.tests;
import com.qa.visual.base.BaseTest;
import com.qa.visual.utils.CommonUtils;
import org.testng.Assert;
import org.testng.annotations.Test;

public class My_Profile extends BaseTest {

    private final String MODULE_NAME = "My_Profile";
    private final double THRESHOLD = CommonUtils.DEFAULT_THRESHOLD;

    @Test
    public void verifyMyProfileVisualRegression() throws Exception {
//        page.setViewportSize(1920, 1080);
        CommonUtils.performLogin(page, test);
        Thread.sleep(20000);
        // Click to open My Profile popup
        CommonUtils.click(page, "//*[@class='icon-circle name-alignment']", test);
        Thread.sleep(2000);
        CommonUtils.click(page, "//*[text()='My Profile']", test);
        // Visual check for My Profile popup
        double diffPercent = CommonUtils.performVisualStep(
            page, test, MODULE_NAME, "My_Profile_Section", null, THRESHOLD
        );
        if (diffPercent >= 0) {
            Assert.assertTrue(diffPercent <= THRESHOLD,
                "Visual regression found on My Profile section! " + diffPercent + "% mismatch.");
        }
        // Click Reset Compute Resources
        CommonUtils.click(page, "//*[text()=' Reset Compute Resources ']", test);
        // Visual check for Compute Resources popup
        double diffPercent1 = CommonUtils.performVisualStep(
            page, test, MODULE_NAME, "Compute_Resources", "//*[text()=' Reset Compute Resources ']", THRESHOLD
        );
        if (diffPercent1 >= 0) {
            Assert.assertTrue(diffPercent1 <= THRESHOLD,
                "Visual regression found on Compute Resources! " + diffPercent1 + "% mismatch.");
        }
    }
}