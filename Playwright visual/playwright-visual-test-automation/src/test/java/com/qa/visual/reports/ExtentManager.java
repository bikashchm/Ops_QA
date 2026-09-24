package com.qa.visual.reports;

import com.aventstack.extentreports.ExtentReports;
//import com.aventstack.extentreports.reporter.ExtentHtmlReporter; // extentreports v4 style
import com.aventstack.extentreports.reporter.configuration.Theme;
import com.aventstack.extentreports.reporter.ExtentSparkReporter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.io.IOException;

public class ExtentManager {
    private static ExtentReports extent;
    private static final String REPORT_DIR = "reports/extent-report";
    private static final String REPORT_FILE = REPORT_DIR + "/index.html";

    public synchronized static ExtentReports getInstance() {
        if (extent == null) {
            createInstance(REPORT_FILE);
        }
        return extent;
    }

    private static ExtentReports createInstance(String fileName) {
        try {
            Path dir = Paths.get(REPORT_DIR);
            if (!Files.exists(dir)) {
                Files.createDirectories(dir);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }

        ExtentSparkReporter spark = new ExtentSparkReporter(fileName);
        spark.config().setDocumentTitle("Visual Regression Report");
        spark.config().setReportName("Visual Regression Results");
        spark.config().setTheme(Theme.STANDARD);

        extent = new ExtentReports();
        extent.attachReporter(spark);

        // add system info if required
        extent.setSystemInfo("Environment", "QA");
        extent.setSystemInfo("Executed By", System.getProperty("user.name"));

        return extent;
    }
}
