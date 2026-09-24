package com.qa.visual.utils;

import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import java.io.*;

public class PdfReportGenerator {

    public static void generatePdfFromHtml(String htmlPath, String pdfPath) throws Exception {
        File htmlFile = new File(htmlPath);
        if (!htmlFile.exists()) {
            throw new FileNotFoundException("HTML report not found at: " + htmlFile.getAbsolutePath());
        }

        try (OutputStream os = new FileOutputStream(pdfPath)) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            // Convert HTML file to absolute URI
            builder.withUri(htmlFile.toURI().toString());
            builder.toStream(os);
            builder.run();
        }
    }

    public static void main(String[] args) throws Exception {
        File reportsDir = new File("reports");
        if (!reportsDir.exists()) reportsDir.mkdirs();

        String htmlReport = new File(reportsDir, "extent-report.html").getAbsolutePath();
        String pdfReport = new File(reportsDir, "extent-report.pdf").getAbsolutePath();

        generatePdfFromHtml(htmlReport, pdfReport);
        System.out.println("PDF report generated at: " + pdfReport);
    }
}
