export interface ReservoirParametersDefaults {
  fractureHeight: string;
  payzoneHeight: string;
  depthToCenterOfPay: string;
  closureStress: string;
  closureStressDisplay: string;
  formationModulus: string;
  poissonsRatio: string;
  leakoffCoefficient: string;
  poreFluidPermeability: string;
  reservoirTemperature: string;
  fractureToughness: string;
  lithology: string;
}

export interface ReservoirParametersFillValues {
  fractureHeight: string;
  payzoneHeight: string;
  depthToCenterOfPay: string;
  closureStress: string;
  formationModulus: string;
  poissonsRatio: string;
  leakoffCoefficient: string;
  poreFluidPermeability: string;
  reservoirTemperature: string;
  fractureToughness: string;
  lithology: string;
}

export interface ReservoirParametersTestData {
  defaults: ReservoirParametersDefaults;
  fill: ReservoirParametersFillValues;
}

export interface ReservoirParametersFlowData extends ReservoirParametersTestData {
  padName: string;
  wellName: string;
  companyButtonName: string;
}

/** Defaults from the Reservoir Parameters recording — written to Excel when keys are missing. */
export const RESERVOIR_PARAMETERS_EXCEL_DEFAULTS: Record<string, string> = {
  ReservoirParameters_FractureHeightGrossPay: '100',
  ReservoirParameters_PayzoneHeight: '100',
  ReservoirParameters_DepthToCenterOfPay: '10000',
  ReservoirParameters_ClosureStressInPayzone: '5000',
  ReservoirParameters_ClosureStressDisplay: '5,000',
  ReservoirParameters_FormationModulus: '1.00e+6',
  ReservoirParameters_FormationPoissonsRatio: '0.250',
  ReservoirParameters_LeakoffCoefficient: '0.00e+0',
  ReservoirParameters_PoreFluidPermeability: '0.00e+0',
  ReservoirParameters_ReservoirTemperature: '180.0',
  ReservoirParameters_FractureToughness: '0.0',
  ReservoirParameters_Lithology: 'Sandstone',
};

type GetValue = (key: string, options?: { fallback?: string; required?: boolean }) => string;
type SetValue = (key: string, value: string) => void;

export function ensureReservoirParametersExcelKeys(get: GetValue, set: SetValue): void {
  for (const [key, value] of Object.entries(RESERVOIR_PARAMETERS_EXCEL_DEFAULTS)) {
    const existing = get(key, { fallback: '' }).trim();
    if (!existing) {
      set(key, value);
    }
  }
}

/** Compare Excel value to formatted on-screen value (commas / scientific notation). */
export function reservoirDisplayMatches(expected: string, actual: string): boolean {
  const normalize = (v: string) =>
    v.replace(/,/g, '').replace(/\s+/g, '').trim().toLowerCase();
  const a = normalize(expected);
  const b = normalize(actual);
  if (a === b) return true;

  const numA = Number(a);
  const numB = Number(b);
  if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
    // Treat scientific / plain zeros as equal (0.00e+0 vs 0 / 0.0)
    if (Math.abs(numA) < 1e-12 && Math.abs(numB) < 1e-12) return true;
    const rel = Math.abs(numA - numB) / Math.max(Math.abs(numA), Math.abs(numB), 1);
    return Math.abs(numA - numB) < 0.001 || rel < 1e-6;
  }
  return false;
}

export function buildReservoirParametersTestData(get: GetValue): ReservoirParametersTestData {
  const d = RESERVOIR_PARAMETERS_EXCEL_DEFAULTS;

  const fractureHeight = get('ReservoirParameters_FractureHeightGrossPay', {
    fallback: d.ReservoirParameters_FractureHeightGrossPay,
  });
  const payzoneHeight = get('ReservoirParameters_PayzoneHeight', {
    fallback: d.ReservoirParameters_PayzoneHeight,
  });
  const depthToCenterOfPay = get('ReservoirParameters_DepthToCenterOfPay', {
    fallback: d.ReservoirParameters_DepthToCenterOfPay,
  });
  const closureStress = get('ReservoirParameters_ClosureStressInPayzone', {
    fallback: d.ReservoirParameters_ClosureStressInPayzone,
  });
  const closureStressDisplay = get('ReservoirParameters_ClosureStressDisplay', {
    fallback: d.ReservoirParameters_ClosureStressDisplay,
  });
  const formationModulus = get('ReservoirParameters_FormationModulus', {
    fallback: d.ReservoirParameters_FormationModulus,
  });
  const poissonsRatio = get('ReservoirParameters_FormationPoissonsRatio', {
    fallback: d.ReservoirParameters_FormationPoissonsRatio,
  });
  const leakoffCoefficient = get('ReservoirParameters_LeakoffCoefficient', {
    fallback: d.ReservoirParameters_LeakoffCoefficient,
  });
  const poreFluidPermeability = get('ReservoirParameters_PoreFluidPermeability', {
    fallback: d.ReservoirParameters_PoreFluidPermeability,
  });
  const reservoirTemperature = get('ReservoirParameters_ReservoirTemperature', {
    fallback: d.ReservoirParameters_ReservoirTemperature,
  });
  const fractureToughness = get('ReservoirParameters_FractureToughness', {
    fallback: d.ReservoirParameters_FractureToughness,
  });
  const lithology = get('ReservoirParameters_Lithology', {
    fallback: d.ReservoirParameters_Lithology,
  });

  return {
    defaults: {
      fractureHeight,
      payzoneHeight,
      depthToCenterOfPay,
      closureStress,
      closureStressDisplay,
      formationModulus,
      poissonsRatio,
      leakoffCoefficient,
      poreFluidPermeability,
      reservoirTemperature,
      fractureToughness,
      lithology,
    },
    fill: {
      fractureHeight,
      payzoneHeight,
      depthToCenterOfPay,
      closureStress,
      formationModulus,
      poissonsRatio,
      leakoffCoefficient,
      poreFluidPermeability,
      reservoirTemperature,
      fractureToughness,
      lithology,
    },
  };
}

export function buildReservoirParametersFlowData(get: GetValue): ReservoirParametersFlowData {
  return {
    ...buildReservoirParametersTestData(get),
    padName: get('Padname', { required: true }),
    wellName: get('WellName', { required: true }),
    companyButtonName: get('CompanyButtonName', { fallback: 'Liveplus playwright' }),
  };
}
