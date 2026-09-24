package com.qa.visual.runner;

import java.lang.reflect.Method;
import java.time.Instant;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;

import org.testng.Assert;
import org.testng.annotations.Listeners;
import org.testng.annotations.Test;

@Listeners({com.qa.visual.reports.TestNGExtentListener.class})
public class SelectivePriorityTestRunner {

    /**
     * 🔹 ENTER ONLY THE PRIORITIES YOU WANT TO RUN
     * Example: 1, 5, 12, 17
     */
    private static final List<Integer> SELECTED_PRIORITIES =
            Arrays.asList(3,5,22);

    /**
     * Priority → Method mapping from MasterTestRunner
     */
    private static final Map<Integer, String> PRIORITY_METHOD_MAP = new LinkedHashMap<>();

    static {
        PRIORITY_METHOD_MAP.put(1, "runLoginTest");
        PRIORITY_METHOD_MAP.put(2, "runLandingPageVisualTest");
        PRIORITY_METHOD_MAP.put(3, "runHomePageTest");
        PRIORITY_METHOD_MAP.put(4, "runWellAndTreatmentVisualTest");
        PRIORITY_METHOD_MAP.put(5, "runWellAndTreatmentLocationVisualTest");
        PRIORITY_METHOD_MAP.put(6, "runWellAndTreatmentCommentsVisualTest");
        PRIORITY_METHOD_MAP.put(7, "runChannelInputTest");
        PRIORITY_METHOD_MAP.put(8, "runWellboreConfigurationTest");
        PRIORITY_METHOD_MAP.put(9, "runHeatTransferVisualRegressionTest");
        PRIORITY_METHOD_MAP.put(10, "runResorviorParameterVisualTest");
        PRIORITY_METHOD_MAP.put(11, "runMaterialSelectionTest");
        PRIORITY_METHOD_MAP.put(12, "runTreatmentScheduleTest");
        PRIORITY_METHOD_MAP.put(13, "runEntryFrictionTest");
        PRIORITY_METHOD_MAP.put(14, "runPlotTest");
        PRIORITY_METHOD_MAP.put(15, "runReportTest");
        PRIORITY_METHOD_MAP.put(16, "runUserDefinedChannelTest");
        PRIORITY_METHOD_MAP.put(17, "runVersionControlTest");
        PRIORITY_METHOD_MAP.put(18, "runSaveAndNextTest");
        PRIORITY_METHOD_MAP.put(19, "runRunModelTest");
        PRIORITY_METHOD_MAP.put(20, "runNewDashboardTest");
        PRIORITY_METHOD_MAP.put(21, "runMyProfileTest");
        PRIORITY_METHOD_MAP.put(22, "runForgetPasswordTest");
    }

    @Test
    public void runSelectedPriorityTests() throws Exception {

        System.out.println("\n===== SELECTIVE TEST RUN STARTED =====");
        System.out.println("Selected Priorities: " + SELECTED_PRIORITIES);
        System.out.println("Start Time: " + Instant.now());

        MasterTestRunner masterRunner = new MasterTestRunner();
        List<Integer> failedPriorities = new ArrayList<>();

        for (Integer priority : SELECTED_PRIORITIES) {

            String methodName = PRIORITY_METHOD_MAP.get(priority);

            if (methodName == null) {
                System.out.println("⚠️ No test mapped for priority: " + priority);
                continue;
            }

            System.out.println("\n>>> START Priority " + priority + " : " + methodName);

            try {
                Method method =
                        MasterTestRunner.class.getDeclaredMethod(methodName);
                method.invoke(masterRunner);

                System.out.println("✅ PASSED Priority " + priority);

            } catch (Throwable t) {
                failedPriorities.add(priority);

                System.out.println("❌ FAILED Priority " + priority);
                System.out.println("Reason: " + t.getCause());

                // Continue execution – DO NOT rethrow
            }

            System.out.println(">>> END Priority " + priority);
        }

        System.out.println("\n===== SELECTIVE TEST RUN COMPLETED =====");
        System.out.println("End Time: " + Instant.now());

        if (!failedPriorities.isEmpty()) {
            System.out.println("❌ Failed Priorities: " + failedPriorities);
        } else {
            System.out.println("🎉 All Selected Priorities Passed");
        }

        // Optional: fail the overall test at the end if any priority failed
        Assert.assertTrue(
                failedPriorities.isEmpty(),
                "Some priorities failed: " + failedPriorities
        );
    }
}
