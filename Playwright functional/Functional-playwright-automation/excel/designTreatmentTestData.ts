export interface DesignTreatmentRowData {
  stepType: string;
  flowRate: string;
  flowRateDisplay: string;
  propConc: string;
  propConcDisplay: string;
  cleanVol: string;
  cleanVolDisplay: string;
  fluidType: string;
  proppantType: string;
  expectedMetric: string;
  expectedStepProp: string;
  expectedTime: string;
  expectedSlurryVol: string;
  expectedCleanCum?: string;
  expectedPropCum?: string;
  expectedFoam?: string;
  expectedTotalSlurry?: string;
}

export interface DesignTreatmentTotals {
  totalTime: string;
  totalCleanVol: string;
  totalProp: string;
}

export interface DesignTreatmentTestData {
  row1: DesignTreatmentRowData;
  row2: DesignTreatmentRowData;
  totals: DesignTreatmentTotals;
  propModeStaged: string;
  propModeRamped: string;
}

export interface DesignTreatmentFlowData extends DesignTreatmentTestData {
  padName: string;
  wellName: string;
  companyButtonName: string;
}

/**
 * Recording values for Design Treatment Schedule.
 * Written to Excel when missing; updated when existing value differs.
 */
export const DESIGN_TREATMENT_EXCEL_DEFAULTS: Record<string, string> = {
  DesignTreatment_Row1_StepType: 'Water injection',
  DesignTreatment_Row1_FlowRate: '1000',
  DesignTreatment_Row1_FlowRateDisplay: '1,000.00',
  DesignTreatment_Row1_PropConc: '2000',
  DesignTreatment_Row1_PropConcDisplay: '2,000.00',
  DesignTreatment_Row1_CleanVol: '10000',
  DesignTreatment_Row1_CleanVolDisplay: '10,000',
  DesignTreatment_Row1_FluidType: 'Binary 30 65',
  DesignTreatment_Row1_ProppantType: '100 mesh',
  // Step Length / totals — UAT pad5351 screenshot (100 mesh)
  DesignTreatment_Row1_ExpectedMetric: '25.16',
  DesignTreatment_Row1_ExpectedStepProp: '20,000,000.00',
  DesignTreatment_Row1_ExpectedTime: '25:09',
  DesignTreatment_Row1_ExpectedSlurryVol: '1,056,519.07',
  DesignTreatment_Row1_ExpectedCleanCum: '10,000.00',
  DesignTreatment_Row1_ExpectedPropCum: '20,000.00',
  DesignTreatment_Row1_ExpectedFoam: '9.47',
  DesignTreatment_Row1_ExpectedTotalSlurry: '1,056,519.07',

  DesignTreatment_Row2_StepType: 'Main frac pad',
  DesignTreatment_Row2_FlowRate: '300',
  DesignTreatment_Row2_FlowRateDisplay: '300.00',
  DesignTreatment_Row2_PropConc: '400',
  DesignTreatment_Row2_PropConcDisplay: '400.00',
  DesignTreatment_Row2_CleanVol: '20000',
  DesignTreatment_Row2_CleanVolDisplay: '20,000',
  DesignTreatment_Row2_FluidType: 'Binary 30 65',
  DesignTreatment_Row2_ProppantType: '100 mesh',
  DesignTreatment_Row2_ExpectedMetric: '34.81',
  DesignTreatment_Row2_ExpectedStepProp: '8,000,000.00',
  DesignTreatment_Row2_ExpectedTime: '59:58',
  DesignTreatment_Row2_ExpectedSlurryVol: '438,607.63',
  DesignTreatment_Row2_ExpectedCleanCum: '30,000.00',
  DesignTreatment_Row2_ExpectedPropCum: '28,000.00',
  DesignTreatment_Row2_ExpectedFoam: '13.68',
  DesignTreatment_Row2_ExpectedTotalSlurry: '1,495,126.70',

  DesignTreatment_TotalTime: '59.97',
  DesignTreatment_TotalCleanVol: '30,000',
  DesignTreatment_TotalProp: '28,000,000.00',
  DesignTreatment_PropMode_Staged: 'Staged',
  DesignTreatment_PropMode_Ramped: 'Ramped',
};

type GetValue = (key: string, options?: { fallback?: string; required?: boolean }) => string;
type SetValue = (key: string, value: string) => void;

/** Add missing DesignTreatment_* keys; update when value differs from recording defaults. */
export function ensureDesignTreatmentExcelKeys(get: GetValue, set: SetValue): void {
  for (const [key, value] of Object.entries(DESIGN_TREATMENT_EXCEL_DEFAULTS)) {
    const existing = get(key, { fallback: '' }).trim();
    if (existing !== value) {
      set(key, value);
    }
  }
}

function rowFromExcel(get: GetValue, prefix: 'Row1' | 'Row2'): DesignTreatmentRowData {
  const d = DESIGN_TREATMENT_EXCEL_DEFAULTS;
  const p = `DesignTreatment_${prefix}_`;
  return {
    stepType: get(`${p}StepType`, { fallback: d[`${p}StepType`] }),
    flowRate: get(`${p}FlowRate`, { fallback: d[`${p}FlowRate`] }),
    flowRateDisplay: get(`${p}FlowRateDisplay`, { fallback: d[`${p}FlowRateDisplay`] }),
    propConc: get(`${p}PropConc`, { fallback: d[`${p}PropConc`] }),
    propConcDisplay: get(`${p}PropConcDisplay`, { fallback: d[`${p}PropConcDisplay`] }),
    cleanVol: get(`${p}CleanVol`, { fallback: d[`${p}CleanVol`] }),
    cleanVolDisplay: get(`${p}CleanVolDisplay`, { fallback: d[`${p}CleanVolDisplay`] }),
    fluidType: get(`${p}FluidType`, { fallback: d[`${p}FluidType`] }),
    proppantType: get(`${p}ProppantType`, { fallback: d[`${p}ProppantType`] }),
    expectedMetric: get(`${p}ExpectedMetric`, { fallback: d[`${p}ExpectedMetric`] }),
    expectedStepProp: get(`${p}ExpectedStepProp`, { fallback: d[`${p}ExpectedStepProp`] }),
    expectedTime: get(`${p}ExpectedTime`, { fallback: d[`${p}ExpectedTime`] }),
    expectedSlurryVol: get(`${p}ExpectedSlurryVol`, { fallback: d[`${p}ExpectedSlurryVol`] }),
    expectedCleanCum: get(`${p}ExpectedCleanCum`, { fallback: d[`${p}ExpectedCleanCum`] }),
    expectedPropCum: get(`${p}ExpectedPropCum`, { fallback: d[`${p}ExpectedPropCum`] }),
    expectedFoam: get(`${p}ExpectedFoam`, { fallback: d[`${p}ExpectedFoam`] }),
    expectedTotalSlurry: get(`${p}ExpectedTotalSlurry`, { fallback: d[`${p}ExpectedTotalSlurry`] }),
  };
}

export function buildDesignTreatmentTestData(get: GetValue): DesignTreatmentTestData {
  const d = DESIGN_TREATMENT_EXCEL_DEFAULTS;
  return {
    row1: rowFromExcel(get, 'Row1'),
    row2: rowFromExcel(get, 'Row2'),
    totals: {
      totalTime: get('DesignTreatment_TotalTime', { fallback: d.DesignTreatment_TotalTime }),
      totalCleanVol: get('DesignTreatment_TotalCleanVol', {
        fallback: d.DesignTreatment_TotalCleanVol,
      }),
      totalProp: get('DesignTreatment_TotalProp', { fallback: d.DesignTreatment_TotalProp }),
    },
    propModeStaged: get('DesignTreatment_PropMode_Staged', {
      fallback: d.DesignTreatment_PropMode_Staged,
    }),
    propModeRamped: get('DesignTreatment_PropMode_Ramped', {
      fallback: d.DesignTreatment_PropMode_Ramped,
    }),
  };
}

export function buildDesignTreatmentFlowData(get: GetValue): DesignTreatmentFlowData {
  return {
    ...buildDesignTreatmentTestData(get),
    padName: get('Padname', { required: true }),
    wellName: get('WellName', { required: true }),
    companyButtonName: get('CompanyButtonName', { fallback: 'Liveplus playwright' }),
  };
}
