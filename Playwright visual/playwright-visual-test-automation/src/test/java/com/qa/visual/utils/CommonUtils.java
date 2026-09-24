package com.qa.visual.utils;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

//optional: if you prefer using TestNG Assert, uncomment:
//import org.testng.Assert;

import javax.imageio.ImageIO;

// Selenium screenshot imports
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.testng.Assert;

import com.aventstack.extentreports.ExtentTest;
//Playwright
import com.microsoft.playwright.Page;

import com.qa.visual.config.TestConfig;

/**
 * Utility class for visual regression comparison:
 *  - Handles directory creation
 *  - Baseline creation
 *  - Screenshot comparison with pixel tolerance
 *  - Diff image with bounding boxes
 */
public final class CommonUtils {

    private CommonUtils() { /* Prevent instantiation */ }

    /** Holds the 3 key screenshot file paths (baseline/current/diff). */
    public static class PathsTriple {
        public final Path baseline;
        public final Path current;
        public final Path diff;

        public PathsTriple(Path baseline, Path current, Path diff) {
            this.baseline = baseline;
            this.current = current;
            this.diff = diff;
        }
    }
    
    // Perform login using credentials from test/resources/config.properties
    public static void performLogin(Page page, ExtentTest test) {
        try {
            page.navigate(TestConfig.getBaseUrl());
            page.fill("input[name='Email Address']", TestConfig.getLoginUsername());
            page.fill("input[name='Password']", TestConfig.getLoginPassword());
            page.click("button[type='submit']");
            if (test != null) {
                test.info("Performed login as: " + TestConfig.getLoginUsername());
            }
        } catch (Exception e) {
            if (test != null) {
                test.warning("Failed to perform login: " + e.getMessage());
            }
            throw new RuntimeException("Login failed", e);
        }
    }
    
    // Navigate to tab
    public static void navigateToTab(Page page, String tabSelector, ExtentTest test) {
        page.click(tabSelector);
        if (test != null) test.info("Navigated to tab: " + tabSelector);
    }

    // Generic click with logging
    public static void click(Page page, String selector, ExtentTest test) {
        page.click(selector);
        if (test != null) test.info("Clicked: " + selector);
    }
    
    // Fill input with logging
    public static void fill(Page page, String selector, String value, ExtentTest test) {
        page.fill(selector, value);
        if (test != null) test.info("Filled: " + selector + " with value: " + value);
    }
    
    // Take screenshot and save to path
    public static void takeScreenshot(Page page, String path) {
        page.screenshot(new Page.ScreenshotOptions().setPath(Paths.get(path)));
    }

    /**
     * Compare screenshots pixel-by-pixel and draw bounding boxes around changed areas.
     * Only writes the diff image when there are actual differences (diffPixels > 0).
     */
    public static double compareAndGenerateDiff(String baselinePath, String currentPath, String diffPath) throws Exception {
        BufferedImage baselineImage = ImageIO.read(new File(baselinePath));
        BufferedImage currentImage = ImageIO.read(new File(currentPath));

        int width = Math.min(baselineImage.getWidth(), currentImage.getWidth());
        int height = Math.min(baselineImage.getHeight(), currentImage.getHeight());

        BufferedImage diffImage = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = diffImage.createGraphics();
        g2d.drawImage(baselineImage, 0, 0, null);

        int tolerance = 5;
        int diffPixels = 0;
        boolean[][] diffMask = new boolean[width][height];

        // Identify changed pixels
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                Color baseColor = new Color(baselineImage.getRGB(x, y));
                Color currColor = new Color(currentImage.getRGB(x, y));

                int diffR = Math.abs(baseColor.getRed() - currColor.getRed());
                int diffG = Math.abs(baseColor.getGreen() - currColor.getGreen());
                int diffB = Math.abs(baseColor.getBlue() - currColor.getBlue());

                if (diffR > tolerance || diffG > tolerance || diffB > tolerance) {
                    diffMask[x][y] = true;
                    diffPixels++;
                }
            }
        }

        double totalPixels = (double) width * height;
        double diffPercent = (diffPixels / totalPixels) * 100;
        diffPercent = Math.round(diffPercent * 100.0) / 100.0;

        // Only draw and write diff image if there are changed pixels
        if (diffPixels > 0) {
            // Draw rectangles around connected changed regions using BFS
            boolean[][] visited = new boolean[width][height];
            int[] dx = {-1, 1, 0, 0};
            int[] dy = {0, 0, -1, 1};
            for (int y = 0; y < height; y++) {
                for (int x = 0; x < width; x++) {
                    if (diffMask[x][y] && !visited[x][y]) {
                        // BFS to find all connected diff pixels
                        int minX = x, minY = y, maxX = x, maxY = y;
                        java.util.Queue<int[]> queue = new java.util.LinkedList<>();
                        queue.add(new int[]{x, y});
                        visited[x][y] = true;
                        while (!queue.isEmpty()) {
                            int[] curr = queue.poll();
                            int cx = curr[0], cy = curr[1];
                            minX = Math.min(minX, cx);
                            minY = Math.min(minY, cy);
                            maxX = Math.max(maxX, cx);
                            maxY = Math.max(maxY, cy);
                            for (int dir = 0; dir < 4; dir++) {
                                int nx = cx + dx[dir];
                                int ny = cy + dy[dir];
                                if (nx >= 0 && nx < width && ny >= 0 && ny < height && diffMask[nx][ny] && !visited[nx][ny]) {
                                    queue.add(new int[]{nx, ny});
                                    visited[nx][ny] = true;
                                }
                            }
                        }
                        g2d.setColor(Color.RED);
                        g2d.setStroke(new BasicStroke(2));
                        g2d.drawRect(minX, minY, maxX - minX + 1, maxY - minY + 1);
                    }
                }
            }
            g2d.dispose();
            ImageIO.write(diffImage, "png", new File(diffPath));
        } else {
            g2d.dispose();
        }

        return diffPercent;
    }

    // Default threshold for visual diffs
    public static final double DEFAULT_THRESHOLD = 0.5;
    public static final String VISUAL_REGRESSION_PAD = "Visual_Regression_Pad";
    public static final String VISUAL_REGRESSION_WELL = "Visual_Regression_Well";

    // Helper to get per-module screenshot directories
    public static Path baselineDir(String moduleName) {
        return Paths.get("screenshots/baseline", moduleName);
    }

    public static Path currentDir(String moduleName) {
        return Paths.get("screenshots/current", moduleName);
    }

    public static Path diffDir(String moduleName) {
        return Paths.get("screenshots/diff", moduleName);
    }

    // Ensure baseline/current/diff directories exist for given module
    public static void ensureModuleDirs(String moduleName) throws IOException {
        Files.createDirectories(baselineDir(moduleName));
        Files.createDirectories(currentDir(moduleName));
        Files.createDirectories(diffDir(moduleName));
    }

    // Ensure subfolders for a section under baseline/current/diff/Material_Selection
    public static void ensureSectionDirs(String moduleName, String sectionName) throws IOException {
        String baseDir = "screenshots";
        String[] types = {"baseline", "current", "diff"};
        for (String type : types) {
            Path dir = Paths.get(baseDir, type, moduleName, sectionName.replace(" ", "_"));
            if (!Files.exists(dir)) {
                Files.createDirectories(dir);
            }
        }
    }


    /**
     * Perform a visual regression step: ensure folders, handle baseline, capture, compare, and return diff percent.
     */
    public static double performVisualStep(Page page, ExtentTest test, String moduleName, String stepName, String selector, double threshold) throws Exception {
        // Ensure module dirs
        ensureModuleDirs(moduleName);
        // Wait for selector if provided
        if (selector != null && !selector.trim().isEmpty()) {
            page.waitForSelector(selector);
            Thread.sleep(2000); // Optional: allow UI to stabilize
        }
        // Paths
        Path baselinePath = baselineDir(moduleName).resolve(stepName + ".png");
        Path currentPath = currentDir(moduleName).resolve(stepName + ".png");
        Path diffPath = diffDir(moduleName).resolve(stepName + "_diff.png");
        // Take current screenshot
        takeScreenshot(page, currentPath.toString());
        // Baseline missing → create baseline and exit
        if (!Files.exists(baselinePath)) {
            if (test != null) test.info("🆕 Baseline missing for step: " + stepName + ". Creating new baseline...");
            Files.copy(currentPath, baselinePath, StandardCopyOption.REPLACE_EXISTING);
            return -1.0;
        }
        // Compare screenshots
        double diffPercent = compareAndGenerateDiff(
                baselinePath.toString(),
                currentPath.toString(),
                diffPath.toString()
        );
        // Log
        if (diffPercent > threshold) {
            if (test != null) test.fail("❌ Visual regression detected in [" + stepName + "]: " + diffPercent + "% mismatch");
            if (diffPercent > 0 && Files.exists(diffPath)) {
                if (test != null) test.info("   → Diff image: " + diffPath.toString());
            }
        } else {
            if (test != null) test.pass("✅ [" + stepName + "] OK — Difference: " + diffPercent + "%");
            if (Files.exists(diffPath)) {
                try { Files.delete(diffPath); } catch (Exception ignore) {}
            }
        }
        return diffPercent;
    }


    // Click a locator's nth element
    public static void clickLocatorNth(Page page, String locator, int index, ExtentTest test) {
        page.locator(locator).nth(index).click();
        if (test != null) test.info("Clicked locator: " + locator + " [index=" + index + "]");
    }

    public static void navigateToPadAndWellViaFilters(Page page, ExtentTest test) {
        page.waitForSelector("img[tooltip='Filters']");
        page.locator("img[tooltip='Filters']").click();
        page.locator("input[type='radio']").nth(0).click();
        page.locator("//input[@placeholder='Search Pad or Well']").fill(VISUAL_REGRESSION_PAD);
        page.locator("text='" + VISUAL_REGRESSION_PAD + " (1)'").click();
        page.locator("text='" + VISUAL_REGRESSION_WELL + "'").click();
        page.keyboard().press("Escape");
        if (test != null) {
            test.info("Navigated to pad: " + VISUAL_REGRESSION_PAD + " and well: " + VISUAL_REGRESSION_WELL);
        }
    }

    public static void navigateToPadAndWellViaPlotIcon(Page page, ExtentTest test) {
        click(page, "img.plot-icon", test);
        clickLocatorNth(page, "input[type='radio']", 0, test);
        fill(page, "input.form-control", VISUAL_REGRESSION_PAD, test);
        click(page, "text='" + VISUAL_REGRESSION_PAD + " (1)'", test);
        click(page, "text='" + VISUAL_REGRESSION_WELL + "'", test);
        page.keyboard().press("Escape");
        if (test != null) {
            test.info("Navigated to pad: " + VISUAL_REGRESSION_PAD + " and well: " + VISUAL_REGRESSION_WELL);
        }
    }

    /**
     * Builds standardized paths like:
     *   screenshots/{baseline|current|diff}/<name>/<name>.png
     */
    public static PathsTriple buildScreenshotPaths(String name) {
        Path baseline = Paths.get("screenshots", "baseline",name ,name + ".png");
        Path current = Paths.get("screenshots", "current", name,name + ".png");
        Path diff = Paths.get("screenshots", "diff",name ,name + "_diff.png");
        return new PathsTriple(baseline, current, diff);
    }

    /**
     * Builds paths from multiple path parts. Example: ("module","tab") ->
     * screenshots/baseline/module/tab/tab.png and corresponding current/diff
     * (diff file will be tab_diff.png).
     */
    public static PathsTriple buildScreenshotPaths(String... parts) {
        if (parts == null || parts.length == 0) {
            throw new IllegalArgumentException("At least one path part (name) is required");
        }

        Path baselineParent = Paths.get("screenshots", "baseline");
        Path currentParent = Paths.get("screenshots", "current");
        Path diffParent = Paths.get("screenshots", "diff");

        // resolve all parts except the last into parent directories
        for (int i = 0; i < parts.length - 1; i++) {
            baselineParent = baselineParent.resolve(parts[i]);
            currentParent = currentParent.resolve(parts[i]);
            diffParent = diffParent.resolve(parts[i]);
        }

        String last = parts[parts.length - 1];
        Path baseline = baselineParent.resolve(last).resolve(last + ".png");
        Path current = currentParent.resolve(last).resolve(last + ".png");
        Path diff = diffParent.resolve(last).resolve(last + "_diff.png");

        return new PathsTriple(baseline, current, diff);
    }

    /** Ensures that directories for all paths exist. */
    public static void ensureDirs(PathsTriple p) throws Exception {
        Files.createDirectories(p.baseline.getParent());
        Files.createDirectories(p.current.getParent());
        Files.createDirectories(p.diff.getParent());
    }

    /**
     * If baseline is missing, copy current → baseline and return true.
     * Caller may decide to skip or mark baseline creation.
     */
    public static boolean createBaselineIfMissing(Path baseline, Path current) throws Exception {
        if (!Files.exists(baseline) && Files.exists(current)) {
            Files.copy(current, baseline, StandardCopyOption.REPLACE_EXISTING);
            System.out.println("🆕 Baseline created: " + baseline);
            return true;
        }
        return false;
    }

    /**
     * Save a screenshot from a Selenium WebDriver into the 'current' screenshot path
     * built from the provided path parts. Example: (driver, "module","tab") ->
     * screenshots/current/module/tab/tab.png
     */
    public static Path saveScreenshot(WebDriver driver, String... pathParts) throws Exception {
        if (driver == null) {
            throw new IllegalArgumentException("WebDriver must not be null");
        }
        PathsTriple paths = buildScreenshotPaths(pathParts);
        ensureDirs(paths);

        // capture screenshot bytes and write to current path
        byte[] bytes = ((TakesScreenshot) driver).getScreenshotAs(OutputType.BYTES);
        Files.write(paths.current, bytes);
        return paths.current;
    }

    /**
     * Compares baseline and current images with tolerance, draws bounding boxes
     * around differences, and writes diff image.
     * Returns the % of differing pixels (0–100, rounded to 2 decimals).
     */
    public static double compareAndGenerateDiff(String baselinePath, String currentPath, String diffPath, int tolerance) throws Exception {
        BufferedImage baselineImage = ImageIO.read(new File(baselinePath));
        BufferedImage currentImage = ImageIO.read(new File(currentPath));

        int width = Math.min(baselineImage.getWidth(), currentImage.getWidth());
        int height = Math.min(baselineImage.getHeight(), currentImage.getHeight());

        BufferedImage diffImage = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = diffImage.createGraphics();
        g2d.drawImage(baselineImage, 0, 0, null);

        boolean[][] diffMask = new boolean[width][height];
        int diffPixels = 0;

        // Step 1: mark pixels that differ beyond tolerance
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int baseRGB = baselineImage.getRGB(x, y);
                int currRGB = currentImage.getRGB(x, y);

                int dr = Math.abs(((baseRGB >> 16) & 0xff) - ((currRGB >> 16) & 0xff));
                int dg = Math.abs(((baseRGB >> 8) & 0xff) - ((currRGB >> 8) & 0xff));
                int db = Math.abs((baseRGB & 0xff) - (currRGB & 0xff));

                if (dr > tolerance || dg > tolerance || db > tolerance) {
                    diffMask[x][y] = true;
                    diffPixels++;
                }
            }
        }

        // Step 2: find connected regions and draw red bounding boxes
        boolean[][] visited = new boolean[width][height];
        List<int[]> boxes = new ArrayList<>();
        int[] dx = {1, -1, 0, 0};
        int[] dy = {0, 0, 1, -1};
        Deque<int[]> stack = new ArrayDeque<>();

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                if (diffMask[x][y] && !visited[x][y]) {
                    int minX = x, maxX = x, minY = y, maxY = y;
                    stack.push(new int[]{x, y});
                    visited[x][y] = true;

                    while (!stack.isEmpty()) {
                        int[] p = stack.pop();
                        int px = p[0], py = p[1];
                        minX = Math.min(minX, px);
                        minY = Math.min(minY, py);
                        maxX = Math.max(maxX, px);
                        maxY = Math.max(maxY, py);

                        for (int k = 0; k < 4; k++) {
                            int nx = px + dx[k];
                            int ny = py + dy[k];
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                if (diffMask[nx][ny] && !visited[nx][ny]) {
                                    visited[nx][ny] = true;
                                    stack.push(new int[]{nx, ny});
                                }
                            }
                        }
                    }
                    boxes.add(new int[]{minX, minY, maxX, maxY});
                }
            }
        }

        // Step 3: draw bounding boxes
        g2d.setColor(Color.RED);
        g2d.setStroke(new BasicStroke(2));
        for (int[] b : boxes) {
            int pad = 2;
            g2d.drawRect(Math.max(0, b[0] - pad), Math.max(0, b[1] - pad),
                    Math.min(width - 1, b[2] - b[0] + pad * 2),
                    Math.min(height - 1, b[3] - b[1] + pad * 2));
        }

        g2d.dispose();
        ImageIO.write(diffImage, "png", new File(diffPath));

        double totalPixels = (double) width * height;
        double diffPercent = (diffPixels / totalPixels) * 100.0;
        return Math.round(diffPercent * 100.0) / 100.0;
    }

    /**
     * Full workflow helper.
     * 1. Creates directories
     * 2. Creates baseline if missing
     * 3. Compares baseline vs current
     * Returns difference percent.
     */
    public static double compareVisuals(String screenshotName, int tolerance, boolean createBaselineIfMissing) throws Exception {
        PathsTriple paths = buildScreenshotPaths(screenshotName);
        ensureDirs(paths);

        if (!Files.exists(paths.current)) {
            throw new IllegalStateException("Current screenshot not found: " + paths.current);
        }

        if (createBaselineIfMissing && createBaselineIfMissing(paths.baseline, paths.current)) {
            return 0.0; // baseline just created, no difference yet
        }

        return compareAndGenerateDiff(paths.baseline.toString(), paths.current.toString(), paths.diff.toString(), tolerance);
    }

    /**
     * Compare visuals by specifying multiple path parts (e.g. module, tab).
     * This creates/reads files like screenshots/baseline/module/tab/tab.png
     */
    public static double compareVisualsByParts(int tolerance, boolean createBaselineIfMissing, String... pathParts) throws Exception {
        PathsTriple paths = buildScreenshotPaths(pathParts);
        ensureDirs(paths);

        if (!Files.exists(paths.current)) {
            throw new IllegalStateException("Current screenshot not found: " + paths.current);
        }

        if (createBaselineIfMissing && createBaselineIfMissing(paths.baseline, paths.current)) {
            return 0.0; // baseline just created, no difference yet
        }

        return compareAndGenerateDiff(paths.baseline.toString(), paths.current.toString(), paths.diff.toString(), tolerance);
    }
    
    public static void captureAndValidateVisualRegression(
            Page page,
            String category,
            String name,
            int tolerance,
            double thresholdPercent
    ) throws Exception {

        // Build and prepare directories
        PathsTriple paths = buildScreenshotPaths(category, name);
        ensureDirs(paths);

        System.out.println("📸 Capturing screenshot -> " + paths.current);
        page.screenshot(new Page.ScreenshotOptions().setPath(paths.current)); 
        System.out.println("Saved current screenshot: " + paths.current);

        // If baseline doesn't exist, create it
        if (!Files.exists(paths.baseline)) {
            System.out.println("🆕 Baseline missing. Creating baseline for: " + name);
            Files.copy(paths.current, paths.baseline, StandardCopyOption.REPLACE_EXISTING);
            return;
        }

        // Compare images
        double diffPercent = compareAndGenerateDiff(
                paths.baseline.toString(),
                paths.current.toString(),
                paths.diff.toString(),
                tolerance);

        // Fail if exceeds threshold
        if (diffPercent > thresholdPercent) {
            String msg = String.format(
                    "❌ Visual regression in '%s' ➜ %.2f%% diff (threshold %.2f%%). Diff stored at: %s",
                    name, diffPercent, thresholdPercent, paths.diff
            );
            System.out.println(msg);
            Assert.fail(msg);
        }

        System.out.println("✅ Visual verified OK for '" + name + "' (" + diffPercent + "%).");
    }

    
}