/**
 * Results → Report → Material Usage expected grid values (staging screenshot / design schedule).
 */

export interface MaterialUsageChemicalRow {
  name: string;
  designTotal: string;
}

export interface MaterialUsageProppantRow {
  name: string;
  designTotalLbs: string;
  meteredTotalLbs: string;
  actualTotalLbs: string;
}

export interface MaterialUsageTestData {
  chemicals: MaterialUsageChemicalRow[];
  proppant: MaterialUsageProppantRow;
}

export interface MaterialUsageFlowData extends MaterialUsageTestData {
  padName: string;
  wellName: string;
  companyButtonName: string;
}

/** Post-model-run Material Usage values (pad7652 stage screenshot). */
export const MATERIAL_USAGE_EXCEL_DEFAULTS: Record<string, string> = {
  MaterialUsage_Chemical1_Name: 'Acid Pack Pro_HT',
  MaterialUsage_Chemical2_Name: 'OPS Biocide',
  MaterialUsage_Chemical3_Name: 'ProCross 170',
  MaterialUsage_Chemical4_Name: 'OPS Scale Inhibitor',
  MaterialUsage_Chemical1_Design: '30,000.00',
  MaterialUsage_Chemical2_Design: '60,000.00',
  MaterialUsage_Chemical3_Design: '120,000.00',
  MaterialUsage_Chemical4_Design: '150,000.00',
  MaterialUsage_Proppant_DesignLbs: '28,000,000.0',
  MaterialUsage_Proppant_MeteredLbs: '28,000,000.0',
  MaterialUsage_Proppant_ActualLbs: '0.0',
  MaterialUsage_CleanTotal: '714.2',
};

type GetValue = (key: string, options?: { fallback?: string; required?: boolean }) => string;
type SetValue = (key: string, value: string) => void;

export function ensureMaterialUsageExcelKeys(get: GetValue, set: SetValue): void {
  for (const [key, value] of Object.entries(MATERIAL_USAGE_EXCEL_DEFAULTS)) {
    const existing = get(key, { fallback: '' }).trim();
    if (existing !== value) {
      set(key, value);
    }
  }
}

export function buildMaterialUsageTestData(get: GetValue): MaterialUsageTestData {
  const d = MATERIAL_USAGE_EXCEL_DEFAULTS;
  const chemicals: MaterialUsageChemicalRow[] = [];

  for (let index = 1; index <= 4; index++) {
    const nameKey = `MaterialUsage_Chemical${index}_Name`;
    const name =
      get(`Chemical${index}`, { fallback: '' }).trim() ||
      get(nameKey, { fallback: d[nameKey] ?? '' }).trim();
    if (!name) continue;
    chemicals.push({
      name,
      designTotal: get(`MaterialUsage_Chemical${index}_Design`, {
        fallback: d[`MaterialUsage_Chemical${index}_Design`] ?? '',
      }),
    });
  }

  return {
    chemicals,
    proppant: {
      name: get('Proppant1', { fallback: '100 mesh' }),
      designTotalLbs: get('MaterialUsage_Proppant_DesignLbs', {
        fallback: d.MaterialUsage_Proppant_DesignLbs,
      }),
      meteredTotalLbs: get('MaterialUsage_Proppant_MeteredLbs', {
        fallback: d.MaterialUsage_Proppant_MeteredLbs,
      }),
      actualTotalLbs: get('MaterialUsage_Proppant_ActualLbs', {
        fallback: d.MaterialUsage_Proppant_ActualLbs,
      }),
    },
  };
}

export function buildMaterialUsageFlowData(
  get: GetValue,
  padWell: { padName: string; wellName: string; companyButtonName: string },
): MaterialUsageFlowData {
  return {
    ...buildMaterialUsageTestData(get),
    ...padWell,
  };
}
