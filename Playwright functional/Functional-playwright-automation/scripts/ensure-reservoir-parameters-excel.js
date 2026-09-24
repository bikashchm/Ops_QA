const XLSX = require('xlsx');

const path = 'test-data/excel/Liveplus_TestData.xlsx';
const sheet = 'Sheet1';
const wb = XLSX.readFile(path);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, defval: '' });

const defaults = {
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

const map = new Map();
for (let i = 0; i < rows.length; i++) {
  const k = String(rows[i][0] || '').trim();
  if (k) map.set(k.toLowerCase(), i);
}

let added = 0;
for (const [k, v] of Object.entries(defaults)) {
  const idx = map.get(k.toLowerCase());
  if (idx === undefined) {
    rows.push([k, v]);
    added++;
    map.set(k.toLowerCase(), rows.length - 1);
  } else if (!String(rows[idx][1] || '').trim()) {
    rows[idx][1] = v;
    added++;
  }
}

wb.Sheets[sheet] = XLSX.utils.aoa_to_sheet(rows);
XLSX.writeFile(wb, path);
console.log('ReservoirParameters keys added/filled:', added);
