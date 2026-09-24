package com.qa.visual.runner;

import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;

import org.testng.annotations.BeforeClass;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Listeners;
import org.testng.annotations.Test;

import com.qa.visual.tests.Channel_Inputs;
import com.qa.visual.tests.EntryFriction;
import com.qa.visual.tests.Forget_Password;
import com.qa.visual.tests.HeatTransferParametersTest;
import com.qa.visual.tests.HomePageVisualTest;
import com.qa.visual.tests.LandingPageVisualTest;
import com.qa.visual.tests.Login;
import com.qa.visual.tests.Material_Selection;
import com.qa.visual.tests.My_Profile;
import com.qa.visual.tests.New_Dashboard;
import com.qa.visual.tests.PlotTest;
import com.qa.visual.tests.ReportTest;
import com.qa.visual.tests.ReservoirParametersTest;
import com.qa.visual.tests.RunModelTest;
import com.qa.visual.tests.Save_And_Next;
import com.qa.visual.tests.TreatmentScheduleTest;
import com.qa.visual.tests.UserDefinedChannelsTest;
import com.qa.visual.tests.VersionControlTest;
import com.qa.visual.tests.WellAndTreatment;
import com.qa.visual.tests.WellAndTreatmentCommentsTest;
import com.qa.visual.tests.WellAndTreatmentLocation;
import com.qa.visual.tests.WellboreConfiguration;
import com.qa.visual.base.BaseTest; // used only for type of reference when calling tearDown()

/**
 * MasterTestRunner (DOES NOT extend BaseTest)
 *
 * Each test method here will:
 *  - instantiate its test class (which extends BaseTest and therefore creates Playwright browser/page)
 *  - execute verify... method
 *  - call testInstance.tearDown() in finally to close Playwright resources
 *
 * This guarantees: login/start -> test -> tearDown (browser closed) -> next test fresh.
 */
@Listeners({com.qa.visual.reports.TestNGExtentListener.class})
public class MasterTestRunner {

    private static final String SCREENSHOT_DIR = "reports/screenshots";
    private static final String EXTENT_DIR = "reports/extent-report";

    @BeforeClass(alwaysRun = true)
    public void beforeClassSetup() throws Exception {
        createDirectoryIfNotExists(SCREENSHOT_DIR);
        createDirectoryIfNotExists(EXTENT_DIR);
        System.out.println("[MasterTestRunner] @BeforeClass - reports dirs ready at " + Instant.now());
    }

    @BeforeMethod(alwaysRun = true)
    public void registerTestName(Method method) {
        // If you use TestNameHelper for screenshot filenames, keep this call.
        try {
            TestNameHelper.setTestName(method.getName());
        } catch (Throwable t) {
            // not critical — just log if TestNameHelper isn't available
            System.out.println("[MasterTestRunner] TestNameHelper not available: " + t.getMessage());
        }
    }

    private void createDirectoryIfNotExists(String dirPath) throws Exception {
        Path dir = Paths.get(dirPath);
        if (Files.notExists(dir)) {
            Files.createDirectories(dir);
        }
    }

    // -------------------------
    // Tests — each manages its own BaseTest lifecycle in try/finally
    // -------------------------

    @Test(priority = 1)
    public void runLoginTest() throws Exception {
        System.out.println("\n=== START Test: runLoginTest at " + Instant.now() + " ===");
        Login loginTest = new Login(); // Login extends BaseTest -> this creates Playwright browser/page
        try {
            loginTest.verifyLogInPageVisualRegression();
        } finally {
            loginTest.tearDown();
            System.out.println("=== END Test: runLoginTest at " + Instant.now() + " ===\n");
        }
    }

    @Test(priority = 2)
    public void runLandingPageVisualTest() throws Exception {
        System.out.println("\n=== START Test: runLandingPageVisualTest at " + Instant.now() + " ===");
        LandingPageVisualTest ldtest = new LandingPageVisualTest();
        try {
            ldtest.verifyLandingScreenVisualRegression();
        } finally {
            ldtest.tearDown();
            System.out.println("=== END Test: runLandingPageVisualTest at " + Instant.now() + " ===\n");
        }
    }

    @Test(priority = 3)
    public void runHomePageTest() throws Exception {
        System.out.println("\n=== START Test: runHomePageTest at " + Instant.now() + " ===");
        HomePageVisualTest hpTest = new HomePageVisualTest();
        try {
            hpTest.verifyHomeScreenVisualRegression();
        } finally {
            hpTest.tearDown();
            System.out.println("=== END Test: runHomePageTest at " + Instant.now() + " ===\n");
        }
    }

    @Test(priority = 4)
    public void runWellAndTreatmentVisualTest() throws Exception {
        System.out.println("\n=== START Test: runWellAndTreatmentVisualTest at " + Instant.now() + " ===");
        WellAndTreatment wtTest = new WellAndTreatment();
        try {
            wtTest.verifyWelltreatmentPageVisualRegression();
        } finally {
            wtTest.tearDown();
            System.out.println("=== END Test: runWellAndTreatmentVisualTest at " + Instant.now() + " ===\n");
        }
    }

    @Test(priority = 5)
    public void runWellAndTreatmentLocationVisualTest() throws Exception {
        System.out.println("\n=== START Test: runWellAndTreatmentLocationVisualTest at " + Instant.now() + " ===");
        WellAndTreatmentLocation wlTest = new WellAndTreatmentLocation();
        try {
            wlTest.verifyWelltreatmentLocationAdditionalInfoPageVisualRegression();
        } finally {
            wlTest.tearDown();
            System.out.println("=== END Test: runWellAndTreatmentLocationVisualTest at " + Instant.now() + " ===\n");
        }
    }

    @Test(priority = 6)
    public void runWellAndTreatmentCommentsVisualTest() throws Exception {
        System.out.println("\n=== START Test: runWellAndTreatmentCommentsVisualTest at " + Instant.now() + " ===");
        WellAndTreatmentCommentsTest wtcTest = new WellAndTreatmentCommentsTest();
        try {
            wtcTest.verifyWelltreatmentCommentPageVisualRegression();
        } finally {
            wtcTest.tearDown();
            System.out.println("=== END Test: runWellAndTreatmentCommentsVisualTest at " + Instant.now() + " ===\n");
        }
    }

    @Test(priority = 7)
    public void runChannelInputTest() throws Exception {
        System.out.println("\n=== START Test: runChannelInputTest at " + Instant.now() + " ===");
        Channel_Inputs ciTest = new Channel_Inputs();
        try {
            ciTest.verifyChannelInputWorkflowVisuals();
        } finally {
            ciTest.tearDown();
            System.out.println("=== END Test: runChannelInputTest at " + Instant.now() + " ===\n");
        }
    }

    @Test(priority = 8)
    public void runWellboreConfigurationTest() throws Exception {
        System.out.println("\n=== START Test: runWellboreConfigurationTest at " + Instant.now() + " ===");
        WellboreConfiguration wcTest = new WellboreConfiguration();
        try {
            wcTest.verifyWellboreConfigurationPageVisualRegression();
        } finally {
            wcTest.tearDown();
            System.out.println("=== END Test: runWellboreConfigurationTest at " + Instant.now() + " ===\n");
        }
    }

    @Test(priority = 9)
    public void runHeatTransferVisualRegressionTest() throws Exception {
        System.out.println("\n=== START Test: runHeatTransferVisualRegressionTest at " + Instant.now() + " ===");
        HeatTransferParametersTest htTest = new HeatTransferParametersTest();
        try {
            htTest.verifyHeatTransferPageVisualRegression();
        } finally {
            htTest.tearDown();
            System.out.println("=== END Test: runHeatTransferVisualRegressionTest at " + Instant.now() + " ===\n");
        }
    }

    @Test(priority = 10)
    public void runResorviorParameterVisualTest() throws Exception {
        System.out.println("\n=== START Test: runResorviorParameterVisualTest at " + Instant.now() + " ===");
        ReservoirParametersTest rpTest = new ReservoirParametersTest();
        try {
            rpTest.verifyReservoirParametersPageVisualRegression();
        } finally {
            rpTest.tearDown();
            System.out.println("=== END Test: runResorviorParameterVisualTest at " + Instant.now() + " ===\n");
        }
    }

    @Test(priority = 11)
    public void runMaterialSelectionTest() throws Exception {
        System.out.println("\n=== START Test: runMaterialSelectionTest at " + Instant.now() + " ===");
        Material_Selection mcTest = new Material_Selection();
        try {
            mcTest.verifyMaterialSelectionWorkflowVisuals();
        } finally {
            mcTest.tearDown();
            System.out.println("=== END Test: runMaterialSelectionTest at " + Instant.now() + " ===\n");
        }
    }

    @Test(priority = 12)
    public void runTreatmentScheduleTest() throws Exception {
        System.out.println("\n=== START Test: runTreatmentScheduleTest at " + Instant.now() + " ===");
        TreatmentScheduleTest tcTest = new TreatmentScheduleTest();
        try {
            tcTest.verifyTreatmentScheduledPageVisualRegression();
        } finally {
            tcTest.tearDown();
            System.out.println("=== END Test: runTreatmentScheduleTest at " + Instant.now() + " ===\n");
        }
    }

    @Test(priority = 13)
    public void runEntryFrictionTest() throws Exception {
        System.out.println("\n=== START Test: runEntryFrictionTest at " + Instant.now() + " ===");
        EntryFriction efTest = new EntryFriction();
        try {
            efTest.verifyEntryFrictionPageVisualRegression();
        } finally {
            efTest.tearDown();
            System.out.println("=== END Test: runEntryFrictionTest at " + Instant.now() + " ===\n");
        }
    }

    @Test(priority = 14)
    public void runPlotTest() throws Exception {
        System.out.println("\n=== START Test: runPlotTest at " + Instant.now() + " ===");
        PlotTest ptTest = new PlotTest();
        try {
            ptTest.verifyPlotPageVisualRegression();
        } finally {
            ptTest.tearDown();
            System.out.println("=== END Test: runPlotTest at " + Instant.now() + " ===\n");
        }
    }

    @Test(priority = 15)
    public void runReportTest() throws Exception {
        System.out.println("\n=== START Test: runReportTest at " + Instant.now() + " ===");
        ReportTest reportTest = new ReportTest();
        try {
            reportTest.verifyReportPageVisualRegression();
        } finally {
            reportTest.tearDown();
            System.out.println("=== END Test: runReportTest at " + Instant.now() + " ===\n");
        }
    }

    @Test(priority = 16)
    public void runUserDefinedChannelTest() throws Exception {
        System.out.println("\n=== START Test: runUserDefinedChannelTest at " + Instant.now() + " ===");
        UserDefinedChannelsTest usdTest = new UserDefinedChannelsTest();
        try {
            usdTest.verifyUserDefinedChannelPageVisualRegression();
        } finally {
            usdTest.tearDown();
            System.out.println("=== END Test: runUserDefinedChannelTest at " + Instant.now() + " ===\n");
        }
    }

    @Test(priority = 17)
    public void runVersionControlTest() throws Exception {
        System.out.println("\n=== START Test: runVersionControlTest at " + Instant.now() + " ===");
        VersionControlTest vcTest = new VersionControlTest();
        try {
            vcTest.verifyVersionControlPageVisualRegression();
        } finally {
            vcTest.tearDown();
            System.out.println("=== END Test: runVersionControlTest at " + Instant.now() + " ===\n");
        }
    }

    @Test(priority = 18)
    public void runSaveAndNextTest() throws Exception {
        System.out.println("\n=== START Test: runSaveAndNextTest at " + Instant.now() + " ===");
        Save_And_Next snTest = new Save_And_Next();
        try {
            snTest.verifySave_And_NextWorkflowVisuals();
        } finally {
            snTest.tearDown();
            System.out.println("=== END Test: runSaveAndNextTest at " + Instant.now() + " ===\n");
        }
    }

    @Test(priority = 19)
    public void runRunModelTest() throws Exception {
        System.out.println("\n=== START Test: runRunModelTest at " + Instant.now() + " ===");
        RunModelTest rmTest = new RunModelTest();
        try {
            rmTest.verifyRunModelPageVisualRegression();
        } finally {
            rmTest.tearDown();
            System.out.println("=== END Test: runRunModelTest at " + Instant.now() + " ===\n");
        }
    }

    @Test(priority = 20)
    public void runNewDashboardTest() throws Exception {
        System.out.println("\n=== START Test: runNewDashboardTest at " + Instant.now() + " ===");
        New_Dashboard ndTest = new New_Dashboard();
        try {
            ndTest.verifyNew_DashboardVisualRegression();
        } finally {
            ndTest.tearDown();
            System.out.println("=== END Test: runNewDashboardTest at " + Instant.now() + " ===\n");
        }
    }

    @Test(priority = 21)
    public void runMyProfileTest() throws Exception {
        System.out.println("\n=== START Test: runMyProfileTest at " + Instant.now() + " ===");
        My_Profile mpTest = new My_Profile();
        try {
            mpTest.verifyMyProfileVisualRegression();
        } finally {
            mpTest.tearDown();
            System.out.println("=== END Test: runMyProfileTest at " + Instant.now() + " ===\n");
        }
    }

    @Test(priority = 22)
    public void runForgetPasswordTest() throws Exception {
        System.out.println("\n=== START Test: runForgetPasswordTest at " + Instant.now() + " ===");
        Forget_Password fpTest = new Forget_Password();
        try {
            fpTest.verifyForget_PasswordscreenVisualRegression();
        } finally {
            fpTest.tearDown();
            System.out.println("=== END Test: runForgetPasswordTest at " + Instant.now() + " ===\n");
        }
    }
}
