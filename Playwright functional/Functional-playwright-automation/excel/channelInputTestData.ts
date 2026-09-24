export interface ChannelInputUnits {
  treatingPressure: string;
  bottomholePressure: string;
  deadStringPressure: string;
  cleanFlowRate: string;
  slurryFlowRate: string;
  proppantConc: string;
  slurryDensity: string;
  nitrogenFlowRate: string;
  co2CleanFlowRate: string;
}

export interface ChannelInputUserDefined {
  name1: string;
  name2: string;
  name3: string;
  unitType1: string;
  unitType2: string;
  unitType3: string;
  expectedUnit1: string;
  expectedUnit2: string;
  expectedUnit3: string;
  formula1: string;
  formula2: string;
  formula3: string;
}

export interface ChannelInputTestData {
  flowmeters: string;
  densometers: string;
  additivesSmoothingPoints: string;
  smoothChannels: string[];
  units: ChannelInputUnits;
  userDefined: ChannelInputUserDefined;
}

export interface ChannelInputFlowData extends ChannelInputTestData {
  padName: string;
  wellName: string;
  companyButtonName: string;
}

/** Defaults matching the original Channel Input script — written to Excel when keys are missing. */
export const CHANNEL_INPUT_EXCEL_DEFAULTS: Record<string, string> = {
  ChannelInput_Flowmeters: '2',
  ChannelInput_Densometers: '2',
  ChannelInput_AdditivesSmoothingPoints: '50',
  ChannelInput_SmoothChannels:
    "Treating Pressure|Bottomhole Pressure|Dead String Pressure|Clean Flow Rate|Slurry Flow Rate|Proppant Conc|Slurry Density|Nitrogen Flow Rate|CO2 Clean Flow Rate|Step Number/Total|Add'l Display Channel #1|Add'l Display Channel #2|Add'l Display Channel #3|Add'l Display Channel #4",
  ChannelInput_Unit_TreatingPressure: 'psi',
  ChannelInput_Unit_BottomholePressure: 'psi',
  ChannelInput_Unit_DeadStringPressure: 'psi',
  ChannelInput_Unit_CleanFlowRate: 'bpm',
  ChannelInput_Unit_SlurryFlowRate: 'bpm',
  ChannelInput_Unit_ProppantConc: 'ppg',
  ChannelInput_Unit_SlurryDensity: 'lbm/gal',
  ChannelInput_Unit_NitrogenFlowRate: 'scfm',
  ChannelInput_Unit_CO2CleanFlowRate: 'bpm',
  ChannelInput_UserDefinedName1: 'abc',
  ChannelInput_UserDefinedName2: 'abc1',
  ChannelInput_UserDefinedName3: 'abc2',
  ChannelInput_UnitType1: 'Activation Energy',
  ChannelInput_UnitType2: 'Build Rate Angle (Wellbore)',
  ChannelInput_UnitType3: 'Additive Mass Concentration',
  ChannelInput_ExpectedUnit1: '(kcal/mol)',
  ChannelInput_ExpectedUnit2: '(deg/100 ft)',
  ChannelInput_ExpectedUnit3: '(lb/Mgal)',
  ChannelInput_Formula1: 'COSH',
  ChannelInput_Formula2: 'LOG10',
  ChannelInput_Formula3: 'SIGN',
};

type GetValue = (key: string, options?: { fallback?: string; required?: boolean }) => string;
type SetValue = (key: string, value: string) => void;

/** Write Channel Input keys to Excel when missing (does not overwrite existing values). */
export function ensureChannelInputExcelKeys(get: GetValue, set: SetValue): void {
  for (const [key, value] of Object.entries(CHANNEL_INPUT_EXCEL_DEFAULTS)) {
    const existing = get(key, { fallback: '' }).trim();
    if (!existing) {
      set(key, value);
    }
  }
}

function splitPipeList(value: string): string[] {
  return value
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildChannelInputTestData(get: GetValue): ChannelInputTestData {
  const defaults = CHANNEL_INPUT_EXCEL_DEFAULTS;

  return {
    flowmeters: get('ChannelInput_Flowmeters', { fallback: defaults.ChannelInput_Flowmeters }),
    densometers: get('ChannelInput_Densometers', { fallback: defaults.ChannelInput_Densometers }),
    additivesSmoothingPoints: get('ChannelInput_AdditivesSmoothingPoints', {
      fallback: defaults.ChannelInput_AdditivesSmoothingPoints,
    }),
    smoothChannels: splitPipeList(
      get('ChannelInput_SmoothChannels', { fallback: defaults.ChannelInput_SmoothChannels }),
    ),
    units: {
      treatingPressure: get('ChannelInput_Unit_TreatingPressure', {
        fallback: defaults.ChannelInput_Unit_TreatingPressure,
      }),
      bottomholePressure: get('ChannelInput_Unit_BottomholePressure', {
        fallback: defaults.ChannelInput_Unit_BottomholePressure,
      }),
      deadStringPressure: get('ChannelInput_Unit_DeadStringPressure', {
        fallback: defaults.ChannelInput_Unit_DeadStringPressure,
      }),
      cleanFlowRate: get('ChannelInput_Unit_CleanFlowRate', {
        fallback: defaults.ChannelInput_Unit_CleanFlowRate,
      }),
      slurryFlowRate: get('ChannelInput_Unit_SlurryFlowRate', {
        fallback: defaults.ChannelInput_Unit_SlurryFlowRate,
      }),
      proppantConc: get('ChannelInput_Unit_ProppantConc', {
        fallback: defaults.ChannelInput_Unit_ProppantConc,
      }),
      slurryDensity: get('ChannelInput_Unit_SlurryDensity', {
        fallback: defaults.ChannelInput_Unit_SlurryDensity,
      }),
      nitrogenFlowRate: get('ChannelInput_Unit_NitrogenFlowRate', {
        fallback: defaults.ChannelInput_Unit_NitrogenFlowRate,
      }),
      co2CleanFlowRate: get('ChannelInput_Unit_CO2CleanFlowRate', {
        fallback: defaults.ChannelInput_Unit_CO2CleanFlowRate,
      }),
    },
    userDefined: {
      name1: get('ChannelInput_UserDefinedName1', { fallback: defaults.ChannelInput_UserDefinedName1 }),
      name2: get('ChannelInput_UserDefinedName2', { fallback: defaults.ChannelInput_UserDefinedName2 }),
      name3: get('ChannelInput_UserDefinedName3', { fallback: defaults.ChannelInput_UserDefinedName3 }),
      unitType1: get('ChannelInput_UnitType1', { fallback: defaults.ChannelInput_UnitType1 }),
      unitType2: get('ChannelInput_UnitType2', { fallback: defaults.ChannelInput_UnitType2 }),
      unitType3: get('ChannelInput_UnitType3', { fallback: defaults.ChannelInput_UnitType3 }),
      expectedUnit1: get('ChannelInput_ExpectedUnit1', {
        fallback: defaults.ChannelInput_ExpectedUnit1,
      }),
      expectedUnit2: get('ChannelInput_ExpectedUnit2', {
        fallback: defaults.ChannelInput_ExpectedUnit2,
      }),
      expectedUnit3: get('ChannelInput_ExpectedUnit3', {
        fallback: defaults.ChannelInput_ExpectedUnit3,
      }),
      formula1: get('ChannelInput_Formula1', { fallback: defaults.ChannelInput_Formula1 }),
      formula2: get('ChannelInput_Formula2', { fallback: defaults.ChannelInput_Formula2 }),
      formula3: get('ChannelInput_Formula3', { fallback: defaults.ChannelInput_Formula3 }),
    },
  };
}

export function buildChannelInputFlowData(get: GetValue): ChannelInputFlowData {
  return {
    ...buildChannelInputTestData(get),
    padName: get('Padname', { required: true }),
    wellName: get('WellName', { required: true }),
    companyButtonName: get('CompanyButtonName', { fallback: 'Liveplus playwright' }),
  };
}
