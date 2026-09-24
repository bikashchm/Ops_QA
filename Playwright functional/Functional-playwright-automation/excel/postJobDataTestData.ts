/**
 * Results → Report → Post Job Data — Excel keys written when missing.
 */

export interface PostJobDataDefaults {
  kickoffTvd: string;
  plugDepth: string;
  producedWater: string;
  designAvgTreatingPressure: string;
  designAvgFracGradient: string;
  chargeWeight: string;
  operatorsMaxPressure: string;
  pumpdownVolume: string;
  pumpdownMaxPressure: string;
  pumpdownMaxRate: string;
  fieldGas: string;
  cng: string;
  diesel: string;
  chlorides: string;
  overrideSurfaceMaxPressure: string;
  padStageCompleted: string;
  padStageTotal: string;
}

export interface PostJobDataFillValues {
  kickoffTvd: string;
  plugDepth: string;
  producedWater: string;
  producedWaterDisplay: string;
  designAvgTreatingPressure: string;
  designAvgFracGradient: string;
  designAvgFracGradientDisplay: string;
  chargeWeight: string;
  chargeWeightDisplay: string;
  plugType: string;
  operatorsMaxPressure: string;
  pumpdownVolume: string;
  pumpdownVolumeDisplay: string;
  pumpdownMaxPressure: string;
  pumpdownMaxRate: string;
  fieldGas: string;
  cng: string;
  diesel: string;
  chlorides: string;
  overrideSurfaceMaxPressure: string;
  padStageCompleted: string;
  padStageTotal: string;
  /** Calculated Sub % after Save (codegen). */
  subPercentAfterSave: string;
}

export interface PostJobDataTestData {
  defaults: PostJobDataDefaults;
  fill: PostJobDataFillValues;
  clearSampleValue: string;
}

export interface PostJobDataFlowData extends PostJobDataTestData {
  padName: string;
  wellName: string;
  companyButtonName: string;
}

export const POST_JOB_DATA_EXCEL_DEFAULTS: Record<string, string> = {
  PostJobData_Default_KickoffTvd: '0',
  PostJobData_Default_PlugDepth: '0',
  PostJobData_Default_ProducedWater: '0.0',
  PostJobData_Default_DesignAvgTreatingPressure: '0',
  PostJobData_Default_DesignAvgFracGradient: '0.000',
  PostJobData_Default_ChargeWeight: '0.000',
  PostJobData_Default_OperatorsMaxPressure: '0',
  PostJobData_Default_PumpdownVolume: '0.0',
  PostJobData_Default_PumpdownMaxPressure: '0',
  PostJobData_Default_PumpdownMaxRate: '0',
  PostJobData_Default_FieldGas: '0',
  PostJobData_Default_Cng: '0',
  PostJobData_Default_Diesel: '0',
  PostJobData_Default_Chlorides: '0',
  PostJobData_Default_OverrideSurfaceMaxPressure: '0',
  PostJobData_Default_PadStageCompleted: '0',
  PostJobData_Default_PadStageTotal: '0',

  PostJobData_Fill_KickoffTvd: '100',
  PostJobData_Fill_PlugDepth: '100',
  PostJobData_Fill_ProducedWater: '100',
  PostJobData_Fill_ProducedWaterDisplay: '100.0',
  PostJobData_Fill_DesignAvgTreatingPressure: '100',
  PostJobData_Fill_DesignAvgFracGradient: '100',
  PostJobData_Fill_DesignAvgFracGradientDisplay: '100.000',
  PostJobData_Fill_ChargeWeight: '100',
  PostJobData_Fill_ChargeWeightDisplay: '100.000',
  PostJobData_Fill_PlugType: 'Plug1',
  PostJobData_Fill_OperatorsMaxPressure: '200',
  PostJobData_Fill_PumpdownVolume: '200',
  PostJobData_Fill_PumpdownVolumeDisplay: '200.0',
  PostJobData_Fill_PumpdownMaxPressure: '300',
  PostJobData_Fill_PumpdownMaxRate: '300',
  PostJobData_Fill_FieldGas: '400',
  PostJobData_Fill_Cng: '500',
  PostJobData_Fill_Diesel: '600',
  PostJobData_Fill_Chlorides: '800',
  PostJobData_Fill_OverrideSurfaceMaxPressure: '900',
  PostJobData_Fill_PadStageCompleted: '1',
  PostJobData_Fill_PadStageTotal: '1',
  PostJobData_Fill_SubPercentAfterSave: '82',
  PostJobData_ClearSampleValue: '100',
};

type GetValue = (key: string, options?: { fallback?: string; required?: boolean }) => string;
type SetValue = (key: string, value: string) => void;

/** Write PostJobData_* keys only when missing/empty. */
export function ensurePostJobDataExcelKeys(get: GetValue, set: SetValue): void {
  for (const [key, value] of Object.entries(POST_JOB_DATA_EXCEL_DEFAULTS)) {
    const existing = get(key, { fallback: '' }).trim();
    if (!existing) {
      set(key, value);
    }
  }
}

export function buildPostJobDataTestData(get: GetValue): PostJobDataTestData {
  const d = POST_JOB_DATA_EXCEL_DEFAULTS;
  const g = (key: string) => get(key, { fallback: d[key] });

  return {
    defaults: {
      kickoffTvd: g('PostJobData_Default_KickoffTvd'),
      plugDepth: g('PostJobData_Default_PlugDepth'),
      producedWater: g('PostJobData_Default_ProducedWater'),
      designAvgTreatingPressure: g('PostJobData_Default_DesignAvgTreatingPressure'),
      designAvgFracGradient: g('PostJobData_Default_DesignAvgFracGradient'),
      chargeWeight: g('PostJobData_Default_ChargeWeight'),
      operatorsMaxPressure: g('PostJobData_Default_OperatorsMaxPressure'),
      pumpdownVolume: g('PostJobData_Default_PumpdownVolume'),
      pumpdownMaxPressure: g('PostJobData_Default_PumpdownMaxPressure'),
      pumpdownMaxRate: g('PostJobData_Default_PumpdownMaxRate'),
      fieldGas: g('PostJobData_Default_FieldGas'),
      cng: g('PostJobData_Default_Cng'),
      diesel: g('PostJobData_Default_Diesel'),
      chlorides: g('PostJobData_Default_Chlorides'),
      overrideSurfaceMaxPressure: g('PostJobData_Default_OverrideSurfaceMaxPressure'),
      padStageCompleted: g('PostJobData_Default_PadStageCompleted'),
      padStageTotal: g('PostJobData_Default_PadStageTotal'),
    },
    fill: {
      kickoffTvd: g('PostJobData_Fill_KickoffTvd'),
      plugDepth: g('PostJobData_Fill_PlugDepth'),
      producedWater: g('PostJobData_Fill_ProducedWater'),
      producedWaterDisplay: g('PostJobData_Fill_ProducedWaterDisplay'),
      designAvgTreatingPressure: g('PostJobData_Fill_DesignAvgTreatingPressure'),
      designAvgFracGradient: g('PostJobData_Fill_DesignAvgFracGradient'),
      designAvgFracGradientDisplay: g('PostJobData_Fill_DesignAvgFracGradientDisplay'),
      chargeWeight: g('PostJobData_Fill_ChargeWeight'),
      chargeWeightDisplay: g('PostJobData_Fill_ChargeWeightDisplay'),
      plugType: g('PostJobData_Fill_PlugType'),
      operatorsMaxPressure: g('PostJobData_Fill_OperatorsMaxPressure'),
      pumpdownVolume: g('PostJobData_Fill_PumpdownVolume'),
      pumpdownVolumeDisplay: g('PostJobData_Fill_PumpdownVolumeDisplay'),
      pumpdownMaxPressure: g('PostJobData_Fill_PumpdownMaxPressure'),
      pumpdownMaxRate: g('PostJobData_Fill_PumpdownMaxRate'),
      fieldGas: g('PostJobData_Fill_FieldGas'),
      cng: g('PostJobData_Fill_Cng'),
      diesel: g('PostJobData_Fill_Diesel'),
      chlorides: g('PostJobData_Fill_Chlorides'),
      overrideSurfaceMaxPressure: g('PostJobData_Fill_OverrideSurfaceMaxPressure'),
      padStageCompleted: g('PostJobData_Fill_PadStageCompleted'),
      padStageTotal: g('PostJobData_Fill_PadStageTotal'),
      subPercentAfterSave: g('PostJobData_Fill_SubPercentAfterSave'),
    },
    clearSampleValue: g('PostJobData_ClearSampleValue'),
  };
}

export function buildPostJobDataFlowData(get: GetValue): PostJobDataFlowData {
  return {
    ...buildPostJobDataTestData(get),
    padName: get('Padname', { required: true }),
    wellName: get('WellName', { required: true }),
    companyButtonName: get('CompanyButtonName', { fallback: 'Liveplus playwright' }),
  };
}
