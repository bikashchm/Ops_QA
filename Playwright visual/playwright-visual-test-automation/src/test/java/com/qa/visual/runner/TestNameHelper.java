package com.qa.visual.runner;

/**
 * Simple ThreadLocal holder for current TestNG method name.
 * Use TestNameHelper.getTestName() inside your tests/pages to build stable screenshot filenames.
 */
public class TestNameHelper {
    private static final ThreadLocal<String> currentTestName = new ThreadLocal<>();

    public static void setTestName(String name) {
        currentTestName.set(name);
    }

    public static String getTestName() {
        String name = currentTestName.get();
        return name != null ? name : "unknown_test";
    }

    public static void clear() {
        currentTestName.remove();
    }
}
