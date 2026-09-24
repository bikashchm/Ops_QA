/**
 * Sync login email/password into Excel sheets from credentials/.env.local.
 * Usage: node scripts/update-login-credentials.js
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const XLSX = require('xlsx');

dotenv.config({ path: path.resolve('credentials/stage.env') });
dotenv.config({ path: path.resolve('credentials/.env.local'), override: true });

const email = (process.env.USERNAME || '').trim();
const password = (process.env.PASSWORD || '').trim();

if (!email || !password) {
  console.error('USERNAME/PASSWORD missing. Set them in credentials/.env.local first.');
  process.exit(1);
}

const candidates = [
  path.resolve('test-data/excel/Liveplus_TestData.xlsx'),
  path.resolve('Liveplus_TestData.xlsx'),
];

const filePath = candidates.find((candidate) => fs.existsSync(candidate));
if (!filePath) {
  console.error('Excel workbook not found.');
  process.exit(1);
}

const workbook = XLSX.readFile(filePath);
const keys = ['Email', 'EmailAddress', 'Password'];
const values = {
  Email: email,
  EmailAddress: email,
  Password: password,
};

function upsertSheet(sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.log(`Skip missing sheet: ${sheetName}`);
    return;
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rows.length) {
    rows.push(['Key', 'Value']);
  }

  for (const key of keys) {
    const normalized = key.toLowerCase();
    let found = false;
    for (const row of rows) {
      const currentKey = String(row[0] ?? '').trim();
      if (currentKey && currentKey.toLowerCase() === normalized) {
        row[1] = values[key];
        found = true;
        break;
      }
    }
    if (!found) {
      rows.push([key, values[key]]);
    }
  }

  workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(rows);
  console.log(`Updated sheet: ${sheetName}`);
}

for (const sheetName of ['Staging', 'QA', 'Data', 'Sheet1']) {
  upsertSheet(sheetName);
}

XLSX.writeFile(workbook, filePath);
console.log(`Resolved email: ${email}`);
console.log('Password configured: true');
console.log(`Excel file: ${filePath}`);
