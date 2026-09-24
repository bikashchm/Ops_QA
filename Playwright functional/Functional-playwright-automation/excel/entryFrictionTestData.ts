/**
 * Analysis → Entry Friction — Excel keys written when missing (codegen values).
 */

export interface EntryFrictionCramerParams {
  initialDischargeCoefficient: string;
  finalDischargeCoefficient: string;
  proppantVolumeFinalDischarge: string;
  proppantVolumePerfDiameterStart: string;
  perforationDiameterChange: string;
  perfFrictionUnaffectedBelow: string;
}

export interface EntryFrictionTestData {
  fluidName: string;
  clusterCountDefault: string;
  clusterCountTemp: string;
  perforationTexts: readonly string[];
  cellRateBpm: string;
  cellDischarge: string;
  cramer: EntryFrictionCramerParams;
}

export interface EntryFrictionFlowData extends EntryFrictionTestData {
  padName: string;
  wellName: string;
  companyButtonName: string;
}

/** Synced from pad7652 stage run (Entry Friction shows empty perf MD until analysis data exists). */
export const ENTRY_FRICTION_EXCEL_DEFAULTS: Record<string, string> = {
  EntryFriction_FluidName: 'Binary 30 65',
  EntryFriction_ClusterCountDefault: '1',
  EntryFriction_ClusterCountTemp: '10',
  EntryFriction_PerfTexts: '0.00;-',
  EntryFriction_CellRateBpm: '0.00',
  EntryFriction_CellDischarge: '0.00',
  EntryFriction_Cramer_InitialDischarge: '0.65',
  EntryFriction_Cramer_FinalDischarge: '0.90',
  EntryFriction_Cramer_ProppantVolFinal: '7000',
  EntryFriction_Cramer_ProppantVolPerfStart: '9000',
  EntryFriction_Cramer_PerfDiameterChange: '0.0043',
  EntryFriction_Cramer_PerfFrictionUnaffected: '0.008',
};

type GetValue = (key: string, options?: { fallback?: string; required?: boolean }) => string;
type SetValue = (key: string, value: string) => void;

/** Sync EntryFriction_* keys to recording defaults when missing or stale. */
export function ensureEntryFrictionExcelKeys(get: GetValue, set: SetValue): void {
  for (const [key, value] of Object.entries(ENTRY_FRICTION_EXCEL_DEFAULTS)) {
    const existing = get(key, { fallback: '' }).trim();
    if (existing !== value) {
      set(key, value);
    }
  }
}

export function buildEntryFrictionTestData(get: GetValue): EntryFrictionTestData {
  const d = ENTRY_FRICTION_EXCEL_DEFAULTS;
  const g = (key: string) => get(key, { fallback: d[key] }).trim() || d[key];

  return {
    fluidName: g('EntryFriction_FluidName'),
    clusterCountDefault: g('EntryFriction_ClusterCountDefault'),
    clusterCountTemp: g('EntryFriction_ClusterCountTemp'),
    perforationTexts: g('EntryFriction_PerfTexts')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean),
    cellRateBpm: g('EntryFriction_CellRateBpm'),
    cellDischarge: g('EntryFriction_CellDischarge'),
    cramer: {
      initialDischargeCoefficient: g('EntryFriction_Cramer_InitialDischarge'),
      finalDischargeCoefficient: g('EntryFriction_Cramer_FinalDischarge'),
      proppantVolumeFinalDischarge: g('EntryFriction_Cramer_ProppantVolFinal'),
      proppantVolumePerfDiameterStart: g('EntryFriction_Cramer_ProppantVolPerfStart'),
      perforationDiameterChange: g('EntryFriction_Cramer_PerfDiameterChange'),
      perfFrictionUnaffectedBelow: g('EntryFriction_Cramer_PerfFrictionUnaffected'),
    },
  };
}

export function buildEntryFrictionFlowData(
  get: GetValue,
  sharedPadWell: { padName: string; wellName: string; companyButtonName: string },
): EntryFrictionFlowData {
  return {
    ...buildEntryFrictionTestData(get),
    padName: sharedPadWell.padName,
    wellName: sharedPadWell.wellName,
    companyButtonName: sharedPadWell.companyButtonName,
  };
}
