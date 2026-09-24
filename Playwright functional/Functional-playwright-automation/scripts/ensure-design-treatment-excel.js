const XLSX = require('xlsx');

const path = 'test-data/excel/Liveplus_TestData.xlsx';
const sheet = 'Sheet1';
const wb = XLSX.readFile(path);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, defval: '' });

const defaults = {
  DesignTreatment_Row1_StepType: 'Water injection',
  DesignTreatment_Row1_FlowRate: '1000',
  DesignTreatment_Row1_FlowRateDisplay: '1,000.00',
  DesignTreatment_Row1_PropConc: '2000',
  DesignTreatment_Row1_PropConcDisplay: '2,000.00',
  DesignTreatment_Row1_CleanVol: '10000',
  DesignTreatment_Row1_CleanVolDisplay: '10,000',
  DesignTreatment_Row1_FluidType: 'Binary 30 65',
  DesignTreatment_Row1_ProppantType: '100 mesh',
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

const map = new Map();
for (let i = 0; i < rows.length; i++) {
  const k = String(rows[i][0] || '').trim();
  if (k) map.set(k.toLowerCase(), i);
}

let changed = 0;
for (const [k, v] of Object.entries(defaults)) {
  const idx = map.get(k.toLowerCase());
  if (idx === undefined) {
    rows.push([k, v]);
    changed++;
    map.set(k.toLowerCase(), rows.length - 1);
  } else if (String(rows[idx][1] || '').trim() !== v) {
    rows[idx][1] = v;
    changed++;
  }
}

wb.Sheets[sheet] = XLSX.utils.aoa_to_sheet(rows);
XLSX.writeFile(wb, path);
console.log('DesignTreatment keys added/updated:', changed);
