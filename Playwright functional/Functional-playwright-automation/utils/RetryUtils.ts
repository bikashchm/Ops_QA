import { LogHelper } from '../logger/LogHelper';

export interface RetryOptions {
  retries?: number;
  delayMs?: number;
  label?: string;
}

/**
 * Retry flaky operations with exponential-friendly fixed delay.
 */
export class RetryUtils {
  static async retry<T>(
    action: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    const { retries = 3, delayMs = 500, label = 'operation' } = options;
    let lastError: unknown;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await action();
      } catch (error) {
        lastError = error;
        LogHelper.logRetry(label, attempt, retries, error);
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError;
  }
}
