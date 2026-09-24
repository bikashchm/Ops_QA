import type { KeyValueOptions } from './types';

export interface PathSummaryTestData {
  injectionPathOption: string;
  expectedFracStringVolume: string;
  expectedTotalFracStringVolume: string;
  expectedFlushAboveTopPerf: string;
  expectedFlushVolume: string;
  expectedMdWellTransitTime: string;
}

export interface PathSummaryFlowData extends PathSummaryTestData {
  padName: string;
  wellName: string;
  companyButtonName: string;
}

type GetFn = (key: string, options?: KeyValueOptions) => string;
type SetFn = (key: string, value: string) => void;

/** Defaults matching staging Path Summary codegen — written when Excel keys are empty. */
export const PATH_SUMMARY_EXCEL_DEFAULTS: Record<string, string> = {
  PathSummary_InjectionPathOption: 'Tubing and Annulus',
  PathSummary_FracStringVolume: '0.0',
  PathSummary_TotalFracStringVolume: '0.0',
  PathSummary_FlushAboveTopPerf: '0.0',
  PathSummary_FlushVolume: '0.0',
  PathSummary_MDWellTransitTime: '10,001.0',
};

export function ensurePathSummaryExcelKeys(get: GetFn, set: SetFn): void {
  for (const [key, value] of Object.entries(PATH_SUMMARY_EXCEL_DEFAULTS)) {
    const existing = get(key, { fallback: '' }).trim();
    if (!existing) {
      set(key, value);
    }
  }
}

export function buildPathSummaryTestData(get: GetFn): PathSummaryTestData {
  const d = PATH_SUMMARY_EXCEL_DEFAULTS;
  return {
    injectionPathOption: get('PathSummary_InjectionPathOption', {
      fallback: d.PathSummary_InjectionPathOption,
    }).trim(),
    expectedFracStringVolume: get('PathSummary_FracStringVolume', {
      fallback: d.PathSummary_FracStringVolume,
    }).trim(),
    expectedTotalFracStringVolume: get('PathSummary_TotalFracStringVolume', {
      fallback: d.PathSummary_TotalFracStringVolume,
    }).trim(),
    expectedFlushAboveTopPerf: get('PathSummary_FlushAboveTopPerf', {
      fallback: d.PathSummary_FlushAboveTopPerf,
    }).trim(),
    expectedFlushVolume: get('PathSummary_FlushVolume', {
      fallback: d.PathSummary_FlushVolume,
    }).trim(),
    expectedMdWellTransitTime: get('PathSummary_MDWellTransitTime', {
      fallback: d.PathSummary_MDWellTransitTime,
    }).trim(),
  };
}

export function buildPathSummaryFlowData(
  get: GetFn,
  sharedPadWell: { padName: string; wellName: string; companyButtonName: string },
): PathSummaryFlowData {
  return {
    ...buildPathSummaryTestData(get),
    padName: sharedPadWell.padName,
    wellName: sharedPadWell.wellName,
    companyButtonName: sharedPadWell.companyButtonName,
  };
}
