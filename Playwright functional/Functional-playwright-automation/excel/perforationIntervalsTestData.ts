import type { KeyValueOptions } from './types';

export interface PerforationClusterData {
  topMd: string;
  botMd: string;
  diameter: string;
  noOfPerfs: string;
  perfPhasing: string;
}

export interface PerforationIntervalsTestData {
  validationTopMd: string;
  validationMessage: string;
  /** First Edit Clusters pass (Top 0 / Bot 10000 / 5 perfs) before overwrite. */
  initialCluster: PerforationClusterData;
  /** Second Edit Clusters pass for cluster row 0 (Top 1 / Bot 10000 / 10 perfs). */
  cluster1: PerforationClusterData;
  /** Second cluster row in dialog (Top 10001 / Bot 10800 / 20 perfs). */
  cluster2: PerforationClusterData;
  /** Expected main-grid values after first Ok + Save. */
  afterFirstSave: {
    topMd: string;
    botMd: string;
    topTvd: string;
    botTvd: string;
    diameter: string;
    perfPhasing: string;
  };
  /** Expected main-grid values after cluster1 Ok + Use checkbox. */
  afterCluster1Use: {
    topMd: string;
    botMd: string;
    topTvd: string;
    botTvd: string;
    diameter: string;
    noOfPerfs: string;
    perfPhasing: string;
    noOfClusters: string;
  };
  /** Expected main-grid values after cluster2 + final Save. */
  afterFinalSave: {
    topTvd: string;
    botTvd: string;
    diameter: string;
    noOfPerfs: string;
    perfPhasing: string;
    noOfClusters: string;
  };
}

export interface PerforationIntervalsFlowData extends PerforationIntervalsTestData {
  padName: string;
  wellName: string;
  companyButtonName: string;
}

type GetFn = (key: string, options?: KeyValueOptions) => string;
type SetFn = (key: string, value: string) => void;

/** Defaults matching staging Perforation Intervals codegen — written when Excel keys are empty. */
export const PERFORATION_INTERVALS_EXCEL_DEFAULTS: Record<string, string> = {
  PI_ValidationTopMD: '2000',
  PI_ValidationMessage: 'Top MD cannot be greater than Bottom MD!',

  PI_Initial_TopMD: '0',
  PI_Initial_BotMD: '10000',
  PI_Initial_Diameter: '0.400',
  PI_Initial_NoOfPerfs: '5',
  PI_Initial_PerfPhasing: '90',

  PI_Cluster1_TopMD: '1',
  PI_Cluster1_BotMD: '10000',
  PI_Cluster1_Diameter: '0.400',
  PI_Cluster1_NoOfPerfs: '10',
  PI_Cluster1_PerfPhasing: '90',

  PI_Cluster2_TopMD: '10001',
  PI_Cluster2_BotMD: '10800',
  PI_Cluster2_Diameter: '0.400',
  PI_Cluster2_NoOfPerfs: '20',
  PI_Cluster2_PerfPhasing: '90',

  PI_AfterFirst_TopMD: '0.0',
  PI_AfterFirst_BotMD: '10,000.0',
  PI_AfterFirst_TopTVD: '0.0',
  PI_AfterFirst_BotTVD: '10,000.0',
  PI_AfterFirst_Diameter: '0.400',
  PI_AfterFirst_PerfPhasing: '90',

  PI_AfterCluster1_TopMD: '1.0',
  PI_AfterCluster1_BotMD: '10,000.0',
  PI_AfterCluster1_TopTVD: '1.0',
  PI_AfterCluster1_BotTVD: '10,000.0',
  PI_AfterCluster1_Diameter: '0.400',
  PI_AfterCluster1_NoOfPerfs: '10',
  PI_AfterCluster1_PerfPhasing: '90',
  PI_AfterCluster1_NoOfClusters: '1',

  PI_Final_TopTVD: '1.0',
  PI_Final_BotTVD: '10,800.0',
  PI_Final_Diameter: '0.400',
  PI_Final_NoOfPerfs: '30',
  PI_Final_PerfPhasing: '90',
  PI_Final_NoOfClusters: '2',
};

export function ensurePerforationIntervalsExcelKeys(get: GetFn, set: SetFn): void {
  for (const [key, value] of Object.entries(PERFORATION_INTERVALS_EXCEL_DEFAULTS)) {
    const existing = get(key, { fallback: '' }).trim();
    if (!existing) {
      set(key, value);
    }
  }
}

export function formatPerforationMdDisplay(value: string): string {
  const n = Number(String(value).replace(/,/g, ''));
  if (Number.isNaN(n)) return value;
  return n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function cluster(
  get: GetFn,
  d: Record<string, string>,
  prefix: string,
): PerforationClusterData {
  return {
    topMd: get(`${prefix}_TopMD`, { fallback: d[`${prefix}_TopMD`] }).trim(),
    botMd: get(`${prefix}_BotMD`, { fallback: d[`${prefix}_BotMD`] }).trim(),
    diameter: get(`${prefix}_Diameter`, { fallback: d[`${prefix}_Diameter`] }).trim(),
    noOfPerfs: get(`${prefix}_NoOfPerfs`, { fallback: d[`${prefix}_NoOfPerfs`] }).trim(),
    perfPhasing: get(`${prefix}_PerfPhasing`, { fallback: d[`${prefix}_PerfPhasing`] }).trim(),
  };
}

export function buildPerforationIntervalsTestData(get: GetFn): PerforationIntervalsTestData {
  const d = PERFORATION_INTERVALS_EXCEL_DEFAULTS;
  return {
    validationTopMd: get('PI_ValidationTopMD', { fallback: d.PI_ValidationTopMD }).trim(),
    validationMessage: get('PI_ValidationMessage', {
      fallback: d.PI_ValidationMessage,
    }).trim(),
    initialCluster: cluster(get, d, 'PI_Initial'),
    cluster1: cluster(get, d, 'PI_Cluster1'),
    cluster2: cluster(get, d, 'PI_Cluster2'),
    afterFirstSave: {
      topMd: get('PI_AfterFirst_TopMD', { fallback: d.PI_AfterFirst_TopMD }).trim(),
      botMd: get('PI_AfterFirst_BotMD', { fallback: d.PI_AfterFirst_BotMD }).trim(),
      topTvd: get('PI_AfterFirst_TopTVD', { fallback: d.PI_AfterFirst_TopTVD }).trim(),
      botTvd: get('PI_AfterFirst_BotTVD', { fallback: d.PI_AfterFirst_BotTVD }).trim(),
      diameter: get('PI_AfterFirst_Diameter', { fallback: d.PI_AfterFirst_Diameter }).trim(),
      perfPhasing: get('PI_AfterFirst_PerfPhasing', {
        fallback: d.PI_AfterFirst_PerfPhasing,
      }).trim(),
    },
    afterCluster1Use: {
      topMd: get('PI_AfterCluster1_TopMD', { fallback: d.PI_AfterCluster1_TopMD }).trim(),
      botMd: get('PI_AfterCluster1_BotMD', { fallback: d.PI_AfterCluster1_BotMD }).trim(),
      topTvd: get('PI_AfterCluster1_TopTVD', { fallback: d.PI_AfterCluster1_TopTVD }).trim(),
      botTvd: get('PI_AfterCluster1_BotTVD', { fallback: d.PI_AfterCluster1_BotTVD }).trim(),
      diameter: get('PI_AfterCluster1_Diameter', {
        fallback: d.PI_AfterCluster1_Diameter,
      }).trim(),
      noOfPerfs: get('PI_AfterCluster1_NoOfPerfs', {
        fallback: d.PI_AfterCluster1_NoOfPerfs,
      }).trim(),
      perfPhasing: get('PI_AfterCluster1_PerfPhasing', {
        fallback: d.PI_AfterCluster1_PerfPhasing,
      }).trim(),
      noOfClusters: get('PI_AfterCluster1_NoOfClusters', {
        fallback: d.PI_AfterCluster1_NoOfClusters,
      }).trim(),
    },
    afterFinalSave: {
      topTvd: get('PI_Final_TopTVD', { fallback: d.PI_Final_TopTVD }).trim(),
      botTvd: get('PI_Final_BotTVD', { fallback: d.PI_Final_BotTVD }).trim(),
      diameter: get('PI_Final_Diameter', { fallback: d.PI_Final_Diameter }).trim(),
      noOfPerfs: get('PI_Final_NoOfPerfs', { fallback: d.PI_Final_NoOfPerfs }).trim(),
      perfPhasing: get('PI_Final_PerfPhasing', { fallback: d.PI_Final_PerfPhasing }).trim(),
      noOfClusters: get('PI_Final_NoOfClusters', { fallback: d.PI_Final_NoOfClusters }).trim(),
    },
  };
}

export function buildPerforationIntervalsFlowData(
  get: GetFn,
  sharedPadWell: { padName: string; wellName: string; companyButtonName: string },
): PerforationIntervalsFlowData {
  return {
    ...buildPerforationIntervalsTestData(get),
    padName: sharedPadWell.padName,
    wellName: sharedPadWell.wellName,
    companyButtonName: sharedPadWell.companyButtonName,
  };
}
