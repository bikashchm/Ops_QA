import path from 'path';

export const TEST_DATA_DIR = path.resolve(process.cwd(), 'test-data');
export const EXCEL_DATA_DIR = path.resolve(TEST_DATA_DIR, 'excel');

/** Primary enterprise Excel location */
export const LIVEPLUS_TEST_DATA_FILE = path.resolve(EXCEL_DATA_DIR, 'Liveplus_TestData.xlsx');

/** Sample/template workbook for new suites */
export const SAMPLE_TEST_DATA_FILE = path.resolve(EXCEL_DATA_DIR, 'LivePlus_Sample_TestData.xlsx');

/** @deprecated Root-level legacy file — kept for backward compatibility during migration */
export const LEGACY_TEST_DATA_FILE = path.resolve(process.cwd(), 'Liveplus_TestData.xlsx');

export const SCREENSHOTS_DIR = path.resolve(process.cwd(), 'screenshots');
export const VIDEOS_DIR = path.resolve(process.cwd(), 'videos');
export const REPORTS_DIR = path.resolve(process.cwd(), 'reports');
export const LOGS_DIR = path.resolve(process.cwd(), 'logs');
