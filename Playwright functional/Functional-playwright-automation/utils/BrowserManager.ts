import { type Page } from '@playwright/test';
import { logger } from '../logger';

/**
 * Browser lifecycle management — maximize, window bounds (CDP).
 * Preserves legacy Selenium-equivalent maximize behavior.
 */
export class BrowserManager {
  constructor(private readonly page: Page) {}

  async maximize(): Promise<void> {
    const cdpSession = await this.page.context().newCDPSession(this.page);
    const { windowId } = await cdpSession.send('Browser.getWindowForTarget');
    await cdpSession.send('Browser.setWindowBounds', {
      windowId,
      bounds: { windowState: 'maximized' },
    });
    logger.debug('Browser window maximized via CDP');
  }

  static async maximize(page: Page): Promise<void> {
    await new BrowserManager(page).maximize();
  }
}

/** @deprecated Use BrowserManager.maximize() — kept for backward compatibility */
export async function maximizeBrowserWindow(page: Page): Promise<void> {
  await BrowserManager.maximize(page);
}
