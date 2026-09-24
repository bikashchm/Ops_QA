package com.qa.visual.tests;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

import javax.imageio.ImageIO;

import org.testng.Assert;
import org.testng.annotations.Test;

import com.qa.visual.base.BaseTest;
import com.qa.visual.utils.CommonUtils;

public class WellAndTreatment extends BaseTest  {

    private final String BASELINE_PATH = "screenshots/baseline/welltreatment.png";
    private final String CURRENT_PATH = "screenshots/current/welltreatment.png";
    private final String DIFF_PATH = "screenshots/diff/welltreatment_diff.png";

    @Test
    public void verifyWelltreatmentPageVisualRegression() throws Exception {

        // Maximize browser window (consistent visual size)
//        page.setViewportSize(1920, 1080);

        // Login to the application
        CommonUtils.performLogin(page, test);

        // Wait for page to load
        Thread.sleep(15000);

        // Navigate to Dashboard tab (example: Continue button)
        navigateToTab("a.continue-btn");
        Thread.sleep(5000);
        CommonUtils.navigateToPadAndWellViaFilters(page, test);
        Thread.sleep(15000);
        
        // Build paths and ensure directories
        CommonUtils.PathsTriple wellTreatmentPath = CommonUtils.buildScreenshotPaths("welltreatment");
        CommonUtils.ensureDirs(wellTreatmentPath);
        
     // Capture current screenshot (uses your BaseTest.takeScreenshot)
        System.out.println("📸 Capturing current dashboard screenshot...");
        takeScreenshot(wellTreatmentPath.current.toString());
        System.out.println("Saved current screenshot: " + wellTreatmentPath.current);
        
     // If baseline missing -> create and end test (mirror previous behaviour)
        if (!java.nio.file.Files.exists(wellTreatmentPath.baseline)) {
            System.out.println("🆕 Baseline missing. Saving current screenshot as new baseline...");
            java.nio.file.Files.copy(wellTreatmentPath.current, wellTreatmentPath.baseline, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            Assert.assertTrue(true, "Baseline image created successfully.");
            return;
        }
        
     // Compare using util
        double diffPercent = CommonUtils.compareAndGenerateDiff(
        		wellTreatmentPath.baseline.toString(),
        		wellTreatmentPath.current.toString(),
        		wellTreatmentPath.diff.toString(),
        		0);
            
        if (diffPercent > 0.5) {
            System.out.println("❌ Visual regression detected on Dashboard!");
            System.out.println("   → " + diffPercent + "% pixels differ.");
            System.out.println("   → Diff image saved at: " + wellTreatmentPath.diff);
        } else {
            System.out.println("✅ No significant visual difference detected (" + diffPercent + "%).");
        }

        Assert.assertTrue(diffPercent <= 0.5,
                "Visual regression found on Dashboard! " + diffPercent + "% mismatch. See diff image: " + wellTreatmentPath.diff);
    } 
}