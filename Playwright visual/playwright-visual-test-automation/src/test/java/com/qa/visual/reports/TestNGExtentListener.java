package com.qa.visual.reports;

import com.aventstack.extentreports.*;
import com.aventstack.extentreports.MediaEntityBuilder;
import org.testng.ITestContext;
import org.testng.ITestListener;
import org.testng.ITestResult;

import java.io.File;

public class TestNGExtentListener implements ITestListener {

    private static ThreadLocal<ExtentTest> extentTest = new ThreadLocal<>();
    private static ExtentReports extent = ExtentManager.getInstance();

    @Override
    public void onStart(ITestContext context) {
        // nothing required; extent already created in ExtentManager
    }

    @Override
    public void onFinish(ITestContext context) {
        extent.flush();
    }

    @Override
    public void onTestStart(ITestResult result) {
        String testName = result.getMethod().getMethodName();
        ExtentTest test = extent.createTest(testName);
        // Optionally add description or class name
        test.assignCategory(result.getMethod().getRealClass().getSimpleName());
        extentTest.set(test);
    }

    @Override
    public void onTestSuccess(ITestResult result) {
        extentTest.get().pass("Test passed");
        // Optionally attach screenshot if you want on pass
        attachScreenshotIfExists(result);
    }

    @Override
    public void onTestFailure(ITestResult result) {
        Throwable t = result.getThrowable();
        if (t != null) extentTest.get().fail(t);
        attachScreenshotIfExists(result);
    }

    @Override
    public void onTestSkipped(ITestResult result) {
        extentTest.get().skip("Test skipped");
        attachScreenshotIfExists(result);
    }

    private void attachScreenshotIfExists(ITestResult result) {
        // convention: store screenshot with test method name under reports/screenshots/<method>.png
        String screenshotsDir = "reports/screenshots";
        String fileName = result.getMethod().getMethodName() + ".png";
        File file = new File(screenshotsDir + File.separator + fileName);
        if (file.exists()) {
            try {
                extentTest.get().info("Screenshot",
                    MediaEntityBuilder.createScreenCaptureFromPath(file.getAbsolutePath()).build());
            } catch (Exception e) {
                extentTest.get().warning("Could not attach screenshot: " + e.getMessage());
            }
        } else {
            // if your visual generates multiple images or different naming (eg <test>_diff.png), adapt logic:
            // check for *_diff.png or iterate directory to attach all matching files.
        }
    }

    // other ITestListener methods left blank (onTestFailedButWithinSuccessPercentage etc.)
}
