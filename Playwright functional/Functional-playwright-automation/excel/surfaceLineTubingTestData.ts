import type { KeyValueOptions } from './types';

export interface SurfaceLineTubingRowData {
  topMd: string;
  botMd: string;
  /** Dropdown option to click for Surf Line/Tubing (e.g. Packer). Empty = leave/assert default. */
  typeOption: string;
  /** Expected Surf Line/Tubing cell text (e.g. Tubing or Packer). */
  typeDisplay: string;
  od: string;
  weight: string;
  expectedId: string;
  gradeOption: string;
  expectedGrade: string;
}

export interface SurfaceLineTubingTestData {
  rows: SurfaceLineTubingRowData[];
  /** Codegen: Top 2000 then Bot 1000 triggers Top > Bot validation. */
  validationTopMd: string;
  validationBotMd: string;
  validationMessage: string;
}

export interface SurfaceLineTubingFlowData extends SurfaceLineTubingTestData {
  padName: string;
  wellName: string;
  companyButtonName: string;
}

type GetFn = (key: string, options?: KeyValueOptions) => string;
type SetFn = (key: string, value: string) => void;

/** Defaults matching staging Surface Line/Tubing codegen — written when Excel keys are empty. */
export const SURFACE_LINE_TUBING_EXCEL_DEFAULTS: Record<string, string> = {
  SLT_ValidationTopMD: '2000',
  SLT_ValidationBotMD: '1000',
  SLT_ValidationMessage: 'Top MD cannot be greater than Bottom MD!',

  SLT_Row1_TopMD: '0',
  SLT_Row1_BotMD: '4000',
  SLT_Row1_TypeOption: '',
  SLT_Row1_TypeDisplay: 'Tubing',
  SLT_Row1_OD: '7',
  SLT_Row1_Weight: '22.64',
  SLT_Row1_ExpectedID: '6.366',
  SLT_Row1_GradeOption: '',
  SLT_Row1_ExpectedGrade: 'Unspec',

  SLT_Row2_TopMD: '4000',
  SLT_Row2_BotMD: '8000',
  SLT_Row2_TypeOption: 'Packer',
  SLT_Row2_TypeDisplay: 'Packer',
  SLT_Row2_OD: '6.625',
  SLT_Row2_Weight: '23.58',
  SLT_Row2_ExpectedID: '5.921',
  SLT_Row2_GradeOption: '',
  SLT_Row2_ExpectedGrade: 'Unspec',

  SLT_Row3_TopMD: '8000',
  SLT_Row3_BotMD: '12000',
  SLT_Row3_TypeOption: '',
  SLT_Row3_TypeDisplay: 'Tubing',
  SLT_Row3_OD: '5.5',
  SLT_Row3_Weight: '25.54',
  SLT_Row3_ExpectedID: '4.548',
  SLT_Row3_GradeOption: '',
  SLT_Row3_ExpectedGrade: 'Unspec',
};

/** Write SLT_* keys to Excel when missing (does not overwrite existing values). */
export function ensureSurfaceLineTubingExcelKeys(get: GetFn, set: SetFn): void {
  for (const [key, value] of Object.entries(SURFACE_LINE_TUBING_EXCEL_DEFAULTS)) {
    const existing = get(key, { fallback: '' }).trim();
    if (!existing) {
      set(key, value);
    }
  }
  // Row 2 must select Packer
  set('SLT_Row2_TypeOption', 'Packer');
  set('SLT_Row2_TypeDisplay', 'Packer');
}

export function formatSurfaceLineMdDisplay(value: string): string {
  const n = Number(String(value).replace(/,/g, ''));
  if (Number.isNaN(n)) return value;
  return n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function buildRow(get: GetFn, d: Record<string, string>, index: 1 | 2 | 3): SurfaceLineTubingRowData {
  const p = `SLT_Row${index}_`;
  return {
    topMd: get(`${p}TopMD`, { fallback: d[`${p}TopMD`] }).trim(),
    botMd: get(`${p}BotMD`, { fallback: d[`${p}BotMD`] }).trim(),
    typeOption: get(`${p}TypeOption`, { fallback: d[`${p}TypeOption`] }).trim(),
    typeDisplay: get(`${p}TypeDisplay`, { fallback: d[`${p}TypeDisplay`] }).trim(),
    od: get(`${p}OD`, { fallback: d[`${p}OD`] }).trim(),
    weight: get(`${p}Weight`, { fallback: d[`${p}Weight`] }).trim(),
    expectedId: get(`${p}ExpectedID`, { fallback: d[`${p}ExpectedID`] }).trim(),
    gradeOption: get(`${p}GradeOption`, { fallback: d[`${p}GradeOption`] }).trim(),
    expectedGrade: get(`${p}ExpectedGrade`, { fallback: d[`${p}ExpectedGrade`] }).trim(),
  };
}

export function buildSurfaceLineTubingTestData(get: GetFn): SurfaceLineTubingTestData {
  const d = SURFACE_LINE_TUBING_EXCEL_DEFAULTS;
  const rows = [buildRow(get, d, 1), buildRow(get, d, 2), buildRow(get, d, 3)];
  rows[1] = { ...rows[1], typeOption: 'Packer', typeDisplay: 'Packer' };
  rows[0] = { ...rows[0], gradeOption: '', expectedGrade: rows[0].expectedGrade || 'Unspec' };
  rows[2] = { ...rows[2], gradeOption: '', expectedGrade: rows[2].expectedGrade || 'Unspec' };

  return {
    rows,
    validationTopMd: get('SLT_ValidationTopMD', { fallback: d.SLT_ValidationTopMD }).trim(),
    validationBotMd: get('SLT_ValidationBotMD', { fallback: d.SLT_ValidationBotMD }).trim(),
    validationMessage: get('SLT_ValidationMessage', {
      fallback: d.SLT_ValidationMessage,
    }).trim(),
  };
}

export function buildSurfaceLineTubingFlowData(
  get: GetFn,
  sharedPadWell: { padName: string; wellName: string; companyButtonName: string },
): SurfaceLineTubingFlowData {
  return {
    ...buildSurfaceLineTubingTestData(get),
    padName: sharedPadWell.padName,
    wellName: sharedPadWell.wellName,
    companyButtonName: sharedPadWell.companyButtonName,
  };
}
