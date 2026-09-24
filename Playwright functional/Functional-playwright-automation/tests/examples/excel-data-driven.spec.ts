/**
 * SAMPLE — Excel data-driven testing patterns.
 * Demonstrates TestDataManager usage; not part of default regression suite.
 */
import { test, expect } from '../../fixtures';
import { TestDataManager } from '../../excel/TestDataManager';
import { SAMPLE_TEST_DATA_FILE } from '../../constants/paths';

test.describe('Excel data-driven samples @sample', () => {
  test('reads environment-aware key-value data from Excel', async () => {
    const testData = TestDataManager.getDefault();

    const email = testData.get('EmailAddress', { fallback: 'user@example.com' });
    const padName = testData.get('Padname');
    const allQaData = testData.getAll();

    expect(email.length).toBeGreaterThan(0);
    expect(typeof allQaData).toBe('object');
    expect(testData.getFilePath()).toContain('test-data');

    // Optional: log resolved sheet for debugging
    expect(testData.getEnvironmentSheetName()).toMatch(/QA|Staging|Prod/i);
  });

  test('reads multiple sheets dynamically', async () => {
    const testData = new TestDataManager({ fileName: SAMPLE_TEST_DATA_FILE });
    const sheetNames = testData.getSheetNames();

    expect(sheetNames).toContain('QA');
    expect(sheetNames).toContain('TestResults');

    const qaRows = testData.readRows('QA');
    expect(qaRows.length).toBeGreaterThan(1);
  });

  test('writes test result back to Excel TestResults sheet', async () => {
    const testData = new TestDataManager({ fileName: SAMPLE_TEST_DATA_FILE });

    testData.recordTestResult({
      testName: 'excel sample - result write-back',
      status: 'PASSED',
      notes: 'Demonstrates write-back to TestResults sheet',
    });

    const results = testData.readRows('TestResults');
    const lastRow = results[results.length - 1] ?? [];
    expect(String(lastRow[0])).toContain('excel sample');
    expect(String(lastRow[2])).toBe('PASSED');
  });
});
