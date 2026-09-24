import type { ExcelRow, KeyValueOptions } from './types';

/** Dedicated workbook sheet for Directional Survey paste payload (screenshot data). */
export const DIRECTIONAL_SURVEY_SHEET = 'directionalSurvey';

export interface DirectionalSurveyRow {
  md: string;
  inclination: string;
  azimuth: string;
}

export interface DirectionalSurveyTestData {
  surveyMode: string;
  rows: DirectionalSurveyRow[];
  /** Tab-separated text for HandsOnTable paste (MD / Inc / Azi). */
  pasteTsv: string;
}

export interface DirectionalSurveyFlowData extends DirectionalSurveyTestData {
  padName: string;
  wellName: string;
  companyButtonName: string;
}

type GetFn = (key: string, options?: KeyValueOptions) => string;
type SetFn = (key: string, value: string) => void;
type ReadRowsFn = (sheetName: string) => ExcelRow[];
type WriteRowsFn = (sheetName: string, rows: ExcelRow[]) => void;

/** Screenshot defaults — written to sheet `directionalSurvey` when missing/empty. */
export const DIRECTIONAL_SURVEY_DEFAULT_ROWS: ExcelRow[] = [
  [0, 0, 0],
  [2000, 0, 0],
  [4000, 0, 0],
  [4500, 30, 90],
  [5000, 60, 90],
  [5500, 90, 90],
  [7000, 90, 90],
  [9000, 90, 90],
  [10800, 90, 90],
  [12000, 90, 90],
];

export const DIRECTIONAL_SURVEY_EXCEL_DEFAULTS: Record<string, string> = {
  DirectionalSurvey_Mode: 'MD, Inclination, Azimuth',
};

export function rowsToTsv(rows: ExcelRow[]): string {
  return rows
    .map((row) =>
      [row[0], row[1], row[2]]
        .map((c) => String(c ?? '').trim())
        .join('\t'),
    )
    .filter((line) => line.replace(/\t/g, '').length > 0)
    .join('\n');
}

export function parseSurveyRows(rows: ExcelRow[]): DirectionalSurveyRow[] {
  return rows
    .map((row) => ({
      md: String(row[0] ?? '').trim(),
      inclination: String(row[1] ?? '').trim(),
      azimuth: String(row[2] ?? '').trim(),
    }))
    .filter((r) => r.md !== '' || r.inclination !== '' || r.azimuth !== '');
}

/**
 * Ensure Sheet1 keys + `directionalSurvey` sheet with screenshot data.
 * Does not overwrite an existing non-empty directionalSurvey sheet.
 */
export function ensureDirectionalSurveyExcel(
  get: GetFn,
  set: SetFn,
  readRows: ReadRowsFn,
  writeRows: WriteRowsFn,
  sheetNames: string[],
): void {
  for (const [key, value] of Object.entries(DIRECTIONAL_SURVEY_EXCEL_DEFAULTS)) {
    const existing = get(key, { fallback: '' }).trim();
    if (!existing) {
      set(key, value);
    }
  }

  const hasSheet = sheetNames.includes(DIRECTIONAL_SURVEY_SHEET);
  const existingRows = hasSheet ? readRows(DIRECTIONAL_SURVEY_SHEET) : [];
  const hasData = existingRows.some((r) =>
    [r[0], r[1], r[2]].some((c) => String(c ?? '').trim() !== ''),
  );

  if (!hasSheet || !hasData) {
    writeRows(DIRECTIONAL_SURVEY_SHEET, DIRECTIONAL_SURVEY_DEFAULT_ROWS);
  }
}

export function buildDirectionalSurveyTestData(
  get: GetFn,
  readRows: ReadRowsFn,
): DirectionalSurveyTestData {
  const d = DIRECTIONAL_SURVEY_EXCEL_DEFAULTS;
  const raw = readRows(DIRECTIONAL_SURVEY_SHEET);
  const rows = parseSurveyRows(raw.length ? raw : DIRECTIONAL_SURVEY_DEFAULT_ROWS);
  return {
    surveyMode: get('DirectionalSurvey_Mode', { fallback: d.DirectionalSurvey_Mode }).trim(),
    rows,
    pasteTsv: rowsToTsv(rows.map((r) => [r.md, r.inclination, r.azimuth])),
  };
}

export function buildDirectionalSurveyFlowData(
  get: GetFn,
  readRows: ReadRowsFn,
  sharedPadWell: { padName: string; wellName: string; companyButtonName: string },
): DirectionalSurveyFlowData {
  return {
    ...buildDirectionalSurveyTestData(get, readRows),
    padName: sharedPadWell.padName,
    wellName: sharedPadWell.wellName,
    companyButtonName: sharedPadWell.companyButtonName,
  };
}
