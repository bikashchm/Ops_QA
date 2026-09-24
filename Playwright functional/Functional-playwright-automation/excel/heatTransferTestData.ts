export interface HeatTransferDefaults {
  surfaceFluidTemp: string;
  surfaceProppantTemp: string;
  surfaceN2Temp: string;
  surfaceCO2Temp: string;
  surfaceRockTemp: string;
  reservoirTemp: string;
  wellboreMultiplier: string;
  fractureMultiplier: string;
  waterDepth: string;
  surfaceWaterTemp: string;
  seabedTemp: string;
  seaCurrent: string;
  oceanMultiplier: string;
}

export interface HeatTransferFillValues extends HeatTransferDefaults {}

export interface HeatTransferGridValues {
  depth1: string;
  temp1: string;
  depth2: string;
  temp2: string;
}

export interface HeatTransferTestData {
  defaults: HeatTransferDefaults;
  fill: HeatTransferFillValues;
  grid: HeatTransferGridValues;
}

/** Pad, well, and Heat Transfer field values — all from Excel (same sheet as material tests). */
export interface HeatTransferFlowData extends HeatTransferTestData {
  padName: string;
  wellName: string;
  companyButtonName: string;
}

/** Strip thousands separators and whitespace for numeric UI comparison. */
export function normalizeDisplayNumber(value: string): string {
  return value.replace(/,/g, '').trim();
}

/** Compare Excel fill value to formatted on-screen value (commas, trailing zeros). */
export function displayMatchesFillValue(expected: string, actual: string): boolean {
  const normalizedExpected = normalizeDisplayNumber(expected);
  const normalizedActual = normalizeDisplayNumber(actual);

  if (normalizedExpected === normalizedActual) return true;

  const expectedNumber = Number(normalizedExpected);
  const actualNumber = Number(normalizedActual);

  if (!Number.isNaN(expectedNumber) && !Number.isNaN(actualNumber)) {
    return Math.abs(expectedNumber - actualNumber) < 0.001;
  }

  return false;
}

type GetValue = (key: string, options?: { fallback?: string; required?: boolean }) => string;

function readTemperatureDefaults(get: GetValue): HeatTransferDefaults {
  return {
    surfaceFluidTemp: get('SurfaceFluidTemperatureValue', { required: true }),
    surfaceProppantTemp: get('SurfaceProppantTemperatureValue', { required: true }),
    surfaceN2Temp: get('SurfaceN2TemperatureValue', { required: true }),
    surfaceCO2Temp: get('SurfaceC02TemperatureValue', { required: true }),
    surfaceRockTemp: get('SurfaceRockTemperatureValue', { required: true }),
    reservoirTemp: get('ReservoirTemperatureatFracCenterDepthValue', { required: true }),
    wellboreMultiplier: get('WellboreHeatTransferCoefficientMultiplierValue', { required: true }),
    fractureMultiplier: get('FractureHeatTransferCoefficientMultiplierValue', { required: true }),
    waterDepth: get('WaterDepthValue', { required: true }),
    surfaceWaterTemp: get('SurfaceWaterTemperatureValue', { required: true }),
    seabedTemp: get('SeabedTemperatureValue', { required: true }),
    seaCurrent: get('SeaCurrentValue', { required: true }),
    oceanMultiplier: get('OceanorWellboreHeatTransferCoefficientMultiplierValue', {
      required: true,
    }),
  };
}

export function buildHeatTransferTestData(get: GetValue): HeatTransferTestData {
  const defaults = readTemperatureDefaults(get);

  return {
    defaults,
    fill: { ...defaults },
    grid: {
      depth1: get('DepthTVDValue', { required: true }),
      temp1: get('TempretureValue', { required: true }),
      depth2: get('KickOffTVDValue', { required: true }),
      temp2: get('PlugDepthValue', { required: true }),
    },
  };
}

/** Excel-driven pad/well + heat transfer fields (mirrors materialTestData builder pattern). */
export function buildHeatTransferFlowData(get: GetValue): HeatTransferFlowData {
  return {
    ...buildHeatTransferTestData(get),
    padName: get('Padname', { required: true }),
    wellName: get('WellName', { required: true }),
    companyButtonName: get('CompanyButtonName', { fallback: 'Liveplus playwright' }),
  };
}
