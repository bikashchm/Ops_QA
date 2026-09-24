/** Escape special regex characters for partial text matching in locators. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface MaterialChemicalData {
  name: string;
  unit: string;
  type: string;
}

export interface MaterialSelectionData {
  fluids: string[];
  proppants: string[];
  chemicals: MaterialChemicalData[];
}

export interface EditFluidChemicalData {
  name: string;
  unit: string;
  type: string;
  concentrationInput: string;
  expectedConcentration: string;
}

export interface EditFluidTestData {
  primaryFluidName: string;
  description: string;
  system: string;
  qValue: string;
  pValue: string;
  shearRate: string;
  apparentViscosity: string;
  defaultTemperature: string;
  thermalConductivity: string;
  specificHeat: string;
  specificGravity: string;
  chemicals: EditFluidChemicalData[];
}

/** @deprecated Use EditFluidTestData */
export type EditFluidMaterialData = EditFluidTestData;

const DEFAULT_CHEMICAL_CONCENTRATIONS = ['1000', '2000', '4000', '5000'] as const;

/** Application-specific type overrides keyed by chemical name from Excel. */
const CHEMICAL_TYPE_OVERRIDES: Record<string, string> = {
  'OPS Scale Inhibitor': 'abrasive',
};

function resolveChemicalType(chemicalName: string, excelType: string): string {
  return CHEMICAL_TYPE_OVERRIDES[chemicalName] ?? excelType;
}

export function formatConcentrationDisplay(value: string): string {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return value;
  return numeric.toFixed(2);
}

export function buildMaterialSelectionData(
  get: (key: string, options?: { fallback?: string }) => string,
): MaterialSelectionData {
  const fluids = readIndexedValues(get, 'Fluid', 4);
  const proppants = readIndexedValues(get, 'Proppant', 4);
  const chemicals: MaterialChemicalData[] = [];

  for (let index = 1; index <= 4; index++) {
    const name = get(`Chemical${index}`).trim();
    if (!name) continue;

    const excelType = get(`TypeColumn${index}`, { fallback: 'abrasive' });

    chemicals.push({
      name,
      unit: get(`Unitcolumn${index}`, { fallback: 'gal' }),
      type: resolveChemicalType(name, excelType),
    });
  }

  return { fluids, proppants, chemicals };
}

export function buildEditFluidTestData(
  get: (key: string, options?: { fallback?: string; required?: boolean }) => string,
): EditFluidTestData {
  const primaryFluidName = get('Fluid1', { required: true });
  const chemicals: EditFluidChemicalData[] = [];

  for (let index = 1; index <= 4; index++) {
    const name = get(`Chemical${index}`).trim();
    if (!name) continue;

    const concentrationInput = DEFAULT_CHEMICAL_CONCENTRATIONS[index - 1];
    const excelType = get(`TypeColumn${index}`, { fallback: 'abrasive' });

    chemicals.push({
      name,
      unit: get(`Unitcolumn${index}`, { fallback: 'gal' }),
      type: resolveChemicalType(name, excelType),
      concentrationInput,
      expectedConcentration: formatConcentrationDisplay(concentrationInput),
    });
  }

  return {
    primaryFluidName,
    description: get('FluidDescription', {
      fallback: '65% Binary BJFoam with 30# Gel',
    }),
    system: get('systemField', { fallback: 'Binary Foam' }),
    qValue: get('WellboreQValue', { fallback: '10' }),
    pValue: get('WellborePValue', { fallback: '20' }),
    shearRate: get('DeafultShearRate', { fallback: '511' }),
    apparentViscosity: get('DefaultAppVisc', { fallback: '83.1' }),
    defaultTemperature: get('Defaulttemperature', { fallback: '180' }),
    thermalConductivity: get('defaulThermalConductivity', { fallback: '0.32' }),
    specificHeat: get('defaulSpecificHeat', { fallback: '1' }),
    specificGravity: get('defaulFluidDensity', { fallback: '1' }),
    chemicals,
  };
}

/** @deprecated Use buildEditFluidTestData */
export const buildEditFluidMaterialData = buildEditFluidTestData;

function readIndexedValues(
  get: (key: string) => string,
  prefix: string,
  max: number,
): string[] {
  const values: string[] = [];

  for (let index = 1; index <= max; index++) {
    const value = get(`${prefix}${index}`).trim();
    if (value) values.push(value);
  }

  return values;
}
