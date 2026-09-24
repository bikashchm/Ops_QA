import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import type { WorkBook } from 'xlsx';
import { logger } from '../logger';
import { ExcelReader } from './ExcelReader';
import type { ExcelRow, TestResultRecord } from './types';
import { EXCEL_SHEETS } from './types';

/**
 * Write / update Excel workbooks.
 */
export class ExcelWriter {
  private reader: ExcelReader;

  constructor(private readonly filePath: string) {
    this.reader = new ExcelReader(filePath);
  }

  private ensureDirectory(): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
  }

  private loadOrCreateWorkbook(): WorkBook {
    if (this.reader.exists()) {
      return this.reader.load();
    }

    this.ensureDirectory();
    const workbook = XLSX.utils.book_new();
    const defaultSheet = XLSX.utils.aoa_to_sheet([
      ['Key', 'Value'],
    ]);
    XLSX.utils.book_append_sheet(workbook, defaultSheet, EXCEL_SHEETS.LEGACY);
    XLSX.writeFile(workbook, this.filePath);
    logger.info(`Created new Excel workbook: ${this.filePath}`);
    return workbook;
  }

  writeWorkbook(workbook: WorkBook): void {
    this.ensureDirectory();
    XLSX.writeFile(workbook, this.filePath);
    this.reader.reload();
  }

  writeRows(sheetName: string, rows: ExcelRow[], createSheet = true): void {
    const workbook = this.loadOrCreateWorkbook();

    if (!workbook.Sheets[sheetName] && createSheet) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), sheetName);
    }

    workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(rows);
    if (!workbook.SheetNames.includes(sheetName)) {
      workbook.SheetNames.push(sheetName);
    }

    this.writeWorkbook(workbook);
    logger.info(`Wrote ${rows.length} row(s) to sheet "${sheetName}"`);
  }

  upsertKeyValue(key: string, value: string, sheetName: string = EXCEL_SHEETS.LEGACY): void {
    const workbook = this.loadOrCreateWorkbook();
    const targetSheet = workbook.Sheets[sheetName]
      ? sheetName
      : this.reader.resolveSheetName(sheetName);

    const rows = this.reader.readRows(targetSheet);
    const normalizedKey = key.trim().toLowerCase();
    let found = false;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] ?? [];
      const colA = String(row[0] ?? '').trim();
      if (colA && colA.toLowerCase() === normalizedKey) {
        row[1] = value;
        rows[i] = row;
        found = true;
        break;
      }
    }

    if (!found) {
      rows.push([key, value]);
    }

    workbook.Sheets[targetSheet] = XLSX.utils.aoa_to_sheet(rows);
    if (!workbook.SheetNames.includes(targetSheet)) {
      workbook.SheetNames.push(targetSheet);
    }

    this.writeWorkbook(workbook);
    logger.info(`Excel upsert [${targetSheet}]: ${key} -> ${value}`);
  }

  appendRow(sheetName: string, row: ExcelRow): void {
    const workbook = this.loadOrCreateWorkbook();
    const targetSheet = workbook.Sheets[sheetName]
      ? sheetName
      : EXCEL_SHEETS.TEST_RESULTS;

    if (!workbook.Sheets[targetSheet]) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([]), targetSheet);
    }

    const rows = this.reader.readRows(targetSheet);
    rows.push(row);
    workbook.Sheets[targetSheet] = XLSX.utils.aoa_to_sheet(rows);
    this.writeWorkbook(workbook);
    logger.info(`Appended row to sheet "${targetSheet}"`);
  }

  updateCell(sheetName: string, rowIndex: number, columnIndex: number, value: string | number): void {
    const workbook = this.loadOrCreateWorkbook();
    const targetSheet = this.reader.resolveSheetName(sheetName);
    const rows = this.reader.readRows(targetSheet);
    const row = rows[rowIndex] ?? [];
    row[columnIndex] = value;
    rows[rowIndex] = row;
    workbook.Sheets[targetSheet] = XLSX.utils.aoa_to_sheet(rows);
    this.writeWorkbook(workbook);
  }

  /** Appends or updates test execution result in TestResults sheet. */
  writeTestResult(record: TestResultRecord, sheetName = EXCEL_SHEETS.TEST_RESULTS): void {
    const workbook = this.loadOrCreateWorkbook();

    if (!workbook.Sheets[sheetName]) {
      const header: ExcelRow = ['TestName', 'Environment', 'Status', 'Timestamp', 'Notes'];
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([header]), sheetName);
    }

    const rows = this.reader.readRows(sheetName);
    const timestamp = record.timestamp ?? new Date().toISOString();
    const environment = record.environment ?? process.env.TEST_ENV ?? 'qa';
    const normalizedName = record.testName.trim().toLowerCase();

    let updated = false;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] ?? [];
      const existingName = String(row[0] ?? '').trim().toLowerCase();
      const existingEnv = String(row[1] ?? '').trim().toLowerCase();
      if (existingName === normalizedName && existingEnv === environment.toLowerCase()) {
        row[2] = record.status;
        row[3] = timestamp;
        row[4] = record.notes ?? '';
        rows[i] = row;
        updated = true;
        break;
      }
    }

    if (!updated) {
      rows.push([record.testName, environment, record.status, timestamp, record.notes ?? '']);
    }

    workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(rows);
    this.writeWorkbook(workbook);
    logger.info(`Test result recorded: ${record.testName} -> ${record.status}`);
  }
}
