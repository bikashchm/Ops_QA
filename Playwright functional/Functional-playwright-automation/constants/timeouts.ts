/** Centralized timeout values (milliseconds). */
export const TIMEOUTS = {
  ACTION_DELAY_MS: 150,
  TYPING_DELAY_MS: 20,
  ASSERT_WAIT_MS: 100,
  SAVE_WAIT_MS: 5000,
  /** Fail fast for locator/click issues — do not hang for minutes. */
  SHORT_UI_MS: 20_000,
  SLOW_UI_MS: 120_000,
  TEST_DEFAULT_MS: 300_000,
  /** Utilities → Version Control full flow (from Playwright_Rohan). */
  VERSION_CONTROL_TEST_MS: 480_000,
} as const;
