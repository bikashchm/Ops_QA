package com.qa.visual.tests;
import com.qa.visual.base.BaseTest;
import com.qa.visual.utils.CommonUtils;
import org.testng.Assert;
import org.testng.annotations.Test;

public class Channel_Inputs extends BaseTest {

    private final String MODULE_NAME = "Channel_Inputs_for_Model";
    // use default threshold from CommonUtils
    private final double THRESHOLD = CommonUtils.DEFAULT_THRESHOLD;

    @Test
    public void verifyChannelInputWorkflowVisuals() throws Exception {
//        page.setViewportSize(1920, 1080);
        CommonUtils.performLogin(page, test);
        Thread.sleep(8000);

        CommonUtils.navigateToTab(page, "a.continue-btn", test);
        Thread.sleep(5000);
        CommonUtils.navigateToPadAndWellViaPlotIcon(page, test);
        Thread.sleep(4000);
        CommonUtils.click(page, "//a[normalize-space()='Channel Inputs for Model']", test);
        Thread.sleep(3000);
        double diff1 = CommonUtils.performVisualStep(page, test, MODULE_NAME, "Channel_Input", "a.nav-link.active.d-flex.align-items-center", THRESHOLD);
        if (diff1 >= 0) {
            Assert.assertTrue(diff1 <= THRESHOLD, "Visual regression found in step [Channel_Input]: " + diff1 + "% mismatch");
        }
        CommonUtils.click(page, "//a[text()=' Additives ']", test);
        Thread.sleep(3000);
        double diff2 = CommonUtils.performVisualStep(page, test, MODULE_NAME, "Additive_Tab", "a[class='nav-link d-flex align-items-center']", THRESHOLD);
        if (diff2 >= 0) {
            Assert.assertTrue(diff2 <= THRESHOLD, "Visual regression found in step [Additive_Tab]: " + diff2 + "% mismatch");
        }
    }
}