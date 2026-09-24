import type { KeyValueOptions } from './types';

export interface DrilledHoleRowData {
  topMd: string;
  botMd: string;
  /** Optional — when set, Bit Diam is edited; otherwise UI default is kept. */
  bitDiam?: string;
  /** Optional — when set, Effective Diam is edited; otherwise UI default is kept. */
  effectiveDiam?: string;
  /** Expected Hole Type cell text after Open Hole auto-fill (e.g. ▼Open Hole). */
  holeTypeDisplay: string;
}

export interface DrilledHoleTestData {
  rows: DrilledHoleRowData[];
  /** Top MD used to trigger validation while Bot MD is already set on row 1. */
  invalidTopMd: string;
  validationMessage: string;
  /** Default Bit / Effective Diam shown by UI when not overridden (display). */
  defaultDiamDisplay: string;
}

export interface DrilledHoleFlowData extends DrilledHoleTestData {
  padName: string;
  wellName: string;
  companyButtonName: string;
}

type GetFn = (key: string, options?: KeyValueOptions) => string;
type SetFn = (key: string, value: string) => void;

/** Defaults matching the staging Drilled Hole codegen flow — written when Excel keys are empty. */
export const DRILLED_HOLE_EXCEL_DEFAULTS: Record<string, string> = {
  DrilledHole_Row1_TopMD: '0',
  DrilledHole_Row1_BotMD: '4000',
  DrilledHole_Row1_BitDiam: '12',
  DrilledHole_Row1_EffectiveDiam: '12',
  DrilledHole_Row2_TopMD: '4000',
  DrilledHole_Row2_BotMD: '8000',
  DrilledHole_Row3_TopMD: '8000',
  DrilledHole_Row3_BotMD: '12000',
  DrilledHole_InvalidTopMD: '8000',
  DrilledHole_ValidationMessage: 'Top MD cannot be greater than Bottom MD!',
  DrilledHole_HoleTypeDisplay: '▼Open Hole',
  DrilledHole_DefaultDiamDisplay: '10.000',
};

/** Write Drilled Hole keys to Excel when missing (does not overwrite existing values). */
export function ensureDrilledHoleExcelKeys(get: GetFn, set: SetFn): void {
  for (const [key, value] of Object.entries(DRILLED_HOLE_EXCEL_DEFAULTS)) {
    const existing = get(key, { fallback: '' }).trim();
    if (!existing) {
      set(key, value);
    }
  }
}

/** Format MD for HandsOnTable display (e.g. 4000 → 4,000.0). */
export function formatDrilledHoleMdDisplay(value: string): string {
  const n = Number(String(value).replace(/,/g, ''));
  if (Number.isNaN(n)) return value;
  return n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Format diameter for HandsOnTable display (e.g. 12 → 12.000). */
export function formatDrilledHoleDiamDisplay(value: string): string {
  const n = Number(String(value).replace(/,/g, ''));
  if (Number.isNaN(n)) return value;
  return n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

export function buildDrilledHoleTestData(get: GetFn): DrilledHoleTestData {
  const d = DRILLED_HOLE_EXCEL_DEFAULTS;
  const holeTypeDisplay =
    get('DrilledHole_HoleTypeDisplay', { fallback: d.DrilledHole_HoleTypeDisplay }).trim() ||
    d.DrilledHole_HoleTypeDisplay;

  const row1Bit = get('DrilledHole_Row1_BitDiam', { fallback: d.DrilledHole_Row1_BitDiam }).trim();
  const row1Eff = get('DrilledHole_Row1_EffectiveDiam', {
    fallback: d.DrilledHole_Row1_EffectiveDiam,
  }).trim();

  return {
    rows: [
      {
        topMd: get('DrilledHole_Row1_TopMD', { fallback: d.DrilledHole_Row1_TopMD }).trim(),
        botMd: get('DrilledHole_Row1_BotMD', { fallback: d.DrilledHole_Row1_BotMD }).trim(),
        bitDiam: row1Bit || undefined,
        effectiveDiam: row1Eff || undefined,
        holeTypeDisplay,
      },
      {
        topMd: get('DrilledHole_Row2_TopMD', { fallback: d.DrilledHole_Row2_TopMD }).trim(),
        botMd: get('DrilledHole_Row2_BotMD', { fallback: d.DrilledHole_Row2_BotMD }).trim(),
        holeTypeDisplay,
      },
      {
        topMd: get('DrilledHole_Row3_TopMD', { fallback: d.DrilledHole_Row3_TopMD }).trim(),
        botMd: get('DrilledHole_Row3_BotMD', { fallback: d.DrilledHole_Row3_BotMD }).trim(),
        holeTypeDisplay,
      },
    ],
    invalidTopMd: get('DrilledHole_InvalidTopMD', { fallback: d.DrilledHole_InvalidTopMD }).trim(),
    validationMessage: get('DrilledHole_ValidationMessage', {
      fallback: d.DrilledHole_ValidationMessage,
    }).trim(),
    defaultDiamDisplay: get('DrilledHole_DefaultDiamDisplay', {
      fallback: d.DrilledHole_DefaultDiamDisplay,
    }).trim(),
  };
}

export function buildDrilledHoleFlowData(
  get: GetFn,
  sharedPadWell: { padName: string; wellName: string; companyButtonName: string },
): DrilledHoleFlowData {
  return {
    ...buildDrilledHoleTestData(get),
    padName: sharedPadWell.padName,
    wellName: sharedPadWell.wellName,
    companyButtonName: sharedPadWell.companyButtonName,
  };
}
