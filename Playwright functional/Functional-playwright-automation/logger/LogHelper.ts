import type { TestCase, TestResult, TestStep } from '@playwright/test/reporter';
import type { TestInfo } from '@playwright/test';
import { ConfigManager } from '../config/ConfigManager';
import { appLogger } from './winstonLogger';

type ErrorLike = {
  message?: string;
  stack?: string;
};

/**
 * High-level logging API for tests, steps, API calls, retries, and screenshots.
 */
export class LogHelper {
  private static currentTestName: string | undefined;

  static setCurrentTest(testName: string): void {
    this.currentTestName = testName;
  }

  static clearCurrentTest(): void {
    this.currentTestName = undefined;
  }

  private static baseMeta(extra?: Record<string, unknown>) {
    return {
      testName: this.currentTestName,
      ...extra,
    };
  }

  // --- Environment ---

  static logEnvironment(): void {
    const env = ConfigManager.get();
    appLogger.info('Environment configuration loaded', {
      category: 'ENV',
      environment: env.testEnv,
      baseUrl: env.baseUrl,
      ci: !!process.env.CI,
      ...this.baseMeta(),
    });
  }

  // --- Test lifecycle ---

  static logTestStart(test: TestCase | TestInfo | { title: string; file?: string }): void {
    const title = 'title' in test ? test.title : (test as TestCase).title;
    const file = 'file' in test && test.file ? test.file : (test as TestInfo).file;
    this.setCurrentTest(title);

    appLogger.info('TEST START', {
      category: 'TEST',
      file,
      ...this.baseMeta({ testName: title, project: (test as TestInfo).project?.name }),
    });
  }

  static logTestEnd(test: TestCase | TestInfo, result?: TestResult): void {
    const title = test.title;
    const status = result?.status ?? (test as TestInfo).status ?? 'unknown';
    const duration = result?.duration ?? (test as TestInfo).duration;

    appLogger.info('TEST END', {
      category: 'TEST',
      status,
      durationMs: duration,
      retry: result?.retry ?? (test as TestInfo).retry,
      ...this.baseMeta({ testName: title }),
    });

    if (status === 'passed') {
      this.logPass(title, duration);
    } else if (status === 'failed' || status === 'timedOut') {
      const error = result?.error ?? (test as TestInfo).error;
      this.logFail(title, error, duration);
    }

    this.clearCurrentTest();
  }

  static logPass(testName: string, durationMs?: number): void {
    appLogger.info('TEST PASSED', {
      category: 'TEST',
      durationMs,
      ...this.baseMeta({ testName }),
    });
  }

  static logFail(testName: string, error?: ErrorLike, durationMs?: number): void {
    appLogger.error('TEST FAILED', {
      category: 'TEST',
      durationMs,
      errorMessage: error?.message,
      stack: error?.stack,
      ...this.baseMeta({ testName }),
    });
  }

  // --- Steps ---

  static logStep(stepTitle: string, details?: Record<string, unknown>): void {
    appLogger.info(`STEP: ${stepTitle}`, {
      category: 'STEP',
      ...this.baseMeta(details),
    });
  }

  static logStepBegin(step: TestStep | { title: string }): void {
    this.logStep(`BEGIN — ${step.title}`);
  }

  static logStepEnd(step: TestStep | { title: string }, error?: ErrorLike): void {
    if (error) {
      appLogger.error(`STEP FAILED — ${step.title}`, {
        category: 'STEP',
        errorMessage: error.message,
        stack: error.stack,
        ...this.baseMeta(),
      });
      return;
    }
    this.logStep(`END — ${step.title}`);
  }

  // --- Exceptions ---

  static logException(error: unknown, context?: string): void {
    const normalized = error instanceof Error ? error : new Error(String(error));
    appLogger.error(context ? `EXCEPTION: ${context}` : 'EXCEPTION', {
      category: 'TEST',
      errorMessage: normalized.message,
      stack: normalized.stack,
      ...this.baseMeta(),
    });
  }

  // --- Screenshots ---

  static logScreenshot(filePath: string, context?: string): void {
    appLogger.info(context ? `SCREENSHOT: ${context}` : 'SCREENSHOT captured', {
      category: 'SCREENSHOT',
      screenshotPath: filePath,
      ...this.baseMeta(),
    });
  }

  // --- API ---

  static logApi(
    method: string,
    url: string,
    options?: { status?: number; durationMs?: number; requestBody?: unknown; responseBody?: unknown },
  ): void {
    appLogger.info(`API ${method.toUpperCase()} ${url}`, {
      category: 'API',
      method: method.toUpperCase(),
      url,
      status: options?.status,
      durationMs: options?.durationMs,
      requestBody: options?.requestBody,
      responseBody: options?.responseBody,
      ...this.baseMeta(),
    });
  }

  // --- Retry ---

  static logRetry(
    label: string,
    attempt: number,
    maxAttempts: number,
    error?: unknown,
  ): void {
    const normalized = error instanceof Error ? error : undefined;
    appLogger.warn(`RETRY: ${label} (attempt ${attempt}/${maxAttempts})`, {
      category: 'RETRY',
      label,
      attempt,
      maxAttempts,
      errorMessage: normalized?.message,
      ...this.baseMeta(),
    });
  }

  // --- Suite lifecycle ---

  static logSuiteStart(message: string): void {
    appLogger.info(message, { category: 'FRAMEWORK', ...this.baseMeta() });
  }

  static logSuiteEnd(message: string): void {
    appLogger.info(message, { category: 'FRAMEWORK', ...this.baseMeta() });
  }
}
