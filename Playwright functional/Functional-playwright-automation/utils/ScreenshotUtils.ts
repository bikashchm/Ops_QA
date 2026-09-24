import fs from 'fs';
import path from 'path';
import { type Page, type TestInfo } from '@playwright/test';
import { SCREENSHOTS_DIR } from '../constants/paths';
import { LogHelper } from '../logger/LogHelper';

/**
 * Custom screenshot capture — supplements Playwright built-in failure screenshots.
 */
export class ScreenshotUtils {
  constructor(
    private readonly page: Page,
    private readonly testInfo?: TestInfo,
  ) {}

  private buildPath(name: string): string {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    const safeName = name.replace(/[^\w.-]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(SCREENSHOTS_DIR, `${safeName}_${timestamp}.png`);
  }

  async capture(name: string): Promise<string> {
    const filePath = this.buildPath(name);
    await this.page.screenshot({ path: filePath, fullPage: true });
    LogHelper.logScreenshot(filePath, name);
    return filePath;
  }

  async captureViewport(name: string): Promise<string> {
    const filePath = this.buildPath(name);
    await this.page.screenshot({ path: filePath, fullPage: false });
    LogHelper.logScreenshot(filePath, `viewport: ${name}`);
    return filePath;
  }

  async captureOnFailure(testInfo?: TestInfo): Promise<void> {
    const info = testInfo ?? this.testInfo;
    if (!info || info.status === info.expectedStatus) return;

    const filePath = this.buildPath(`FAILURE_${info.title}`);
    await this.page.screenshot({ path: filePath, fullPage: true });
    await info.attach('failure-screenshot', {
      path: filePath,
      contentType: 'image/png',
    });
    LogHelper.logScreenshot(filePath, `FAILURE: ${info.title}`);
  }
}
