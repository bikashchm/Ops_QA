import type { KeyValueOptions } from './types';

export interface CasingRowData {
  topMd: string;
  botMd: string;
  /** OD dropdown option (e.g. 11.75). */
  od: string;
  /** Weight dropdown option (e.g. 36.69). */
  weight: string;
  /** Expected ID after OD/Weight selection (display). */
  expectedId: string;
  /** Grade dropdown option label to click (e.g. H-). Empty = leave default. */
  gradeOption: string;
  /** Expected Grade cell text after save (e.g. H-40 or Unspec). */
  expectedGrade: string;
  /** Expected casing-type display (assert only — dropdown is not clicked). */
  casingTypeDisplay: string;
}

export interface CasingTestData {
  rows: CasingRowData[];
  /** Intermediate Top/Bot used before validation (codegen: 8000 / 12000). */
  validationTopMd: string;
  validationBotMd: string;
  invalidTopMd: string;
  validationMessage: string;
}

export interface CasingFlowData extends CasingTestData {
  padName: string;
  wellName: string;
  companyButtonName: string;
}

type GetFn = (key: string, options?: KeyValueOptions) => string;
type SetFn = (key: string, value: string) => void;

/** Defaults matching the staging Casing codegen flow — written when Excel keys are empty. */
export const CASING_EXCEL_DEFAULTS: Record<string, string> = {
  Casing_ValidationTopMD: '8000',
  Casing_ValidationBotMD: '12000',
  Casing_InvalidTopMD: '14000',
  Casing_ValidationMessage: 'Top MD cannot be greater than Bottom MD!',
  Casing_CasingTypeDisplay: 'Cemented Casing',

  Casing_Row1_TopMD: '0',
  Casing_Row1_BotMD: '4000',
  Casing_Row1_OD: '11.75',
  Casing_Row1_Weight: '36.69',
  Casing_Row1_ExpectedID: '11.150',
  Casing_Row1_GradeOption: '',
  Casing_Row1_ExpectedGrade: 'Unspec',

  Casing_Row2_TopMD: '4000',
  Casing_Row2_BotMD: '8000',
  Casing_Row2_OD: '8.125',
  Casing_Row2_Weight: '26.67',
  Casing_Row2_ExpectedID: '7.485',
  Casing_Row2_GradeOption: 'H-',
  Casing_Row2_ExpectedGrade: 'H-40',

  Casing_Row3_TopMD: '8000',
  Casing_Row3_BotMD: '12000',
  Casing_Row3_OD: '7',
  Casing_Row3_Weight: '13',
  Casing_Row3_ExpectedID: '6.652',
  Casing_Row3_GradeOption: '',
  Casing_Row3_ExpectedGrade: 'Unspec',
};

/** Write Casing keys to Excel when missing (does not overwrite existing values). */
export function ensureCasingExcelKeys(get: GetFn, set: SetFn): void {
  for (const [key, value] of Object.entries(CASING_EXCEL_DEFAULTS)) {
    const existing = get(key, { fallback: '' }).trim();
    if (!existing) {
      set(key, value);
    }
  }
  // Row 3 Grade stays Unspec (do not select dropdown; overwrite stale H-40 expectation)
  set('Casing_Row3_GradeOption', '');
  set('Casing_Row3_ExpectedGrade', 'Unspec');
}

/** Format MD for HandsOnTable display (e.g. 4000 → 4,000.0). */
export function formatCasingMdDisplay(value: string): string {
  const n = Number(String(value).replace(/,/g, ''));
  if (Number.isNaN(n)) return value;
  return n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function buildRow(get: GetFn, d: Record<string, string>, index: 1 | 2 | 3): CasingRowData {
  const p = `Casing_Row${index}_`;
  return {
    topMd: get(`${p}TopMD`, { fallback: d[`${p}TopMD`] }).trim(),
    botMd: get(`${p}BotMD`, { fallback: d[`${p}BotMD`] }).trim(),
    od: get(`${p}OD`, { fallback: d[`${p}OD`] }).trim(),
    weight: get(`${p}Weight`, { fallback: d[`${p}Weight`] }).trim(),
    expectedId: get(`${p}ExpectedID`, { fallback: d[`${p}ExpectedID`] }).trim(),
    gradeOption: get(`${p}GradeOption`, { fallback: d[`${p}GradeOption`] }).trim(),
    expectedGrade: get(`${p}ExpectedGrade`, { fallback: d[`${p}ExpectedGrade`] }).trim(),
    casingTypeDisplay: get('Casing_CasingTypeDisplay', {
      fallback: d.Casing_CasingTypeDisplay,
    }).trim(),
  };
}

export function buildCasingTestData(get: GetFn): CasingTestData {
  const d = CASING_EXCEL_DEFAULTS;
  const rows = [buildRow(get, d, 1), buildRow(get, d, 2), buildRow(get, d, 3)];
  // Row 3 Grade must stay Unspec (staging does not auto-set H-40 for OD 7 / Weight 13)
  rows[2] = { ...rows[2], gradeOption: '', expectedGrade: 'Unspec' };

  return {
    rows,
    validationTopMd: get('Casing_ValidationTopMD', { fallback: d.Casing_ValidationTopMD }).trim(),
    validationBotMd: get('Casing_ValidationBotMD', { fallback: d.Casing_ValidationBotMD }).trim(),
    invalidTopMd: get('Casing_InvalidTopMD', { fallback: d.Casing_InvalidTopMD }).trim(),
    validationMessage: get('Casing_ValidationMessage', {
      fallback: d.Casing_ValidationMessage,
    }).trim(),
  };
}

export function buildCasingFlowData(
  get: GetFn,
  sharedPadWell: { padName: string; wellName: string; companyButtonName: string },
): CasingFlowData {
  return {
    ...buildCasingTestData(get),
    padName: sharedPadWell.padName,
    wellName: sharedPadWell.wellName,
    companyButtonName: sharedPadWell.companyButtonName,
  };
}
