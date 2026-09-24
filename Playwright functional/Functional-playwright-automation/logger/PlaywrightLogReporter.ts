import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
  TestStep,
} from '@playwright/test/reporter';
import { LogHelper } from './LogHelper';
import { getRunId, getRunLogFilePath } from './winstonLogger';

/**
 * Playwright reporter — logs every test/step to Winston for all specs (including legacy).
 */
export default class PlaywrightLogReporter implements Reporter {
  onBegin(config: FullConfig, suite: Suite): void {
    LogHelper.logSuiteStart(
      `Playwright run started — workers: ${config.workers}, projects: ${config.projects.length}, runId: ${getRunId()}`,
    );
    LogHelper.logEnvironment();
    LogHelper.logStep(`Log file: ${getRunLogFilePath()}`);
  }

  onTestBegin(test: TestCase): void {
    LogHelper.logTestStart(test);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    LogHelper.logTestEnd(test, result);

    for (const attachment of result.attachments) {
      if (attachment.contentType?.includes('image') && attachment.path) {
        LogHelper.logScreenshot(attachment.path, `attachment: ${attachment.name}`);
      }
    }

    if (result.error) {
      const error =
        result.error instanceof Error
          ? result.error
          : new Error(result.error.message ?? JSON.stringify(result.error));
      LogHelper.logException(error, `test: ${test.title}`);
    }
  }

  onStepBegin(test: TestCase, _result: TestResult, step: TestStep): void {
    LogHelper.setCurrentTest(test.title);
    LogHelper.logStepBegin(step);
  }

  onStepEnd(test: TestCase, _result: TestResult, step: TestStep): void {
    LogHelper.setCurrentTest(test.title);
    LogHelper.logStepEnd(step, step.error);
  }

  onEnd(result: FullResult): void {
    LogHelper.logSuiteEnd(
      `Playwright run finished — status: ${result.status}, duration: ${result.duration}ms`,
    );
  }
}
