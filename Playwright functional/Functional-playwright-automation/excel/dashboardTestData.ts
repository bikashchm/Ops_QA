/**
 * Dashboard → + New Dashboad — Excel keys written when missing (codegen names).
 * User-defined / pad plots come from PlotBaseline* Excel keys (written by Plot.spec).
 */

import type { PlotBaselineData } from './plotTestData';

export interface DashboardTestData {
  /** First saved dashboard name (codegen: D1). */
  saveName: string;
  /** Name after rename (codegen: Dashboard1). */
  renameName: string;
  /** Temporary dashboard created then deleted (codegen: D2). */
  deleteName: string;
  /** Required plot checkboxes — checked when visible and enabled. */
  requiredPlots: readonly string[];
  /** Optional plot checkboxes — checked only when visible and enabled. */
  optionalPlots: readonly string[];
}

export interface DashboardFlowData extends DashboardTestData {
  padName: string;
  wellName: string;
  companyButtonName: string;
}

export const DASHBOARD_EXCEL_DEFAULTS: Record<string, string> = {
  Dashboard_SaveName: 'D1',
  Dashboard_RenameName: 'Dashboard1',
  Dashboard_DeleteName: 'D2',
  // Excel PlotBaseline* names are merged in at runtime (after Surf PRC / Btm PRC).
  Dashboard_RequiredPlots: 'Surf PRC;Btm PRC;Summary;Schematic',
  Dashboard_OptionalPlots: 'Chemicals',
};

type GetValue = (key: string, options?: { fallback?: string; required?: boolean }) => string;
type SetValue = (key: string, value: string) => void;

function splitList(raw: string): string[] {
  return raw
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Write Dashboard_* keys when missing.
 * Always refresh plot lists so required/optional stay aligned with staging UI.
 */
export function ensureDashboardExcelKeys(get: GetValue, set: SetValue): void {
  for (const [key, value] of Object.entries(DASHBOARD_EXCEL_DEFAULTS)) {
    const existing = get(key, { fallback: '' }).trim();
    const forceRefresh =
      key === 'Dashboard_RequiredPlots' || key === 'Dashboard_OptionalPlots';
    if (!existing || forceRefresh) {
      set(key, value);
    }
  }
}

export function buildDashboardTestData(get: GetValue): DashboardTestData {
  const d = DASHBOARD_EXCEL_DEFAULTS;
  const g = (key: string) => get(key, { fallback: d[key] }).trim() || d[key];

  return {
    saveName: g('Dashboard_SaveName'),
    renameName: g('Dashboard_RenameName'),
    deleteName: g('Dashboard_DeleteName'),
    requiredPlots: splitList(g('Dashboard_RequiredPlots')),
    optionalPlots: splitList(g('Dashboard_OptionalPlots')),
  };
}

function uniqueKeepOrder(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const key = name.trim();
    if (!key) continue;
    const id = key.toLowerCase();
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(key);
  }
  return out;
}

export function buildDashboardFlowData(
  get: GetValue,
  sharedPadWell: { padName: string; wellName: string; companyButtonName: string },
  plotBaseline?: PlotBaselineData,
): DashboardFlowData {
  const data = buildDashboardTestData(get);
  const excelPlots = [plotBaseline?.userDefinedName, plotBaseline?.padPlotName]
    .map((name) => name?.trim() || '')
    .filter(Boolean);

  return {
    ...data,
    requiredPlots: uniqueKeepOrder([
      'Surf PRC',
      'Btm PRC',
      ...excelPlots,
      ...data.requiredPlots,
    ]),
    optionalPlots: uniqueKeepOrder(
      data.optionalPlots.filter((name) => {
        const n = name.toLowerCase();
        return !excelPlots.some(
          (plot) => plot.toLowerCase() === n || plot.toLowerCase().startsWith(`${n} `),
        );
      }),
    ),
    padName: sharedPadWell.padName,
    wellName: sharedPadWell.wellName,
    companyButtonName: sharedPadWell.companyButtonName,
  };
}
