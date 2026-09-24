const XLSX = require('xlsx');

const path = 'test-data/excel/Liveplus_TestData.xlsx';
const sheet = 'Sheet1';
const wb = XLSX.readFile(path);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, defval: '' });

const defaults = {
  TreatmentTotals_SpecField1: '50',
  TreatmentTotals_SpecField2: '10,443.0',
  TreatmentTotals_SpecField3: '476.1',
  TreatmentTotals_SpecField4: '10,443.0',
  TreatmentTotals_FluidName: 'Binary 30 65',
  TreatmentTotals_ProppantName: '100 mesh',
};

const keyIndex = new Map();
for (let i = 0; i < rows.length; i++) {
  const key = String(rows[i][0] ?? '').trim();
  if (key) keyIndex.set(key, i);
}

let added = 0;
let updated = 0;
for (const [key, value] of Object.entries(defaults)) {
  if (!keyIndex.has(key)) {
    rows.push([key, value]);
    added++;
    continue;
  }
  const rowIdx = keyIndex.get(key);
  const current = String(rows[rowIdx][1] ?? '').trim();
  if (current !== value) {
    rows[rowIdx][1] = value;
    updated++;
  }
}

wb.Sheets[sheet] = XLSX.utils.aoa_to_sheet(rows);
XLSX.writeFile(wb, path);
console.log(`Treatment Totals Excel keys — added: ${added}, updated: ${updated}`);
