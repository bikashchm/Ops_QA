package com.qa.visual.tests;

import com.qa.visual.base.BaseTest;
import com.qa.visual.utils.CommonUtils;
import org.testng.Assert;
import org.testng.annotations.Test;

public class Save_And_Next extends BaseTest {

    private final String MODULE_NAME = "Save_And_Next";
    private final double THRESHOLD = CommonUtils.DEFAULT_THRESHOLD;

    @Test
    public void verifySave_And_NextWorkflowVisuals() throws Exception {

//        page.setViewportSize(1920, 1080);

        // Login
        CommonUtils.performLogin(page, test);

        // Navigate to Well & Treatment screen
        CommonUtils.navigateToTab(page, "a.continue-btn", test);
        CommonUtils.navigateToPadAndWellViaPlotIcon(page, test);

        // -------------------- EDIT ON SCREEN --------------------
        // Example edit (update locator/value as per your app)
        CommonUtils.fill(page, "//*[@id='prospect']", "YourBoat123", test);

        // -------------------- SCROLL TO BOTTOM --------------------
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
        Thread.sleep(2000);

        // -------------------- CLICK NEXT BUTTON --------------------
        // Update selector if your Next button uses a different locator
        CommonUtils.click(page, "//*[text()=' Next ']", test);
        
        Thread.sleep(5000);

        // -------------------- VISUAL REGRESSION OF POPUP --------------------
        double diffPercent = CommonUtils.performVisualStep(
                page,
                test,
                MODULE_NAME,
                "Save_And_Next_Popup",
                null,
                THRESHOLD
        );

        if (diffPercent >= 0) {
            Assert.assertTrue(
                    diffPercent <= THRESHOLD,
                    "Visual Regression Difference found on Save & Next popup! "
                            + diffPercent + "% mismatch."
            );
        }
    }
}
