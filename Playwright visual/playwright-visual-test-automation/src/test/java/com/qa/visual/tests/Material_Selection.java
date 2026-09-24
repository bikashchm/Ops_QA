package com.qa.visual.tests;
import com.qa.visual.base.BaseTest;
import com.qa.visual.utils.CommonUtils;
import org.testng.Assert;
import org.testng.annotations.Test;

public class Material_Selection extends BaseTest {

    private final String MODULE_NAME = "Material_Selection";
    // use default threshold from CommonUtils
    private final double THRESHOLD = CommonUtils.DEFAULT_THRESHOLD;

    @Test
    public void verifyMaterialSelectionWorkflowVisuals() throws Exception {
//        page.setViewportSize(1920, 1080);
        CommonUtils.performLogin(page, test);
        Thread.sleep(8000);

        CommonUtils.navigateToTab(page, "a.continue-btn", test);
        Thread.sleep(5000);
        CommonUtils.navigateToPadAndWellViaPlotIcon(page, test);
        Thread.sleep(4000);
        CommonUtils.click(page, "//*[text()=' Material Selection ']", test);
        Thread.sleep(5000);
        page.waitForSelector("//*[text()='Fluid Selection']",
                new com.microsoft.playwright.Page.WaitForSelectorOptions().setTimeout(60000));

        double diff1 = CommonUtils.performVisualStep(page, test, MODULE_NAME, "Fluid Selection Tab", "//*[text()=' Material Selection ']", THRESHOLD);
        if (diff1 >= 0) {
            Assert.assertTrue(diff1 <= THRESHOLD, "Visual regression found in step [Material_Selection]: " + diff1 + "% mismatch");
        }
        Thread.sleep(4000);
        CommonUtils.click(page, "//*[text()=' Add New Fluid to List ']", test);
        Thread.sleep(9000);
        double diff2 = CommonUtils.performVisualStep(page, test, MODULE_NAME, "Fluid Selection-Add New Fluid to List", null, THRESHOLD);
        if (diff2 >= 0) {
            Assert.assertTrue(diff2 <= THRESHOLD, "Visual regression found in step [Material_Selection]: " + diff2 + "% mismatch");
        }
        page.keyboard().press("Escape");
        Thread.sleep(1000);
        CommonUtils.click(page, "//*[text()=' Material Selection ']", test);
        Thread.sleep(4000);
        CommonUtils.click(page, "//*[text()='Proppant Selection']", test);
        Thread.sleep(4000);
        double diff3 = CommonUtils.performVisualStep(page, test, MODULE_NAME, "Proppant_Selection_Tab", "//*[text()='Proppant Selection']", THRESHOLD);
        if (diff3 >= 0) {
            Assert.assertTrue(diff3 <= THRESHOLD, "Visual regression found in step [Proppant_Selection_Tab]: " + diff3 + "% mismatch");
        }
        CommonUtils.click(page, "//*[text()=' Add New Proppant to List ']", test);
        Thread.sleep(9000);
        double diff4 = CommonUtils.performVisualStep(page, test, MODULE_NAME, "Proppant_Selection_Tab-Add New Proppant to List", null, THRESHOLD);
        if (diff4 >= 0) {
            Assert.assertTrue(diff4 <= THRESHOLD, "Visual regression found in step [Proppant_Selection_Tab-Add New Proppant to List]: " + diff4 + "% mismatch");
        }
        page.keyboard().press("Escape");
        Thread.sleep(1000);
        CommonUtils.click(page, "//*[text()=' Material Selection ']", test);
        Thread.sleep(4000);
        CommonUtils.click(page, "//*[text()='Chemical Selection']", test);
        double diff5 = CommonUtils.performVisualStep(page, test, MODULE_NAME, "Chemical_Selection_Tab", "//*[text()='Chemical Selection']", THRESHOLD);
        if (diff5 >= 0) {
            Assert.assertTrue(diff5 <= THRESHOLD, "Visual regression found in step [Chemical_Selection_Tab]: " + diff5 + "% mismatch");
        }
        CommonUtils.click(page, "//*[text()='Fluid Selection']", test);
        Thread.sleep(4000);
        page.keyboard().press("Escape");
        Thread.sleep(1000);

        // Edit is disabled when the well has no fluid rows (pointer-events: none)
        com.microsoft.playwright.Locator editIcon = page.locator("img[alt='Edit']").first();
        String pointerEvents = (String) editIcon.evaluate("el => getComputedStyle(el).pointerEvents");
        if ("none".equalsIgnoreCase(pointerEvents) || editIcon.count() == 0) {
            if (test != null) {
                test.warning("Edit icon disabled — no fluid available on well. Skipping Fluid Friction detail steps.");
            }
            System.out.println("⚠ Edit disabled on Fluid Selection. Skipping Fluid Friction / Rheology / Thermal / Chemicals steps.");
            return;
        }

        editIcon.click(new com.microsoft.playwright.Locator.ClickOptions().setTimeout(60000));
        if (test != null) test.info("Clicked: img[alt='Edit']");
        Thread.sleep(5000);
        page.waitForSelector("//*[contains(normalize-space(),'Fluid Friction')]",
                new com.microsoft.playwright.Page.WaitForSelectorOptions().setTimeout(60000));
        double diff6 = CommonUtils.performVisualStep(page, test, MODULE_NAME, "Fluid_Friction", null, THRESHOLD);
        if (diff6 >= 0) {
            Assert.assertTrue(diff6 <= THRESHOLD, "Visual regression found in step [Fluid_Friction_tab]: " + diff6 + "% mismatch");
        }
        CommonUtils.click(page, "//*[text()='Fluid Rheology']", test);
        double diff7 = CommonUtils.performVisualStep(page, test, MODULE_NAME, "Fluid_Rheology", null, THRESHOLD);
        if (diff7 >= 0) {
            Assert.assertTrue(diff7 <= THRESHOLD, "Visual regression found in step [Fluid_Rheology_tab]: " + diff7 + "% mismatch");
        }
        CommonUtils.click(page, "//*[text()='Fluid Thermal Properties']", test);
        double diff8 = CommonUtils.performVisualStep(page, test, MODULE_NAME, "Fluid_Thermal_Properties", null, THRESHOLD);
		if (diff8 >= 0) {
			Assert.assertTrue(diff8 <= THRESHOLD,
					"Visual regression found in step [Fluid_Thermal_Properties_tab]: " + diff8 + "% mismatch");
		}
		CommonUtils.click(page, "//*[text()='Chemicals']", test);
		double diff9 = CommonUtils.performVisualStep(page, test, MODULE_NAME, "Chemicals_Tab", null, THRESHOLD);	
		if (diff9 >= 0) {
			Assert.assertTrue(diff9 <= THRESHOLD,
					"Visual regression found in step [Chemicals_tab]: " + diff9 + "% mismatch");
		}
        
        
        
        
        
//        String[] fluidSections = {
//            "Fluid Friction",
//            "Fluid Rheology",
//            "Fluid Thermal Properties",
//            "Chemicals"
//        };
//        for (String section : fluidSections) {
//            CommonUtils.ensureSectionDirs(MODULE_NAME, section);
//            double sectionDiff = CommonUtils.performVisualStep(
//                page, test, MODULE_NAME + "/" + section.replace(" ", "_"), section, "//*[text()='" + section + "']", THRESHOLD
//            );
//            if (sectionDiff >= 0) {
//                Assert.assertTrue(sectionDiff <= THRESHOLD,
//                    "Visual regression found in section [" + section + "]: " + sectionDiff + "% mismatch");
//            }
//        }
    }
}