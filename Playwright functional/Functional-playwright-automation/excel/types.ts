export type ExcelRow = (string | number | null | undefined)[];
export type ExcelRowObject = Record<string, string | number | null | undefined>;

export type TestResultStatus = 'PASSED' | 'FAILED' | 'SKIPPED' | 'IN_PROGRESS';

export interface TestResultRecord {
  testName: string;
  status: TestResultStatus;
  notes?: string;
  environment?: string;
  timestamp?: string;
}

export interface KeyValueOptions {
  sheetName?: string;
  fallback?: string;
  /** When true, throws if key is missing and no fallback provided */
  required?: boolean;
}

export const EXCEL_SHEETS = {
  DATA: 'Data',
  LEGACY: 'Sheet1',
  TEST_RESULTS: 'TestResults',
  QA: 'QA',
  STAGING: 'Staging',
  PROD: 'Prod',
} as const;

export const KEY_VALUE_SCAN_LIMIT = 500;
