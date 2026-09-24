export interface TreatmentTotalsTestData {
  specField1: string;
  specField2: string;
  specField3: string;
  specField4: string;
  fluidName: string;
  proppantName: string;
}

export interface TreatmentTotalsFlowData extends TreatmentTotalsTestData {
  padName: string;
  wellName: string;
  companyButtonName: string;
}

/** Recording defaults for Treatment Totals tab assertions (UAT pad5351 + 100 mesh). */
export const TREATMENT_TOTALS_EXCEL_DEFAULTS: Record<string, string> = {
  TreatmentTotals_SpecField1: '50',
  TreatmentTotals_SpecField2: '10,443.0',
  TreatmentTotals_SpecField3: '476.1',
  TreatmentTotals_SpecField4: '10,443.0',
  TreatmentTotals_FluidName: 'Binary 30 65',
  TreatmentTotals_ProppantName: '100 mesh',
};

type GetValue = (key: string, options?: { fallback?: string; required?: boolean }) => string;
type SetValue = (key: string, value: string) => void;

export function ensureTreatmentTotalsExcelKeys(get: GetValue, set: SetValue): void {
  for (const [key, value] of Object.entries(TREATMENT_TOTALS_EXCEL_DEFAULTS)) {
    const existing = get(key, { fallback: '' }).trim();
    if (existing !== value) {
      set(key, value);
    }
  }
}

export function buildTreatmentTotalsTestData(get: GetValue): TreatmentTotalsTestData {
  const d = TREATMENT_TOTALS_EXCEL_DEFAULTS;
  return {
    specField1: get('TreatmentTotals_SpecField1', { fallback: d.TreatmentTotals_SpecField1 }),
    specField2: get('TreatmentTotals_SpecField2', { fallback: d.TreatmentTotals_SpecField2 }),
    specField3: get('TreatmentTotals_SpecField3', { fallback: d.TreatmentTotals_SpecField3 }),
    specField4: get('TreatmentTotals_SpecField4', { fallback: d.TreatmentTotals_SpecField4 }),
    fluidName: get('TreatmentTotals_FluidName', { fallback: d.TreatmentTotals_FluidName }),
    proppantName: get('TreatmentTotals_ProppantName', { fallback: d.TreatmentTotals_ProppantName }),
  };
}

export function buildTreatmentTotalsFlowData(get: GetValue): TreatmentTotalsFlowData {
  return {
    ...buildTreatmentTotalsTestData(get),
    padName: get('Padname', { required: true }),
    wellName: get('WellName', { required: true }),
    companyButtonName: get('CompanyButtonName', { fallback: 'Liveplus playwright' }),
  };
}
