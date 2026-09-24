import type { KeyValueOptions } from './types';

export interface PlotPadWellData {
  padName: string;
  wellName: string;
  companyButtonName: string;
}

export interface PlotDirectNavData {
  /** treatmentId for Measured Data / Schematic direct URL navigation.
   *  wellId is extracted at runtime from the current page URL — no Excel key needed.
   */
  treatmentId: string;
}

/** Permanent baseline plot names from Excel (never deleted by the Plot suite). */
export interface PlotBaselineData {
  userDefinedName: string;
  padPlotName: string;
}

export const PLOT_BASELINE_USER_DEFINED = 'Test UserDefine Plot 1';
export const PLOT_BASELINE_PAD_PLOT = 'Test Pad Plot 1';
export const PLOT_BASELINE_USER_DEFINED_KEY = 'PlotBaselineUserDefinedName';
export const PLOT_BASELINE_PAD_PLOT_KEY = 'PlotBaselinePadPlotName';

type GetFn = (key: string, options?: KeyValueOptions) => string;
type SetFn = (key: string, value: string) => void;

/**
 * Plot pad/well navigation — always shared Excel Padname / WellName
 * (same as WellAndTreatment / createwellandpad). Do not use PlotPadname/PlotWellName for search.
 */
export function buildPlotPadWellData(get: GetFn): PlotPadWellData {
  return {
    padName: get('Padname', { fallback: '' }).trim(),
    wellName: get('WellName', { fallback: '' }).trim(),
    companyButtonName: get('CompanyButtonName', { fallback: 'Liveplus playwright' }),
  };
}

/**
 * Direct-URL navigation data for Measured Data and Schematic plot validation.
 * Only reads PlotTreatmentId — wellId comes from the live page URL at runtime.
 */
export function buildPlotDirectNavData(get: GetFn): PlotDirectNavData {
  return {
    treatmentId: get('PlotTreatmentId', { fallback: '' }).trim(),
  };
}

/** Write baseline plot name keys when missing. Does not overwrite existing values. */
export function ensurePlotBaselineExcelKeys(get: GetFn, set: SetFn): void {
  const defaults: Record<string, string> = {
    [PLOT_BASELINE_USER_DEFINED_KEY]: PLOT_BASELINE_USER_DEFINED,
    [PLOT_BASELINE_PAD_PLOT_KEY]: PLOT_BASELINE_PAD_PLOT,
  };
  for (const [key, value] of Object.entries(defaults)) {
    const existing = get(key, { fallback: '' }).trim();
    if (!existing) {
      set(key, value);
    }
  }
}

export function buildPlotBaselineData(get: GetFn): PlotBaselineData {
  return {
    userDefinedName:
      get(PLOT_BASELINE_USER_DEFINED_KEY, { fallback: PLOT_BASELINE_USER_DEFINED }).trim() ||
      PLOT_BASELINE_USER_DEFINED,
    padPlotName:
      get(PLOT_BASELINE_PAD_PLOT_KEY, { fallback: PLOT_BASELINE_PAD_PLOT }).trim() ||
      PLOT_BASELINE_PAD_PLOT,
  };
}
