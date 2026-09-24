package com.qa.visual.base;

import java.nio.file.Paths;

import org.testng.annotations.AfterSuite;

import com.qa.visual.utils.CommonUtils;
import com.qa.visual.config.TestConfig;
import com.aventstack.extentreports.ExtentReports;
import com.aventstack.extentreports.ExtentTest;
import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;

public class BaseTest {

    // Playwright objects – now per-class instance (NOT static)
    protected Playwright playwright;
    protected Browser browser;
    protected Page page;

    // ExtentReports objects
    protected static ExtentReports extent;
    protected ExtentTest test;

    // ---------------------------------------------------------
    // Constructor – runs whenever a child test class is "new"ed
    // ---------------------------------------------------------
    public BaseTest() {
        initReporting();
        initBrowserAndPage();

        // Create a test node for each concrete test class
        test = extent.createTest(this.getClass().getSimpleName());
    }

    // Initialize ExtentReports once (shared for all tests)
    private synchronized void initReporting() {
        if (extent == null) {
            extent = com.qa.visual.reports.ExtentManager.getInstance();
        }
    }

    // Initialize Playwright / Browser / Page – per instance
    private void initBrowserAndPage() {
        playwright = Playwright.create();

        // Always run with a visible (non-headless) browser for interactive runs
        // Force non-headless (visible) browser
        browser = playwright.chromium().launch(
                new BrowserType.LaunchOptions()
                        .setHeadless(false)
                        .setArgs(java.util.Arrays.asList(
                                "--start-maximized",
                                "--incognito")));

        // viewport null = let --start-maximized / --window-size dictate the visible
        // area
        page = browser.newPage(
                new Browser.NewPageOptions()
                        .setViewportSize(null));
    }

    // ---------------------------------------------------------
    // Global teardown – ONLY for reports
    // ---------------------------------------------------------
    @AfterSuite
    public void tearDownAll() {
        if (extent != null) {
            extent.flush();
            extent = null;
        }
    }

    // ---------------------------------------------------------
    // Per-instance teardown – called after each class finishes
    // ---------------------------------------------------------
    public void tearDown() {

        try {
            if (page != null && page.context() != null) {
                page.context().close(); // Close context first (fixes Playwright Node error)
            }
        } catch (Exception ignored) {
        }

        try {
            if (browser != null) {
                browser.close();
            }
        } catch (Exception ignored) {
        }

        try {
            if (playwright != null) {
                playwright.close();
            }
        } catch (Exception ignored) {
        }

        page = null;
        browser = null;
        playwright = null;
    }

    // ------------------------------
    // Utility Methods
    // ------------------------------

    protected void takeScreenshot(String path) {
        page.screenshot(new Page.ScreenshotOptions().setPath(Paths.get(path)));
    }

    protected void login(String url, String username, String password) {
        page.navigate(url);
        page.fill("input[name='Email Address']", username);
        page.fill("input[name='Password']", password);
        page.click("button[type='submit']");
        test.info("Logged in as: " + username);
    }

    protected void performLogin() {
        CommonUtils.performLogin(page, test);
    }

    protected void loginFromConfig() {
        login(TestConfig.getBaseUrl(), TestConfig.getLoginUsername(), TestConfig.getLoginPassword());
    }

    protected void navigateToTab(String tabSelector) {
        page.click(tabSelector);
        test.info("Navigated to tab: " + tabSelector);
    }

    protected void logScreenshot(String message, String imagePath) {
        try {
            test.addScreenCaptureFromPath(imagePath, message);
        } catch (Exception e) {
            test.warning("Failed to attach screenshot: " + e.getMessage());
        }
    }

    protected void logInfo(String message) {
        test.info(message);
    }

    protected void logPass(String message) {
        test.pass(message);
    }

    protected void logFail(String message) {
        test.fail(message);
    }
}