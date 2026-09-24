import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import type { WorkBook } from 'xlsx';
import { logger } from '../logger';
import type { ExcelRow, ExcelRowObject } from './types';
import { KEY_VALUE_SCAN_LIMIT } from './types';

/**
 * Read-only Excel operations.
 * Use ExcelWriter for mutations; TestDataManager for test-facing API.
 */
export class ExcelReader {
  private workbook: WorkBook | null = null;

  constructor(private readonly filePath: string) {}

  getFilePath(): string {
    return this.filePath;
  }

  exists(): boolean {
    return fs.existsSync(this.filePath);
  }

  load(): WorkBook {
    if (!this.exists()) {
      throw new Error(`Excel file not found: ${this.filePath}`);
    }
    this.workbook = XLSX.readFile(this.filePath);
    return this.workbook;
  }

  private getWorkbook(): WorkBook {
    return this.workbook ?? this.load();
  }

  /** Clears in-memory cache so the next read reflects disk changes. */
  reload(): WorkBook {
    this.workbook = null;
    return this.load();
  }

  getSheetNames(): string[] {
    return this.getWorkbook().SheetNames;
  }

  resolveSheetName(preferredSheet?: string): string {
    const workbook = this.getWorkbook();
    if (preferredSheet && workbook.Sheets[preferredSheet]) {
      return preferredSheet;
    }
    return workbook.SheetNames[0];
  }

  readRows(sheetName?: string): ExcelRow[] {
    const workbook = this.getWorkbook();
    const targetSheet = this.resolveSheetName(sheetName);
    const sheet = workbook.Sheets[targetSheet];
    if (!sheet) return [];

    return XLSX.utils.sheet_to_json<ExcelRow>(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });
  }

  /** Reads sheet as array of objects using the first row as headers. */
  readAsObjects(sheetName?: string): ExcelRowObject[] {
    const workbook = this.getWorkbook();
    const targetSheet = this.resolveSheetName(sheetName);
    const sheet = workbook.Sheets[targetSheet];
    if (!sheet) return [];

    return XLSX.utils.sheet_to_json<ExcelRowObject>(sheet, { defval: '' });
  }

  /**
   * Key-value lookup supporting:
   * - Column A / Column B  (legacy LivePlus format)
   * - Header / Data columns (Java ReadData equivalent)
   */
  getKeyValue(key: string, sheetName?: string): string | undefined {
    const normalizedKey = key.trim().toLowerCase();
    if (!normalizedKey) return undefined;

    const objectRows = this.readAsObjects(sheetName);
    for (const row of objectRows) {
      const headerKey = String(row.Header ?? row.Key ?? row.key ?? '').trim();
      const headerValue = row.Data ?? row.Value ?? row.value;
      if (headerKey && headerKey.toLowerCase() === normalizedKey) {
        return String(headerValue ?? '').trim();
      }
    }

    const rows = this.readRows(sheetName);
    for (let i = 0; i < Math.min(KEY_VALUE_SCAN_LIMIT, rows.length); i++) {
      const row = rows[i] ?? [];
      const colA = String(row[0] ?? '').trim();
      const colB = String(row[1] ?? '').trim();
      if (colA && colA.toLowerCase() === normalizedKey) {
        return colB;
      }
    }

    return undefined;
  }

  getAllKeyValues(sheetName?: string): Record<string, string> {
    const result: Record<string, string> = {};
    const rows = this.readRows(sheetName);

    for (let i = 0; i < Math.min(KEY_VALUE_SCAN_LIMIT, rows.length); i++) {
      const row = rows[i] ?? [];
      const key = String(row[0] ?? '').trim();
      const value = String(row[1] ?? '').trim();
      if (key && key.toLowerCase() !== 'key' && key.toLowerCase() !== 'header') {
        result[key] = value;
      }
    }

    const objectRows = this.readAsObjects(sheetName);
    for (const row of objectRows) {
      const key = String(row.Header ?? row.Key ?? '').trim();
      const value = String(row.Data ?? row.Value ?? '').trim();
      if (key && key.toLowerCase() !== 'header' && key.toLowerCase() !== 'key') {
        result[key] = value;
      }
    }

    return result;
  }

  getRow(sheetName: string | undefined, rowIndex: number): ExcelRow {
    const rows = this.readRows(sheetName);
    return rows[rowIndex] ?? [];
  }

  getRowCount(sheetName?: string): number {
    return this.readRows(sheetName).length;
  }
}

export function resolveExcelPath(fileName: string): string {
  return path.isAbsolute(fileName) ? fileName : path.resolve(process.cwd(), fileName);
}
