package com.qa.visual.tests;

import com.qa.visual.base.BaseTest;
import com.qa.visual.utils.CommonUtils;
import org.testng.Assert;
import org.testng.annotations.Test;

public class New_Dashboard extends BaseTest {

    private final String MODULE_NAME = "New_Dashboard";
    private final double THRESHOLD = CommonUtils.DEFAULT_THRESHOLD;

    @Test
    public void verifyNew_DashboardVisualRegression() throws Exception {

//        page.setViewportSize(1920, 1080);
        CommonUtils.performLogin(page, test);
        Thread.sleep(8000);

        CommonUtils.navigateToTab(page, "a.continue-btn", test);
        Thread.sleep(5000);

        CommonUtils.navigateToPadAndWellViaPlotIcon(page, test);
        Thread.sleep(4000);

        // ========= UPDATED PART STARTS HERE =========

        // Click on Dashboard
        CommonUtils.click(page, "//*[text()=' Dashboard']", test);
        Thread.sleep(2000);

        // Scroll LEFT SIDE PANEL to bottom
        page.evaluate(
                "() => {" +
                "  const leftPanel = document.querySelector('.left-panel, .sidebar, aside');" +
                "  if (leftPanel) {" +
                "    leftPanel.scrollTop = leftPanel.scrollHeight;" +
                "  }" +
                "}"
        );
        Thread.sleep(2000);

        // Click on New Dashboard option
        CommonUtils.click(page, "//*[text()='  + New Dashboad ']", test);
        Thread.sleep(5000);

        // ========= UPDATED PART ENDS HERE =========

        double diff1 = CommonUtils.performVisualStep(
                page,
                test,
                MODULE_NAME,
                "New_Dashboard",
                null,
                THRESHOLD
        );

        if (diff1 >= 0) {
            Assert.assertTrue(
                    diff1 <= THRESHOLD,
                    "Visual regression found in step New Dashboard screen: " + diff1 + "% mismatch"
            );
        }
    }
}
